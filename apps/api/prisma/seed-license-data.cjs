const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));

const prisma = new PrismaClient();
const dataRoot = path.resolve(process.argv[2] || path.resolve(__dirname, '../../../ref_data/인허가'));

const GROUPS = [
  {
    group: 'LODGING',
    table: 'license_lodging',
    dir: '숙박',
    files: {
      '문화_숙박업.csv': '숙박업',
      '문화_관광숙박업.csv': '관광숙박업',
      '문화_관광펜션업.csv': '관광펜션업',
      '문화_농어촌민박업.csv': '농어촌민박업'
    },
    columns: {
      room_count: ['객실수'],
      korean_room_count: ['한실수'],
      western_room_count: ['양실수'],
      breakfast_available: ['조식제공여부'],
      toilet_count: ['화장실수']
    }
  },
  {
    group: 'RESTAURANT',
    table: 'license_restaurant',
    dir: '식당',
    files: {
      '식품_관광식당.csv': '관광식당',
      '식품_일반음식점.csv': '일반음식점',
      '식품_휴게음식점.csv': '휴게음식점',
      '식품_제과점영업.csv': '제과점영업',
      '식품_관광유흥음식점업.csv': '관광유흥음식점업',
      '모범음식점정보.csv': '모범음식점'
    },
    columns: {
      hygiene_category: ['위생업태명', '업태구분명'],
      main_food: ['전통업소주된음식', '대표메뉴', '주된음식'],
      homepage: ['홈페이지'],
      facility_scale: ['시설총규모', '시설규모']
    }
  },
  {
    group: 'CAMPING',
    table: 'license_camping',
    dir: '캠핑',
    files: {
      '문화_일반야영장업.csv': '일반야영장업',
      '문화_자동차야영장업.csv': '자동차야영장업'
    },
    columns: {
      room_count: ['객실수'],
      facility_scale: ['시설규모'],
      facility_area: ['시설면적'],
      insurance_org: ['보험기관명'],
      environment_name: ['주변환경명']
    }
  },
  {
    group: 'FACILITY',
    table: 'license_facility',
    dir: '편의시설',
    files: {
      '공중화장실정보.csv': '공중화장실',
      '낚시터정보.csv': '낚시터'
    },
    columns: {
      manager_name: ['관리기관명'],
      open_hours: ['개방시간상세', '개방시간'],
      fee: ['이용요금'],
      fish_species: ['주요어종'],
      amenities: ['편익시설현황', '기저귀교환대장소'],
      safety_facilities: ['안전시설현황', '비상벨설치장소', '비상벨설치여부'],
      nearby_attractions: ['주변관광지']
    }
  },
  {
    group: 'MEDICAL',
    table: 'license_medical',
    dir: '의료',
    files: {
      '건강_의료법인.csv': '의료법인'
    },
    columns: {
      medical_type: ['의료기관종별명'],
      departments: ['진료과목내용명', '진료과목내용'],
      bed_count: ['병상수'],
      doctor_count: ['의료인수'],
      room_count: ['입원실수']
    }
  }
];

const COMMON_KEYS = {
  management_no: ['관리번호', '번호', '데이터관리번호'],
  place_name: ['사업장명', '업소명', '화장실명', '낚시터명', '명칭'],
  business_status: ['영업상태명', '운영상태', '상태'],
  detail_status: ['상세영업상태명', '상세상태'],
  category_name: ['업태구분명', '위생업태명', '문화체육업종명', '구분명', '낚시터유형'],
  road_address: ['도로명주소', '소재지도로명주소', '도로명전체주소'],
  lot_address: ['지번주소', '소재지지번주소', '소재지전체주소'],
  phone: ['전화번호', '소재지전화', '낚시터전화번호', '관리기관전화번호'],
  permit_date: ['인허가일자', '허가일자', '신고일자'],
  close_date: ['폐업일자'],
  x: ['좌표정보(X)'],
  y: ['좌표정보(Y)'],
  latitude: ['WGS84위도', '위도'],
  longitude: ['WGS84경도', '경도']
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

function pick(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
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

function toLatitude(value) {
  const parsed = toNumber(value);
  return parsed !== null && parsed >= -90 && parsed <= 90 ? parsed : null;
}

function toLongitude(value) {
  const parsed = toNumber(value);
  return parsed !== null && parsed >= -180 && parsed <= 180 ? parsed : null;
}

function toDate(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  let year;
  let month;
  let day;
  if (/^\d{8}$/.test(normalized)) {
    year = normalized.slice(0, 4);
    month = normalized.slice(4, 6);
    day = normalized.slice(6, 8);
  } else if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    [year, month, day] = normalized.slice(0, 10).split('-');
  } else {
    return null;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
}

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];
    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      fields.push(field);
      field = '';
      continue;
    }
    field += char;
  }

  fields.push(field);
  return fields.map((value) => value.trim());
}

