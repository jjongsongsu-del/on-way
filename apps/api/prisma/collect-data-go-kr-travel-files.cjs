const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));

const prisma = new PrismaClient();
const repoRoot = path.resolve(__dirname, '../../..');
const dataRoot = path.resolve(repoRoot, 'ref_data/여행추천/data-go-kr');
const pageRoot = path.join(dataRoot, 'pages');
const detailRoot = path.join(dataRoot, 'details');
const fileRoot = path.join(dataRoot, 'files');
const catalogPath = path.join(dataRoot, 'catalog.json');
const BASE_URL = 'https://www.data.go.kr';
const PER_PAGE = 40;
const DEFAULT_DELAY_MS = 250;

const args = parseArgs(process.argv.slice(2));
const showSummary = args.summary === true;
const shouldDownload = args.download === true;
const keyword = String(args.keyword ?? '여행').trim() || '여행';
const keywordSlug = slugKeyword(keyword);
const startPage = Number(args['start-page'] ?? 1);
const maxPagesArg = args.pages === 'all' || args.pages === undefined ? null : Number(args.pages);
const limit = args.limit ? Number(args.limit) : null;
const delayMs = args['delay-ms'] ? Number(args['delay-ms']) : DEFAULT_DELAY_MS;
const pageRootForKeyword = path.join(pageRoot, keywordSlug);
const catalogPathForKeyword = path.join(dataRoot, `catalog-${keywordSlug}.json`);

async function main() {
  if (showSummary) {
    await printSummary();
    return;
  }

  ensureDir(pageRoot);
  ensureDir(pageRootForKeyword);
  ensureDir(detailRoot);
  ensureDir(fileRoot);

  const firstPage = await fetchSearchPage(startPage);
  const totalCount = getTotalCount(firstPage.html) ?? 0;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PER_PAGE) : 1;
  const pagesToRead = maxPagesArg ? Math.min(maxPagesArg, totalPages - startPage + 1) : totalPages - startPage + 1;
  const datasets = [];
  const firstEntries = parseSearchPage(firstPage.html);

  console.log(`Keyword "${keyword}": found ${totalCount || 'unknown'} file datasets. Reading ${pagesToRead} page(s) from page ${startPage}.`);
  await processEntries(firstEntries, datasets);

  for (let page = startPage + 1; page < startPage + pagesToRead; page += 1) {
    if (limit && datasets.length >= limit) break;
    await wait(delayMs);
    const { html } = await fetchSearchPage(page);
    await processEntries(parseSearchPage(html), datasets);
    console.log(`Page ${page}/${startPage + pagesToRead - 1}: ${datasets.length} collected.`);
  }

  const catalog = { keyword, totalCount, collectedCount: datasets.length, generatedAt: new Date().toISOString(), datasets };
  fs.writeFileSync(catalogPathForKeyword, stringifyJson(catalog), 'utf8');
  if (keyword === '여행') {
    fs.writeFileSync(catalogPath, stringifyJson(catalog), 'utf8');
  }
  console.log(`Saved catalog: ${catalogPathForKeyword}`);
}

async function printSummary() {
  const total = await prisma.publicDataFileDataset.count();
  const byStatus = await prisma.publicDataFileDataset.groupBy({
    by: ['downloadStatus'],
    _count: { _all: true },
    orderBy: { downloadStatus: 'asc' }
  });
  const byExtension = await prisma.publicDataFileDataset.groupBy({
    by: ['fileExtension'],
    _count: { _all: true },
    orderBy: { _count: { fileExtension: 'desc' } },
    take: 10
  });
  const highSuitability = await prisma.publicDataFileDataset.findMany({
    where: { suitabilityScore: { gte: 70 } },
    orderBy: [{ suitabilityScore: 'desc' }, { title: 'asc' }],
    take: 20,
    select: {
      publicDataPk: true,
      title: true,
      organization: true,
      fileExtension: true,
      suitabilityScore: true,
      islandRelevance: true
    }
  });

  console.log(JSON.stringify({ total, byStatus, byExtension, highSuitability }, null, 2));
}

