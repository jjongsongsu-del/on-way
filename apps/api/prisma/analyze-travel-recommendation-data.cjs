const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();
const repoRoot = path.resolve(__dirname, '../../..');
const dataRoot = path.resolve(repoRoot, 'ref_data/여행추천/data-go-kr');
const fileRoot = path.join(dataRoot, 'files');
const metadataRoot = path.join(dataRoot, 'metadata');
const analysisRoot = path.resolve(repoRoot, 'ref_data/여행추천/analysis');
const args = parseArgs(process.argv.slice(2));
const maxRowsPerDataset = Number(args['max-rows-per-dataset'] ?? 1000);
const maxAssetCandidates = Number(args['max-assets'] ?? 50000);
const maxSampleRows = Number(args['sample-rows'] ?? 5);
const maxFileBytesForRowScan = Number(args['max-file-mb'] ?? 25) * 1024 * 1024;

const CATEGORY_RULES = [
  ['accommodation', ['숙박', '호텔', '모텔', '펜션', '민박', '게스트하우스', '리조트', '호스텔', '야영', '캠핑', '차박', '객실']],
  ['food', ['맛집', '식당', '음식점', '메뉴', '해산물', '수산시장', '전통시장', '카페', '향토음식', '미식']],
  ['course', ['코스', '여행일정', '추천여행', '테마여행', '둘레길', '해안길', '탐방로', '트레킹', '산책', '올레길', '해파랑길']],
  ['activity', ['체험', '해루질', '낚시', '수상레저', '해양레저', '서핑', '요트', '카약', '스노클링', '레저']],
  ['beach', ['해수욕장', '해변', '해안', '갯벌', '바다']],
  ['viewpoint', ['전망대', '등대', '노을', '일몰', '일출', '포토존', '사진']],
  ['festival', ['축제', '행사', '공연']],
  ['accessibility', ['무장애', '관광약자', '장애인', '휠체어', '배리어프리']],
  ['facility', ['화장실', '주차장', '샤워장', '편의시설', '편의점', '안내소', '매점', '휴게소']],
  ['pet', ['반려동물', '반려견', '애견']],
  ['port', ['항구', '어항', '선착장', '여객선', '터미널', '포구']]
];

const STYLE_RULES = {
  dayTrip: ['코스', '주차장', '식당', '카페', '관광지', '해수욕장', '전망대', '시장', '편의시설', '편의점', '안내소'],
  oneNight: ['숙박', '호텔', '펜션', '민박', '캠핑', '야영', '코스', '편의시설'],
  family: ['무장애', '화장실', '주차장', '체험', '해수욕장', '편의시설', '편의점', '안내소', '관광약자'],
  couple: ['노을', '일몰', '전망대', '등대', '카페', '숙박', '해변'],
  solo: ['산책', '둘레길', '해안길', '탐방로', '조용', '도보'],
  friends: ['맛집', '사진', '포토존', '액티비티', '체험', '축제'],
  food: ['맛집', '식당', '메뉴', '해산물', '수산시장', '전통시장'],
  photo: ['포토존', '사진', '전망대', '등대', '노을', '일출', '일몰'],
  healing: ['산책', '해변', '바다', '자연', '공원', '휴양림'],
  trekking: ['트레킹', '둘레길', '해안길', '탐방로', '산책로', '올레길'],
  activity: ['낚시', '해루질', '서핑', '스노클링', '요트', '카약', '수상레저', '해양레저'],
  camping: ['캠핑', '야영', '차박', '오토캠핑', '백패킹', '샤워장', '화장실', '편의점', '편의시설']
};

