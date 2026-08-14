const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();
const repoRoot = path.resolve(__dirname, '../../..');
const cruiseRoot = path.resolve(repoRoot, 'ref_api/크루즈');
const now = new Date();
const args = parseArgs(process.argv.slice(2));

const SOURCES = {
  busan: {
    name: '부산항만공사',
    url: null,
    port: {
      key: 'busan-cruise-terminal',
      name: '부산항',
      region: '부산권',
      city: '부산광역시',
      terminal: '부산항 국제여객터미널'
    }
  },
  yeosu: {
    name: '여수광양항만공사',
    url: null,
    port: {
      key: 'yeosu-cruise-terminal',
      name: '여수항',
      region: '전남 동부권',
      city: '전라남도 여수시',
      terminal: '여수항 크루즈 터미널'
    }
  },
  pohang: {
    name: '경상북도 포항시',
    url: null,
    port: {
      key: 'pohang-canal-cruise',
      name: '포항운하',
      region: '동해 남부권',
      city: '경상북도 포항시',
      terminal: '포항운하관'
    }
  },
  incheon: {
    name: '인천항만공사',
    url: 'https://www.icpa.or.kr/icferry/cruise/nvg/list.do?menuKey=958',
    port: {
      key: 'incheon-cruise-terminal',
      name: '인천항',
      region: '수도권 서해',
      city: '인천광역시',
      terminal: '인천항 크루즈터미널'
    }
  },
  operatorApi: {
    name: '행정안전부_문화_관광유람선업 조회서비스',
    url: process.env.CRUISE_TOURIST_API_URL || 'https://apis.data.go.kr/1741000/tourist_cruises'
  }
};

