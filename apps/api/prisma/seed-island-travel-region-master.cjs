const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();
const TRAVEL_REGION_VERSION = '1.0';

const TRAVEL_REGIONS = [
  {
    id: 'west5-baengnyeong',
    name: '서해5도·백령권',
    group: 'WEST_SEA',
    description: '백령도·대청도·소청도·연평도 중심의 서해 최북단 장거리 도서 여행권입니다.',
    provinceNames: ['인천광역시'],
    cityNames: ['옹진군'],
    mainPortNames: ['인천항'],
    aliases: ['백령도', '대청도', '소청도', '연평도', '서해5도'],
    primaryForecastRegionId: 'daechung-baengnyeong',
    forecastRegionIds: ['daechung-baengnyeong', 'incheon-coast'],
    centerLatitude: 37.825,
    centerLongitude: 124.712,
    sortOrder: 10,
    keywords: ['백령', '대청', '소청', '연평'],
    adminFallback: false
  },
  {
    id: 'ongjin-deokjeok',
    name: '인천 옹진·덕적권',
    group: 'WEST_SEA',
    description: '덕적도·자월도·승봉도·이작도·굴업도 등 수도권 섬여행 핵심권입니다.',
    provinceNames: ['인천광역시'],
    cityNames: ['옹진군'],
    mainPortNames: ['인천항', '대부도 방아머리항'],
    aliases: ['덕적도', '자월도', '승봉도', '이작도', '굴업도', '문갑도'],
    primaryForecastRegionId: 'deokjeok-guleop',
    forecastRegionIds: ['deokjeok-guleop', 'incheon-coast'],
    centerLatitude: 37.194,
    centerLongitude: 125.995,
    sortOrder: 20,
    keywords: ['덕적', '자월', '승봉', '이작', '굴업', '문갑', '소야'],
    adminFallback: false
  },
  {
    id: 'ganghwa-gyeonggi-bay',
    name: '강화·김포·경기만권',
    group: 'WEST_SEA',
    description: '강화·석모·교동·영종·무의·대부·제부 등 연륙도와 수도권 근교 해양관광권입니다.',
    provinceNames: ['인천광역시', '경기도'],
    cityNames: ['강화군', '중구', '김포시', '안산시', '화성시'],
    mainPortNames: ['강화', '영종도', '대부도'],
    aliases: ['강화도', '석모도', '교동도', '영종도', '무의도', '대부도', '제부도'],
    primaryForecastRegionId: 'incheon-coast',
    forecastRegionIds: ['incheon-coast'],
    centerLatitude: 37.55,
    centerLongitude: 126.45,
    sortOrder: 30,
    adminKeywords: ['인천광역시 강화군', '인천광역시 중구', '경기도 김포시', '경기도 안산시', '경기도 화성시'],
    keywords: ['강화', '석모', '교동', '영종', '무의', '대부', '제부', '김포', '안산', '화성']
  },
  {
    id: 'taean-boryeong-seocheon',
    name: '태안·보령·서천권',
    group: 'WEST_SEA',
    description: '원산도·삽시도·외연도·효자도·안면도 등 충남 서해 섬여행권입니다.',
    provinceNames: ['충청남도'],
    cityNames: ['태안군', '보령시', '서천군', '서산시', '당진시', '홍성군'],
    mainPortNames: ['대천항', '오천항', '안흥항'],
    aliases: ['원산도', '삽시도', '외연도', '효자도', '안면도', '고대도', '장고도'],
    primaryForecastRegionId: 'boryeong-coast',
    forecastRegionIds: ['boryeong-coast'],
    centerLatitude: 36.406,
    centerLongitude: 126.486,
    sortOrder: 40,
    adminKeywords: ['충청남도 태안군', '충청남도 보령시', '충청남도 서천군', '충청남도 서산시', '충청남도 당진시', '충청남도 홍성군'],
    keywords: ['태안', '보령', '서천', '서산', '당진', '홍성', '원산', '삽시', '외연', '효자', '안면', '고대', '장고']
  },
  {
    id: 'gunsan-buan-gogunsan',
    name: '군산·부안 고군산권',
    group: 'WEST_SEA',
    description: '선유도·무녀도·장자도·신시도·위도 등 고군산군도 중심 여행권입니다.',
    provinceNames: ['전북특별자치도'],
    cityNames: ['군산시', '부안군', '고창군'],
    mainPortNames: ['군산항', '격포항'],
    aliases: ['선유도', '무녀도', '장자도', '신시도', '위도', '고군산'],
    primaryForecastRegionId: 'gunsan-coast',
    forecastRegionIds: ['gunsan-coast'],
    centerLatitude: 35.975,
    centerLongitude: 126.563,
    sortOrder: 50,
    adminKeywords: ['전북특별자치도 군산시', '전북특별자치도 부안군', '전북특별자치도 고창군'],
    keywords: ['군산', '부안', '고창', '선유', '무녀', '장자', '신시', '위도', '고군산']
  },
  {
    id: 'mokpo-shinan-north',
    name: '목포·신안 다도해 북부권',
    group: 'SOUTHWEST_SEA',
    description: '목포·신안 천사대교 생활권과 다도해 북부 섬여행권입니다.',
    provinceNames: ['전라남도'],
    cityNames: ['목포시', '신안군', '무안군', '영광군', '함평군'],
    mainPortNames: ['목포항', '송공항'],
    aliases: ['압해도', '암태도', '자은도', '비금도', '도초도', '임자도', '증도'],
    primaryForecastRegionId: 'mokpo-coast',
    forecastRegionIds: ['mokpo-coast'],
    centerLatitude: 34.77972,
    centerLongitude: 126.37556,
    sortOrder: 60,
    adminKeywords: ['전라남도 목포시', '전라남도 신안군', '전라남도 무안군', '전라남도 영광군', '전라남도 함평군'],
    keywords: ['목포', '신안', '무안', '영광', '함평', '압해', '암태', '자은', '비금', '도초', '임자', '증도']
  },
  {
    id: 'heuksan-hongdo-remote',
    name: '흑산·홍도 원도권',
    group: 'SOUTHWEST_SEA',
    description: '흑산도·홍도·가거도·만재도 등 장거리 원도 여행권입니다.',
    provinceNames: ['전라남도'],
    cityNames: ['신안군'],
    mainPortNames: ['목포항'],
    aliases: ['흑산도', '홍도', '가거도', '만재도'],
    primaryForecastRegionId: 'heuksan-hongdo',
    forecastRegionIds: ['heuksan-hongdo', 'mokpo-coast'],
    centerLatitude: 34.684,
    centerLongitude: 125.435,
    sortOrder: 70,
    keywords: ['흑산', '홍도', '가거', '만재'],
    adminFallback: false
  },
  {
    id: 'jindo-haenam',
    name: '진도·해남권',
    group: 'SOUTHWEST_SEA',
    description: '진도와 조도군도·관매도 등 진도항/팽목항 생활권입니다.',
    provinceNames: ['전라남도'],
    cityNames: ['진도군', '해남군'],
    mainPortNames: ['진도항', '팽목항'],
    aliases: ['진도', '조도', '관매도', '하조도', '상조도'],
    primaryForecastRegionId: 'jindo-coast',
    forecastRegionIds: ['jindo-coast'],
    centerLatitude: 34.377,
    centerLongitude: 126.308,
    sortOrder: 80,
    adminKeywords: ['전라남도 진도군', '전라남도 해남군'],
    keywords: ['진도', '해남', '조도', '관매', '하조', '상조']
  },
  {
    id: 'wando-cheongsan-bogil',
    name: '완도·청산·보길권',
    group: 'SOUTH_SEA',
    description: '완도·청산도·보길도·노화도·소안도 등 전남 남해 서부 대표 섬여행권입니다.',
    provinceNames: ['전라남도'],
    cityNames: ['완도군', '강진군', '장흥군'],
    mainPortNames: ['완도항', '화흥포항'],
    aliases: ['완도', '청산도', '보길도', '노화도', '소안도', '생일도'],
    primaryForecastRegionId: 'wando-coast',
    forecastRegionIds: ['wando-coast'],
    centerLatitude: 34.315,
    centerLongitude: 126.759,
    sortOrder: 90,
    adminKeywords: ['전라남도 완도군', '전라남도 강진군', '전라남도 장흥군'],
    keywords: ['완도', '청산', '보길', '노화', '소안', '생일', '강진', '장흥']
  },
  {
    id: 'yeosu-goheung-central',
    name: '여수·고흥·남해 중부권',
    group: 'SOUTH_SEA',
    description: '금오도·개도·백야도·거문도·초도·낭도·연홍도 등 여수/고흥 관광권입니다.',
    provinceNames: ['전라남도'],
    cityNames: ['여수시', '고흥군', '보성군', '광양시', '순천시'],
    mainPortNames: ['여수항', '백야항', '녹동항'],
    aliases: ['금오도', '개도', '백야도', '거문도', '초도', '낭도', '연홍도'],
    primaryForecastRegionId: 'yeosu-coast',
    forecastRegionIds: ['yeosu-coast', 'geomundo'],
    centerLatitude: 34.747,
    centerLongitude: 127.765,
    sortOrder: 100,
    adminKeywords: ['전라남도 여수시', '전라남도 고흥군', '전라남도 보성군', '전라남도 광양시', '전라남도 순천시'],
    keywords: ['여수', '고흥', '보성', '광양', '순천', '금오', '개도', '백야', '거문', '초도', '낭도', '연홍']
  },
  {
    id: 'sacheon-namhae-hadong',
    name: '사천·남해·하동권',
    group: 'SOUTH_SEA',
    description: '남해도·창선도와 사천/하동 연안 섬 관광권입니다.',
    provinceNames: ['경상남도'],
    cityNames: ['사천시', '남해군', '하동군', '고성군'],
    mainPortNames: ['삼천포항', '남해'],
    aliases: ['남해도', '창선도', '사천', '하동'],
    primaryForecastRegionId: 'tongyeong-coast',
    forecastRegionIds: ['tongyeong-coast'],
    centerLatitude: 34.9,
    centerLongitude: 128.0,
    sortOrder: 110,
    adminKeywords: ['경상남도 사천시', '경상남도 남해군', '경상남도 하동군', '경상남도 고성군'],
    keywords: ['사천', '남해', '하동', '고성', '창선', '삼천포']
  },
  {
    id: 'tongyeong-hallyeo',
    name: '통영 한려수도권',
    group: 'SOUTH_SEA',
    description: '욕지도·연화도·비진도·한산도·매물도·사량도 등 한려수도 대표 섬여행권입니다.',
    provinceNames: ['경상남도'],
    cityNames: ['통영시'],
    mainPortNames: ['통영항', '삼덕항', '중화항'],
    aliases: ['욕지도', '연화도', '비진도', '한산도', '매물도', '사량도'],
    primaryForecastRegionId: 'tongyeong-coast',
    forecastRegionIds: ['tongyeong-coast'],
    centerLatitude: 34.827,
    centerLongitude: 128.434,
    sortOrder: 120,
    adminKeywords: ['경상남도 통영시'],
    keywords: ['통영', '욕지', '연화', '비진', '한산', '매물', '사량', '추도']
  },
  {
    id: 'geoje-changwon-east',
    name: '거제·창원 남해동부권',
    group: 'SOUTH_SEA',
    description: '거제도·외도·지심도·칠천도와 창원 저도 등 남해동부 섬여행권입니다.',
    provinceNames: ['경상남도'],
    cityNames: ['거제시', '창원시'],
    mainPortNames: ['장승포항', '저구항', '마산항'],
    aliases: ['거제도', '외도', '지심도', '칠천도', '저도'],
    primaryForecastRegionId: 'geoje-coast',
    forecastRegionIds: ['geoje-coast'],
    centerLatitude: 34.801,
    centerLongitude: 128.699,
    sortOrder: 130,
    adminKeywords: ['경상남도 거제시', '경상남도 창원시'],
    keywords: ['거제', '창원', '외도', '지심', '칠천', '저도']
  },
  {
    id: 'busan-ulsan-southeast',
    name: '부산·울산 동남해권',
    group: 'SOUTH_EAST_SEA',
    description: '부산·울산의 도시형 해양 관광권과 연안 섬/항만권입니다.',
    provinceNames: ['부산광역시', '울산광역시'],
    cityNames: [],
    mainPortNames: ['부산항', '울산항'],
    aliases: ['영도', '가덕도', '오륙도', '대마등', '울산'],
    primaryForecastRegionId: 'busan-coast',
    forecastRegionIds: ['busan-coast', 'ulsan-coast'],
    centerLatitude: 35.096,
    centerLongitude: 129.035,
    sortOrder: 140,
    adminKeywords: ['부산광역시', '울산광역시'],
    keywords: ['부산', '울산', '영도', '가덕', '오륙', '대마등']
  },
  {
    id: 'gangwon-east-coast',
    name: '강원 동해안권',
    group: 'EAST_SEA',
    description: '고성·속초·양양·강릉·동해·삼척의 동해안 해양관광권입니다.',
    provinceNames: ['강원특별자치도', '강원도'],
    cityNames: ['고성군', '속초시', '양양군', '강릉시', '동해시', '삼척시'],
    mainPortNames: ['속초항', '묵호항', '주문진항', '삼척항'],
    aliases: ['속초 조도', '고성 죽도', '강릉', '동해', '삼척'],
    primaryForecastRegionId: 'pohang-coast',
    forecastRegionIds: ['pohang-coast'],
    centerLatitude: 37.75,
    centerLongitude: 128.95,
    sortOrder: 150,
    adminKeywords: ['강원특별자치도 고성군', '강원특별자치도 속초시', '강원특별자치도 양양군', '강원특별자치도 강릉시', '강원특별자치도 동해시', '강원특별자치도 삼척시'],
    keywords: ['강원', '고성', '속초', '양양', '강릉', '동해', '삼척', '조도', '죽도', '묵호', '주문진']
  },
  {
    id: 'pohang-east-ulleung',
    name: '포항·동해·울릉권',
    group: 'EAST_SEA',
    description: '포항/동해안과 울릉도·독도 등 동해 대표 섬여행권입니다.',
    provinceNames: ['경상북도'],
    cityNames: ['포항시', '경주시', '영덕군', '울진군', '울릉군'],
    mainPortNames: ['포항항', '후포항', '묵호항'],
    aliases: ['울릉도', '독도', '죽도', '포항'],
    primaryForecastRegionId: 'ulleung',
    forecastRegionIds: ['pohang-coast', 'ulleung'],
    centerLatitude: 37.491,
    centerLongitude: 130.913,
    sortOrder: 160,
    adminKeywords: ['경상북도 포항시', '경상북도 경주시', '경상북도 영덕군', '경상북도 울진군', '경상북도 울릉군'],
    keywords: ['울릉', '독도', '포항', '경주', '영덕', '울진', '죽도']
  },
  {
    id: 'jeju-north',
    name: '제주 북부권',
    group: 'JEJU',
    description: '제주시와 추자도·비양도 등 제주 북부 섬여행권입니다.',
    provinceNames: ['제주특별자치도'],
    cityNames: ['제주시'],
    mainPortNames: ['제주항', '한림항'],
    aliases: ['추자도', '비양도', '제주'],
    primaryForecastRegionId: 'jeju-coast',
    forecastRegionIds: ['jeju-coast'],
    centerLatitude: 33.527,
    centerLongitude: 126.543,
    sortOrder: 170,
    adminKeywords: ['제주특별자치도 제주시'],
    keywords: ['제주시', '추자', '비양', '제주']
  },
  {
    id: 'jeju-south-seogwipo',
    name: '제주 남부·서귀포권',
    group: 'JEJU',
    description: '서귀포와 마라도·가파도·우도 등 제주 남부/부속섬 여행권입니다.',
    provinceNames: ['제주특별자치도'],
    cityNames: ['서귀포시'],
    mainPortNames: ['서귀포항', '모슬포항', '성산항'],
    aliases: ['마라도', '가파도', '우도', '서귀포'],
    primaryForecastRegionId: 'seogwipo-coast',
    forecastRegionIds: ['seogwipo-coast', 'jeju-coast'],
    centerLatitude: 33.24,
    centerLongitude: 126.561,
    sortOrder: 180,
    adminKeywords: ['제주특별자치도 서귀포시'],
    keywords: ['서귀포', '마라', '가파', '우도', '성산']
  }
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
  return String(value ?? '').replace(/\s+/g, '').toLowerCase();
}

