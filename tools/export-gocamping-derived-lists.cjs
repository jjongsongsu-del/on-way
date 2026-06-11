#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.GOCAMPING_API_URL || 'https://apis.data.go.kr/B551011/GoCamping';
const INPUT = path.resolve(process.cwd(), process.env.GOCAMPING_BASED_CSV || 'dist/gocamping-based-list.csv');
const OUTPUT_DIR = path.resolve(process.cwd(), process.env.GOCAMPING_OUTPUT_DIR || 'dist');
const ROWS_PER_PAGE = Number(process.env.GOCAMPING_ROWS_PER_PAGE || 100);
const DELAY_MS = Number(process.env.GOCAMPING_DELAY_MS || 120);
const CONCURRENCY = Number(getArg('--concurrency') || process.env.GOCAMPING_CONCURRENCY || 8);
const LOCATION_RADIUS = Number(process.env.GOCAMPING_LOCATION_RADIUS || 2000);
const MODE = getArg('--mode') || process.env.GOCAMPING_EXPORT_MODE || 'all';
const LIMIT = Number(getArg('--limit') || process.env.GOCAMPING_LIMIT || 0);

loadEnvFile(path.resolve(process.cwd(), '.env'));

const serviceKey =
  process.env.GOCAMPING_SERVICE_KEY ||
  process.env.TOURISM_SERVICE_KEY ||
  process.env.DATA_GO_KR_SERVICE_KEY ||
  process.env.PUBLIC_DATA_SERVICE_KEY;

if (!serviceKey) fail('Missing service key. Set GOCAMPING_SERVICE_KEY, TOURISM_SERVICE_KEY, DATA_GO_KR_SERVICE_KEY, or PUBLIC_DATA_SERVICE_KEY.');
if (!fs.existsSync(INPUT)) fail(`Missing basedList CSV: ${INPUT}. Run "corepack pnpm export:gocamping" first.`);

main().catch((error) => fail(error instanceof Error ? error.stack || error.message : String(error)));

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const masterRows = parseCsv(fs.readFileSync(INPUT, 'utf8')).filter((row) => row.contentId);
  const rows = LIMIT > 0 ? masterRows.slice(0, LIMIT) : masterRows;
  console.log(`Input rows: ${masterRows.length}, export rows: ${rows.length}, mode: ${MODE}`);

  if (MODE === 'all' || MODE === 'search') {
    await exportSearchList(rows);
  }
  if (MODE === 'all' || MODE === 'image') {
    await exportImageList(rows);
  }
  if (MODE === 'all' || MODE === 'location') {
    await exportLocationBasedList(rows);
  }
}

async function exportSearchList(rows) {
  const output = path.join(OUTPUT_DIR, 'gocamping-search-list.csv');
  const results = [];
  const seen = new Set();

  await eachLimit(rows, CONCURRENCY, async (row, index) => {
    const keyword = row.facltNm;
    if (!keyword) return;

    const items = await fetchAllPages('searchList', { keyword });
    appendUnique(results, seen, items, {
      queryContentId: row.contentId,
      queryKeyword: keyword
    });
    logProgress('searchList', index + 1, rows.length, items.length, results.length);
    await sleep(DELAY_MS);
  });

  writeCsv(output, results);
  console.log(`searchList CSV saved: ${output} (${results.length} rows)`);
}

async function exportImageList(rows) {
  const output = path.join(OUTPUT_DIR, 'gocamping-image-list.csv');
  const results = [];
  const seen = new Set();

  await eachLimit(rows, CONCURRENCY, async (row, index) => {
    const contentId = row.contentId;
    if (!contentId) return;

    const items = await fetchAllPages('imageList', { contentId });
    appendUnique(results, seen, items, {
      queryContentId: contentId,
      queryFacilityName: row.facltNm
    });
    logProgress('imageList', index + 1, rows.length, items.length, results.length);
    await sleep(DELAY_MS);
  });

  writeCsv(output, results);
  console.log(`imageList CSV saved: ${output} (${results.length} rows)`);
}

async function exportLocationBasedList(rows) {
  const output = path.join(OUTPUT_DIR, 'gocamping-location-based-list.csv');
  const results = [];
  const seen = new Set();
  const locationRows = rows.filter((row) => row.mapX && row.mapY);

  await eachLimit(locationRows, CONCURRENCY, async (row, index) => {
    const items = await fetchAllPages('locationBasedList', {
      mapX: row.mapX,
      mapY: row.mapY,
      radius: LOCATION_RADIUS
    });
    appendUnique(results, seen, items, {
      queryContentId: row.contentId,
      queryFacilityName: row.facltNm,
      queryMapX: row.mapX,
      queryMapY: row.mapY,
      queryRadius: String(LOCATION_RADIUS)
    });
    logProgress('locationBasedList', index + 1, locationRows.length, items.length, results.length);
    await sleep(DELAY_MS);
  });

  writeCsv(output, results);
  console.log(`locationBasedList CSV saved: ${output} (${results.length} rows)`);
}

