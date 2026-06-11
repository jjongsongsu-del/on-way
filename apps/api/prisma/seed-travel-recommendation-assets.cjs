const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();
const repoRoot = path.resolve(__dirname, '../../..');
const analysisRoot = path.resolve(repoRoot, 'ref_data/여행추천/analysis');
const inventoryPath = path.join(analysisRoot, 'travel-data-inventory.json');
const assetCandidatesPath = path.join(analysisRoot, 'travel-asset-candidates.json');
const args = parseArgs(process.argv.slice(2));
const minMatchScore = Number(args['min-match-score'] ?? 60);
const allowedUses = new Set(String(args.uses ?? 'core,supporting').split(',').map((value) => value.trim()).filter(Boolean));
const maxAssets = args['max-assets'] ? Number(args['max-assets']) : null;
const chunkSize = Number(args['chunk-size'] ?? 500);
const dryRun = args['dry-run'] === true;
const seedTimestamp = new Date();

async function main() {
  if (args.summary === true) {
    await printSummary();
    return;
  }

  if (!fs.existsSync(inventoryPath)) throw new Error(`Inventory JSON not found: ${inventoryPath}`);
  if (!fs.existsSync(assetCandidatesPath)) throw new Error(`Asset candidates JSON not found: ${assetCandidatesPath}`);

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const assetCandidates = JSON.parse(fs.readFileSync(assetCandidatesPath, 'utf8'));
  const datasets = inventory.datasets ?? [];
  const candidates = assetCandidates.candidates ?? [];

  const selectedSources = datasets
    .filter((source) => allowedUses.has(source.recommendationUse))
    .filter((source) => Number(source.usabilityScore ?? 0) >= 35);
  const sourcePkSet = new Set(selectedSources.map((source) => source.publicDataPk));

  const selectedAssets = candidates
    .filter((asset) => sourcePkSet.has(asset.sourceDatasetPk))
    .filter((asset) => Number(asset.matchScore ?? 0) >= minMatchScore)
    .filter((asset) => asset.travelRegionId)
    .filter((asset) => asset.name || asset.address)
    .slice(0, maxAssets ?? undefined);

  const sourceRows = selectedSources.map(toSourceRow);
  const assetRows = selectedAssets.map(toAssetRow);
  const matchRows = selectedAssets.flatMap(toMatchRows);

  const summary = {
    selectedSources: sourceRows.length,
    selectedAssets: assetRows.length,
    selectedMatches: matchRows.length,
    minMatchScore,
    allowedUses: [...allowedUses],
    dryRun
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM "travel_asset_match"');
    await tx.$executeRawUnsafe('DELETE FROM "travel_asset"');
    await tx.$executeRawUnsafe('DELETE FROM "travel_data_source"');
  });

  await insertRows('travel_data_source', SOURCE_COLUMNS, sourceRows);
  await insertRows('travel_asset', ASSET_COLUMNS, assetRows);
  await insertRows('travel_asset_match', MATCH_COLUMNS, matchRows);

  const [sourceCount, assetCount, matchCount] = await Promise.all([
    countTable('travel_data_source'),
    countTable('travel_asset'),
    countTable('travel_asset_match')
  ]);

  console.log(JSON.stringify({ ...summary, inserted: { sourceCount, assetCount, matchCount } }, null, 2));
}

async function printSummary() {
  const counts = await prisma.$queryRawUnsafe(`
    select
      (select count(*)::int from travel_data_source) as sources,
      (select count(*)::int from travel_asset) as assets,
      (select count(*)::int from travel_asset_match) as matches
  `);
  const byCategory = await prisma.$queryRawUnsafe(`
    select coalesce(category, 'unknown') as category, count(*)::int as count
    from travel_asset
    group by category
    order by count desc
    limit 20
  `);
  const byRegion = await prisma.$queryRawUnsafe(`
    select travel_region_name as region, count(*)::int as count
    from travel_asset
    where travel_region_id is not null
    group by travel_region_name
    order by count desc
    limit 20
  `);
  const byTarget = await prisma.$queryRawUnsafe(`
    select target_type as "targetType", count(*)::int as count
    from travel_asset_match
    group by target_type
    order by count desc
  `);
  console.log(JSON.stringify({ counts: counts[0], byCategory, byRegion, byTarget }, null, 2));
}

