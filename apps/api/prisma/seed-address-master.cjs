const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();
const dataRoot = path.resolve(process.argv[2] || path.resolve(__dirname, '../../../ref_data/\uC8FC\uC18C/zipcode_DB'));
const BATCH_SIZE = 2500;

const FIELDS = [
  'zipCode',
  'sido',
  'sidoEnglish',
  'sigungu',
  'sigunguEnglish',
  'eupmyeon',
  'eupmyeonEnglish',
  'roadNameCode',
  'roadName',
  'roadNameEnglish',
  'basementFlag',
  'buildingMainNo',
  'buildingSubNo',
  'buildingManagementNo',
  'bulkDeliveryName',
  'buildingName',
  'legalDongCode',
  'legalDongName',
  'riName',
  'administrativeDongName',
  'mountainFlag',
  'lotMainNo',
  'eupmyeondongSerialNo',
  'lotSubNo',
  'oldZipCode',
  'zipSerialNo'
];

const MARINE_REGION_RULES = [
  { id: 'incheon-coast', keywords: ['인천광역시', '경기도 김포시', '경기도 안산시', '경기도 화성시', '경기도 시흥시'] },
  { id: 'boryeong-coast', keywords: ['충청남도 보령시', '충청남도 서천군', '충청남도 서산시', '충청남도 태안군', '충청남도 홍성군', '충청남도 당진시'] },
  { id: 'gunsan-coast', keywords: ['전북특별자치도 군산시', '전북특별자치도 부안군', '전북특별자치도 고창군', '충청남도 서천군'] },
  { id: 'mokpo-coast', keywords: ['전라남도 목포시', '전라남도 신안군', '전라남도 무안군', '전라남도 영광군', '전라남도 함평군'] },
  { id: 'jindo-coast', keywords: ['전라남도 진도군', '전라남도 해남군'] },
  { id: 'wando-coast', keywords: ['전라남도 완도군', '전라남도 강진군', '전라남도 장흥군'] },
  { id: 'yeosu-coast', keywords: ['전라남도 여수시', '전라남도 고흥군', '전라남도 보성군', '전라남도 광양시', '전라남도 순천시'] },
  { id: 'tongyeong-coast', keywords: ['경상남도 통영시', '경상남도 사천시', '경상남도 남해군', '경상남도 하동군', '경상남도 고성군'] },
  { id: 'geoje-coast', keywords: ['경상남도 거제시', '경상남도 창원시'] },
  { id: 'busan-coast', keywords: ['부산광역시'] },
  { id: 'ulsan-coast', keywords: ['울산광역시'] },
  { id: 'pohang-coast', keywords: ['경상북도 포항시', '경상북도 경주시', '경상북도 영덕군', '경상북도 울진군', '강원특별자치도 고성군', '강원특별자치도 속초시', '강원특별자치도 양양군', '강원특별자치도 강릉시', '강원특별자치도 동해시', '강원특별자치도 삼척시'] },
  { id: 'ulleung', keywords: ['경상북도 울릉군'] },
  { id: 'jeju-coast', keywords: ['제주특별자치도 제주시'] },
  { id: 'seogwipo-coast', keywords: ['제주특별자치도 서귀포시'] }
];