async function processEntries(entries, datasets) {
  for (const entry of entries) {
    if (limit && datasets.length >= limit) break;
    try {
      await wait(delayMs);
      const detail = await fetchDatasetDetail(entry.publicDataPk);
      await wait(delayMs);
      const downloadMeta = detail.publicDataDetailPk ? await fetchDownloadMeta(entry.publicDataPk, detail.publicDataDetailPk) : null;
      const dataset = buildDataset(entry, detail, downloadMeta);
      if (shouldDownload && dataset.atchFileId && dataset.fileDetailSn) {
        const skipped = await hydrateExistingDownload(dataset);
        if (!skipped) {
          await wait(delayMs);
          await downloadDatasetFile(dataset);
        }
      }
      await upsertDataset(dataset);
      datasets.push(dataset);
      console.log(`${datasets.length}. ${dataset.publicDataPk} ${dataset.title} [${dataset.fileExtension ?? 'unknown'}] score=${dataset.suitabilityScore}`);
    } catch (error) {
      const failed = {
        ...entry,
        detailUrl: `${BASE_URL}${entry.detailUrl}`,
        downloadStatus: 'FAILED',
        rawMetadata: { error: getErrorMessage(error) }
      };
      await upsertDataset(failed);
      datasets.push(failed);
      console.error(`Failed ${entry.publicDataPk}: ${getErrorMessage(error)}`);
    }
  }
}

async function fetchSearchPage(page) {
  const url = new URL('/tcs/dss/selectDataSetList.do', BASE_URL);
  url.searchParams.set('dType', 'FILE');
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('currentPage', String(page));
  url.searchParams.set('perPage', String(PER_PAGE));
  url.searchParams.set('brm', '문화관광');
  url.searchParams.set('svcType', '다운로드');
  url.searchParams.set('extsn', 'CSV,XLS,XLSX,JSON');
  url.searchParams.set('pblonsipScopeCode', 'PBDE07');

  const html = await requestText(url);
  fs.writeFileSync(path.join(pageRootForKeyword, `search-page-${page}.html`), html, 'utf8');
  return { html, url: url.toString() };
}

async function fetchDatasetDetail(publicDataPk) {
  const detailUrl = `/data/${publicDataPk}/fileData.do`;
  const html = await requestText(new URL(detailUrl, BASE_URL));
  fs.writeFileSync(path.join(detailRoot, `${publicDataPk}.html`), html, 'utf8');
  const detailPkMatch = html.match(/fileDetailObj\.fn_fileDataDown\('\d+',\s*'([^']+)'/);
  const contentUrlMatch = html.match(/"contentUrl"\s*:\s*"([^"]+)"/);
  const licenseMatch = html.match(/"license"\s*:\s*"([^"]+)"/);

  return {
    detailUrl,
    html,
    publicDataDetailPk: detailPkMatch?.[1] ?? null,
    directContentUrl: contentUrlMatch?.[1]?.replace(/&amp;/g, '&') ?? null,
    jsonLdLicense: licenseMatch?.[1] ? stripHtml(licenseMatch[1]) : null
  };
}

async function fetchDownloadMeta(publicDataPk, publicDataDetailPk) {
  const url = new URL('/tcs/dss/selectFileDataDownload.do', BASE_URL);
  url.searchParams.set('recommendDataYn', 'Y');
  url.searchParams.set('publicDataPk', publicDataPk);
  url.searchParams.set('publicDataDetailPk', publicDataDetailPk);
  const text = await requestText(url);
  return JSON.parse(text);
}