async function fetchAllPages(endpoint, params) {
  const first = await fetchPage(endpoint, params, 1);
  const totalCount = getTotalCount(first);
  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE));
  const items = [...getItems(first)];

  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    await sleep(DELAY_MS);
    items.push(...getItems(await fetchPage(endpoint, params, pageNo)));
  }
  return items;
}

async function fetchPage(endpoint, params, pageNo) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetchPageOnce(endpoint, params, pageNo);
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(500 * attempt);
    }
  }
}

async function fetchPageOnce(endpoint, params, pageNo) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('MobileOS', process.env.GOCAMPING_MOBILE_OS || 'ETC');
  url.searchParams.set('MobileApp', process.env.GOCAMPING_MOBILE_APP || 'Seomttok');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('numOfRows', String(ROWS_PER_PAGE));
  url.searchParams.set('pageNo', String(pageNo));

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && String(value).trim()) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${endpoint} failed: HTTP ${response.status} ${response.statusText} ${text.slice(0, 300)}`);
  }

  const payload = JSON.parse(text);
  const resultCode = payload?.response?.header?.resultCode ?? payload?.resultCode;
  if (resultCode && !['0000', '00'].includes(String(resultCode))) {
    const resultMsg = payload?.response?.header?.resultMsg ?? payload?.resultMsg ?? 'Unknown API error';
    throw new Error(`${endpoint} failed: ${resultCode} ${resultMsg}`);
  }

  return payload;
}

async function eachLimit(items, limit, worker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

function appendUnique(results, seen, items, query) {
  for (const item of items) {
    const key = createItemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ ...query, ...flattenObject(item) });
  }
}

function createItemKey(item) {
  return [item.contentId, item.serialnum, item.imageUrl, item.facltNm, item.mapX, item.mapY].filter(Boolean).join('|') || JSON.stringify(item);
}

function getTotalCount(payload) {
  return Number(payload?.response?.body?.totalCount ?? payload?.body?.totalCount ?? 0) || 0;
}

function getItems(payload) {
  const item = payload?.response?.body?.items?.item ?? payload?.body?.items?.item ?? [];
  if (Array.isArray(item)) return item;
  if (item && typeof item === 'object') return [item];
  return [];
}

function writeCsv(output, items) {
  const headers = collectHeaders(items);
  const lines = [headers.map(escapeCsv).join(',')];
  for (const item of items) {
    lines.push(headers.map((header) => escapeCsv(item[header])).join(','));
  }
  fs.writeFileSync(output, `\uFEFF${lines.join('\n')}`, 'utf8');
}

function collectHeaders(items) {
  const preferred = [
    'queryContentId',
    'queryKeyword',
    'queryFacilityName',
    'queryMapX',
    'queryMapY',
    'queryRadius',
    'contentId',
    'facltNm',
    'addr1',
    'addr2',
    'doNm',
    'sigunguNm',
    'mapX',
    'mapY',
    'tel',
    'homepage',
    'firstImageUrl',
    'imageUrl',
    'thumbImageUrl',
    'serialnum',
    'createdtime',
    'modifiedtime'
  ];
  const seen = new Set();
  const headers = [];

  for (const key of preferred) {
    if (items.some((item) => Object.prototype.hasOwnProperty.call(item, key))) {
      seen.add(key);
      headers.push(key);
    }
  }

  for (const item of items) {
    for (const key of Object.keys(item)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }
  return headers;
}

function flattenObject(value, prefix = '', output = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    output[prefix] = Array.isArray(value) ? JSON.stringify(value) : value;
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenObject(child, nextKey, output);
    } else {
      output[nextKey] = Array.isArray(child) ? JSON.stringify(child) : child;
    }
  }
  return output;
}

function parseCsv(text) {
  const rows = [];
  const clean = text.replace(/^\uFEFF/, '');
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const next = clean[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\r?\n/g, ' ').trim();
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index < 0) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logProgress(name, current, total, fetched, unique) {
  if (current === 1 || current === total || current % 50 === 0) {
    console.log(`${name}: ${current}/${total}, fetched=${fetched}, unique=${unique}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
