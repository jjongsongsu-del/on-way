#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_API_URL = 'https://apis.data.go.kr/B551011/GoCamping/basedList';
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'dist', 'gocamping-based-list.csv');
const DEFAULT_ROWS = 1000;

loadEnvFile(path.resolve(process.cwd(), '.env'));

const serviceKey =
  process.env.GOCAMPING_SERVICE_KEY ||
  process.env.TOURISM_SERVICE_KEY ||
  process.env.DATA_GO_KR_SERVICE_KEY ||
  process.env.PUBLIC_DATA_SERVICE_KEY;

if (!serviceKey) {
  fail('인증키가 없습니다. GOCAMPING_SERVICE_KEY, TOURISM_SERVICE_KEY, DATA_GO_KR_SERVICE_KEY, PUBLIC_DATA_SERVICE_KEY 중 하나를 설정하세요.');
}

const output = path.resolve(process.cwd(), process.argv[2] || process.env.GOCAMPING_CSV_OUTPUT || DEFAULT_OUTPUT);
const apiUrl = process.env.GOCAMPING_BASED_LIST_URL || DEFAULT_API_URL;
const rowsPerPage = Number(process.env.GOCAMPING_ROWS_PER_PAGE || DEFAULT_ROWS);

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

async function main() {
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const first = await fetchPage(1);
  const totalCount = getTotalCount(first);
  const firstItems = getItems(first);
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const allItems = [...firstItems];

  console.log(`GoCamping basedList: totalCount=${totalCount}, rowsPerPage=${rowsPerPage}, totalPages=${totalPages}`);
  console.log(`page 1/${totalPages}: ${firstItems.length} rows`);

  for (let page = 2; page <= totalPages; page += 1) {
    await sleep(150);
    const response = await fetchPage(page);
    const items = getItems(response);
    allItems.push(...items);
    console.log(`page ${page}/${totalPages}: ${items.length} rows`);
  }

  const headers = collectHeaders(allItems);
  const csv = toCsv(headers, allItems);
  fs.writeFileSync(output, `\uFEFF${csv}`, 'utf8');

  console.log(`CSV saved: ${output}`);
  console.log(`rows: ${allItems.length}`);
}

async function fetchPage(pageNo) {
  const url = new URL(apiUrl);
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('MobileOS', process.env.GOCAMPING_MOBILE_OS || 'ETC');
  url.searchParams.set('MobileApp', process.env.GOCAMPING_MOBILE_APP || 'Seomttok');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('numOfRows', String(rowsPerPage));
  url.searchParams.set('pageNo', String(pageNo));

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`API 호출 실패: HTTP ${response.status} ${response.statusText} ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON 파싱 실패: ${text.slice(0, 300)}`);
  }
}

function getTotalCount(payload) {
  const value = payload?.response?.body?.totalCount ?? payload?.body?.totalCount ?? 0;
  return Number(value) || 0;
}

function getItems(payload) {
  const item = payload?.response?.body?.items?.item ?? payload?.body?.items?.item ?? [];
  if (Array.isArray(item)) return item;
  if (item && typeof item === 'object') return [item];
  return [];
}

function collectHeaders(items) {
  const preferred = [
    'contentId',
    'facltNm',
    'lineIntro',
    'intro',
    'allar',
    'insrncAt',
    'trsagntNo',
    'bizrno',
    'facltDivNm',
    'mangeDivNm',
    'mgcDiv',
    'manageSttus',
    'hvofBgnde',
    'hvofEnddle',
    'featureNm',
    'induty',
    'lctCl',
    'doNm',
    'sigunguNm',
    'zipcode',
    'addr1',
    'addr2',
    'mapX',
    'mapY',
    'direction',
    'tel',
    'homepage',
    'resveUrl',
    'resveCl',
    'gnrlSiteCo',
    'autoSiteCo',
    'glampSiteCo',
    'caravSiteCo',
    'indvdlCaravSiteCo',
    'sitedStnc',
    'siteMg1Width',
    'siteMg2Width',
    'siteMg3Width',
    'siteMg1Vrticl',
    'siteMg2Vrticl',
    'siteMg3Vrticl',
    'siteBottomCl1',
    'siteBottomCl2',
    'siteBottomCl3',
    'siteBottomCl4',
    'siteBottomCl5',
    'tooltip',
    'glampInnerFclty',
    'caravInnerFclty',
    'prmisnDe',
    'operPdCl',
    'operDeCl',
    'trlerAcmpnyAt',
    'caravAcmpnyAt',
    'toiletCo',
    'swrmCo',
    'wtrplCo',
    'brazierCl',
    'sbrsCl',
    'sbrsEtc',
    'posblFcltyCl',
    'posblFcltyEtc',
    'clturEventAt',
    'clturEvent',
    'exprnProgrmAt',
    'exprnProgrm',
    'extshrCo',
    'frprvtWrppCo',
    'frprvtSandCo',
    'fireSensorCo',
    'themaEnvrnCl',
    'eqpmnLendCl',
    'animalCmgCl',
    'tourEraCl',
    'firstImageUrl',
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
    for (const key of Object.keys(flattenObject(item))) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }
  return headers;
}

function toCsv(headers, items) {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const item of items) {
    const flat = flattenObject(item);
    lines.push(headers.map((header) => escapeCsv(flat[header])).join(','));
  }
  return lines.join('\n');
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