function parseSearchPage(html) {
  const blocks = html.split(/<li\b/i).slice(1);
  const entries = [];

  for (const block of blocks) {
    const pk = block.match(/href="\/data\/(\d+)\/fileData\.do"/)?.[1];
    if (!pk) continue;
    const detailUrl = `/data/${pk}/fileData.do`;
    const title = stripHtml(block.match(/<span class="title">([\s\S]*?)<\/span>/)?.[1] ?? '');
    const description = stripHtml(block.match(/<dd class="ellipsis publicDataDesc">([\s\S]*?)<\/dd>/)?.[1] ?? '');
    const info = parseInfoData(block);
    const formats = [...block.matchAll(/<span class="tagset\s+([^"]+)">([\s\S]*?)<\/span>/g)].map((match) => stripHtml(match[2])).filter(Boolean);
    const downloadAction = block.match(/onclick="([^"]*fn_fileDataDown[^"]+)"/)?.[1] ?? null;

    entries.push({
      publicDataPk: pk,
      title,
      description,
      organization: info['제공기관'] ?? null,
      category: getLabelText(block, 0),
      serviceType: '다운로드',
      formats,
      keywords: splitKeywords(info['키워드']),
      detailUrl,
      downloadAction,
      viewCount: toInteger(info['조회수']),
      downloadCount: toInteger(info['다운로드']),
      modifiedDate: toDate(info['수정일']),
      updateCycle: info['주기성 데이터'] ?? null
    });
  }

  return uniqueBy(entries, (entry) => entry.publicDataPk);
}

function parseInfoData(block) {
  const info = {};
  const matches = block.matchAll(/<span class="tit">([\s\S]*?)<\/span>\s*<span[^>]*class="?data"?[^>]*>([\s\S]*?)<\/span>/g);
  for (const match of matches) {
    const key = stripHtml(match[1]);
    const value = stripHtml(match[2]);
    if (key) info[key] = value;
  }
  const keywordMatch = block.match(/<span class="tit">키워드<\/span>([\s\S]*?)<\/p>/);
  if (keywordMatch) info['키워드'] = stripHtml(keywordMatch[1]);
  return info;
}

function buildDataset(entry, detail, downloadMeta) {
  const info = downloadMeta?.dataSetFileDetailInfo ?? {};
  const file = downloadMeta?.fileDataRegistVO ?? {};
  const raw = {
    searchKeyword: keyword,
    list: entry,
    dataSetFileDetailInfo: info,
    fileDataRegistVO: file,
    status: downloadMeta?.status ?? null
  };
  const downloadUrl = detail.directContentUrl ?? (downloadMeta?.atchFileId && downloadMeta?.fileDetailSn
    ? `${BASE_URL}/cmm/cmm/fileDownload.do?atchFileId=${encodeURIComponent(downloadMeta.atchFileId)}&fileDetailSn=${encodeURIComponent(downloadMeta.fileDetailSn)}&insertDataPrcus=N`
    : null);
  const title = stripHtml(info.publicDataSj ?? entry.title);
  const description = stripHtml(info.publicDataDc ?? entry.description);
  const keywords = splitKeywords(info.kwrd ?? entry.keywords.join(','));
  const formats = uniqueBy([...(entry.formats ?? []), file.atchFileExtsn, info.mediaTyNm].filter(Boolean).map((value) => String(value).toUpperCase()), (value) => value);
  const relevance = scoreDataset({ title, description, keywords, organization: info.insttNm ?? entry.organization });

  return {
    publicDataPk: entry.publicDataPk,
    publicDataDetailPk: detail.publicDataDetailPk,
    title,
    description,
    organization: stripHtml(info.insttNm ?? entry.organization ?? ''),
    category: stripHtml(info.brmCodeNm ?? entry.category ?? ''),
    serviceType: entry.serviceType,
    formats,
    keywords,
    license: stripHtml(info.license ?? detail.jsonLdLicense ?? ''),
    detailUrl: `${BASE_URL}${entry.detailUrl}`,
    downloadUrl,
    downloadAction: entry.downloadAction,
    atchFileId: downloadMeta?.atchFileId ?? file.atchFileId ?? null,
    fileDetailSn: downloadMeta?.fileDetailSn ?? file.fileDetailSn ?? null,
    originalFileName: file.orginlFileNm ?? null,
    fileExtension: file.atchFileExtsn ?? null,
    fileSizeText: file.atchFileCo ?? info.atchFileCo ?? null,
    viewCount: toInteger(info.inqireCo) ?? entry.viewCount ?? null,
    downloadCount: entry.downloadCount ?? null,
    modifiedDate: toDate(info.updtDt) ?? entry.modifiedDate ?? null,
    registeredAtSource: toDateTime(info.registDt),
    updatedAtSource: toDateTime(info.updtDt),
    nextUpdateDate: toDate(info.nextRegistPrarnde),
    updateCycle: info.dataRegistCycleNm ?? entry.updateCycle ?? null,
    suitabilityScore: relevance.score,
    islandRelevance: relevance.reason,
    downloadStatus: downloadUrl ? 'READY' : 'NO_FILE',
    rawMetadata: raw
  };
}