const TRAVEL_REGION_RULES = [
  { id: 'west5-baengnyeong', keywords: ['인천광역시 옹진군 백령', '인천광역시 옹진군 대청', '인천광역시 옹진군 소청', '인천광역시 옹진군 연평'] },
  { id: 'ongjin-deokjeok', keywords: ['인천광역시 옹진군 덕적', '인천광역시 옹진군 자월', '인천광역시 옹진군 승봉', '인천광역시 옹진군 이작', '인천광역시 옹진군 굴업', '인천광역시 옹진군 문갑', '인천광역시 옹진군 소야'] },
  { id: 'ganghwa-gyeonggi-bay', keywords: ['인천광역시 강화군', '인천광역시 중구 영종', '인천광역시 중구 무의', '경기도 김포시', '경기도 안산시 대부', '경기도 화성시 제부', '경기도 시흥시'] },
  { id: 'taean-boryeong-seocheon', keywords: ['충청남도 태안군', '충청남도 보령시', '충청남도 서천군', '충청남도 서산시', '충청남도 당진시', '충청남도 홍성군'] },
  { id: 'gunsan-buan-gogunsan', keywords: ['전북특별자치도 군산시', '전북특별자치도 부안군', '전북특별자치도 고창군'] },
  { id: 'mokpo-shinan-north', keywords: ['전라남도 목포시', '전라남도 신안군', '전라남도 무안군', '전라남도 영광군', '전라남도 함평군'] },
  { id: 'heuksan-hongdo-remote', keywords: ['전라남도 신안군 흑산', '전라남도 신안군 홍도', '전라남도 신안군 가거', '전라남도 신안군 만재'] },
  { id: 'jindo-haenam', keywords: ['전라남도 진도군', '전라남도 해남군'] },
  { id: 'wando-cheongsan-bogil', keywords: ['전라남도 완도군', '전라남도 강진군', '전라남도 장흥군'] },
  { id: 'yeosu-goheung-central', keywords: ['전라남도 여수시', '전라남도 고흥군', '전라남도 보성군', '전라남도 광양시', '전라남도 순천시'] },
  { id: 'sacheon-namhae-hadong', keywords: ['경상남도 사천시', '경상남도 남해군', '경상남도 하동군', '경상남도 고성군'] },
  { id: 'tongyeong-hallyeo', keywords: ['경상남도 통영시'] },
  { id: 'geoje-changwon-east', keywords: ['경상남도 거제시', '경상남도 창원시'] },
  { id: 'busan-ulsan-southeast', keywords: ['부산광역시', '울산광역시'] },
  { id: 'gangwon-east-coast', keywords: ['강원특별자치도 고성군', '강원특별자치도 속초시', '강원특별자치도 양양군', '강원특별자치도 강릉시', '강원특별자치도 동해시', '강원특별자치도 삼척시'] },
  { id: 'pohang-east-ulleung', keywords: ['경상북도 포항시', '경상북도 경주시', '경상북도 영덕군', '경상북도 울진군', '경상북도 울릉군'] },
  { id: 'jeju-north', keywords: ['제주특별자치도 제주시'] },
  { id: 'jeju-south-seogwipo', keywords: ['제주특별자치도 서귀포시'] }
];

const INLAND_EXCLUDE_RULES = [
  '충청북도',
  '대전광역시',
  '세종특별자치시',
  '서울특별시',
  '광주광역시',
  '대구광역시',
  '경기도 가평군',
  '경기도 고양시',
  '경기도 과천시',
  '경기도 광명시',
  '경기도 광주시',
  '경기도 구리시',
  '경기도 군포시',
  '경기도 남양주시',
  '경기도 동두천시',
  '경기도 부천시',
  '경기도 성남시',
  '경기도 수원시',
  '경기도 안성시',
  '경기도 안양시',
  '경기도 양주시',
  '경기도 양평군',
  '경기도 여주시',
  '경기도 연천군',
  '경기도 오산시',
  '경기도 용인시',
  '경기도 의왕시',
  '경기도 의정부시',
  '경기도 이천시',
  '경기도 파주시',
  '경기도 평택시',
  '경기도 포천시',
  '경기도 하남시',
  '충청남도 공주시',
  '충청남도 계룡시',
  '충청남도 논산시',
  '충청남도 금산군',
  '충청남도 부여군',
  '충청남도 청양군',
  '충청남도 예산군',
  '충청남도 천안시',
  '충청남도 아산시',
  '전북특별자치도 전주시',
  '전북특별자치도 익산시',
  '전북특별자치도 정읍시',
  '전북특별자치도 남원시',
  '전북특별자치도 김제시',
  '전북특별자치도 완주군',
  '전북특별자치도 진안군',
  '전북특별자치도 무주군',
  '전북특별자치도 장수군',
  '전북특별자치도 임실군',
  '전북특별자치도 순창군',
  '전라남도 나주시',
  '전라남도 담양군',
  '전라남도 곡성군',
  '전라남도 구례군',
  '전라남도 화순군',
  '전라남도 장성군',
  '경상북도 김천시',
  '경상북도 안동시',
  '경상북도 구미시',
  '경상북도 영주시',
  '경상북도 영천시',
  '경상북도 상주시',
  '경상북도 문경시',
  '경상북도 경산시',
  '경상북도 군위군',
  '경상북도 의성군',
  '경상북도 청송군',
  '경상북도 영양군',
  '경상북도 청도군',
  '경상북도 고령군',
  '경상북도 성주군',
  '경상북도 칠곡군',
  '경상북도 예천군',
  '경상북도 봉화군',
  '경상남도 진주시',
  '경상남도 김해시',
  '경상남도 밀양시',
  '경상남도 양산시',
  '경상남도 의령군',
  '경상남도 함안군',
  '경상남도 창녕군',
  '경상남도 산청군',
  '경상남도 함양군',
  '경상남도 거창군',
  '경상남도 합천군',
  '강원특별자치도 춘천시',
  '강원특별자치도 원주시',
  '강원특별자치도 태백시',
  '강원특별자치도 홍천군',
  '강원특별자치도 횡성군',
  '강원특별자치도 영월군',
  '강원특별자치도 평창군',
  '강원특별자치도 정선군',
  '강원특별자치도 철원군',
  '강원특별자치도 화천군',
  '강원특별자치도 양구군',
  '강원특별자치도 인제군'
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

function stableId(parts) {
  return crypto.createHash('sha1').update(parts.filter(Boolean).join('|')).digest('hex');
}

function parseLine(line) {
  const values = line.replace(/^\uFEFF/, '').split('|');
  return Object.fromEntries(FIELDS.map((field, index) => [field, values[index] ?? '']));
}

function value(record, key) {
  const text = record[key];
  return text === undefined || text === '' ? null : text;
}

function toInt(text) {
  if (text === undefined || text === null || text === '') return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) ? parsed : null;
}

