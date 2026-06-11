const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const repoRoot = path.resolve(__dirname, '../../..');
const dataRoot = path.resolve(repoRoot, 'ref_data/여행추천/data-go-kr');
const pageRoot = path.join(dataRoot, 'pages');
const detailRoot = path.join(dataRoot, 'details');
const BASE_URL = 'https://www.data.go.kr';

const args = parseArgs(process.argv.slice(2));
const keywordArg = args.keyword ? String(args.keyword).trim() : null;
const outputRoot = path.resolve(args['output-root'] ?? dataRoot);
const shouldFetchMissing = args['fetch-missing'] !== false && args['fetch-missing'] !== 'false';
const delayMs = args['delay-ms'] ? Number(args['delay-ms']) : 120;
const limit = args.limit ? Number(args.limit) : null;

async function main() {
  ensureDir(outputRoot);
  ensureDir(detailRoot);

  const keywords = keywordArg ? [keywordArg] : getPageKeywords();
  if (keywords.length === 0) {
    throw new Error(`No page keyword directories found: ${pageRoot}`);
  }

  for (const keyword of keywords) {
    const datasets = readDatasetsFromPages(keyword);
    const targetDatasets = limit ? datasets.slice(0, limit) : datasets;
    const results = [];

    console.log(`Keyword "${keyword}": ${datasets.length} datasets from pages, processing ${targetDatasets.length}.`);

    for (let index = 0; index < targetDatasets.length; index += 1) {
      const dataset = targetDatasets[index];
      try {
        const html = await readOrFetchDetailHtml(dataset);
        const columnInfo = extractColumnInfo(html);
        results.push({
          publicDataPk: dataset.publicDataPk,
          publicDataDetailPk: columnInfo.publicDataDetailPk,
          title: dataset.title,
          organization: dataset.organization,
          detailUrl: dataset.detailUrl,
          columnDefExcelUrl: columnInfo.columnDefExcelUrl,
          caption: columnInfo.caption,
          columns: columnInfo.columns
        });
        console.log(`${index + 1}/${targetDatasets.length} ${dataset.publicDataPk} ${dataset.title} columns=${columnInfo.columns.length}`);
      } catch (error) {
        results.push({
          publicDataPk: dataset.publicDataPk,
          title: dataset.title,
          detailUrl: dataset.detailUrl,
          columns: [],
          error: getErrorMessage(error)
        });
        console.error(`Failed ${dataset.publicDataPk}: ${getErrorMessage(error)}`);
      }
    }

    const output = {
      sourcePages: path.relative(repoRoot, path.join(pageRoot, keyword)).replace(/\\/g, '/'),
      keyword,
      totalDatasets: datasets.length,
      processedDatasets: targetDatasets.length,
      generatedAt: new Date().toISOString(),
      datasets: results
    };
    const outputPath = path.join(outputRoot, `columns-catalog-${keyword}.json`);
    fs.writeFileSync(outputPath, stringifyJson(output), 'utf8');
    console.log(`Saved column info: ${outputPath}`);
  }
}

function getPageKeywords() {
  if (!fs.existsSync(pageRoot)) return [];
  return fs.readdirSync(pageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'ko'));
}

function readDatasetsFromPages(keyword) {
  const keywordPageRoot = path.join(pageRoot, keyword);
  if (!fs.existsSync(keywordPageRoot)) {
    throw new Error(`Page directory not found: ${keywordPageRoot}`);
  }

  const pageFiles = fs.readdirSync(keywordPageRoot)
    .filter((name) => /^search-page-\d+\.html$/i.test(name))
    .sort((left, right) => pageNumber(left) - pageNumber(right));

  const datasets = [];
  for (const fileName of pageFiles) {
    const html = fs.readFileSync(path.join(keywordPageRoot, fileName), 'utf8');
    datasets.push(...parseSearchPage(html));
  }

  return uniqueBy(datasets, (dataset) => dataset.publicDataPk);
}