async function downloadDatasetFile(dataset) {
  const safeName = sanitizeFileName(dataset.originalFileName || `${dataset.publicDataPk}.${dataset.fileExtension || 'dat'}`);
  const target = path.join(fileRoot, `${dataset.publicDataPk}-${safeName}`);
  const bytes = await requestBuffer(new URL(dataset.downloadUrl));
  fs.writeFileSync(target, bytes);
  dataset.localFilePath = path.relative(repoRoot, target).replace(/\\/g, '/');
  dataset.fileSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  dataset.fileSizeBytes = BigInt(bytes.length);
  dataset.downloadedAt = new Date();
  dataset.downloadStatus = 'DOWNLOADED';
}

async function hydrateExistingDownload(dataset) {
  const existing = await prisma.publicDataFileDataset.findUnique({
    where: { publicDataPk: dataset.publicDataPk },
    select: {
      atchFileId: true,
      fileDetailSn: true,
      originalFileName: true,
      downloadStatus: true,
      localFilePath: true,
      fileSha256: true,
      fileSizeBytes: true,
      downloadedAt: true
    }
  });

  if (
    existing?.downloadStatus !== 'DOWNLOADED' ||
    !existing.localFilePath ||
    !existing.fileSha256 ||
    existing.atchFileId !== dataset.atchFileId ||
    existing.fileDetailSn !== dataset.fileDetailSn ||
    existing.originalFileName !== dataset.originalFileName
  ) {
    return false;
  }

  const absolutePath = path.resolve(repoRoot, existing.localFilePath);
  if (!fs.existsSync(absolutePath)) return false;

  dataset.localFilePath = existing.localFilePath;
  dataset.fileSha256 = existing.fileSha256;
  dataset.fileSizeBytes = existing.fileSizeBytes;
  dataset.downloadedAt = existing.downloadedAt;
  dataset.downloadStatus = 'DOWNLOADED';
  dataset.rawMetadata = {
    ...(dataset.rawMetadata ?? {}),
    downloadSkipped: true,
    downloadSkipReason: 'already-downloaded'
  };

  return true;
}

async function upsertDataset(dataset) {
  const data = {
    publicDataDetailPk: dataset.publicDataDetailPk ?? null,
    title: dataset.title || dataset.publicDataPk,
    description: dataset.description ?? null,
    organization: dataset.organization || null,
    category: dataset.category || null,
    serviceType: dataset.serviceType ?? null,
    formats: dataset.formats ?? [],
    keywords: dataset.keywords ?? [],
    license: dataset.license || null,
    detailUrl: dataset.detailUrl,
    downloadUrl: dataset.downloadUrl ?? null,
    downloadAction: dataset.downloadAction ?? null,
    atchFileId: dataset.atchFileId ?? null,
    fileDetailSn: dataset.fileDetailSn ?? null,
    originalFileName: dataset.originalFileName ?? null,
    fileExtension: dataset.fileExtension ?? null,
    fileSizeText: dataset.fileSizeText ?? null,
    viewCount: dataset.viewCount ?? null,
    downloadCount: dataset.downloadCount ?? null,
    modifiedDate: dataset.modifiedDate ?? null,
    registeredAtSource: dataset.registeredAtSource ?? null,
    updatedAtSource: dataset.updatedAtSource ?? null,
    nextUpdateDate: dataset.nextUpdateDate ?? null,
    updateCycle: dataset.updateCycle ?? null,
    suitabilityScore: dataset.suitabilityScore ?? 0,
    islandRelevance: dataset.islandRelevance ?? null,
    downloadStatus: dataset.downloadStatus ?? 'PENDING',
    localFilePath: dataset.localFilePath ?? null,
    fileSha256: dataset.fileSha256 ?? null,
    fileSizeBytes: dataset.fileSizeBytes ?? null,
    downloadedAt: dataset.downloadedAt ?? null,
    rawMetadata: dataset.rawMetadata ?? null
  };

  await prisma.publicDataFileDataset.upsert({
    where: { publicDataPk: dataset.publicDataPk },
    create: { publicDataPk: dataset.publicDataPk, ...data },
    update: data
  });
}

