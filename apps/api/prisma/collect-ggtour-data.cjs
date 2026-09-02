const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();
const args = parseArgs(process.argv.slice(2));
const baseUrl = String(process.env.GGTOUR_API_BASE_URL || 'https://ggtour.or.kr/ggapi-svc/api/v1').replace(/\/$/, '');
const apiKey = process.env.GGTOUR_API_KEY;
const selectedPath = args.path || process.env.GGTOUR_API_PATH || null;
const pages = args.pages === 'all' ? 'all' : Number(args.pages || 1);
const pageSize = Number(args['page-size'] || 100);
const limit = args.limit ? Number(args.limit) : null;
const delayMs = Number(args['delay-ms'] || 120);
const dryRun = args['dry-run'] === true;
const discoverOnly = args.discover === true;

async function main() {
  if (!apiKey) throw new Error('GGTOUR_API_KEY is required. Add it to .env or the server environment.');

  const spec = await fetchJson('/v3/api-docs');
  const candidates = selectedPath ? [{ path: selectedPath, method: 'get', parameters: [] }] : discoverGetPaths(spec);

  if (discoverOnly) {
    console.log(JSON.stringify({ baseUrl, candidates: candidates.slice(0, 40) }, null, 2));
    return;
  }

  const collected = [];
  const warnings = [];
  for (const candidate of candidates) {
    const pathRecords = await collectPath(candidate, warnings);
    collected.push(...pathRecords);
    if (limit && collected.length >= limit) break;
    if (selectedPath) break;
  }

  const rows = uniqueById(collected.map(normalizeContent).filter((row) => row.title));
  const relevantRows = rows.filter(isRelevantToGyeonggiSea);
  const context = await loadMatchingContext();
  const assetRows = relevantRows.map((row) => toTravelAsset(row, context)).filter(Boolean);
  const matchRows = assetRows.flatMap((asset) => toMatchRows(asset));

  const summary = {
    fetched: collected.length,
    normalized: rows.length,
    relevantToSeaLoad: relevantRows.length,
    travelAssets: assetRows.length,
    matches: matchRows.length,
    paths: candidates.map((candidate) => candidate.path).slice(0, 20),
    dryRun,
    warnings
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await upsertGgTourRows(rows);
  await upsertTravelDataSource();
  await upsertTravelAssets(assetRows);
  await upsertTravelAssetMatches(matchRows);

  console.log(JSON.stringify(summary, null, 2));
}

async function collectPath(candidate, warnings) {
  const records = [];
  const maxPages = pages === 'all' ? 1000 : pages;
  for (let page = 1; page <= maxPages; page += 1) {
    const params = buildParams(candidate, page);
    let response;
    try {
      response = await fetchJson(candidate.path, params);
    } catch (error) {
      warnings.push(`${candidate.path}: ${error.message}`);
      break;
    }

    const items = extractItems(response);
    if (items.length === 0) break;
    items.forEach((item, index) => records.push({ ...item, __sourcePath: candidate.path, __page: page, __index: index }));
    if (limit && records.length >= limit) break;
    if (items.length < Math.min(pageSize, 20)) break;
    if (page < maxPages) await sleep(delayMs);
  }
  return limit ? records.slice(0, limit) : records;
}

function discoverGetPaths(spec) {
  const paths = spec && typeof spec === 'object' ? spec.paths || {} : {};
  return Object.entries(paths)
    .flatMap(([apiPath, operations]) => Object.entries(operations || {}).map(([method, operation]) => ({ apiPath, method, operation })))
    .filter((entry) => String(entry.method).toLowerCase() === 'get')
    .map((entry) => ({
      path: entry.apiPath,
      method: 'get',
      summary: entry.operation?.summary || entry.operation?.description || '',
      parameters: entry.operation?.parameters || []
    }))
    .filter((entry) => !entry.parameters.some((param) => param.in === 'path' && param.required))
    .filter((entry) => !entry.parameters.some((param) => param.in === 'query' && param.required && !isKnownQueryParam(param.name)))
    .map((entry) => ({ ...entry, score: scorePath(entry.path, entry.summary) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}

function scorePath(apiPath, summary) {
  const text = `${apiPath} ${summary}`.toLowerCase();
  let score = 0;
  if (/tour|travel|content|place|festival|event|course|restaurant|stay|lodg|camp|attraction/.test(text)) score += 10;
  if (/관광|여행|축제|행사|숙박|음식|맛집|코스|체험|명소|콘텐츠/.test(text)) score += 12;
  if (/code|auth|login|user|key|swagger|api-docs/.test(text)) score -= 20;
  return score;
}

function isKnownQueryParam(name) {
  return /^(page|pageNo|pageIndex|currentPage|size|pageSize|perPage|numOfRows|limit|keyword|q|search|searchKeyword|sigungu|sigunguCode|area|areaCode|lang|type|format)$/i.test(String(name));
}

function buildParams(candidate, page) {
  const params = {};
  const names = new Set((candidate.parameters || []).filter((param) => param.in === 'query').map((param) => param.name));
  const addIfKnown = (patterns, value) => {
    for (const name of names) {
      if (patterns.some((pattern) => pattern.test(name))) params[name] = value;
    }
  };

  addIfKnown([/^page$/i, /^pageNo$/i, /^pageIndex$/i, /^currentPage$/i], page);
  addIfKnown([/^size$/i, /^pageSize$/i, /^perPage$/i, /^numOfRows$/i, /^limit$/i], pageSize);
  if (args.keyword) addIfKnown([/keyword/i, /^q$/i, /search/i], args.keyword);
  if (args.sigungu) addIfKnown([/sigungu/i], args.sigungu);
  if (names.has('type')) params.type = 'json';
  if (names.has('format')) params.format = 'json';

  if (Object.keys(params).length === 0) {
    params.page = page;
    params.size = pageSize;
    if (args.keyword) params.keyword = args.keyword;
  }
  return params;
}

async function fetchJson(apiPath, params = {}) {
  const url = new URL(`${baseUrl}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers: { 'GGTOUR-API-KEY': apiKey }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function normalizeContent(item) {
  const raw = stripInternal(item);
  const title = pick(item, ['title', 'name', 'contentTitle', 'contentName', 'touristSpotName', 'placeName', 'facltNm', '업소명', '관광지명', '명칭', '제목']);
  const address = pick(item, ['address', 'addr', 'addr1', 'roadAddress', 'jibunAddress', 'refineRoadnmAddr', 'refineLotnoAddr', '소재지', '주소', '도로명주소']);
  const category = pick(item, ['category', 'catName', 'contentType', 'contentTypeName', 'themeName', 'type', '분류', '콘텐츠유형']);
  const contentId = pick(item, ['contentId', 'contentsId', 'id', 'seq', 'idx', '관광지ID', '콘텐츠ID']);
  const sigunguName = pick(item, ['sigunguName', 'sigungu', 'cityName', 'signguNm', 'areaName', '시군명', '시군구']);
  const lat = pickNumber(item, ['latitude', 'lat', 'mapY', 'y', 'refineWgs84Lat', '위도']);
  const lng = pickNumber(item, ['longitude', 'lng', 'lon', 'mapX', 'x', 'refineWgs84Logt', '경도']);
  return {
    id: hash(['ggtour', contentId, title, address].filter(Boolean).join(':')),
    contentId,
    title: title || '',
    category,
    sigunguName: sigunguName || inferSigungu(address),
    address,
    latitude: lat,
    longitude: lng,
    tel: pick(item, ['tel', 'telephone', 'phone', 'contact', '문의처', '전화번호']),
    homepageUrl: pick(item, ['homepage', 'homepageUrl', 'url', 'website', '홈페이지']),
    imageUrl: pick(item, ['imageUrl', 'firstImage', 'firstimage', 'thumbnailUrl', 'imgUrl', 'mainImage', '이미지URL']),
    summary: pick(item, ['summary', 'subtitle', 'overview', 'intro', 'description', '소개', '개요', '요약']),
    description: pick(item, ['description', 'content', 'contents', 'detail', 'body', '상세내용', '내용']),
    sourceUrl: pick(item, ['sourceUrl', 'detailUrl', 'url', 'homepageUrl']),
    raw
  };
}

function isRelevantToGyeonggiSea(row) {
  const text = normalize(`${row.title} ${row.category || ''} ${row.sigunguName || ''} ${row.address || ''} ${row.summary || ''}`);
  return /(안산|화성|시흥|평택|김포|대부|제부|풍도|육도|국화|전곡|탄도|방아머리|시화|오이도|궁평|전곡항|탄도항|대부해솔|제부항|누에섬|입파|도리도)/.test(text);
}

async function loadMatchingContext() {
  const islands = await prisma.$queryRawUnsafe(`
    SELECT id, island_name, province_name, city_name, address, latitude, longitude, travel_region_id, travel_region_name
    FROM island_master
    WHERE province_name = '경기도'
       OR city_name IN ('안산시', '화성시', '시흥시', '평택시', '김포시')
       OR island_name IN ('대부도', '제부도', '풍도', '육도', '국화도', '입파도', '도리도')
  `);
  const regions = await prisma.$queryRawUnsafe(`
    SELECT id, region_name
    FROM island_travel_region
    WHERE region_name ILIKE '%경기%' OR region_name ILIKE '%수도%' OR region_name ILIKE '%서해%'
    ORDER BY CASE WHEN region_name ILIKE '%경기%' THEN 0 WHEN region_name ILIKE '%수도%' THEN 1 ELSE 2 END
    LIMIT 3
  `);
  return { islands, defaultRegion: regions[0] || null };
}

function toTravelAsset(row, context) {
  const island = findMatchedIsland(row, context.islands || []);
  const regionId = island?.travel_region_id || context.defaultRegion?.id || null;
  const regionName = island?.travel_region_name || context.defaultRegion?.region_name || null;
  return {
    id: `ggtour-${row.id}`,
    sourceDatasetPk: 'GGTOUR_OPEN_API',
    sourceTitle: '경기관광 OPEN API',
    sourceFilePath: null,
    sourceRowIndex: null,
    name: row.title,
    category: inferCategory(row),
    province: '경기도',
    city: row.sigunguName,
    legalDongName: null,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    matchedIslandId: island?.id || null,
    matchedIslandName: island?.island_name || null,
    travelRegionId: regionId,
    travelRegionName: regionName,
    matchType: island ? 'ggtour_island_keyword' : 'ggtour_gyeonggi_coastal',
    matchScore: island ? 85 : 65,
    tags: inferTags(row),
    evidence: { source: 'GGTOUR_OPEN_API', contentId: row.contentId, sigunguName: row.sigunguName, sourceUrl: row.sourceUrl }
  };
}

function findMatchedIsland(row, islands) {
  const text = normalize(`${row.title} ${row.address || ''} ${row.summary || ''} ${row.description || ''}`);
  const direct = islands.find((island) => {
    const name = normalize(island.island_name || '');
    const stem = name.replace(/[도섬]$/, '');
    return name && (text.includes(name) || (stem.length >= 2 && text.includes(stem)));
  });
  if (direct) return direct;

  if (row.latitude && row.longitude) {
    return islands
      .filter((island) => island.latitude && island.longitude)
      .map((island) => ({ island, km: distanceKm(row.latitude, row.longitude, island.latitude, island.longitude) }))
      .filter((entry) => entry.km <= 12)
      .sort((a, b) => a.km - b.km)[0]?.island || null;
  }
  return null;
}

async function upsertGgTourRows(rows) {
  const columns = [
    ['id', 'id'], ['contentId', 'content_id'], ['title', 'title'], ['category', 'category'], ['sigunguName', 'sigungu_name'],
    ['address', 'address'], ['latitude', 'latitude'], ['longitude', 'longitude'], ['tel', 'tel'], ['homepageUrl', 'homepage_url'],
    ['imageUrl', 'image_url'], ['summary', 'summary'], ['description', 'description'], ['sourceUrl', 'source_url'], ['raw', 'raw', '::jsonb']
  ];
  await insertRows('ggtour_content', columns, rows);
}

async function upsertTravelDataSource() {
  await prisma.$executeRawUnsafe(`
    INSERT INTO travel_data_source (public_data_pk, title, organization, source_keywords, formats, local_file_path, column_count, sample_headers, capabilities, categories, style_scores, usability_score, usability_grade, recommendation_use, reasons, cautions, raw_inventory, created_at, updated_at)
    VALUES ($1, $2, $3, $4::text[], $5::text[], $6, $7, $8::text[], $9::jsonb, $10::text[], $11::jsonb, $12, $13, $14, $15::text[], $16::text[], $17::jsonb, now(), now())
    ON CONFLICT (public_data_pk) DO UPDATE SET
      title = EXCLUDED.title,
      organization = EXCLUDED.organization,
      source_keywords = EXCLUDED.source_keywords,
      categories = EXCLUDED.categories,
      capabilities = EXCLUDED.capabilities,
      style_scores = EXCLUDED.style_scores,
      usability_score = EXCLUDED.usability_score,
      usability_grade = EXCLUDED.usability_grade,
      recommendation_use = EXCLUDED.recommendation_use,
      raw_inventory = EXCLUDED.raw_inventory,
      updated_at = now()
  `, 'GGTOUR_OPEN_API', '경기관광 OPEN API', '경기관광공사', ['경기관광', '경기도', '관광', '여행', '축제', '체험'], ['JSON'], null, 0, [], JSON.stringify({ api: true, address: true, coordinates: true, photos: true }), ['attraction', 'festival', 'experience', 'food', 'course'], JSON.stringify({ family: 12, couple: 10, friends: 12, photo: 10, healing: 8, dayTrip: 14 }), 85, 'A', 'core', ['경기도 서해권 섬 주변 관광지와 코스 추천에 활용'], [], JSON.stringify({ baseUrl }));
}

async function upsertTravelAssets(rows) {
  const columns = [
    ['id', 'id'], ['sourceDatasetPk', 'source_dataset_pk'], ['sourceTitle', 'source_title'], ['sourceFilePath', 'source_file_path'], ['sourceRowIndex', 'source_row_index'],
    ['name', 'name'], ['category', 'category'], ['province', 'province'], ['city', 'city'], ['legalDongName', 'legal_dong_name'], ['address', 'address'],
    ['latitude', 'latitude'], ['longitude', 'longitude'], ['matchedIslandId', 'matched_island_id'], ['matchedIslandName', 'matched_island_name'],
    ['travelRegionId', 'travel_region_id'], ['travelRegionName', 'travel_region_name'], ['matchType', 'match_type'], ['matchScore', 'match_score'], ['tags', 'tags'], ['evidence', 'evidence', '::jsonb']
  ];
  await insertRows('travel_asset', columns, rows);
}

async function upsertTravelAssetMatches(rows) {
  const columns = [
    ['id', 'id'], ['travelAssetId', 'travel_asset_id'], ['targetType', 'target_type'], ['targetId', 'target_id'], ['targetName', 'target_name'],
    ['matchType', 'match_type'], ['matchScore', 'match_score'], ['evidence', 'evidence', '::jsonb']
  ];
  await insertRows('travel_asset_match', columns, rows);
}

async function insertRows(table, columns, rows) {
  if (rows.length === 0) return;
  for (let start = 0; start < rows.length; start += 200) {
    const chunk = rows.slice(start, start + 200);
    const values = [];
    const params = [];
    chunk.forEach((row) => {
      const placeholders = columns.map(([prop, , cast]) => {
        params.push(serializeValue(row[prop], cast));
        return `$${params.length}${cast || ''}`;
      });
      values.push(`(${placeholders.join(', ')}, now(), now())`);
    });
    const insertColumns = [...columns.map(([, column]) => `"${column}"`), '"created_at"', '"updated_at"'];
    const updateColumns = columns.map(([, column]) => column).filter((column) => column !== 'id').map((column) => `"${column}" = EXCLUDED."${column}"`);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${table}" (${insertColumns.join(', ')})
      VALUES ${values.join(', ')}
      ON CONFLICT ("id") DO UPDATE SET ${[...updateColumns, '"updated_at" = now()'].join(', ')}
    `, ...params);
  }
}

function toMatchRows(asset) {
  const rows = [];
  if (asset.travelRegionId) rows.push({ id: hash(`${asset.id}:travel_region:${asset.travelRegionId}`), travelAssetId: asset.id, targetType: 'travel_region', targetId: asset.travelRegionId, targetName: asset.travelRegionName, matchType: asset.matchType, matchScore: asset.matchScore, evidence: asset.evidence });
  if (asset.matchedIslandId) rows.push({ id: hash(`${asset.id}:island:${asset.matchedIslandId}`), travelAssetId: asset.id, targetType: 'island', targetId: asset.matchedIslandId, targetName: asset.matchedIslandName, matchType: asset.matchType, matchScore: asset.matchScore, evidence: asset.evidence });
  return rows;
}

function extractItems(value) {
  if (Array.isArray(value)) return value.flatMap((item) => item && typeof item === 'object' ? [item] : []);
  if (!value || typeof value !== 'object') return [];
  for (const key of ['items', 'item', 'list', 'data', 'content', 'contents', 'rows', 'result']) {
    const items = extractItems(value[key]);
    if (items.length > 0) return items;
  }
  if (Object.values(value).some(Array.isArray)) {
    return Object.values(value).flatMap(extractItems);
  }
  return [];
}

function inferCategory(row) {
  const text = normalize(`${row.title} ${row.category || ''} ${row.summary || ''}`);
  if (/(맛집|음식|식당|카페|해산물|수산시장)/.test(text)) return 'food';
  if (/(숙박|호텔|모텔|펜션|민박)/.test(text)) return 'accommodation';
  if (/(축제|공연|행사)/.test(text)) return 'festival';
  if (/(걷기|산책|둘레길|올레길|트레킹|탐방로|해안길)/.test(text)) return 'course';
  if (/(낚시|서핑|카약|요트|마리나|수상레저|스노클링|체험|해루질)/.test(text)) return 'activity';
  if (/(노을|일몰|일출|전망대|등대|포토존|사진)/.test(text)) return 'viewpoint';
  if (/(해변|해수욕|바다|해안|갯벌)/.test(text)) return 'beach';
  if (/(공원)/.test(text)) return 'park';
  return 'attraction';
}

function inferTags(row) {
  const text = normalize(`${row.title} ${row.category || ''} ${row.summary || ''} ${row.description || ''}`);
  const tags = ['경기관광'];
  const rules = [
    ['맛집', /맛집|음식|식당|카페|해산물|수산시장/], ['숙박', /숙박|호텔|모텔|펜션|민박/], ['축제', /축제|공연|행사/],
    ['걷기', /걷기|산책|둘레길|올레길|트레킹|탐방로|해안길/], ['액티비티', /낚시|서핑|카약|요트|마리나|수상레저|스노클링|체험|해루질/],
    ['사진', /노을|일몰|일출|전망대|등대|포토존|사진/], ['해변', /해변|해수욕|바다|해안|갯벌/], ['공원', /공원/]
  ];
  rules.forEach(([tag, pattern]) => { if (pattern.test(text)) tags.push(tag); });
  return [...new Set(tags)];
}

function pick(item, keys) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickNumber(item, keys) {
  const value = pick(item, keys);
  if (!value) return null;
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : null;
}

function inferSigungu(address) {
  const match = String(address || '').match(/경기도\s+([^\s]+[시군구])/);
  return match ? match[1] : null;
}

function normalize(value) { return String(value || '').replace(/\s+/g, ''); }
function stripInternal(item) { return Object.fromEntries(Object.entries(item).filter(([key]) => !key.startsWith('__'))); }
function hash(value) { return crypto.createHash('sha1').update(String(value)).digest('hex'); }
function uniqueById(rows) { return [...new Map(rows.map((row) => [row.id, row])).values()]; }
function serializeValue(value, cast) {
  if (value === undefined || value === null) return null;
  if (cast === '::jsonb') return JSON.stringify(value);
  return value;
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--' || !arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) parsed[key] = true;
    else { parsed[key] = next; index += 1; }
  }
  return parsed;
}
function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