async function main() {
  ensureDir(analysisRoot);

  const context = await loadDbContext();
  const catalogDatasets = readCatalogDatasets();
  const columnProfiles = readColumnProfiles();
  const fileIndex = indexDownloadedFiles();
  const dbDatasets = await loadDbDatasets();

  const inventory = [];
  const columnProfileOutput = [];
  const assetCandidates = [];
  const sourceUsage = [];

  for (const dataset of catalogDatasets) {
    const db = dbDatasets.get(dataset.publicDataPk) ?? {};
    const columns = columnProfiles.get(dataset.publicDataPk) ?? [];
    const file = resolveDatasetFile(dataset, db, fileIndex);
    const fileProfile = file ? inspectFile(file.path, columns) : null;
    const sourceLocationHint = findSourceLocationHint(dataset, db, file, context);
    const signals = buildSignals(dataset, db, columns, fileProfile);
    const match = matchDatasetToIslandAndRegion(`${signals.searchText} ${sourceLocationHint?.searchText ?? ''}`, context);
    const usability = scoreUsability(signals, match, fileProfile, db);
    const styles = scoreStyles(signals.searchText);

    const inventoryRow = {
      publicDataPk: dataset.publicDataPk,
      title: firstText(db.title, dataset.title),
      organization: firstText(db.organization, dataset.organization),
      sourceKeywords: dataset.sourceKeywords,
      formats: unique([...(dataset.formats ?? []), db.fileExtension, file?.extension].filter(Boolean).map((value) => String(value).toUpperCase())),
      localFilePath: file ? rel(file.path) : firstText(db.localFilePath, null),
      fileSizeBytes: file?.size ?? numberOrNull(db.fileSizeBytes),
      columnCount: columns.length,
      sampleHeaders: fileProfile?.headers ?? [],
      sampleRows: fileProfile?.sampleRows ?? [],
      capabilities: signals.capabilities,
      categories: signals.categories,
      sourceLocationHint,
      styleScores: styles,
      islandMatch: match.island,
      travelRegionMatch: match.travelRegion,
      usabilityScore: usability.score,
      usabilityGrade: usability.grade,
      recommendationUse: usability.recommendationUse,
      reasons: usability.reasons,
      cautions: usability.cautions
    };

    inventory.push(inventoryRow);
    columnProfileOutput.push({
      publicDataPk: dataset.publicDataPk,
      title: inventoryRow.title,
      sourceKeywords: dataset.sourceKeywords,
      columnCount: columns.length,
      columns: columns.map((column) => ({
        name: column.name,
        englishName: column.englishName,
        description: column.description,
        inferredRole: inferColumnRole(column.name, column.englishName, column.description)
      })),
      sampleHeaders: fileProfile?.headers ?? []
    });

    if (fileProfile?.rows?.length && usability.score >= 45) {
      const candidates = buildAssetCandidates(dataset, db, file, fileProfile, signals, context, sourceLocationHint);
      for (const candidate of candidates) {
        if (assetCandidates.length >= maxAssetCandidates) break;
        assetCandidates.push(candidate);
      }
    }

    sourceUsage.push({
      publicDataPk: dataset.publicDataPk,
      title: inventoryRow.title,
      usabilityScore: usability.score,
      grade: usability.grade,
      categories: signals.categories,
      capabilities: signals.capabilities,
      candidateCount: assetCandidates.filter((item) => item.sourceDatasetPk === dataset.publicDataPk).length
    });
  }

  inventory.sort((left, right) => right.usabilityScore - left.usabilityScore || left.title.localeCompare(right.title, 'ko'));
  assetCandidates.sort((left, right) => right.matchScore - left.matchScore || left.name.localeCompare(right.name, 'ko'));

  const summary = buildSummary(inventory, assetCandidates, context);

  writeJson('travel-data-inventory.json', { generatedAt: now(), summary, datasets: inventory });
  writeJson('travel-data-column-profile.json', { generatedAt: now(), totalDatasets: columnProfileOutput.length, datasets: columnProfileOutput });
  writeJson('travel-asset-candidates.json', { generatedAt: now(), totalCandidates: assetCandidates.length, candidates: assetCandidates });
  writeJson('travel-source-usage-candidates.json', { generatedAt: now(), sources: sourceUsage.sort((a, b) => b.usabilityScore - a.usabilityScore) });

  console.log(JSON.stringify({
    outputRoot: analysisRoot,
    datasets: inventory.length,
    assetCandidates: assetCandidates.length,
    highValueSources: inventory.filter((item) => item.usabilityGrade === 'A').length,
    regions: context.travelRegions.length,
    islands: context.islands.length
  }, null, 2));
}

async function loadDbContext() {
  const [islands, travelRegions, addressRegions] = await Promise.all([
    prisma.islandMaster.findMany({
      select: {
        id: true,
        islandName: true,
        legalDongName: true,
        travelRegionId: true,
        travelRegionName: true,
        forecastLocationId: true,
        forecastLocationName: true
      }
    }),
    prisma.islandTravelRegionMaster.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        group: true,
        provinceNames: true,
        cityNames: true,
        mainPortNames: true,
        aliases: true,
        primaryForecastRegionId: true,
        forecastRegionIds: true
      }
    }),
    prisma.$queryRaw`
      select travel_region_id as "travelRegionId",
             travel_region_name as "travelRegionName",
             sido,
             sigungu,
             count(*)::int as count
      from public.address_master
      where travel_region_id is not null
      group by travel_region_id, travel_region_name, sido, sigungu
    `
  ]);

  const islandTokens = islands.flatMap((island) => {
    const tokens = [island.islandName]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter((value) => normalizeText(value).length >= 3);
    return tokens.map((token) => ({ token, island }));
  });

  return { islands, travelRegions, addressRegions, islandTokens };
}