function scoreDataset({ title, description, keywords, organization }) {
  const text = [title, description, keywords.join(' '), organization].join(' ');
  let score = 0;
  const reasons = [];
  addScore(/섬|도서|해양|바다|해변|해수욕|어촌|항구|연안|갯벌/, 35, 'island-coast');
  addScore(/여행|관광|관광지|코스|일정|테마|체험|추천/, 25, 'travel-content');
  addScore(/숙박|펜션|캠핑|야영|식당|맛집|음식|사진|포토|반려동물|무장애|관광약자/, 20, 'trip-amenity');
  addScore(/제주|인천|옹진|신안|완도|진도|여수|통영|거제|남해|보령|서산|울릉|포항|군산|목포|부산|강릉|고성|동해|삼척/, 10, 'coastal-region');
  addScore(/조사|통계|방문객|실태조사|만족도|설문/, -20, 'survey-statistics');

  return { score: Math.max(0, Math.min(100, score)), reason: reasons.join(',') || 'general-travel' };

  function addScore(pattern, value, reason) {
    if (!pattern.test(text)) return;
    score += value;
    reasons.push(reason);
  }
}

function requestText(url) {
  return requestBuffer(url).then((buffer) => buffer.toString('utf8'));
}

function requestBuffer(url, redirects = 0, attempts = 0) {
  return new Promise((resolve, reject) => {
    const parsed = typeof url === 'string' ? new URL(url) : url;
    const client = parsed.protocol === 'http:' ? http : https;
    const fail = (error) => {
      if (attempts < 4) {
        setTimeout(() => {
          requestBuffer(parsed, redirects, attempts + 1).then(resolve, reject);
        }, 500 * (attempts + 1));
        return;
      }
      reject(error);
    };
    const req = client.get(
      parsed,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 badagil-data-collector/1.0',
          Referer: BASE_URL
        }
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
          res.resume();
          resolve(requestBuffer(new URL(res.headers.location, parsed), redirects + 1, attempts));
          return;
        }
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} ${parsed.toString()}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on('error', fail);
    req.setTimeout(30000, () => {
      req.destroy(new Error(`Timeout ${parsed.toString()}`));
    });
  });
}

function getTotalCount(html) {
  const match = html.match(/\(([\d,]+)건\)/);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function splitKeywords(value) {
  return uniqueBy(
    String(value ?? '')
      .split(/[,;|]/)
      .map((item) => stripHtml(item))
      .filter(Boolean),
    (item) => item
  );
}

function getLabelText(block, index) {
  const labels = [...block.matchAll(/<span class="labelset[^"]*">([\s\S]*?)<\/span>/g)].map((match) => stripHtml(match[1]));
  return labels[index] ?? null;
}

function toInteger(value) {
  const text = String(value ?? '').replace(/[^\d-]/g, '');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value) {
  const date = toDateTime(value);
  if (!date) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function toDateTime(value) {
  if (!value) return null;
  const normalized = String(value).replace(/\.\d+$/, '').replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizeFileName(value) {
  return String(value).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 180);
}

function stringifyJson(value) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === 'bigint' ? item.toString() : item),
    2
  );
}

function slugKeyword(value) {
  return String(value).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'keyword';
}

function uniqueBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