async function main() {
  const summary = {
    ports: 0,
    vessels: 0,
    schedules: 0,
    tourProducts: 0,
    operatorLicenses: 0,
    skippedIncheon: false,
    skippedOperatorApi: false,
    warnings: []
  };

  const ports = {};
  for (const source of Object.values(SOURCES).filter((item) => item.port)) {
    ports[source.port.key] = await upsertPort(source);
    summary.ports += 1;
  }

  const busanRows = parseCsvFile('부산항만공사_부산항 크루즈 스케줄 정보_20241231.csv');
  for (const row of busanRows) {
    const vessel = await upsertVessel({
      vesselName: value(row, '선명'),
      operatorName: value(row, '선사'),
      registryCountry: value(row, '선박국적'),
      grossTonnage: decimal(row, '총톤수(GT)'),
      lengthMeter: decimal(row, '선박길이(LOA)'),
      airDraftMeter: decimal(row, '높이(Air_Draft)'),
      maxDraftMeter: decimal(row, '최대높이(Max_Draft)'),
      crewCount: int(row, '선원수'),
      passengerCapacity: int(row, '승객수'),
      sourceName: SOURCES.busan.name
    });
    await upsertSchedule({
      source: SOURCES.busan,
      portId: ports[SOURCES.busan.port.key],
      vesselId: vessel.id,
      vesselName: value(row, '선명'),
      operatorName: value(row, '선사'),
      arrivalDate: dateOnly(value(row, '입항예정일(ETA)')),
      arrivalTime: timeOnly(value(row, '접안시간(Time)')),
      departureDate: dateOnly(value(row, '출항예정일(ETD)')),
      departureTime: timeOnly(value(row, '이안시간(Time)')),
      homePortCode: value(row, '출항지코드'),
      homePortName: value(row, '출항지(HomePort)'),
      previousPortCode: value(row, '전항지코드'),
      previousPortName: value(row, '전항지(PrePort)'),
      nextPortCode: value(row, '차항지코드'),
      nextPortName: value(row, '차항지(NextPort)'),
      berthName: value(row, '선석(Berth)'),
      scheduleType: value(row, '구분(SORT)'),
      agentName: value(row, '대리점(AgentNm)'),
      raw: row
    });
    summary.schedules += 1;
  }

  const yeosuVessels = new Map();
  for (const row of parseCsvFile('여수광양항만공사_여수항 크루즈선 정보_20250831.csv')) {
    const vessel = await upsertVessel({
      vesselName: value(row, '선명(Vessel)'),
      operatorName: value(row, '선사(Operator)'),
      registryCountry: value(row, '국적(Registry)'),
      grossTonnage: decimal(row, '총톤수(GT)'),
      lengthMeter: decimal(row, '길이(m)'),
      maxDraftMeter: decimal(row, '최대흘수(m)'),
      passengerCapacity: int(row, '승객수(Est)'),
      sourceName: SOURCES.yeosu.name
    });
    yeosuVessels.set(normalizeKey(value(row, '선명(Vessel)')), vessel);
    summary.vessels += 1;
  }

  for (const row of parseCsvFile('여수광양항만공사_크루즈입항스케줄_20250831.csv')) {
    const vesselName = value(row, '선명(Vessel)');
    const vessel = yeosuVessels.get(normalizeKey(vesselName)) ?? null;
    await upsertSchedule({
      source: SOURCES.yeosu,
      portId: ports[SOURCES.yeosu.port.key],
      vesselId: vessel?.id ?? null,
      vesselName,
      operatorName: vessel?.operator_name ?? null,
      arrivalDate: dateOnly(value(row, '입항예정일(ETA)')),
      arrivalTime: timeOnly(value(row, '입항예정일(ETA)')),
      departureDate: dateOnly(value(row, '출항예정일(ETD)')),
      departureTime: timeOnly(value(row, '출항예정일(ETD)')),
      previousPortName: value(row, '전항지(Previous Port)'),
      nextPortName: value(row, '차항지(Next Port)'),
      agentName: value(row, '대리점(LA)'),
      agentTel: value(row, '연락처(Tel)'),
      scheduleType: '기항',
      raw: row
    });
    summary.schedules += 1;
  }

  const pohangRows = parseCsvFile('경상북도 포항시_포항운하크루즈_20221011.csv');
  await upsertPohangProduct(ports[SOURCES.pohang.port.key], pohangRows);
  summary.tourProducts += 1;

  if (args['skip-incheon'] === true) {
    summary.skippedIncheon = true;
  } else {
    const incheonRows = await fetchIncheonSchedules();
    const incheonQuality = validateIncheonRows(incheonRows);
    if (incheonQuality.warnings.length > 0) summary.warnings.push(...incheonQuality.warnings);
    for (const row of incheonRows) {
      const vessel = await upsertVessel({
        vesselName: row.vesselName,
        operatorName: row.operatorName,
        sourceName: SOURCES.incheon.name
      });
      await upsertSchedule({
        source: SOURCES.incheon,
        portId: ports[SOURCES.incheon.port.key],
        vesselId: vessel.id,
        vesselName: row.vesselName,
        operatorName: row.operatorName,
        arrivalDate: dateOnly(row.arrivalDate),
        arrivalTime: timeOnly(row.arrivalTime),
        departureDate: dateOnly(row.departureDate),
        departureTime: timeOnly(row.departureTime),
        scheduleType: row.scheduleType,
        raw: row
      });
      summary.schedules += 1;
    }
  }

  if (args['skip-operator-api'] === true) {
    summary.skippedOperatorApi = true;
  } else {
    const serviceKey = getPublicDataServiceKey();
    if (!serviceKey) {
      summary.skippedOperatorApi = true;
      summary.warnings.push('관광유람선업 API 인증키가 없어 사업자 원장 적재를 건너뜁니다.');
    } else {
      try {
        const operatorRows = await fetchTouristCruiseOperators(serviceKey);
        const portRows = await prisma.$queryRawUnsafe('SELECT id, port_name, city_name FROM cruise_port');
        for (const row of operatorRows) {
          await upsertOperatorLicense(row, matchOperatorPort(row, portRows));
          summary.operatorLicenses += 1;
        }
      } catch (error) {
        if (args['strict-operator-api'] === true) throw error;
        summary.skippedOperatorApi = true;
        summary.warnings.push(`관광유람선업 API 적재 실패: ${error.message}`);
      }
    }
  }

  const dbSummary = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT count(*)::int FROM cruise_port) AS ports,
      (SELECT count(*)::int FROM cruise_vessel) AS vessels,
      (SELECT count(*)::int FROM cruise_schedule) AS schedules,
      (SELECT count(*)::int FROM cruise_tour_product) AS "tourProducts",
      (SELECT count(*)::int FROM cruise_operator_license) AS "operatorLicenses"
  `);

  console.log(JSON.stringify({ processed: summary, database: dbSummary[0] }, null, 2));
}

async function upsertPort(source) {
  const id = stableId('cruise-port', source.port.key);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO cruise_port (
        id, port_key, port_name, region_name, city_name, terminal_name, source_name, source_url, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (port_key) DO UPDATE SET
        port_name = EXCLUDED.port_name,
        region_name = EXCLUDED.region_name,
        city_name = EXCLUDED.city_name,
        terminal_name = EXCLUDED.terminal_name,
        source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url,
        updated_at = EXCLUDED.updated_at
      RETURNING id
    `,
    id,
    source.port.key,
    source.port.name,
    source.port.region,
    source.port.city,
    source.port.terminal,
    source.name,
    source.url,
    now
  );
  const rows = await prisma.$queryRawUnsafe('SELECT id FROM cruise_port WHERE port_key = $1', source.port.key);
  return rows[0].id;
}