async function loadDbDatasets() {
  const rows = await prisma.publicDataFileDataset.findMany();
  return new Map(rows.map((row) => [row.publicDataPk, row]));
}

function readCatalogDatasets() {
  const catalogFiles = fs.readdirSync(dataRoot)
    .filter((name) => /^catalog-.+\.json$/i.test(name))
    .sort((left, right) => left.localeCompare(right, 'ko'));
  const byPk = new Map();

  for (const fileName of catalogFiles) {
    const catalog = readJson(path.join(dataRoot, fileName));
    const keyword = catalog.keyword ?? fileName.replace(/^catalog-|\.json$/g, '');
    for (const dataset of catalog.datasets ?? []) {
      const publicDataPk = String(dataset.publicDataPk ?? '').trim();
      if (!publicDataPk) continue;
      const existing = byPk.get(publicDataPk);
      if (existing) {
        existing.sourceKeywords = unique([...existing.sourceKeywords, keyword]);
        existing.formats = unique([...(existing.formats ?? []), ...(dataset.formats ?? [])]);
      } else {
        byPk.set(publicDataPk, { ...dataset, publicDataPk, sourceKeywords: [keyword] });
      }
    }
  }

  return [...byPk.values()];
}

function readColumnProfiles() {
  const roots = [dataRoot, metadataRoot].filter((dir) => fs.existsSync(dir));
  const byPk = new Map();

  for (const root of roots) {
    const files = fs.readdirSync(root)
      .filter((name) => /^columns-catalog.*\.json$/i.test(name));
    for (const fileName of files) {
      const json = readJson(path.join(root, fileName));
      for (const dataset of json.datasets ?? []) {
        const publicDataPk = String(dataset.publicDataPk ?? '').trim();
        if (!publicDataPk) continue;
        if (!byPk.has(publicDataPk) && Array.isArray(dataset.columns)) {
          byPk.set(publicDataPk, dataset.columns);
        }
      }
    }
  }

  return byPk;
}

function indexDownloadedFiles() {
  const byPk = new Map();
  if (!fs.existsSync(fileRoot)) return byPk;
  for (const entry of fs.readdirSync(fileRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(/^(\d+)-/);
    if (!match) continue;
    const fullPath = path.join(fileRoot, entry.name);
    const stat = fs.statSync(fullPath);
    byPk.set(match[1], {
      path: fullPath,
      name: entry.name,
      extension: path.extname(entry.name).replace('.', '').toUpperCase(),
      size: stat.size
    });
  }
  return byPk;
}

function resolveDatasetFile(dataset, db, fileIndex) {
  const direct = firstText(db.localFilePath, null);
  if (direct) {
    const fullPath = path.isAbsolute(direct) ? direct : path.resolve(repoRoot, direct);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      return { path: fullPath, name: path.basename(fullPath), extension: path.extname(fullPath).replace('.', '').toUpperCase(), size: stat.size };
    }
  }
  return fileIndex.get(dataset.publicDataPk) ?? null;
}