function parseSearchPage(html) {
  const blocks = html.split(/<li\b/i).slice(1);
  const entries = [];

  for (const block of blocks) {
    const pk = block.match(/href="\/data\/(\d+)\/fileData\.do"/)?.[1];
    if (!pk) continue;

    entries.push({
      publicDataPk: pk,
      title: stripHtml(block.match(/<span class="title">([\s\S]*?)<\/span>/i)?.[1] ?? ''),
      description: stripHtml(block.match(/<dd class="ellipsis publicDataDesc">([\s\S]*?)<\/dd>/i)?.[1] ?? ''),
      organization: parseOrganization(block),
      detailUrl: `${BASE_URL}/data/${pk}/fileData.do`
    });
  }

  return entries;
}

function parseOrganization(block) {
  const matches = block.matchAll(/<span class="tit">([\s\S]*?)<\/span>\s*<span[^>]*class="?data"?[^>]*>([\s\S]*?)<\/span>/gi);
  for (const match of matches) {
    const key = stripHtml(match[1]);
    const value = stripHtml(match[2]);
    if (key.includes('제공기관') || key.toLowerCase().includes('organization')) return value || null;
  }
  return null;
}

async function readOrFetchDetailHtml(dataset) {
  const localPath = path.join(detailRoot, `${dataset.publicDataPk}.html`);
  if (fs.existsSync(localPath)) return fs.readFileSync(localPath, 'utf8');

  if (!shouldFetchMissing) {
    throw new Error(`Detail HTML missing: ${localPath}`);
  }

  await wait(delayMs);
  const html = await requestText(dataset.detailUrl);
  fs.writeFileSync(localPath, html, 'utf8');
  return html;
}

function extractColumnInfo(html) {
  const table = html.match(/<table class="column-def-table">([\s\S]*?)<\/table>/i)?.[0] ?? '';
  const caption = stripHtml(table.match(/<caption>([\s\S]*?)<\/caption>/i)?.[1] ?? '');
  const columnDefExcelUrl = getColumnDefExcelUrl(html);
  const publicDataDetailPk = html.match(/fileDetailObj\.fn_fileDataDown\('\d+',\s*'([^']+)'/)?.[1] ?? null;

  if (!table) {
    return { caption, columnDefExcelUrl, publicDataDetailPk, columns: [] };
  }

  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => match[1])
    .filter((row) => /<td[\s>]/i.test(row));

  const columns = rows.map((row, index) => {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]));
    return {
      order: index + 1,
      name: normalizeDash(cells[0]),
      englishName: normalizeDash(cells[1]),
      description: normalizeDash(cells[2]),
      domainCategory: normalizeDash(cells[3]),
      dataType: normalizeDash(cells[4]),
      maxLength: normalizeDash(cells[5]),
      format: normalizeDash(cells[6]),
      unit: normalizeDash(cells[7]),
      sourceSystem: normalizeDash(cells[8]),
      sourceDatabase: normalizeDash(cells[9]),
      sourceTable: normalizeDash(cells[10]),
      code: normalizeDash(cells[11]),
      rawCells: cells
    };
  });

  return { caption, columnDefExcelUrl, publicDataDetailPk, columns };
}

function getColumnDefExcelUrl(html) {
  const match = html.match(/href="([^"]*\/columnDefExcel\.do[^"]*)"/i);
  if (!match) return null;
  return new URL(match[1].replace(/&amp;/g, '&'), BASE_URL).toString();
}

function pageNumber(fileName) {
  return Number(fileName.match(/search-page-(\d+)\.html/i)?.[1] ?? 0);
}

function uniqueBy(values, keyFn) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = keyFn(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDash(value) {
  const normalized = stripHtml(value);
  return normalized === '-' ? null : normalized || null;
}

function stringifyJson(value) {
  return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item), 2);
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
        setTimeout(() => requestBuffer(parsed, redirects, attempts + 1).then(resolve, reject), 500 * (attempts + 1));
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
    req.setTimeout(30000, () => req.destroy(new Error(`Timeout ${parsed.toString()}`)));
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs(values) {
  const parsed = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--') continue;
    if (!value.startsWith('--')) {
      parsed._.push(value);
      continue;
    }
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

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