function scoreRegion(island, region) {
  const legalDong = normalize(island.legal_dong_name);
  const islandName = normalize(island.island_name);
  const haystack = normalize(`${island.legal_dong_name} ${island.island_name}`);
  const adminMatch = findAdminMatch(legalDong, region);
  const keywordMatch = region.keywords.find((keyword) => haystack.includes(normalize(keyword)));

  if (keywordMatch && adminMatch) {
    return { score: 98, matchType: 'LEGAL_DONG_KEYWORD' };
  }

  if (keywordMatch) {
    return { score: 45, matchType: 'KEYWORD_WITHOUT_ADMIN_LOW_CONFIDENCE' };
  }

  const aliasMatch = region.aliases.find((alias) => {
    const normalizedAlias = normalize(alias);
    return normalizedAlias && (haystack.includes(normalizedAlias) || islandName.includes(normalizedAlias) || normalizedAlias.includes(islandName));
  });

  if (aliasMatch && adminMatch) {
    return { score: 86, matchType: 'ALIAS_WITH_LEGAL_DONG' };
  }

  if (adminMatch && region.adminFallback !== false) {
    return { score: 74, matchType: 'LEGAL_DONG_ADMIN_AREA' };
  }

  if (aliasMatch) {
    return { score: 45, matchType: 'ALIAS_WITHOUT_ADMIN_LOW_CONFIDENCE' };
  }

  return { score: 0, matchType: null };
}