function toSourceRow(source) {
  return {
    publicDataPk: String(source.publicDataPk),
    title: truncate(source.title ?? '(untitled)', 1000),
    organization: truncate(source.organization, 500),
    sourceKeywords: normalizeStringArray(source.sourceKeywords),
    formats: normalizeStringArray(source.formats),
    localFilePath: truncate(source.localFilePath, 1000),
    fileSizeBytes: source.fileSizeBytes === null || source.fileSizeBytes === undefined ? null : BigInt(source.fileSizeBytes),
    columnCount: Number(source.columnCount ?? 0),
    sampleHeaders: normalizeStringArray(source.sampleHeaders).slice(0, 200),
    capabilities: source.capabilities ?? {},
    categories: normalizeStringArray(source.categories),
    styleScores: source.styleScores ?? {},
    usabilityScore: Number(source.usabilityScore ?? 0),
    usabilityGrade: source.usabilityGrade ?? 'D',
    recommendationUse: source.recommendationUse ?? 'metadata-only',
    reasons: normalizeStringArray(source.reasons),
    cautions: normalizeStringArray(source.cautions),
    rawInventory: source
    ,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  };
}

function toAssetRow(asset) {
  return {
    id: String(asset.id),
    sourceDatasetPk: String(asset.sourceDatasetPk),
    sourceTitle: truncate(asset.sourceTitle ?? '(unknown source)', 1000),
    sourceFilePath: truncate(asset.sourceFilePath, 1000),
    sourceRowIndex: nullableNumber(asset.sourceRowIndex),
    name: truncate(asset.name ?? asset.address ?? '(unnamed asset)', 1000),
    category: truncate(asset.category, 100),
    province: truncate(asset.province, 100),
    city: truncate(asset.city, 100),
    legalDongName: truncate(asset.legalDongName, 200),
    address: truncate(asset.address, 1000),
    latitude: nullableNumber(asset.latitude),
    longitude: nullableNumber(asset.longitude),
    matchedIslandId: truncate(asset.matchedIslandId, 100),
    matchedIslandName: truncate(asset.matchedIslandName, 200),
    travelRegionId: truncate(asset.travelRegionId, 100),
    travelRegionName: truncate(asset.travelRegionName, 200),
    matchType: truncate(asset.matchType, 100),
    matchScore: Number(asset.matchScore ?? 0),
    tags: normalizeStringArray(asset.tags),
    evidence: asset.evidence ?? {},
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  };
}

function toMatchRows(asset) {
  const rows = [];
  if (asset.travelRegionId) {
    rows.push({
      id: hash(`${asset.id}:travel_region:${asset.travelRegionId}`),
      travelAssetId: String(asset.id),
      targetType: 'travel_region',
      targetId: String(asset.travelRegionId),
      targetName: asset.travelRegionName ?? null,
      matchType: asset.matchType ?? 'travel_region',
      matchScore: Number(asset.matchScore ?? 0),
      evidence: asset.evidence ?? {},
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp
    });
  }
  if (asset.matchedIslandId) {
    rows.push({
      id: hash(`${asset.id}:island:${asset.matchedIslandId}`),
      travelAssetId: String(asset.id),
      targetType: 'island',
      targetId: String(asset.matchedIslandId),
      targetName: asset.matchedIslandName ?? null,
      matchType: asset.matchType ?? 'island',
      matchScore: Number(asset.matchScore ?? 0),
      evidence: asset.evidence ?? {},
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp
    });
  }
  return rows;
}