async function upsertVessel(input) {
  const vesselName = clean(input.vesselName);
  if (!vesselName) throw new Error(`Missing vessel name: ${JSON.stringify(input)}`);
  const vesselKey = normalizeKey(`${vesselName}:${input.operatorName ?? ''}`);
  const id = stableId('cruise-vessel', vesselKey);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO cruise_vessel (
        id, vessel_key, vessel_name, operator_name, registry_country, gross_tonnage, length_meter,
        max_draft_meter, air_draft_meter, crew_count, passenger_capacity, source_name, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (vessel_key) DO UPDATE SET
        vessel_name = EXCLUDED.vessel_name,
        operator_name = COALESCE(EXCLUDED.operator_name, cruise_vessel.operator_name),
        registry_country = COALESCE(EXCLUDED.registry_country, cruise_vessel.registry_country),
        gross_tonnage = COALESCE(EXCLUDED.gross_tonnage, cruise_vessel.gross_tonnage),
        length_meter = COALESCE(EXCLUDED.length_meter, cruise_vessel.length_meter),
        max_draft_meter = COALESCE(EXCLUDED.max_draft_meter, cruise_vessel.max_draft_meter),
        air_draft_meter = COALESCE(EXCLUDED.air_draft_meter, cruise_vessel.air_draft_meter),
        crew_count = COALESCE(EXCLUDED.crew_count, cruise_vessel.crew_count),
        passenger_capacity = COALESCE(EXCLUDED.passenger_capacity, cruise_vessel.passenger_capacity),
        source_name = EXCLUDED.source_name,
        updated_at = EXCLUDED.updated_at
    `,
    id,
    vesselKey,
    vesselName,
    clean(input.operatorName),
    clean(input.registryCountry),
    input.grossTonnage ?? null,
    input.lengthMeter ?? null,
    input.maxDraftMeter ?? null,
    input.airDraftMeter ?? null,
    input.crewCount ?? null,
    input.passengerCapacity ?? null,
    input.sourceName,
    now
  );
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM cruise_vessel WHERE vessel_key = $1', vesselKey);
  return rows[0];
}

async function upsertSchedule(input) {
  if (!input.arrivalDate) return;
  const scheduleKey = normalizeKey(
    `${input.source.name}:${input.portId}:${input.vesselName}:${input.arrivalDate}:${input.arrivalTime ?? ''}`
  );
  const id = stableId('cruise-schedule', scheduleKey);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO cruise_schedule (
        id, schedule_key, port_id, vessel_id, vessel_name, operator_name, arrival_date, arrival_time,
        departure_date, departure_time, home_port_code, home_port_name, previous_port_code,
        previous_port_name, next_port_code, next_port_name, berth_name, schedule_type,
        agent_name, agent_tel, source_name, source_url, raw, collected_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::date, $8, $9::date, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23::jsonb, $24, $25
      )
      ON CONFLICT (schedule_key) DO UPDATE SET
        vessel_id = EXCLUDED.vessel_id,
        vessel_name = EXCLUDED.vessel_name,
        operator_name = EXCLUDED.operator_name,
        departure_date = EXCLUDED.departure_date,
        departure_time = EXCLUDED.departure_time,
        home_port_code = EXCLUDED.home_port_code,
        home_port_name = EXCLUDED.home_port_name,
        previous_port_code = EXCLUDED.previous_port_code,
        previous_port_name = EXCLUDED.previous_port_name,
        next_port_code = EXCLUDED.next_port_code,
        next_port_name = EXCLUDED.next_port_name,
        berth_name = EXCLUDED.berth_name,
        schedule_type = EXCLUDED.schedule_type,
        agent_name = EXCLUDED.agent_name,
        agent_tel = EXCLUDED.agent_tel,
        source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url,
        raw = EXCLUDED.raw,
        collected_at = EXCLUDED.collected_at,
        updated_at = EXCLUDED.updated_at
    `,
    id,
    scheduleKey,
    input.portId,
    input.vesselId ?? null,
    clean(input.vesselName),
    clean(input.operatorName),
    input.arrivalDate,
    clean(input.arrivalTime),
    input.departureDate ?? null,
    clean(input.departureTime),
    clean(input.homePortCode),
    clean(input.homePortName),
    clean(input.previousPortCode),
    clean(input.previousPortName),
    clean(input.nextPortCode),
    clean(input.nextPortName),
    clean(input.berthName),
    clean(input.scheduleType),
    clean(input.agentName),
    clean(input.agentTel),
    input.source.name,
    input.source.url,
    JSON.stringify(input.raw ?? {}),
    now,
    now
  );
}

