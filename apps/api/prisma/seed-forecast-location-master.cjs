const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'Node'
});
require('ts-node/register/transpile-only');

const { getMarineForecastLocations } = require('../src/forecasts/marine-forecast-location-map');
const prisma = new PrismaClient();

const ADDRESS_LOCATION_RULES = [
  { id: 'incheon-coast', keywords: ['인천광역시', '경기도 김포시', '경기도 안산시'] },
  { id: 'boryeong-coast', keywords: ['충청남도 보령시', '충청남도 태안군', '충청남도 서산시', '충청남도 홍성군'] },
  { id: 'gunsan-coast', keywords: ['전북특별자치도 군산시', '전북특별자치도 부안군', '전북특별자치도 고창군', '충청남도 서천군'] },
  { id: 'mokpo-coast', keywords: ['전라남도 목포시', '전라남도 신안군', '전라남도 무안군'] },
  { id: 'jindo-coast', keywords: ['전라남도 진도군', '전라남도 해남군'] },
  { id: 'wando-coast', keywords: ['전라남도 완도군', '전라남도 강진군', '전라남도 장흥군'] },
  { id: 'yeosu-coast', keywords: ['전라남도 여수시', '전라남도 고흥군', '전라남도 보성군', '전라남도 광양시', '전라남도 순천시'] },
  { id: 'tongyeong-coast', keywords: ['경상남도 통영시', '경상남도 사천시', '경상남도 남해군', '경상남도 하동군', '경상남도 고성군'] },
  { id: 'geoje-coast', keywords: ['경상남도 거제시', '경상남도 창원시'] },
  { id: 'busan-coast', keywords: ['부산광역시'] },
  { id: 'ulsan-coast', keywords: ['울산광역시'] },
  { id: 'pohang-coast', keywords: ['경상북도 포항시', '경상북도 경주시', '강원특별자치도', '강원도'] },
  { id: 'ulleung', keywords: ['경상북도 울릉군'] },
  { id: 'jeju-coast', keywords: ['제주특별자치도 제주시'] },
  { id: 'seogwipo-coast', keywords: ['제주특별자치도 서귀포시'] }
];

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

function normalize(value) {
  return String(value ?? '').replace(/\s+/g, '').replace(/[도섬]$/g, '').toLowerCase();
}

function distanceKm(a, b) {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) return null;
  const r = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function scoreLocation(island, location) {
  const haystack = normalize(`${island.island_name} ${island.legal_dong_name}`);
  const islandName = normalize(island.island_name);
  const aliases = [location.label, location.helper, location.stationName, ...location.aliases].map(normalize).filter(Boolean);
  let best = 0;
  let matchType = null;

  for (const alias of aliases) {
    if (!alias) continue;
    if (haystack.includes(alias) || alias.includes(islandName)) {
      const score = Math.min(100, 70 + alias.length * 2 + (location.kind === 'ISLAND' ? 8 : 0));
      if (score > best) {
        best = score;
        matchType = 'ALIAS';
      }
    }
  }

  const dist = distanceKm(island, location);
  if (dist !== null) {
    const geoScore = Math.max(0, Math.round(70 - dist / 3));
    if (geoScore > best) {
      best = geoScore;
      matchType = 'NEAREST_COORD';
    }
  }

  return { score: best, matchType };
}

function findAddressRuleLocation(island, locationById) {
  const address = String(island.legal_dong_name ?? '');
  const rule = ADDRESS_LOCATION_RULES.find((candidate) => candidate.keywords.some((keyword) => address.includes(keyword)));
  const location = rule ? locationById.get(rule.id) : null;
  return location ? { location, score: 45, matchType: 'ADDRESS_RULE' } : null;
}

async function main() {
  const locations = getMarineForecastLocations();
  const locationById = new Map(locations.map((location) => [location.id, location]));
  for (const location of locations) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO marine_forecast_location (
          id, label, helper, kind, aliases, nx, ny, station_code, station_name,
          salinity_grid_code, latitude, longitude, source_note, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::numeric(10,7),$12::numeric(10,7),$13,CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          helper = EXCLUDED.helper,
          kind = EXCLUDED.kind,
          aliases = EXCLUDED.aliases,
          nx = EXCLUDED.nx,
          ny = EXCLUDED.ny,
          station_code = EXCLUDED.station_code,
          station_name = EXCLUDED.station_name,
          salinity_grid_code = EXCLUDED.salinity_grid_code,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          source_note = EXCLUDED.source_note,
          updated_at = CURRENT_TIMESTAMP
      `,
      location.id,
      location.label,
      location.helper,
      location.kind,
      location.aliases,
      location.nx,
      location.ny,
      location.stationCode,
      location.stationName,
      location.salinityGridCode,
      location.latitude,
      location.longitude,
      location.sourceNote
    );
  }

  const islands = await prisma.$queryRawUnsafe(`
    SELECT island_key, island_name, legal_dong_name,
           NULL::numeric AS latitude, NULL::numeric AS longitude
    FROM island_master
  `);

  let updated = 0;
  for (const island of islands) {
    const ranked = locations
      .map((location) => ({ location, ...scoreLocation(island, location) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const best = ranked[0] ?? findAddressRuleLocation(island, locationById);
    if (!best) continue;

    await prisma.$executeRawUnsafe(
      `
        UPDATE island_master
        SET forecast_location_id = $1,
            forecast_location_name = $2,
            forecast_match_type = $3,
            forecast_match_score = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE island_key = $5
      `,
      best.location.id,
      best.location.label,
      best.matchType,
      best.score,
      island.island_key
    );
    updated += 1;
  }

  console.log(`Upserted ${locations.length} forecast locations and mapped ${updated} island master rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
