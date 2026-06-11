const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadVworldKey(path.resolve(__dirname, '../../../ref_2d'));

const prisma = new PrismaClient();
const endpoint = process.env.VWORLD_ISLAND_WFS_URL || 'https://api.vworld.kr/ned/wfs/getIslandsWFS';
const apiKey = process.env.VWORLD_API_KEY || process.env.VWORLD_SERVICE_KEY;

const BBOXES = createGridBboxes({
  minLon: 124.0,
  minLat: 32.8,
  maxLon: 132.5,
  maxLat: 38.8,
  step: 1.0
});

const FIELD_KEYS = {
  uniqueNo: ['islnds_esntlno', 'island_unique_no', 'islandUniqueNo', 'islndsUnqNo', 'isldUnqNo', 'islandNo', 'islandId'],
  name: ['islnds_nm', 'islndsNm', 'islandsNm', 'islandNm', 'islndNm', 'isldNm', 'islandName', 'name'],
  legalDongCode: ['ld_cpsg_code', 'ldCode', 'ldCpsgCode', 'legalDongCode', 'sigCd', 'emdCd'],
  legalDongName: ['ldNm', 'legalDongName', 'addr', 'address', 'rnAdres', 'lnmAdres'],
  province: ['ctprvnNm', 'sidoNm', 'provinceName', 'provNm'],
  city: ['signguNm', 'sggNm', 'sigunguNm', 'cityName'],
  lat: ['lat', 'latitude', 'la', 'y'],
  lon: ['lon', 'lng', 'longitude', 'lo', 'x'],
  area: ['lad_ar', 'area', 'ar', 'islandsAr', 'isldArea'],
  coastline: ['coastline', 'coastlineLen', 'coastLen'],
  population: ['population', 'popltn']
};

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

function loadVworldKey(directoryPath) {
  if (process.env.VWORLD_API_KEY || !fs.existsSync(directoryPath)) return;
  const keyFile = fs.readdirSync(directoryPath).find((name) => name.endsWith('.txt'));
  if (!keyFile) return;
  const key = fs.readFileSync(path.join(directoryPath, keyFile), 'utf8').trim();
  if (key) process.env.VWORLD_API_KEY = key;
}

function pick(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return null;
}

function toNumber(value) {
  if (!value) return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function stableId(parts) {
  return crypto.createHash('sha1').update(parts.filter(Boolean).join('|')).digest('hex');
}

function centroid(geometry) {
  const coords = [];
  collectCoordinates(geometry?.coordinates, coords);
  if (coords.length === 0) return { latitude: null, longitude: null };
  const lon = coords.reduce((sum, item) => sum + item[0], 0) / coords.length;
  const lat = coords.reduce((sum, item) => sum + item[1], 0) / coords.length;
  return { latitude: lat, longitude: lon };
}

function collectCoordinates(value, out) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    out.push(value);
    return;
  }
  value.forEach((item) => collectCoordinates(item, out));
}

function extractFeatures(payload) {
  if (Array.isArray(payload?.features)) return payload.features;
  if (Array.isArray(payload?.response?.result?.featureCollection?.features)) return payload.response.result.featureCollection.features;
  if (Array.isArray(payload?.data)) return payload.data.map((item) => ({ properties: item }));
  if (Array.isArray(payload?.items)) return payload.items.map((item) => ({ properties: item }));
  return [];
}

async function fetchBbox(bbox) {
  const url = new URL(endpoint);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('typename', 'dt_d158');
  url.searchParams.set('bbox', bbox.join(','));
  url.searchParams.set('output', 'json');
  url.searchParams.set('srsName', 'EPSG:4326');
  url.searchParams.set('maxFeatures', '1000');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`VWorld WFS failed: ${response.status} ${response.statusText}`);
  const text = await response.text();
  if (text.trim().startsWith('<')) {
    const message = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(`VWorld WFS XML error: ${message}`);
  }
  return JSON.parse(text);
}

function createGridBboxes({ minLon, minLat, maxLon, maxLat, step }) {
  const boxes = [];
  for (let lon = minLon; lon < maxLon; lon += step) {
    for (let lat = minLat; lat < maxLat; lat += step) {
      boxes.push([
        round(lon),
        round(lat),
        round(Math.min(lon + step, maxLon)),
        round(Math.min(lat + step, maxLat))
      ]);
    }
  }
  return boxes;
}

function round(value) {
  return Math.round(value * 10_000) / 10_000;
}

