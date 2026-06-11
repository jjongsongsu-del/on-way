const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const repoRoot = path.resolve(__dirname, '../../..');
const dataRoot = path.resolve(repoRoot, 'ref_data/여행추천/data-go-kr');
const detailRoot = path.join(dataRoot, 'details');
const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(args._[0] ?? path.join(dataRoot, 'catalog.json'));
const outputPath = path.resolve(args.output ?? defaultOutputPath(inputPath));
const shouldFetchMissing = args['fetch-missing'] !== false;
const delayMs = args['delay-ms'] ? Number(args['delay-ms']) : 120;
const limit = args.limit ? Number(args.limit) : null;

async function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Catalog JSON not found: ${inputPath}`);
  }

  ensureDir(detailRoot);
  ensureDir(path.dirname(outputPath));

  const catalog = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const datasets = Array.isArray(catalog.datasets) ? catalog.datasets : [];
  const results = [];
  const targetDatasets = limit ? datasets.slice(0, limit) : datasets;

  for (let index = 0; index < targetDatasets.length; index += 1) {
    const dataset = targetDatasets[index];
    const publicDataPk = String(dataset.publicDataPk ?? '').trim();
    if (!publicDataPk) continue;

    try {
      const html = await readOrFetchDetailHtml(dataset);
      const columnInfo = extractColumnInfo(html);
      results.push({
        publicDataPk,
        publicDataDetailPk: dataset.publicDataDetailPk ?? columnInfo.publicDataDetailPk ?? null,
        title: dataset.title ?? null,
        organization: dataset.organization ?? null,
        detailUrl: dataset.detailUrl ?? null,
        columnDefExcelUrl: columnInfo.columnDefExcelUrl,
        caption: columnInfo.caption,
        columns: columnInfo.columns
      });
      console.log(`${index + 1}/${targetDatasets.length} ${publicDataPk} ${dataset.title ?? ''} columns=${columnInfo.columns.length}`);
    } catch (error) {
      results.push({
        publicDataPk,
        title: dataset.title ?? null,
        detailUrl: dataset.detailUrl ?? null,
        columns: [],
        error: getErrorMessage(error)
      });
      console.error(`Failed ${publicDataPk}: ${getErrorMessage(error)}`);
    }
  }

  const output = {
    sourceCatalog: path.relative(repoRoot, inputPath).replace(/\\/g, '/'),
    keyword: catalog.keyword ?? null,
    totalDatasets: datasets.length,
    processedDatasets: targetDatasets.length,
    generatedAt: new Date().toISOString(),
    datasets: results
  };

  fs.writeFileSync(outputPath, stringifyJson(output), 'utf8');
  console.log(`Saved column info: ${outputPath}`);
}

async function readOrFetchDetailHtml(dataset) {
  const publicDataPk = String(dataset.publicDataPk);
  const localPath = path.join(detailRoot, `${publicDataPk}.html`);
  if (fs.existsSync(localPath)) return fs.readFileSync(localPath, 'utf8');

  if (!shouldFetchMissing) {
    throw new Error(`Detail HTML missing: ${localPath}`);
  }

  const detailUrl = dataset.detailUrl;
  if (!detailUrl) throw new Error('detailUrl is missing');

  await wait(delayMs);
  const html = await requestText(new URL(detailUrl));
  fs.writeFileSync(localPath, html, 'utf8');
  return html;
}

function extractColumnInfo(html) {
  const table = html.match(/<table class="column-def-table">([\s\S]*?)<\/table>/i)?.[0] ?? '';
  const caption = stripHtml(table.match(/<caption>([\s\S]*?)<\/caption>/i)?.[1] ?? '');
  const columnDefExcelUrl = getColumnDefExcelUrl(html);
  const publicDataDetailPk = html.match(/fileDetailObj\.fn_fileDataDown\('\d+',\s*'([^']+)'/)?.[1] ?? null;

  if (!table) {
    return {
      caption,
      columnDefExcelUrl,
      publicDataDetailPk,
      columns: []
    };
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

  return {
    caption,
    columnDefExcelUrl,
    publicDataDetailPk,
    columns
  };
}

function getColumnDefExcelUrl(html) {
  const match = html.match(/href="([^"]*\/columnDefExcel\.do[^"]*)"/i);
  if (!match) return null;
  return new URL(match[1].replace(/&amp;/g, '&'), 'https://www.data.go.kr').toString();
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

function defaultOutputPath(catalogPath) {
  const parsed = path.parse(catalogPath);
  return path.join(parsed.dir, `columns-${parsed.name}.json`);
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
          Referer: 'https://www.data.go.kr'
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