async function upsertPohangProduct(portId, rows) {
  const details = new Map(rows.map((row) => [value(row, '구분'), row]));
  const basic = details.get('기본정보') ?? {};
  const basicValues = splitDetail(value(basic, '상세정보'));
  const accessibility = {};
  for (const row of rows) {
    const category = value(row, '구분');
    if (category && category !== '기본정보') {
      accessibility[category] = {
        description: value(row, '구분설명'),
        includedInfo: value(row, '포함정보'),
        detail: value(row, '상세정보'),
        imageIncluded: yn(value(row, '이미지포함여부'))
      };
    }
  }

  const productName = basicValues[0] || '포항운하크루즈';
  const productKey = normalizeKey(`pohang:${productName}`);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO cruise_tour_product (
        id, product_key, port_id, product_name, address, price_text, operating_hours, closed_days,
        travel_time_text, image_included, accessibility, description, source_name, source_url,
        reference_date, raw, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15::date, $16::jsonb, $17
      )
      ON CONFLICT (product_key) DO UPDATE SET
        port_id = EXCLUDED.port_id,
        product_name = EXCLUDED.product_name,
        address = EXCLUDED.address,
        price_text = EXCLUDED.price_text,
        operating_hours = EXCLUDED.operating_hours,
        closed_days = EXCLUDED.closed_days,
        travel_time_text = EXCLUDED.travel_time_text,
        image_included = EXCLUDED.image_included,
        accessibility = EXCLUDED.accessibility,
        description = EXCLUDED.description,
        reference_date = EXCLUDED.reference_date,
        raw = EXCLUDED.raw,
        updated_at = EXCLUDED.updated_at
    `,
    stableId('cruise-product', productKey),
    productKey,
    portId,
    productName,
    basicValues[1] ?? null,
    basicValues[3] ?? null,
    basicValues[4] ?? null,
    basicValues[5] ?? null,
    basicValues[2] ?? null,
    yn(value(basic, '이미지포함여부')),
    JSON.stringify(accessibility),
    value(basic, '구분설명') || '포항운하를 따라 즐기는 관광형 크루즈 상품',
    SOURCES.pohang.name,
    null,
    dateOnly(value(basic, '데이터기준일자')),
    JSON.stringify(rows),
    now
  );
}

async function fetchIncheonSchedules() {
  try {
    const html = await fetchTextWithRetry(SOURCES.incheon.url, { 'User-Agent': 'sea-load-cruise-seed/1.0' }, 2);
    const tableRows = extractHtmlTableRows(html)
      .filter((cells) => cells.length >= 8)
      .filter((cells) => /^\d+$/.test(cells[0]));
    const rows = tableRows.map((cells) => ({
      sequence: cells[0],
      vesselName: cells[1],
      operatorName: cells[2],
      arrivalDate: cells[3],
      arrivalTime: cells[4],
      departureDate: cells[5],
      departureTime: cells[6],
      scheduleType: normalizeScheduleType(cells[7]),
      sourceUrl: SOURCES.incheon.url
    }));
    if (rows.length === 0) throw new Error('인천항 크루즈 표에서 일정 행을 찾지 못했습니다.');
    return rows;
  } catch (error) {
    if (args['strict-incheon'] === true) throw error;
    console.warn(`Incheon cruise schedule skipped: ${error.message}`);
    return [];
  }
}

function validateIncheonRows(rows) {
  const warnings = [];
  if (rows.length === 0) {
    warnings.push('인천항 크루즈 일정이 0건입니다. 웹 페이지 구조 또는 네트워크 상태 확인이 필요합니다.');
  }
  const missingRequired = rows.filter((row) => !row.vesselName || !dateOnly(row.arrivalDate)).length;
  if (missingRequired > 0) {
    warnings.push(`인천항 크루즈 일정 ${missingRequired}건에 선명 또는 입항일자가 없습니다.`);
  }
  const typeSet = new Set(rows.map((row) => row.scheduleType).filter(Boolean));
  const unknownTypes = [...typeSet].filter((type) => !['기항', '모항', '오버나잇', '모항(하선)', '모항(승선)'].includes(type));
  if (unknownTypes.length > 0) {
    warnings.push(`인천항 비고 유형 확인 필요: ${unknownTypes.join(', ')}`);
  }
  return { warnings };
}

async function fetchTouristCruiseOperators(serviceKey) {
  const first = await fetchTouristCruiseOperatorPage(serviceKey, 1, Number(args['operator-page-size'] ?? 500));
  const total = Math.min(Number(first.totalCount ?? first.items.length), Number(args['operator-max-rows'] ?? 2000));
  const pages = Math.max(1, Math.ceil(total / first.pageSize));
  const items = [...first.items];
  for (let pageNo = 2; pageNo <= pages; pageNo += 1) {
    const page = await fetchTouristCruiseOperatorPage(serviceKey, pageNo, first.pageSize);
    items.push(...page.items);
  }
  return items.slice(0, total);
}

async function fetchTouristCruiseOperatorPage(serviceKey, pageNo, pageSize) {
  const url = new URL(`${SOURCES.operatorApi.url.replace(/\/$/, '')}/info`);
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('type', 'json');
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(pageSize));
  const text = await fetchTextWithRetry(url.toString(), { Accept: 'application/json' }, 2);
  const parsed = JSON.parse(text);
  const items = extractApiItems(parsed);
  return {
    items,
    pageSize,
    totalCount: pickFirst(parsed, ['response.body.totalCount', 'body.totalCount', 'totalCount', 'totalCnt'])
  };
}

async function upsertOperatorLicense(row, portId) {
  const businessName = pick(row, ['bplcNm', '사업장명', 'businessName', 'BPLCNM']) || '이름 미상 관광유람선업';
  const managementNo = pick(row, ['mgtNo', '관리번호', 'MGTNO']);
  const licenseKey = normalizeKey(managementNo || `${businessName}:${pick(row, ['siteWhlAddr', 'rdnWhlAddr', '소재지전체주소'])}`);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO cruise_operator_license (
        id, license_key, port_id, management_no, business_name, business_status, detail_status,
        road_address, lot_address, phone, permit_date, close_date, local_government_code,
        local_government_name, x, y, source_name, source_url, raw, collected_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12::date, $13, $14, $15, $16,
        $17, $18, $19::jsonb, $20, $21
      )
      ON CONFLICT (license_key) DO UPDATE SET
        port_id = EXCLUDED.port_id,
        management_no = EXCLUDED.management_no,
        business_name = EXCLUDED.business_name,
        business_status = EXCLUDED.business_status,
        detail_status = EXCLUDED.detail_status,
        road_address = EXCLUDED.road_address,
        lot_address = EXCLUDED.lot_address,
        phone = EXCLUDED.phone,
        permit_date = EXCLUDED.permit_date,
        close_date = EXCLUDED.close_date,
        local_government_code = EXCLUDED.local_government_code,
        local_government_name = EXCLUDED.local_government_name,
        x = EXCLUDED.x,
        y = EXCLUDED.y,
        source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url,
        raw = EXCLUDED.raw,
        collected_at = EXCLUDED.collected_at,
        updated_at = EXCLUDED.updated_at
    `,
    stableId('cruise-license', licenseKey),
    licenseKey,
    portId,
    managementNo,
    businessName,
    pick(row, ['trdStateNm', '영업상태명', 'businessStatus']),
    pick(row, ['dtlStateNm', '상세영업상태명', 'detailStatus']),
    pick(row, ['rdnWhlAddr', '도로명전체주소', 'roadAddress']),
    pick(row, ['siteWhlAddr', '소재지전체주소', 'lotAddress']),
    pick(row, ['siteTel', '소재지전화', 'phone']),
    ymdDate(pick(row, ['apvPermYmd', '인허가일자', 'permitDate'])),
    ymdDate(pick(row, ['dcbYmd', '폐업일자', 'closeDate'])),
    pick(row, ['opnSfTeamCode', '개방자치단체코드', 'localGovernmentCode']),
    pick(row, ['siteArea', '관리기관명', 'localGovernmentName']),
    numberValue(pick(row, ['x', '좌표정보(x)', 'X'])),
    numberValue(pick(row, ['y', '좌표정보(y)', 'Y'])),
    SOURCES.operatorApi.name,
    SOURCES.operatorApi.url,
    JSON.stringify(row),
    now,
    now
  );
}

