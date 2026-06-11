const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../ref_api/시간표/해양수산부_해양안전종합정보시스템_여객선 운항정보(KOMSA)_20250828.csv'
);
const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH;
const SOURCE = 'KOMSA_ROUTE_CSV_20250828';
const REFERENCE_DATE = new Date('2025-08-28T00:00:00.000Z');

const CSV_COLUMNS = {
  vesselName: '\uC5EC\uAC1D\uC120\uBA85',
  operatorName: '\uC18C\uC720\uC790\uC0C1\uD638',
  routeName: '\uC6B4\uD56D\uD56D\uB85C\uBA85',
  longitude: '\uACBD\uB3C4',
  latitude: '\uC704\uB3C4'
};

async function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file was not found: ${csvPath}`);
  }

  const islandIndex = buildIslandIndex(
    await prisma.islandMaster.findMany({
      select: { islandKey: true, islandName: true, legalDongName: true }
    })
  );
  const routes = new Map();
  const ports = new Map();
  const lines = readCsvLines(csvPath);
  const header = parseCsvLine(lines[0] ?? '').map((column) => column.trim());
  let rowCount = 0;

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const row = toRow(header, parseCsvLine(line));
    const rawRouteName = cleanValue(row[CSV_COLUMNS.routeName]);
    if (!rawRouteName) continue;

    const routeName = normalizeRouteName(rawRouteName);
    const stopPortNames = parseRouteStops(routeName);
    if (stopPortNames.length < 2) continue;

    const routePairSegments = [
      ...buildRoutePairSegments(stopPortNames),
      ...buildRoutePairSegments([...stopPortNames].reverse())
    ];

    routePairSegments.forEach((pairStopPortNames) => {
      upsertRouteAndPorts(routes, ports, islandIndex, {
        routeName,
        stopPortNames: pairStopPortNames,
        vesselName: row[CSV_COLUMNS.vesselName],
        operatorName: row[CSV_COLUMNS.operatorName],
        latitude: row[CSV_COLUMNS.latitude],
        longitude: row[CSV_COLUMNS.longitude]
      });
    });

    rowCount += 1;
  }

  const routeRecords = [...routes.values()].map((route) => ({
    routeKey: route.routeKey,
    routePairKey: route.routePairKey,
    routeName: route.routeName,
    normalizedRouteName: route.normalizedRouteName,
    departurePortName: route.departurePortName,
    arrivalPortName: route.arrivalPortName,
    stopPortNames: route.stopPortNames,
    vesselNames: [...route.vesselNames].sort((a, b) => a.localeCompare(b, 'ko')),
    operatorNames: [...route.operatorNames].sort((a, b) => a.localeCompare(b, 'ko')),
    waypointCount: route.waypointCount,
    minLatitude: route.minLatitude,
    maxLatitude: route.maxLatitude,
    minLongitude: route.minLongitude,
    maxLongitude: route.maxLongitude,
    source: SOURCE,
    referenceDate: REFERENCE_DATE
  }));

  const portRecords = [...ports.values()].map((port) => ({
    portKey: port.portKey,
    portName: port.portName,
    normalizedPortName: port.normalizedPortName,
    routeCount: port.routeKeys.size,
    departureRouteCount: port.departureRouteKeys.size,
    arrivalRouteCount: port.arrivalRouteKeys.size,
    islandKey: port.island?.islandKey ?? null,
    islandName: port.island?.islandName ?? null,
    legalDongName: port.island?.legalDongName ?? null,
    forecastLocationId: null,
    forecastLocationName: null,
    source: SOURCE,
    referenceDate: REFERENCE_DATE
  }));

  await prisma.$transaction([
    prisma.ferryRouteMaster.deleteMany({ where: { source: SOURCE } }),
    prisma.ferryPortMaster.deleteMany({ where: { source: SOURCE } })
  ]);

  await insertInChunks('ferryRouteMaster', routeRecords);
  await insertInChunks('ferryPortMaster', portRecords);

  console.log(
    `Imported ${routeRecords.length} ferry route pairs and ${portRecords.length} ferry port masters from ${csvPath} (${rowCount} rows scanned).`
  );
}

function readCsvLines(filePath) {
  const buffer = fs.readFileSync(filePath);
  const decoder = new TextDecoder('euc-kr');
  return decoder.decode(buffer).split(/\r?\n/);
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ',' && !quoted) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function toRow(header, columns) {
  return Object.fromEntries(header.map((name, index) => [name, columns[index] ?? '']));
}

function upsertRouteAndPorts(routes, ports, islandIndex, data) {
  const routeKey = makeKey(data.routeName);
  const departurePortName = data.stopPortNames[0];
  const arrivalPortName = data.stopPortNames[data.stopPortNames.length - 1];
  const routePairKey = makeKey([data.routeName, departurePortName, arrivalPortName].join(':'));
  const route = routes.get(routePairKey) ?? {
    routeKey,
    routePairKey,
    routeName: data.routeName,
    normalizedRouteName: normalizeText(data.routeName),
    departurePortName,
    arrivalPortName,
    stopPortNames: data.stopPortNames,
    vesselNames: new Set(),
    operatorNames: new Set(),
    waypointCount: 0,
    minLatitude: null,
    maxLatitude: null,
    minLongitude: null,
    maxLongitude: null
  };

  addSetValue(route.vesselNames, data.vesselName);
  addSetValue(route.operatorNames, data.operatorName);
  updateBounds(route, data.latitude, data.longitude);
  route.waypointCount += 1;
  routes.set(routePairKey, route);

  data.stopPortNames.forEach((portName, index) => {
    const portKey = makeKey(portName);
    const port = ports.get(portKey) ?? {
      portKey,
      portName,
      normalizedPortName: normalizePortName(portName),
      routeKeys: new Set(),
      departureRouteKeys: new Set(),
      arrivalRouteKeys: new Set(),
      island: findIslandMatch(portName, islandIndex)
    };
    port.routeKeys.add(routePairKey);
    if (index === 0) port.departureRouteKeys.add(routePairKey);
    if (index > 0) port.arrivalRouteKeys.add(routePairKey);
    ports.set(portKey, port);
  });
}

function buildRoutePairSegments(stopPortNames) {
  const segments = [];

  for (let startIndex = 0; startIndex < stopPortNames.length - 1; startIndex += 1) {
    for (let endIndex = startIndex + 1; endIndex < stopPortNames.length; endIndex += 1) {
      segments.push(stopPortNames.slice(startIndex, endIndex + 1));
    }
  }

  return segments;
}

function parseRouteStops(routeName) {
  return normalizeRouteName(routeName)
    .split('-')
    .map((part) => cleanPortName(part))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function normalizeRouteName(value) {
  return cleanValue(value)
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s*\[[^\]]*\]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPortName(value) {
  return cleanValue(value)
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValue(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function addSetValue(set, value) {
  const cleaned = cleanValue(value);
  if (cleaned) set.add(cleaned);
}

function updateBounds(route, latitudeValue, longitudeValue) {
  const latitude = toNumber(latitudeValue);
  const longitude = toNumber(longitudeValue);
  if (latitude === null || longitude === null) return;

  route.minLatitude = route.minLatitude === null ? latitude : Math.min(route.minLatitude, latitude);
  route.maxLatitude = route.maxLatitude === null ? latitude : Math.max(route.maxLatitude, latitude);
  route.minLongitude = route.minLongitude === null ? longitude : Math.min(route.minLongitude, longitude);
  route.maxLongitude = route.maxLongitude === null ? longitude : Math.max(route.maxLongitude, longitude);
}

function toNumber(value) {
  const number = Number(cleanValue(value));
  return Number.isFinite(number) ? number : null;
}

function buildIslandIndex(islands) {
  return islands
    .map((island) => ({
      ...island,
      normalizedIslandName: normalizePortName(island.islandName),
      normalizedLegalDongName: normalizeText(island.legalDongName)
    }))
    .sort((a, b) => b.normalizedIslandName.length - a.normalizedIslandName.length);
}

function findIslandMatch(portName, islandIndex) {
  const normalizedPort = normalizePortName(portName);
  if (!normalizedPort) return null;

  return (
    islandIndex.find((island) => island.normalizedIslandName === normalizedPort) ??
    islandIndex.find(
      (island) =>
        normalizedPort.length >= 2 &&
        island.normalizedIslandName.length >= 2 &&
        (island.normalizedIslandName.includes(normalizedPort) || normalizedPort.includes(island.normalizedIslandName))
    ) ??
    null
  );
}

function normalizePortName(value) {
  return normalizeText(value)
    .replace(/여객선터미널/g, '')
    .replace(/연안여객터미널/g, '')
    .replace(/항구/g, '')
    .replace(/항$/g, '')
    .replace(/도$/g, '')
    .replace(/섬$/g, '');
}

function normalizeText(value) {
  return cleanValue(value).replace(/\s/g, '').toLowerCase();
}

function makeKey(value) {
  return normalizeText(value).replace(/[^0-9a-z가-힣]/gi, '-') || 'unknown';
}

async function insertInChunks(modelName, records) {
  const chunkSize = 500;
  for (let index = 0; index < records.length; index += chunkSize) {
    await prisma[modelName].createMany({
      data: records.slice(index, index + chunkSize),
      skipDuplicates: true
    });
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