function inspectFile(filePath, columns) {
  const extension = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);
  const profile = {
    extension: extension.replace('.', '').toUpperCase(),
    size: stat.size,
    headers: [],
    sampleRows: [],
    rows: [],
    parseMode: 'metadata-only'
  };

  if (stat.size > maxFileBytesForRowScan) {
    profile.caution = 'file-too-large-for-row-scan';
    return profile;
  }

  if (extension === '.csv') {
    const text = decodeText(fs.readFileSync(filePath));
    const rows = parseCsvRows(text, maxRowsPerDataset + 1);
    profile.parseMode = 'csv';
    profile.headers = normalizeHeaders(rows[0] ?? columns.map((column) => column.name).filter(Boolean));
    profile.rows = rows.slice(1, maxRowsPerDataset + 1).map((values) => rowObject(profile.headers, values));
    profile.sampleRows = profile.rows.slice(0, maxSampleRows);
    return profile;
  }

  if (extension === '.json') {
    try {
      const json = JSON.parse(decodeText(fs.readFileSync(filePath)));
      const rows = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : Array.isArray(json.items) ? json.items : [];
      profile.parseMode = 'json';
      profile.rows = rows.filter((row) => row && typeof row === 'object').slice(0, maxRowsPerDataset);
      profile.headers = unique(profile.rows.flatMap((row) => Object.keys(row))).slice(0, 80);
      profile.sampleRows = profile.rows.slice(0, maxSampleRows);
    } catch (error) {
      profile.caution = `json-parse-failed: ${getErrorMessage(error)}`;
    }
    return profile;
  }

  if (extension === '.xml') {
    const text = decodeText(fs.readFileSync(filePath));
    profile.parseMode = 'xml';
    profile.headers = unique([...text.matchAll(/<([A-Za-z가-힣_][\w가-힣.-]*)[>\s]/g)].map((match) => match[1])).slice(0, 80);
    profile.sampleRows = [{ preview: text.replace(/\s+/g, ' ').slice(0, 500) }];
    return profile;
  }

  return profile;
}

function buildSignals(dataset, db, columns, fileProfile) {
  const headers = fileProfile?.headers ?? [];
  const columnTexts = [...columns.flatMap((column) => [column.name, column.englishName, column.description]), ...headers].filter(Boolean);
  const searchText = [
    dataset.title,
    dataset.description,
    dataset.organization,
    ...(dataset.sourceKeywords ?? []),
    ...(dataset.keywords ?? []),
    db.title,
    db.description,
    db.organization,
    ...columnTexts
  ].filter(Boolean).join(' ');

  const capabilities = inferCapabilities(columnTexts, searchText);
  const categories = inferCategories(searchText);
  return { searchText, capabilities, categories };
}

function inferCapabilities(columnTexts, searchText) {
  const text = normalizeText([searchText, ...columnTexts].join(' '));
  const roles = columnTexts.map((value) => inferColumnRole(value)).filter(Boolean);
  return {
    hasName: roles.includes('name') || includesAny(text, ['명칭', '이름', '시설명', '관광지명', '업소명']),
    hasAddress: roles.includes('address') || includesAny(text, ['주소', '소재지', '위치']),
    hasProvinceCity: includesAny(text, ['시도', '시군구', '시군', '구군', '행정구역']),
    hasLegalDong: includesAny(text, ['법정동', '읍면동', '리명']),
    hasLatLon: roles.includes('latitude') || roles.includes('longitude') || includesAny(text, ['위도', '경도', '좌표', 'lat', 'lon', 'x좌표', 'y좌표']),
    hasPhone: includesAny(text, ['전화', '연락처', 'tel']),
    hasHours: includesAny(text, ['영업시간', '운영시간', '개방시간', '이용시간']),
    hasPrice: includesAny(text, ['요금', '가격', '비용', '입장료']),
    hasParking: includesAny(text, ['주차']),
    hasRestroom: includesAny(text, ['화장실']),
    hasShower: includesAny(text, ['샤워']),
    hasConvenience: includesAny(text, ['편의시설', '편의점', '안내소', '매점', '휴게소']),
    hasPet: includesAny(text, ['반려동물', '반려견', '애견']),
    hasAccessibility: includesAny(text, ['무장애', '장애인', '휠체어', '관광약자', '배리어프리'])
  };
}

function inferCategories(text) {
  const normalized = normalizeText(text);
  return CATEGORY_RULES
    .filter(([, words]) => includesAny(normalized, words))
    .map(([category]) => category);
}

function scoreStyles(text) {
  const normalized = normalizeText(text);
  const scores = {};
  for (const [style, words] of Object.entries(STYLE_RULES)) {
    scores[style] = Math.min(100, words.reduce((score, word) => score + (normalized.includes(normalizeText(word)) ? 18 : 0), 0));
  }
  return scores;
}