function matchOperatorPort(row, ports) {
  const text = [pick(row, ['rdnWhlAddr', 'siteWhlAddr', '도로명전체주소', '소재지전체주소']), pick(row, ['bplcNm', '사업장명'])]
    .filter(Boolean)
    .join(' ');
  const matched = ports.find((port) => {
    if (port.city_name && text.includes(port.city_name.replace(/특별시|광역시|특별자치도|특별자치시/g, '').split(' ')[0])) return true;
    return text.includes(port.port_name.replace('항', ''));
  });
  return matched?.id ?? null;
}

async function fetchTextWithRetry(url, headers, attempts) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

function extractHtmlTableRows(html) {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) =>
    [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => htmlText(cell[1]))
  );
}

function extractApiItems(parsed) {
  const candidates = [
    parsed?.response?.body?.items?.item,
    parsed?.response?.body?.items,
    parsed?.body?.items?.item,
    parsed?.body?.items,
    parsed?.items?.item,
    parsed?.items,
    parsed?.data
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') return [candidate];
  }
  return [];
}

function pickFirst(source, paths) {
  for (const pathText of paths) {
    const value = pathText.split('.').reduce((target, key) => target?.[key], source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function pick(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim() !== '') return clean(row[key]);
    const found = Object.keys(row ?? {}).find((candidate) => normalizeFieldName(candidate) === normalizeFieldName(key));
    if (found && clean(row[found])) return clean(row[found]);
  }
  return null;
}

function normalizeFieldName(value) {
  return String(value ?? '').replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeScheduleType(value) {
  const text = clean(value);
  if (!text) return null;
  if (text.includes('오버')) return '오버나잇';
  if (text.includes('하선')) return '모항(하선)';
  if (text.includes('승선')) return '모항(승선)';
  if (text.includes('모항')) return '모항';
  if (text.includes('기항')) return '기항';
  return text;
}

function ymdDate(value) {
  const text = clean(value);
  if (!text) return null;
  const compact = text.replace(/[^0-9]/g, '');
  if (compact.length >= 8) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  return dateOnly(text);
}

function numberValue(value) {
  if (!value) return null;
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function getPublicDataServiceKey() {
  return process.env.CRUISE_SERVICE_KEY || process.env.TOURISM_SERVICE_KEY || process.env.DATA_GO_KR_SERVICE_KEY || process.env.PUBLIC_DATA_SERVICE_KEY;
}

function parseCsvFile(fileName) {
  const filePath = path.join(cruiseRoot, fileName);
  if (!fs.existsSync(filePath)) throw new Error(`Cruise data file not found: ${filePath}`);
  return parseCsv(readText(filePath));
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  const headers = records.shift()?.map((header) => cleanHeader(header)) ?? [];
  return records
    .filter((record) => record.some((item) => clean(item)))
    .map((record) =>
      Object.fromEntries(headers.map((header, index) => [header, clean(record[index])]))
    );
}

function readText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const badChars = (utf8.match(/\uFFFD/g) ?? []).length;
  if (badChars > 0) return new TextDecoder('euc-kr').decode(buffer);
  return utf8;
}

function cleanHeader(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
}

function value(row, key) {
  if (!row) return null;
  const normalizedKey = cleanHeader(key);
  if (row[normalizedKey] !== undefined) return clean(row[normalizedKey]);
  const found = Object.keys(row).find((candidate) => cleanHeader(candidate) === normalizedKey || cleanHeader(candidate).startsWith(normalizedKey));
  return found ? clean(row[found]) : null;
}

function clean(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text && text !== '정보없음' && text !== '-' ? text : null;
}

function decimal(row, key) {
  const text = value(row, key);
  if (!text) return null;
  const number = Number(String(text).replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function int(row, key) {
  const number = decimal(row, key);
  return number === null ? null : Math.trunc(number);
}

function dateOnly(text) {
  const cleaned = clean(text);
  if (!cleaned) return null;
  const match = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function timeOnly(text) {
  const cleaned = clean(text);
  if (!cleaned) return null;
  const match = cleaned.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}

function splitDetail(text) {
  return clean(text)?.split(',').map((item) => item.trim()) ?? [];
}

function yn(text) {
  return String(text ?? '').trim().toUpperCase() === 'Y';
}

function htmlText(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#40;/g, '(')
    .replace(/&#41;/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^가-힣a-z0-9:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function stableId(prefix, value) {
  return `${prefix}-${crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 24)}`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      i += 1;
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
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
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