function toBooleanFlag(text) {
  return text === '1';
}

function normalize(text) {
  return String(text ?? '').replace(/\s+/g, '').toLowerCase();
}

function getAddressKey(record) {
  return [value(record, 'sido'), value(record, 'sigungu'), value(record, 'eupmyeon'), value(record, 'legalDongName'), value(record, 'riName')]
    .filter(Boolean)
    .join(' ');
}

function createFullRoadAddress(record) {
  const buildingNo = [value(record, 'buildingMainNo'), value(record, 'buildingSubNo')]
    .filter((part, index) => part && (index === 0 || part !== '0'))
    .join('-');
  return [
    value(record, 'sido'),
    value(record, 'sigungu'),
    value(record, 'eupmyeon'),
    value(record, 'roadName'),
    buildingNo,
    value(record, 'buildingName') || value(record, 'bulkDeliveryName')
  ]
    .filter(Boolean)
    .join(' ');
}

function createFullLotAddress(record) {
  const lotNo = [value(record, 'lotMainNo'), value(record, 'lotSubNo')]
    .filter((part, index) => part && (index === 0 || part !== '0'))
    .join('-');
  const mountain = toBooleanFlag(value(record, 'mountainFlag')) ? '산' : null;
  return [
    value(record, 'sido'),
    value(record, 'sigungu'),
    value(record, 'eupmyeon'),
    value(record, 'legalDongName'),
    value(record, 'riName'),
    mountain,
    lotNo,
    value(record, 'buildingName') || value(record, 'bulkDeliveryName')
  ]
    .filter(Boolean)
    .join(' ');
}

function findRegion(record, rules, lookup, fallbackScore) {
  const normalizedAddress = normalize(getAddressKey(record));
  const rule = rules.find((candidate) => candidate.keywords.some((keyword) => normalizedAddress.includes(normalize(keyword))));
  if (!rule) return null;
  const item = lookup.get(rule.id);
  return {
    id: rule.id,
    name: item?.label ?? item?.name ?? rule.id,
    matchType: 'ADDRESS_RULE',
    matchScore: item ? 70 : fallbackScore
  };
}

function isInlandExcluded(record) {
  const normalizedAddress = normalize(getAddressKey(record));
  return INLAND_EXCLUDE_RULES.some((keyword) => normalizedAddress.includes(normalize(keyword)));
}