function toFeatureRecord(feature) {
  const properties = feature.properties ?? feature;
  const point = centroid(feature.geometry);
  const islandName = pick(properties, FIELD_KEYS.name);
  if (!islandName) return null;
  const islandUniqueNo = pick(properties, FIELD_KEYS.uniqueNo);
  return {
    id: stableId([islandUniqueNo, islandName, pick(properties, FIELD_KEYS.legalDongCode), pick(properties, FIELD_KEYS.legalDongName)]),
    islandUniqueNo,
    islandName,
    legalDongCode: pick(properties, FIELD_KEYS.legalDongCode),
    legalDongName: pick(properties, FIELD_KEYS.legalDongName),
    provinceName: pick(properties, FIELD_KEYS.province),
    cityName: pick(properties, FIELD_KEYS.city),
    latitude: toNumber(pick(properties, FIELD_KEYS.lat)) ?? point.latitude,
    longitude: toNumber(pick(properties, FIELD_KEYS.lon)) ?? point.longitude,
    areaSquareMeters: toNumber(pick(properties, FIELD_KEYS.area)),
    coastlineLengthMeters: toNumber(pick(properties, FIELD_KEYS.coastline)),
    population: toInt(pick(properties, FIELD_KEYS.population)),
    raw: JSON.stringify({ properties, geometry: feature.geometry ?? null }),
    fetchedAt: new Date().toISOString()
  };
}

async function upsertFeature(record) {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO vworld_island_feature (
        id, island_unique_no, island_name, legal_dong_code, legal_dong_name,
        province_name, city_name, latitude, longitude, area_square_meters,
        coastline_length_meters, population, raw, fetched_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::numeric(10,7),$9::numeric(10,7),$10::numeric(18,3),$11::numeric(18,3),$12,$13::jsonb,$14::timestamp,CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        island_unique_no = EXCLUDED.island_unique_no,
        island_name = EXCLUDED.island_name,
        legal_dong_code = EXCLUDED.legal_dong_code,
        legal_dong_name = EXCLUDED.legal_dong_name,
        province_name = EXCLUDED.province_name,
        city_name = EXCLUDED.city_name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        area_square_meters = EXCLUDED.area_square_meters,
        coastline_length_meters = EXCLUDED.coastline_length_meters,
        population = EXCLUDED.population,
        raw = EXCLUDED.raw,
        fetched_at = EXCLUDED.fetched_at,
        updated_at = CURRENT_TIMESTAMP
    `,
    record.id,
    record.islandUniqueNo,
    record.islandName,
    record.legalDongCode,
    record.legalDongName,
    record.provinceName,
    record.cityName,
    record.latitude,
    record.longitude,
    record.areaSquareMeters,
    record.coastlineLengthMeters,
    record.population,
    record.raw,
    record.fetchedAt
  );
}

async function linkIslandMaster() {
  await prisma.$executeRawUnsafe(`
    UPDATE island_master im
    SET vworld_feature_id = vf.id,
        updated_at = CURRENT_TIMESTAMP
    FROM vworld_island_feature vf
    WHERE im.vworld_feature_id IS NULL
      AND vf.island_unique_no IS NOT NULL
      AND vf.island_unique_no = im.island_unique_no
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE island_master im
    SET vworld_feature_id = vf.id,
        updated_at = CURRENT_TIMESTAMP
    FROM vworld_island_feature vf
    WHERE im.vworld_feature_id IS NULL
      AND regexp_replace(im.island_name, '[[:space:]]', '', 'g') = regexp_replace(vf.island_name, '[[:space:]]', '', 'g')
      AND (vf.legal_dong_code IS NULL OR vf.legal_dong_code = im.legal_dong_code)
  `);
}

async function main() {
  if (!apiKey) throw new Error('VWORLD_API_KEY is required.');
  const seen = new Set();
  let imported = 0;

  for (const bbox of BBOXES) {
    const payload = await fetchBbox(bbox);
    const features = extractFeatures(payload);
    for (const feature of features) {
      const record = toFeatureRecord(feature);
      if (!record || seen.has(record.id)) continue;
      seen.add(record.id);
      await upsertFeature(record);
      imported += 1;
    }
    console.log(`bbox ${bbox.join(',')} fetched ${features.length}, imported so far ${imported}`);
  }

  await linkIslandMaster();
  console.log(`Imported ${imported} VWorld island WFS features and linked island_master.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