function findAdminMatch(normalizedLegalDong, region) {
  const adminKeywords = region.adminKeywords ?? [
    ...region.cityNames.map((cityName) => `${region.provinceNames[0] ?? ''} ${cityName}`),
    ...region.provinceNames
  ];

  return adminKeywords.map(normalize).find((keyword) => keyword && normalizedLegalDong.includes(keyword));
}

async function upsertRegions() {
  for (const region of TRAVEL_REGIONS) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO island_travel_region (
          id, version, name, region_group, description, province_names, city_names, main_port_names,
          aliases, primary_forecast_region_id, forecast_region_ids, center_latitude, center_longitude,
          sort_order, source_note, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::numeric(10,7),$13::numeric(10,7),$14,$15,CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          version = EXCLUDED.version,
          name = EXCLUDED.name,
          region_group = EXCLUDED.region_group,
          description = EXCLUDED.description,
          province_names = EXCLUDED.province_names,
          city_names = EXCLUDED.city_names,
          main_port_names = EXCLUDED.main_port_names,
          aliases = EXCLUDED.aliases,
          primary_forecast_region_id = EXCLUDED.primary_forecast_region_id,
          forecast_region_ids = EXCLUDED.forecast_region_ids,
          center_latitude = EXCLUDED.center_latitude,
          center_longitude = EXCLUDED.center_longitude,
          sort_order = EXCLUDED.sort_order,
          source_note = EXCLUDED.source_note,
          updated_at = CURRENT_TIMESTAMP
      `,
      region.id,
      TRAVEL_REGION_VERSION,
      region.name,
      region.group,
      region.description,
      region.provinceNames,
      region.cityNames,
      region.mainPortNames,
      region.aliases,
      region.primaryForecastRegionId,
      region.forecastRegionIds,
      region.centerLatitude,
      region.centerLongitude,
      region.sortOrder,
      `섬여행 UX 기준 수동 권역 마스터 v${TRAVEL_REGION_VERSION}입니다. legal_dong_name과 island_name을 함께 사용해 매핑하며, 예보 권역은 forecast_region_ids로 1차 연결합니다.`
    );
  }
}

async function mapIslands() {
  const islands = await prisma.$queryRawUnsafe(`
    SELECT island_key, island_name, legal_dong_name
    FROM island_master
  `);
  let updated = 0;

  await prisma.$executeRawUnsafe(`
    UPDATE island_master
    SET travel_region_id = NULL,
        travel_region_name = NULL,
        travel_region_match_type = NULL,
        travel_region_match_score = NULL,
        updated_at = CURRENT_TIMESTAMP
  `);

  for (const island of islands) {
    const best = TRAVEL_REGIONS
      .map((region) => ({ region, ...scoreRegion(island, region) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.region.sortOrder - b.region.sortOrder)[0];

    if (!best || best.score < 70) continue;

    await prisma.$executeRawUnsafe(
      `
        UPDATE island_master
        SET travel_region_id = $1,
            travel_region_name = $2,
            travel_region_match_type = $3,
            travel_region_match_score = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE island_key = $5
      `,
      best.region.id,
      best.region.name,
      best.matchType,
      best.score,
      island.island_key
    );
    updated += 1;
  }

  return updated;
}

async function main() {
  await upsertRegions();
  const updated = await mapIslands();
  console.log(`Upserted ${TRAVEL_REGIONS.length} island travel regions v${TRAVEL_REGION_VERSION} and mapped ${updated} island master rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