function toAddressRow(record, sourceFile, referenceDate, locationsById, travelRegionsById) {
  const fullRoadAddress = createFullRoadAddress(record);
  const fullLotAddress = createFullLotAddress(record);
  const marineRegion = findRegion(record, MARINE_REGION_RULES, locationsById, 55);
  const travelRegion = isInlandExcluded(record) ? null : findRegion(record, TRAVEL_REGION_RULES, travelRegionsById, 55);
  const id = stableId([
    value(record, 'buildingManagementNo'),
    value(record, 'zipCode'),
    fullRoadAddress,
    fullLotAddress,
    value(record, 'zipSerialNo')
  ]);

  return {
    id,
    zip_code: value(record, 'zipCode'),
    sido: value(record, 'sido'),
    sido_english: value(record, 'sidoEnglish'),
    sigungu: value(record, 'sigungu'),
    sigungu_english: value(record, 'sigunguEnglish'),
    eupmyeon: value(record, 'eupmyeon'),
    eupmyeon_english: value(record, 'eupmyeonEnglish'),
    road_name_code: value(record, 'roadNameCode'),
    road_name: value(record, 'roadName'),
    road_name_english: value(record, 'roadNameEnglish'),
    basement_flag: toBooleanFlag(value(record, 'basementFlag')),
    building_main_no: toInt(value(record, 'buildingMainNo')),
    building_sub_no: toInt(value(record, 'buildingSubNo')),
    building_management_no: value(record, 'buildingManagementNo'),
    bulk_delivery_name: value(record, 'bulkDeliveryName'),
    building_name: value(record, 'buildingName'),
    legal_dong_code: value(record, 'legalDongCode'),
    legal_dong_name: value(record, 'legalDongName'),
    ri_name: value(record, 'riName'),
    administrative_dong_name: value(record, 'administrativeDongName'),
    mountain_flag: toBooleanFlag(value(record, 'mountainFlag')),
    lot_main_no: toInt(value(record, 'lotMainNo')),
    eupmyeondong_serial_no: value(record, 'eupmyeondongSerialNo'),
    lot_sub_no: toInt(value(record, 'lotSubNo')),
    old_zip_code: value(record, 'oldZipCode'),
    zip_serial_no: value(record, 'zipSerialNo'),
    full_road_address: fullRoadAddress,
    full_lot_address: fullLotAddress,
    normalized_address: normalize(`${fullRoadAddress} ${fullLotAddress}`),
    marine_region_id: marineRegion?.id ?? null,
    marine_region_name: marineRegion?.name ?? null,
    marine_region_match_type: marineRegion?.matchType ?? null,
    marine_region_match_score: marineRegion?.matchScore ?? null,
    travel_region_id: travelRegion?.id ?? null,
    travel_region_name: travelRegion?.name ?? null,
    travel_region_match_type: travelRegion?.matchType ?? null,
    travel_region_match_score: travelRegion?.matchScore ?? null,
    source_file: sourceFile,
    reference_date: referenceDate
  };
}

async function insertRows(rows) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const tuples = rows.map((row) => `(${columns.map((column) => sqlValue(column, row[column])).join(', ')}, CURRENT_TIMESTAMP)`);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO address_master (${columns.map((column) => `"${column}"`).join(', ')}, "updated_at")
      VALUES ${tuples.join(', ')}
    `
  );
}

function sqlValue(column, value) {
  if (value === undefined || value === null) return 'NULL';
  if (column === 'reference_date') return `${quoteSql(value)}::date`;
  if (/_flag$/.test(column)) return value ? 'TRUE' : 'FALSE';
  if (/_no$/.test(column) && !['building_management_no', 'eupmyeondong_serial_no', 'zip_serial_no'].includes(column)) return Number.isFinite(value) ? String(value) : 'NULL';
  if (column === 'marine_region_match_score' || column === 'travel_region_match_score') return Number.isFinite(value) ? String(value) : 'NULL';
  return quoteSql(value);
}

function quoteSql(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function readAddressFile(filePath, locationsById, travelRegionsById) {
  const sourceFile = path.basename(filePath);
  const referenceDate = fs.statSync(filePath).mtime.toISOString().slice(0, 10);
  const input = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const rows = [];
  let isHeader = true;
  let scanned = 0;
  let imported = 0;
  let travelMatched = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }
    scanned += 1;
    const record = parseLine(line);
    if (!value(record, 'zipCode') || !value(record, 'sido')) continue;
    const row = toAddressRow(record, sourceFile, referenceDate, locationsById, travelRegionsById);
    if (row.travel_region_id) travelMatched += 1;
    rows.push(row);
    imported += 1;
    if (rows.length >= BATCH_SIZE) {
      await insertRows(rows.splice(0, rows.length));
    }
  }

  await insertRows(rows);
  console.log(`${sourceFile}: scanned ${scanned.toLocaleString()}, imported ${imported.toLocaleString()}, travel matched ${travelMatched.toLocaleString()}`);
}

async function main() {
  if (!fs.existsSync(dataRoot)) throw new Error(`Address data directory was not found: ${dataRoot}`);
  const locations = await prisma.$queryRawUnsafe('SELECT id, label FROM marine_forecast_location');
  const travelRegions = await prisma.$queryRawUnsafe('SELECT id, name FROM island_travel_region');
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const travelRegionsById = new Map(travelRegions.map((region) => [region.id, region]));
  const files = fs.readdirSync(dataRoot).filter((file) => file.endsWith('.txt')).sort();
  if (files.length === 0) throw new Error(`No address txt files found: ${dataRoot}`);

  await prisma.$executeRawUnsafe('TRUNCATE TABLE address_master');
  for (const file of files) {
    await readAddressFile(path.join(dataRoot, file), locationsById, travelRegionsById);
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