function detectEncoding(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(65536);
  const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);
  const utf8 = new TextDecoder('utf-8').decode(buffer.subarray(0, bytesRead));
  return (utf8.match(/\uFFFD/g) || []).length > 5 ? 'euc-kr' : 'utf-8';
}

async function readCsvRows(filePath, onRow) {
  const decoder = new TextDecoder(detectEncoding(filePath));
  const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
  let headers = null;
  let remainder = '';

  for await (const chunk of stream) {
    const text = remainder + decoder.decode(chunk, { stream: true });
    const lines = text.split(/\r?\n/);
    remainder = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const values = parseCsvLine(line.replace(/^\uFEFF/, ''));
      if (!headers) {
        headers = values;
        continue;
      }
      await onRow(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
    }
  }

  const tail = remainder + decoder.decode();
  if (tail.trim()) {
    const values = parseCsvLine(tail.replace(/^\uFEFF/, ''));
    if (!headers) headers = values;
    else await onRow(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  }
}

function stableId(parts) {
  return crypto.createHash('sha1').update(parts.filter(Boolean).join('|')).digest('hex');
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, '');
}

function createIslandMatchers(islands) {
  const matchers = [];
  for (const island of islands) {
    const islandName = normalizeText(island.island_name);
    const islandStem = islandName.replace(/[도섬]$/, '');
    const legalDongName = String(island.legal_dong_name ?? '').trim();
    const legalParts = legalDongName.split(/\s+/).filter(Boolean);
    const terms = new Map();

    if (islandName.length >= 2) terms.set(islandName, { type: 'ISLAND_NAME', score: 100 });
    if (islandStem.length >= 2) {
      terms.set(islandStem, { type: 'ISLAND_ALIAS', score: 96 });
      terms.set(`${islandStem}면`, { type: 'ISLAND_ADMIN_ALIAS', score: 98 });
      terms.set(`${islandStem}리`, { type: 'ISLAND_ADMIN_ALIAS', score: 92 });
    }
    const legalScore = legalParts.length >= 3 ? 90 : 42;
    if (legalDongName.length >= 2) terms.set(normalizeText(legalDongName), { type: 'LEGAL_DONG_FULL', score: legalScore });
    for (const part of legalParts) {
      if (part.length >= 2) terms.set(normalizeText(part), { type: /[읍면동리]$/.test(part) ? 'LEGAL_DONG_PART' : 'ADMIN_PART', score: /[읍면동리]$/.test(part) ? 82 : 30 });
    }

    for (const [term, meta] of terms) {
      matchers.push({
        islandKey: island.island_key,
        islandName: island.island_name,
        legalDongName: island.legal_dong_name,
        term,
        ...meta
      });
    }
  }

  return matchers.sort((a, b) => b.term.length - a.term.length || b.score - a.score);
}

function indexMatchers(matchers) {
  const index = new Map();
  for (const matcher of matchers) {
    const lead = matcher.term[0];
    if (!lead) continue;
    const bucket = index.get(lead) ?? [];
    bucket.push(matcher);
    index.set(lead, bucket);
  }
  for (const bucket of index.values()) {
    bucket.sort((a, b) => b.term.length - a.term.length || b.score - a.score);
  }
  return index;
}