const SOURCE_COLUMNS = [
  ['publicDataPk', 'public_data_pk'],
  ['title', 'title'],
  ['organization', 'organization'],
  ['sourceKeywords', 'source_keywords'],
  ['formats', 'formats'],
  ['localFilePath', 'local_file_path'],
  ['fileSizeBytes', 'file_size_bytes'],
  ['columnCount', 'column_count'],
  ['sampleHeaders', 'sample_headers'],
  ['capabilities', 'capabilities', '::jsonb'],
  ['categories', 'categories'],
  ['styleScores', 'style_scores', '::jsonb'],
  ['usabilityScore', 'usability_score'],
  ['usabilityGrade', 'usability_grade'],
  ['recommendationUse', 'recommendation_use'],
  ['reasons', 'reasons'],
  ['cautions', 'cautions'],
  ['rawInventory', 'raw_inventory', '::jsonb'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at']
];

const ASSET_COLUMNS = [
  ['id', 'id'],
  ['sourceDatasetPk', 'source_dataset_pk'],
  ['sourceTitle', 'source_title'],
  ['sourceFilePath', 'source_file_path'],
  ['sourceRowIndex', 'source_row_index'],
  ['name', 'name'],
  ['category', 'category'],
  ['province', 'province'],
  ['city', 'city'],
  ['legalDongName', 'legal_dong_name'],
  ['address', 'address'],
  ['latitude', 'latitude'],
  ['longitude', 'longitude'],
  ['matchedIslandId', 'matched_island_id'],
  ['matchedIslandName', 'matched_island_name'],
  ['travelRegionId', 'travel_region_id'],
  ['travelRegionName', 'travel_region_name'],
  ['matchType', 'match_type'],
  ['matchScore', 'match_score'],
  ['tags', 'tags'],
  ['evidence', 'evidence', '::jsonb'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at']
];

const MATCH_COLUMNS = [
  ['id', 'id'],
  ['travelAssetId', 'travel_asset_id'],
  ['targetType', 'target_type'],
  ['targetId', 'target_id'],
  ['targetName', 'target_name'],
  ['matchType', 'match_type'],
  ['matchScore', 'match_score'],
  ['evidence', 'evidence', '::jsonb'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at']
];

async function insertRows(tableName, columns, rows) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    if (chunk.length === 0) continue;
    const params = [];
    const values = chunk.map((row) => {
      const placeholders = columns.map(([prop, _db, cast]) => {
        const value = cast === '::jsonb' ? JSON.stringify(sanitizeDbValue(row[prop] ?? null)) : sanitizeDbValue(row[prop]);
        params.push(value);
        return `$${params.length}${cast ?? ''}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    const dbColumns = columns.map(([, db]) => `"${db}"`).join(', ');
    const sql = `INSERT INTO "${tableName}" (${dbColumns}) VALUES ${values.join(', ')} ON CONFLICT DO NOTHING`;
    await prisma.$executeRawUnsafe(sql, ...params);
  }
}

async function countTable(tableName) {
  const rows = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${tableName}"`);
  return rows[0]?.count ?? 0;
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? [...new Set(values.filter((value) => value !== null && value !== undefined).map((value) => String(value).replace(/\u0000/g, '').trim()).filter(Boolean))]
    : [];
}

function sanitizeDbValue(value) {
  if (typeof value === 'string') return value.replace(/\u0000/g, '');
  if (Array.isArray(value)) return value.map(sanitizeDbValue);
  if (value && typeof value === 'object' && !(value instanceof Date) && typeof value !== 'bigint') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeDbValue(item)]));
  }
  return value;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function truncate(value, maxLength) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  const cleanText = text.replace(/\u0000/g, '');
  if (!cleanText) return null;
  return cleanText.length > maxLength ? cleanText.slice(0, maxLength) : cleanText;
}

function hash(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 24);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--') continue;
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