function matchDatasetToIslandAndRegion(text, context) {
  const normalized = normalizeText(text);
  let islandMatch = null;
  for (const { token, island } of context.islandTokens) {
    if (token.length < 2) continue;
    if (normalized.includes(normalizeText(token))) {
      const score = token === island.islandName ? 95 : 80;
      if (!islandMatch || score > islandMatch.score) {
        islandMatch = {
          id: island.id,
          islandName: island.islandName,
          legalDongName: island.legalDongName,
          travelRegionId: island.travelRegionId,
          travelRegionName: island.travelRegionName,
          matchType: token === island.islandName ? 'island_name' : 'legal_dong_name',
          score
        };
      }
    }
  }

  let regionMatch = null;
  for (const region of context.travelRegions) {
    const tokens = unique([region.name, region.group, ...(region.cityNames ?? []), ...(region.mainPortNames ?? []), ...(region.aliases ?? [])])
      .filter(Boolean)
      .filter((token) => normalizeText(token).length >= 3);
    let score = 0;
    const matchedTokens = [];
    for (const token of tokens) {
      if (normalized.includes(normalizeText(token))) {
        score += region.name === token ? 30 : 12;
        matchedTokens.push(token);
      }
    }
    if (score > 0 && (!regionMatch || score > regionMatch.score)) {
      regionMatch = { id: region.id, name: region.name, group: region.group, matchType: 'text_token', score: Math.min(score, 100), matchedTokens };
    }
  }

  if (!regionMatch && islandMatch?.travelRegionId) {
    regionMatch = {
      id: islandMatch.travelRegionId,
      name: islandMatch.travelRegionName,
      group: null,
      matchType: 'island_travel_region',
      score: 80,
      matchedTokens: [islandMatch.islandName]
    };
  }

  return { island: islandMatch, travelRegion: regionMatch };
}

function scoreUsability(signals, match, fileProfile, db) {
  let score = 0;
  const reasons = [];
  const cautions = [];
  const capabilities = signals.capabilities;

  if (fileProfile) {
    score += 10;
    reasons.push('downloaded-file-present');
  } else {
    cautions.push('downloaded-file-missing');
  }
  if (fileProfile?.parseMode === 'csv' || fileProfile?.parseMode === 'json') score += 8;
  if (capabilities.hasName) score += 8;
  if (capabilities.hasAddress) score += 12;
  if (capabilities.hasProvinceCity) score += 8;
  if (capabilities.hasLatLon) score += 14;
  if (capabilities.hasHours) score += 4;
  if (capabilities.hasPrice) score += 4;
  if (capabilities.hasParking || capabilities.hasRestroom || capabilities.hasAccessibility || capabilities.hasConvenience) score += 5;
  if (signals.categories.length) score += Math.min(18, signals.categories.length * 5);
  if (match.island) score += 15;
  if (match.travelRegion) score += 10;
  if (Number(db.suitabilityScore) >= 70) score += 8;
  if (String(db.downloadStatus ?? '') === 'DOWNLOADED') score += 5;

  if (!capabilities.hasAddress && !capabilities.hasLatLon && !match.travelRegion) cautions.push('location-link-is-weak');
  if (!signals.categories.length) cautions.push('travel-category-unclear');
  if (fileProfile?.parseMode === 'metadata-only') cautions.push('row-sample-not-parsed');

  const grade = score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D';
  return {
    score: Math.min(score, 100),
    grade,
    recommendationUse: grade === 'A' ? 'core' : grade === 'B' ? 'supporting' : grade === 'C' ? 'weak-signal' : 'metadata-only',
    reasons,
    cautions
  };
}