function findMatch(record, matcherIndex) {
  const targets = [
    { type: 'ROAD_ADDRESS', text: pick(record, COMMON_KEYS.road_address), bonus: 8 },
    { type: 'LOT_ADDRESS', text: pick(record, COMMON_KEYS.lot_address), bonus: 10 },
    { type: 'PLACE_NAME', text: pick(record, COMMON_KEYS.place_name), bonus: 0 }
  ];

  let best = null;
  for (const target of targets) {
    const normalized = normalizeText(target.text);
    if (!normalized) continue;
    const candidateMatchers = uniqueChars(normalized).flatMap((char) => matcherIndex.get(char) ?? []);
    const found = candidateMatchers.find((matcher) => normalized.includes(matcher.term));
    if (!found) continue;
    const candidate = {
      ...found,
      type: target.type === 'PLACE_NAME' ? found.type : target.type,
      score: Math.min(100, found.score + target.bonus)
    };
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
}

function uniqueChars(text) {
  return [...new Set(text.split(''))];
}

function isClosed(record) {
  return /폐업|취소|말소|직권말소/.test([pick(record, COMMON_KEYS.business_status), pick(record, COMMON_KEYS.detail_status)].filter(Boolean).join(' '));
}

function baseRecord(group, fileName, licenseType, record, referenceDate) {
  const name = pick(record, COMMON_KEYS.place_name);
  if (!name) return null;
  const managementNo = pick(record, COMMON_KEYS.management_no);
  return {
    id: stableId([group.group, fileName, licenseType, managementNo, name, pick(record, COMMON_KEYS.road_address), pick(record, COMMON_KEYS.lot_address)]),
    source_file: fileName,
    license_type: licenseType,
    management_no: managementNo,
    place_name: name,
    business_status: pick(record, COMMON_KEYS.business_status),
    detail_status: pick(record, COMMON_KEYS.detail_status),
    category_name: pick(record, COMMON_KEYS.category_name) ?? licenseType,
    road_address: pick(record, COMMON_KEYS.road_address),
    lot_address: pick(record, COMMON_KEYS.lot_address),
    phone: pick(record, COMMON_KEYS.phone),
    permit_date: toDate(pick(record, COMMON_KEYS.permit_date)),
    close_date: toDate(pick(record, COMMON_KEYS.close_date)),
    x: toNumber(pick(record, COMMON_KEYS.x)),
    y: toNumber(pick(record, COMMON_KEYS.y)),
    latitude: toLatitude(pick(record, COMMON_KEYS.latitude)),
    longitude: toLongitude(pick(record, COMMON_KEYS.longitude)),
    extra: JSON.stringify(record),
    reference_date: referenceDate
  };
}

function projectRecord(group, fileName, licenseType, record, referenceDate) {
  const base = baseRecord(group, fileName, licenseType, record, referenceDate);
  if (!base) return null;

  const projected = { ...base };
  for (const [column, keys] of Object.entries(group.columns)) {
    const value = pick(record, keys);
    if (/_count$/.test(column)) projected[column] = toInt(value);
    else if (/scale|area/.test(column)) projected[column] = toNumber(value);
    else projected[column] = value;
  }

  if (group.group !== 'FACILITY') {
    delete projected.latitude;
    delete projected.longitude;
  }
  if (group.group === 'FACILITY') {
    delete projected.business_status;
    delete projected.detail_status;
    delete projected.permit_date;
    delete projected.close_date;
    delete projected.x;
    delete projected.y;
  }
  return projected;
}

function matchRecord(group, projected, match) {
  return {
    id: stableId([match.islandKey, group.group, projected.id]),
    island_key: match.islandKey,
    island_name: match.islandName,
    legal_dong_name: match.legalDongName,
    license_group: group.group,
    license_table: group.table,
    license_id: projected.id,
    match_type: match.type,
    match_keyword: match.term,
    match_score: match.score
  };
}

async function insertRows(table, rows) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const offset = rowIndex * columns.length;
    columns.forEach((column) => values.push(row[column] ?? null));
    return `(${columns.map((column, columnIndex) => cast(column, offset + columnIndex + 1)).join(', ')}, CURRENT_TIMESTAMP)`;
  });
  const setColumns = columns.filter((column) => column !== 'id');
  const sql = `
    INSERT INTO ${table} (${columns.map((column) => `"${column}"`).join(', ')}, "updated_at")
    VALUES ${placeholders.join(', ')}
    ON CONFLICT ("id") DO UPDATE SET
      ${setColumns.map((column) => `"${column}" = EXCLUDED."${column}"`).join(', ')},
      "updated_at" = CURRENT_TIMESTAMP
  `;
  await prisma.$executeRawUnsafe(sql, ...values);
}

