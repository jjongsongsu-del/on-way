const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();

async function main() {
  const [
    islandCounts,
    travelRegions,
    islandsByTravelRegion,
    islandsByForecastRegion,
    recommendedCounts,
    travelAssetCounts,
    travelAssetRegionCounts,
    travelAssetMatchCounts,
    recommendedSamples,
    travelAssetSamples
  ] = await Promise.all([
    one(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE travel_region_id IS NOT NULL)::int AS with_travel_region,
        count(*) FILTER (WHERE forecast_location_id IS NOT NULL)::int AS with_forecast_region,
        count(*) FILTER (WHERE legal_dong_name IS NOT NULL AND legal_dong_name <> '')::int AS with_admin_region
      FROM island_master
    `),
    many(`
      SELECT id, name, region_group, sort_order
      FROM island_travel_region
      ORDER BY sort_order, name
    `),
    many(`
      SELECT travel_region_id AS id, travel_region_name AS name, count(*)::int AS count
      FROM island_master
      WHERE travel_region_id IS NOT NULL
      GROUP BY travel_region_id, travel_region_name
      ORDER BY count DESC, name
      LIMIT 30
    `),
    many(`
      SELECT forecast_location_id AS id, forecast_location_name AS name, count(*)::int AS count
      FROM island_master
      WHERE forecast_location_id IS NOT NULL
      GROUP BY forecast_location_id, forecast_location_name
      ORDER BY count DESC, name
      LIMIT 30
    `),
    one(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE active = true)::int AS active,
        count(*) FILTER (WHERE island_key IS NOT NULL)::int AS with_island_key
      FROM recommended_island
    `),
    one(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE travel_region_id IS NOT NULL)::int AS with_travel_region,
        count(*) FILTER (WHERE matched_island_id IS NOT NULL)::int AS with_island,
        count(*) FILTER (WHERE source_dataset_pk = 'GGTOUR_OPEN_API')::int AS ggtour
      FROM travel_asset
    `),
    many(`
      SELECT travel_region_id AS id, travel_region_name AS name, count(*)::int AS count
      FROM travel_asset
      WHERE travel_region_id IS NOT NULL
      GROUP BY travel_region_id, travel_region_name
      ORDER BY count DESC, name
      LIMIT 30
    `),
    many(`
      SELECT target_type AS "targetType", count(*)::int AS count
      FROM travel_asset_match
      GROUP BY target_type
      ORDER BY count DESC
    `),
    many(`
      SELECT r.island_name AS "islandName", r.province_name AS "provinceName", r.city_name AS "cityName",
             im.travel_region_name AS "travelRegionName", im.forecast_location_name AS "forecastRegionName"
      FROM recommended_island r
      LEFT JOIN LATERAL (
        SELECT *
        FROM island_master im
        WHERE im.island_name = r.island_name
           OR im.island_name = regexp_replace(r.island_name, '(도|섬)$', '')
           OR r.island_name = regexp_replace(im.island_name, '(도|섬)$', '')
        ORDER BY
          CASE WHEN split_part(im.legal_dong_name, ' ', 1) = r.province_name THEN 0 ELSE 1 END,
          CASE WHEN im.legal_dong_name ILIKE '%' || COALESCE(r.city_name, '') || '%' THEN 0 ELSE 1 END
        LIMIT 1
      ) im ON true
      WHERE r.active = true
      ORDER BY r.priority DESC, r.island_name
      LIMIT 10
    `),
    many(`
      SELECT name, category, province, city, matched_island_name AS "matchedIslandName",
             travel_region_name AS "travelRegionName", match_score AS "matchScore"
      FROM travel_asset
      ORDER BY match_score DESC, name
      LIMIT 10
    `)
  ]);

  const diagnostics = {
    islandMaster: islandCounts,
    travelRegionMaster: {
      count: travelRegions.length,
      rows: travelRegions
    },
    islandsByTravelRegion,
    islandsByForecastRegion,
    recommendedIsland: recommendedCounts,
    travelAsset: travelAssetCounts,
    travelAssetsByTravelRegion: travelAssetRegionCounts,
    travelAssetMatches: travelAssetMatchCounts,
    samples: {
      recommendedIslands: recommendedSamples,
      travelAssets: travelAssetSamples
    },
    checks: buildChecks({
      islandCounts,
      travelRegions,
      islandsByTravelRegion,
      recommendedCounts,
      travelAssetCounts
    })
  };

  console.log(JSON.stringify(diagnostics, null, 2));
}

function buildChecks({ islandCounts, travelRegions, islandsByTravelRegion, recommendedCounts, travelAssetCounts }) {
  return [
    check('island_master has rows', Number(islandCounts.total) > 0, `${islandCounts.total} islands`),
    check('island_travel_region has master rows', travelRegions.length > 0, `${travelRegions.length} regions`),
    check('island_master has travel region mapping', Number(islandCounts.with_travel_region) > 0, `${islandCounts.with_travel_region}/${islandCounts.total} mapped`),
    check('travel region list can be shown', islandsByTravelRegion.length > 0, `${islandsByTravelRegion.length} populated regions`),
    check('recommended island master has active rows', Number(recommendedCounts.active) > 0, `${recommendedCounts.active} active recommended islands`),
    check('travel assets have rows', Number(travelAssetCounts.total) > 0, `${travelAssetCounts.total} travel assets`),
    check('travel assets have travel region mapping', Number(travelAssetCounts.with_travel_region) > 0, `${travelAssetCounts.with_travel_region}/${travelAssetCounts.total} mapped`)
  ];
}

function check(name, ok, detail) {
  return { name, ok, detail };
}

async function one(sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  return rows[0] ?? {};
}

async function many(sql) {
  return prisma.$queryRawUnsafe(sql);
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
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