function buildAssetCandidates(dataset, db, file, fileProfile, signals, context, sourceLocationHint) {
  const headers = fileProfile.headers ?? [];
  const roles = mapHeaderRoles(headers);
  const candidates = [];
  const sourceTitle = firstText(db.title, dataset.title);
  const sourceDatasetPk = dataset.publicDataPk;

  for (let index = 0; index < fileProfile.rows.length; index += 1) {
    const row = fileProfile.rows[index];
    const extracted = extractAssetFields(row, roles);
    const rowText = normalizeText(Object.values(row).join(' '));
    const rowHasLocation = extracted.province || extracted.city || extracted.legalDongName || extracted.address;
    const rowLocationHint = rowHasLocation ? null : sourceLocationHint;
    const match = matchDatasetToIslandAndRegion(`${sourceTitle} ${Object.values(row).join(' ')} ${rowLocationHint?.searchText ?? ''}`, context);

    if (!extracted.name && !extracted.address && !match.island && !match.travelRegion) continue;

    const rowCategories = inferCategories(rowText);
    const tags = unique([...signals.categories, ...rowCategories, ...Object.entries(scoreStyles(rowText)).filter(([, score]) => score >= 18).map(([style]) => style)]);
    let matchScore = 20;
    if (extracted.address) matchScore += 20;
    if (extracted.latitude !== null && extracted.longitude !== null) matchScore += 20;
    if (match.island) matchScore += match.island.score >= 90 ? 25 : 18;
    if (match.travelRegion) matchScore += Math.min(20, Math.round(match.travelRegion.score / 5));
    if (tags.length) matchScore += Math.min(15, tags.length * 3);

    candidates.push({
      id: hash(`${sourceDatasetPk}:${index}:${extracted.name}:${extracted.address}`),
      sourceDatasetPk,
      sourceTitle,
      sourceFilePath: rel(file.path),
      sourceRowIndex: index + 1,
      name: extracted.name ?? sourceTitle,
      category: signals.categories[0] ?? rowCategories[0] ?? null,
      province: extracted.province ?? rowLocationHint?.province ?? null,
      city: extracted.city ?? rowLocationHint?.city ?? null,
      legalDongName: extracted.legalDongName,
      address: extracted.address ?? rowLocationHint?.address ?? null,
      latitude: extracted.latitude,
      longitude: extracted.longitude,
      matchedIslandId: match.island?.id ?? null,
      matchedIslandName: match.island?.islandName ?? null,
      travelRegionId: match.travelRegion?.id ?? match.island?.travelRegionId ?? rowLocationHint?.travelRegionId ?? null,
      travelRegionName: match.travelRegion?.name ?? match.island?.travelRegionName ?? rowLocationHint?.travelRegionName ?? null,
      matchType: match.island?.matchType ?? match.travelRegion?.matchType ?? rowLocationHint?.matchType ?? 'row_signal',
      matchScore: Math.min(matchScore, 100),
      tags,
      evidence: {
        matchedTokens: match.travelRegion?.matchedTokens ?? [],
        sourceKeywords: dataset.sourceKeywords,
        sourceLocationHint: rowLocationHint,
        sourceCategory: extracted.category,
        fieldsUsed: Object.fromEntries(Object.entries(roles).filter(([, value]) => value !== null))
      }
    });
  }

  return candidates;
}

function findSourceLocationHint(dataset, db, file, context) {
  const text = [
    dataset.title,
    dataset.organization,
    db.title,
    db.organization,
    db.originalFileName,
    file?.name,
    file?.path ? path.basename(file.path) : null
  ].filter(Boolean).join(' ');
  const normalized = normalizeText(text);
  if (!normalized) return null;

  let best = null;
  for (const row of context.addressRegions ?? []) {
    const province = cleanValue(row.sido);
    const city = cleanValue(row.sigungu);
    const travelRegionId = cleanValue(row.travelRegionId);
    const travelRegionName = cleanValue(row.travelRegionName);
    if (!city || !travelRegionId) continue;

    const provinceMatched = province ? normalized.includes(normalizeText(province)) : false;
    const cityMatched = normalized.includes(normalizeText(city));
    const pairMatched = province && city ? normalized.includes(normalizeText(`${province}${city}`)) : false;
    if (!cityMatched && !pairMatched) continue;

    const score = (pairMatched ? 75 : 0) + (cityMatched ? 55 : 0) + (provinceMatched ? 25 : 0) + Math.min(Number(row.count ?? 0), 20);
    if (!best || score > best.score) {
      best = {
        province,
        city,
        address: [province, city].filter(Boolean).join(' ') || null,
        travelRegionId,
        travelRegionName,
        matchType: 'source_file_admin_area',
        score,
        evidenceText: text.slice(0, 300)
      };
    }
  }

  if (!best) return null;
  return {
    province: best.province,
    city: best.city,
    address: best.address,
    travelRegionId: best.travelRegionId,
    travelRegionName: best.travelRegionName,
    matchType: best.matchType,
    score: Math.min(best.score, 100),
    searchText: [best.province, best.city, best.travelRegionName].filter(Boolean).join(' '),
    evidenceText: best.evidenceText
  };
}