async function insertMatches(rows) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const offset = rowIndex * columns.length;
    columns.forEach((column) => values.push(row[column] ?? null));
    return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(', ')})`;
  });
  const sql = `
    INSERT INTO island_license_match (${columns.map((column) => `"${column}"`).join(', ')})
    VALUES ${placeholders.join(', ')}
    ON CONFLICT ("island_key", "license_group", "license_id") DO UPDATE SET
      "match_type" = EXCLUDED."match_type",
      "match_keyword" = EXCLUDED."match_keyword",
      "match_score" = EXCLUDED."match_score"
  `;
  await prisma.$executeRawUnsafe(sql, ...values);
}

async function rebuildKeywordMaster() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE island_license_keyword');
  await prisma.$executeRawUnsafe(`
    INSERT INTO island_license_keyword (
      "id",
      "island_key",
      "island_name",
      "legal_dong_name",
      "match_keyword",
      "normalized_keyword",
      "source_match_count",
      "updated_at"
    )
    SELECT
      md5("island_key" || '|' || "match_keyword") AS "id",
      "island_key",
      "island_name",
      MIN("legal_dong_name") AS "legal_dong_name",
      "match_keyword",
      regexp_replace("match_keyword", '\\s+', '', 'g') AS "normalized_keyword",
      COUNT(*)::integer AS "source_match_count",
      CURRENT_TIMESTAMP
    FROM island_license_match
    GROUP BY "island_key", "island_name", "match_keyword"
    ON CONFLICT ("island_key", "match_keyword") DO UPDATE SET
      "island_name" = EXCLUDED."island_name",
      "legal_dong_name" = EXCLUDED."legal_dong_name",
      "normalized_keyword" = EXCLUDED."normalized_keyword",
      "source_match_count" = EXCLUDED."source_match_count",
      "updated_at" = CURRENT_TIMESTAMP
  `);
}

function cast(column, index) {
  const placeholder = `$${index}`;
  if (['permit_date', 'close_date', 'reference_date'].includes(column)) return `${placeholder}::date`;
  if (['x', 'y'].includes(column)) return `${placeholder}::numeric(14,7)`;
  if (['latitude', 'longitude'].includes(column)) return `${placeholder}::numeric(10,7)`;
  if (/scale|area/.test(column)) return `${placeholder}::numeric(14,3)`;
  if (column === 'extra') return `${placeholder}::jsonb`;
  return placeholder;
}

async function main() {
  if (!fs.existsSync(dataRoot)) throw new Error(`License data directory was not found: ${dataRoot}`);
  const islands = await prisma.$queryRawUnsafe(`
    SELECT island_key, island_name, legal_dong_name
    FROM island_master
    WHERE island_key IS NOT NULL AND island_name IS NOT NULL
  `);
  const matchers = createIslandMatchers(islands);
  const matcherIndex = indexMatchers(matchers);
  if (matchers.length === 0) throw new Error('No island master data found. Run db:seed:islands first.');

  await prisma.$executeRawUnsafe('TRUNCATE TABLE island_license_match');
  for (const group of GROUPS) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${group.table}`);

  for (const group of GROUPS) {
    for (const [fileName, licenseType] of Object.entries(group.files)) {
      const filePath = path.join(dataRoot, group.dir, fileName);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skipped missing file: ${filePath}`);
        continue;
      }

      const referenceDate = fs.statSync(filePath).mtime.toISOString().slice(0, 10);
      const rows = [];
      const matches = [];
      let scanned = 0;
      let imported = 0;

      await readCsvRows(filePath, async (record) => {
        scanned += 1;
        if (isClosed(record)) return;

        const projected = projectRecord(group, fileName, licenseType, record, referenceDate);
        if (!projected) return;

        const match = findMatch(record, matcherIndex);
        if (!match) return;

        rows.push(projected);
        matches.push(matchRecord(group, projected, match));
        imported += 1;

        if (rows.length >= 500) {
          await insertRows(group.table, rows.splice(0, rows.length));
          await insertMatches(matches.splice(0, matches.length));
        }
      });

      await insertRows(group.table, rows);
      await insertMatches(matches);
      console.log(`${group.dir}/${fileName}: scanned ${scanned.toLocaleString()}, imported ${imported.toLocaleString()}`);
    }
  }

  await rebuildKeywordMaster();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