function mapHeaderRoles(headers) {
  const roles = {
    name: findHeader(headers, ['명칭', '이름', '시설명', '관광지명', '업소명', '상호', '콘텐츠명', '장소명', '코스명', 'title', 'name']),
    category: findHeader(headers, ['분류', '구분', '유형', '카테고리', '업종', 'type', 'category']),
    province: findHeader(headers, ['시도', '광역시도', '도명', 'sido', 'province']),
    city: findHeader(headers, ['시군구', '시군', '구군', '군구', 'sigungu', 'city']),
    legalDongName: findHeader(headers, ['법정동', '읍면동', '동명', '리명']),
    address: findHeader(headers, ['주소', '소재지', '도로명주소', '지번주소', 'addr', 'address', '위치']),
    latitude: findHeader(headers, ['위도', 'latitude', 'lat', 'y좌표', 'y']),
    longitude: findHeader(headers, ['경도', 'longitude', 'lon', 'lng', 'x좌표', 'x'])
  };
  return roles;
}

function extractAssetFields(row, roles) {
  const get = (role) => roles[role] ? cleanValue(row[roles[role]]) : null;
  return {
    name: get('name'),
    category: get('category'),
    province: get('province'),
    city: get('city'),
    legalDongName: get('legalDongName'),
    address: get('address'),
    latitude: toCoordinate(get('latitude'), -90, 90),
    longitude: toCoordinate(get('longitude'), -180, 180)
  };
}

function inferColumnRole(...values) {
  const text = normalizeText(values.filter(Boolean).join(' '));
  if (includesAny(text, ['위도', 'latitude', 'lat'])) return 'latitude';
  if (includesAny(text, ['경도', 'longitude', 'lng', 'lon'])) return 'longitude';
  if (includesAny(text, ['주소', '소재지', 'address', 'addr'])) return 'address';
  if (includesAny(text, ['시설명', '관광지명', '업소명', '상호', '콘텐츠명', '장소명', '코스명', '명칭', '이름', 'title', 'name'])) return 'name';
  if (includesAny(text, ['전화', '연락처', 'tel'])) return 'phone';
  if (includesAny(text, ['영업시간', '운영시간', '이용시간'])) return 'hours';
  if (includesAny(text, ['요금', '가격', '입장료'])) return 'price';
  return null;
}

function buildSummary(inventory, candidates, context) {
  return {
    datasetCount: inventory.length,
    coreSourceCount: inventory.filter((item) => item.recommendationUse === 'core').length,
    supportingSourceCount: inventory.filter((item) => item.recommendationUse === 'supporting').length,
    assetCandidateCount: candidates.length,
    islandMatchedCandidateCount: candidates.filter((item) => item.matchedIslandId).length,
    regionMatchedCandidateCount: candidates.filter((item) => item.travelRegionId).length,
    dbIslandCount: context.islands.length,
    dbTravelRegionCount: context.travelRegions.length,
    categoryCounts: countBy(inventory.flatMap((item) => item.categories)),
    capabilityCounts: countCapabilities(inventory),
    topSources: inventory.slice(0, 30).map((item) => ({
      publicDataPk: item.publicDataPk,
      title: item.title,
      score: item.usabilityScore,
      use: item.recommendationUse,
      categories: item.categories,
      capabilities: item.capabilities
    }))
  };
}

function findHeader(headers, needles) {
  const normalizedNeedles = needles.map(normalizeText);
  return headers.find((header) => normalizedNeedles.some((needle) => normalizeText(header).includes(needle))) ?? null;
}

function parseCsvRows(text, limit) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row.map(cleanValue));
      if (rows.length >= limit) break;
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (rows.length < limit && (cell || row.length)) {
    row.push(cell);
    rows.push(row.map(cleanValue));
  }
  return rows.filter((cells) => cells.some(Boolean));
}

function rowObject(headers, values) {
  const result = {};
  headers.forEach((header, index) => {
    result[header || `column_${index + 1}`] = cleanValue(values[index]);
  });
  return result;
}

function normalizeHeaders(headers) {
  return headers.map((header, index) => cleanValue(header) || `column_${index + 1}`);
}

function decodeText(buffer) {
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function cleanValue(value) {
  const text = String(value ?? '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
  return text || null;
}

function toCoordinate(value, min, max) {
  if (!value) return null;
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function firstText(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim()) ?? null;
}

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '');
}

function includesAny(text, words) {
  const normalized = normalizeText(text);
  return words.some((word) => normalized.includes(normalizeText(word)));
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim()))];
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function countCapabilities(inventory) {
  const counts = {};
  for (const item of inventory) {
    for (const [key, enabled] of Object.entries(item.capabilities ?? {})) {
      if (enabled) counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

function hash(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(fileName, data) {
  fs.writeFileSync(path.join(analysisRoot, fileName), JSON.stringify(data, null, 2), 'utf8');
}

function now() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
