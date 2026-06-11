const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();

const SOURCES = {
  travie: {
    title: '트래비 국내 섬 여행 추천',
    url: 'https://www.travie.com/news/articleView.html?idxno=54139',
    type: 'article'
  },
  hotels: {
    title: 'Hotels.com 한국의 아름다운 섬',
    url: 'https://kr.hotels.com/go/south-korea/beautiful-islands-korea',
    type: 'guide'
  },
  dadohae: {
    title: '전남 다도해 가고 싶은 섬',
    url: 'https://www.jndadohae.com/',
    type: 'official'
  }
};

const rows = [
  row('울릉도', '경상북도', '울릉군', '깊은 바다 절벽과 독도 항로의 출발점이 되는 대표 원도형 섬이다. 해안 산책, 전망대, 해산물 식도락, 장거리 배편을 함께 설계하기 좋다.', '해안 절벽, 항구, 독도 전망을 함께 보여주는 원경 사진이 적합하다.', '포항·묵호·강릉·후포 등 동해안 항로가 계절과 기상에 따라 달라지므로 출발 전 운항 확인이 필요하다.', ['절경', '트레킹', '해산물'], ['해안', '전망대', '식당'], ['photo', 'trekking', 'food'], SOURCES.travie, 96),
  row('홍도', '전라남도', '신안군', '붉은빛 기암과 유람선 경관으로 알려진 다도해 대표 절경 섬이다. 흑산도와 묶어 1박 이상 코스로 구성하기 좋다.', '붉은 절벽과 해상 기암을 넓게 담은 사진이 어울린다.', '목포 여객선터미널 출발 항로를 기준으로 흑산도 연계 운항을 확인한다.', ['기암절경', '유람선', '다도해'], ['관광', '노을', '사진'], ['photo', 'couple', 'healing'], SOURCES.travie, 94),
  row('백령도', '인천광역시', '옹진군', '서해 최북단에 가까운 큰 섬으로 사곶해변, 두무진, 심청각 등 자연과 이야기가 함께 있다. 장거리 항로와 숙박 조건을 포함해 코스를 짜야 한다.', '두무진 바위 해안이나 사곶해변의 넓은 모래사장을 대표 사진으로 쓰기 좋다.', '인천항 연안여객터미널 출발 항로이며 기상과 안보 상황에 따른 확인이 중요하다.', ['서해원도', '해변', '역사'], ['해변', '전망대', '관광'], ['family', 'photo', 'healing'], SOURCES.travie, 91),
  row('선유도', '전라북도', '군산시', '고군산군도의 중심 섬으로 해변, 전망대, 섬 간 연결도로가 좋아 당일치기와 자가용 코스 모두 만들기 쉽다.', '고군산대교와 선유도 해변이 함께 보이는 사진이 좋다.', '군산권 도로 접근이 가능하며 주변 섬 연계 배편은 별도 확인한다.', ['당일치기', '해변', '드라이브'], ['해수욕장', '전망대', '카페'], ['dayTrip', 'friends', 'photo'], SOURCES.hotels, 90),
  row('소매물도', '경상남도', '통영시', '등대섬과 바닷길 풍경이 강한 섬으로 걷기, 사진, 물때 확인을 결합한 코스에 적합하다.', '등대섬과 해안 절벽, 물때에 드러나는 길을 함께 설명하는 사진이 적합하다.', '통영항 또는 거제 저구항 계열 항로를 확인하고 물때 시간도 함께 본다.', ['등대섬', '물때', '트레킹'], ['등대', '해안길', '포토존'], ['photo', 'trekking', 'couple'], SOURCES.travie, 89),
  row('우도', '제주특별자치도', '제주시', '성산 앞바다의 작은 섬으로 해변, 카페, 자전거 이동, 짧은 체류 코스가 잘 맞는다.', '검멀레 해안, 산호빛 해변, 우도봉 조망 사진을 대표로 쓸 수 있다.', '성산항 중심 항로이며 현장 운항 시간과 차량 반입 조건을 확인한다.', ['제주부속섬', '카페', '자전거'], ['해변', '카페', '전망대'], ['dayTrip', 'friends', 'couple'], SOURCES.hotels, 88),
  row('비진도', '경상남도', '통영시', '안섬과 바깥섬 사이의 모래목과 바다색이 인상적인 통영권 섬이다. 해수욕, 산책, 사진 코스로 구성하기 좋다.', '두 섬을 잇는 해변과 양쪽 바다색이 드러나는 항공·전망 사진이 좋다.', '통영항 출발 여객선 운항을 확인한다.', ['해변', '산책', '통영'], ['해수욕', '산책', '포토존'], ['healing', 'photo', 'dayTrip'], SOURCES.hotels, 87),
  row('가파도', '제주특별자치도', '서귀포시', '완만한 지형과 청보리 풍경으로 걷기 좋은 제주 남서부 섬이다. 반나절 코스와 사진 여행에 잘 맞는다.', '청보리밭 너머 바다와 한라산이 보이는 계절 사진이 적합하다.', '모슬포 운진항 계열 항로를 기준으로 현장 운항 여부를 확인한다.', ['청보리', '걷기', '반나절'], ['걷기', '사진', '카페'], ['solo', 'photo', 'healing'], SOURCES.travie, 86),
  row('관매도', '전라남도', '진도군', '관매팔경과 긴 해변, 소나무 숲길이 어울리는 다도해 섬이다. 조용한 1박형 힐링 코스로 만들기 좋다.', '관매도 해수욕장과 소나무 숲, 해안 절경을 함께 보여주는 사진이 좋다.', '진도 팽목항 권역 항로를 중심으로 운항을 확인한다.', ['다도해', '해변', '숲길'], ['해변', '트레킹', '노을'], ['healing', 'trekking', 'photo'], SOURCES.dadohae, 85),
  row('청산도', '전라남도', '완도군', '슬로길과 돌담, 봄 풍경이 강한 완도권 섬이다. 걷기 중심 여행과 가족·힐링 코스에 좋다.', '슬로길, 돌담길, 유채 또는 청보리 계절 풍경을 대표 이미지로 쓰기 좋다.', '완도항 출발 항로를 기준으로 운항 일정을 확인한다.', ['슬로길', '걷기', '완도'], ['둘레길', '산책', '관광'], ['healing', 'family', 'trekking'], SOURCES.travie, 84),
  row('연홍도', '전라남도', '고흥군', '섬 전체가 미술관처럼 꾸며진 작은 예술섬이다. 짧은 배편, 산책, 사진 코스와 잘 맞는다.', '벽화와 바다, 작은 골목이 함께 보이는 사진이 어울린다.', '고흥 녹동·거금도 권역에서 접근하는 항로를 확인한다.', ['예술섬', '벽화', '산책'], ['관광', '포토존', '체험'], ['photo', 'dayTrip', 'couple'], SOURCES.dadohae, 83),
  row('가우도', '전라남도', '강진군', '강진만 위를 걷는 출렁다리와 해안 산책로가 강한 섬이다. 육지 연결형 당일 코스에 적합하다.', '출렁다리, 강진만, 해안 데크길을 함께 보여주는 사진이 좋다.', '도보교로 접근 가능한 섬이며 주변 항만 이동은 별도 확인한다.', ['출렁다리', '산책', '당일치기'], ['걷기', '공원', '관광'], ['dayTrip', 'family', 'healing'], SOURCES.dadohae, 82),
  row('반월도', '전라남도', '신안군', '보라색 경관으로 알려진 퍼플섬 권역이다. 박지도와 묶어 사진, 산책, 마을 체험 코스로 활용하기 좋다.', '보라색 다리와 마을 경관이 한눈에 들어오는 사진이 대표 이미지로 좋다.', '안좌도 권역 도로·도보 연계를 기준으로 이동 조건을 확인한다.', ['퍼플섬', '사진', '마을여행'], ['포토존', '산책', '관광'], ['photo', 'couple', 'family'], SOURCES.dadohae, 81),
  row('낭도', '전라남도', '여수시', '여수 여자만과 고흥 사이에 있는 섬으로 해안길, 막걸리, 조용한 마을 여행을 묶기 좋다.', '낭도 해안길과 잔잔한 만 풍경을 담은 사진이 적합하다.', '여수·고흥 권역 연륙교 이동과 인근 항로를 함께 확인한다.', ['해안길', '마을', '여수'], ['해안길', '맛집', '산책'], ['healing', 'food', 'trekking'], SOURCES.dadohae, 80),
  row('기점도', '전라남도', '신안군', '기점·소악도 순례길 권역으로 작은 섬과 예배당, 길 걷기가 결합된 코스형 여행지다.', '작은 예배당과 섬길, 갯벌 풍경을 함께 보여주는 사진이 어울린다.', '신안 증도·송공 권역 항로와 물때, 연계 교통을 확인한다.', ['순례길', '섬길', '사진'], ['걷기', '포토존', '관광'], ['solo', 'healing', 'trekking'], SOURCES.dadohae, 79),
  row('생일도', '전라남도', '완도군', '완도권의 조용한 섬으로 해안 풍경과 마을 체류형 여행에 적합하다. 느린 섬 여행, 숙박, 낚시 조건과 잘 맞는다.', '해안 마을과 선착장, 완만한 산 능선이 보이는 사진이 좋다.', '완도권 항로를 기준으로 운항 시간과 숙박 가능 여부를 확인한다.', ['조용한 섬', '체류', '낚시'], ['낚시', '해안', '숙박'], ['healing', 'solo', 'activity'], SOURCES.dadohae, 78),
  row('외달도', '전라남도', '목포시', '목포에서 가까운 휴양형 섬으로 해수풀장과 해변, 가족 당일 여행 후보로 쓰기 좋다.', '목포 앞바다와 해변 휴양 시설을 함께 담은 사진이 적합하다.', '목포 삼학도·연안여객선터미널 권역 항로를 확인한다.', ['목포근교', '가족', '해변'], ['해수욕', '편의시설', '가족'], ['family', 'dayTrip', 'healing'], SOURCES.dadohae, 77),
  row('우이도', '전라남도', '신안군', '모래언덕과 원도 분위기가 강한 신안권 섬이다. 장거리 이동을 감수하는 사진·탐방 코스에 적합하다.', '모래언덕과 긴 해변, 낮은 마을 지붕을 함께 보여주는 사진이 좋다.', '목포·도초 권역 연계 항로를 확인하고 숙박 조건을 함께 본다.', ['모래언덕', '원도', '탐방'], ['해변', '트레킹', '사진'], ['photo', 'trekking', 'healing'], SOURCES.dadohae, 76),
  row('금당도', '전라남도', '완도군', '기암 해안과 낚시, 섬 산책을 조합하기 좋은 완도·고흥 사이 섬이다.', '해안 절벽과 선착장, 바다 위 작은 섬들이 보이는 사진이 좋다.', '완도·고흥 권역 항로를 기준으로 운항을 확인한다.', ['기암해안', '낚시', '산책'], ['낚시', '해안', '전망대'], ['activity', 'healing', 'photo'], SOURCES.dadohae, 75),
  row('소안도', '전라남도', '완도군', '항일 역사와 해변, 완도권 섬길이 함께 있는 섬이다. 역사탐방과 해변 코스를 결합하기 좋다.', '기념 공간과 해변 풍경을 함께 소개할 수 있는 사진이 적합하다.', '완도 화흥포항 등 완도권 항로를 확인한다.', ['역사탐방', '해변', '완도'], ['관광', '해변', '걷기'], ['family', 'healing', 'trekking'], SOURCES.dadohae, 74)
];

function row(islandName, provinceName, cityName, description, photoDescription, ferrySummary, highlights, tags, travelStyles, source, priority) {
  const id = `${islandName}-${provinceName}-${cityName}`.replace(/\s+/g, '-').toLowerCase();
  return {
    id,
    islandName,
    displayName: islandName,
    provinceName,
    cityName,
    islandKey: null,
    description,
    photoDescription,
    ferrySummary,
    highlights,
    tags,
    travelStyles,
    sourceTitle: source.title,
    sourceUrl: source.url,
    sourceType: source.type,
    priority
  };
}

function pgTextArray(values) {
  return `ARRAY[${values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ')}]::text[]`;
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

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "recommended_island" (
      "id" TEXT NOT NULL,
      "island_name" TEXT NOT NULL,
      "display_name" TEXT,
      "province_name" TEXT,
      "city_name" TEXT,
      "island_key" TEXT,
      "description" TEXT NOT NULL,
      "address" TEXT,
      "contact" TEXT,
      "photo_description" TEXT,
      "ferry_summary" TEXT,
      "traffic_info" TEXT,
      "lodging_info" TEXT,
      "food_info" TEXT,
      "nearby_attractions" TEXT,
      "photo_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      "source_data" JSONB,
      "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      "travel_styles" TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      "source_title" TEXT NOT NULL,
      "source_url" TEXT NOT NULL,
      "source_type" TEXT NOT NULL,
      "priority" INTEGER NOT NULL DEFAULT 50,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "recommended_island_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "address" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "contact" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "traffic_info" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "lodging_info" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "food_info" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "nearby_attractions" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "photo_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::text[]`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "source_data" JSONB`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "recommended_island_island_name_idx" ON "recommended_island"("island_name")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "recommended_island_province_city_idx" ON "recommended_island"("province_name", "city_name")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "recommended_island_source_type_idx" ON "recommended_island"("source_type")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "recommended_island_priority_idx" ON "recommended_island"("priority")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "recommended_island_active_idx" ON "recommended_island"("active")`);
}

async function upsertRecommendedIsland(item) {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "recommended_island" (
        "id", "island_name", "display_name", "province_name", "city_name", "island_key",
        "description", "address", "contact", "photo_description", "ferry_summary",
        "traffic_info", "lodging_info", "food_info", "nearby_attractions", "photo_urls", "source_data",
        "highlights", "tags", "travel_styles",
        "source_title", "source_url", "source_type", "priority", "active", "created_at", "updated_at"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, ${pgTextArray(item.photoUrls ?? [])}, $16::jsonb, ${pgTextArray(item.highlights)}, ${pgTextArray(item.tags)}, ${pgTextArray(item.travelStyles)}, $17, $18, $19, $20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "island_name" = EXCLUDED."island_name",
        "display_name" = EXCLUDED."display_name",
        "province_name" = EXCLUDED."province_name",
        "city_name" = EXCLUDED."city_name",
        "island_key" = EXCLUDED."island_key",
        "description" = EXCLUDED."description",
        "address" = COALESCE(EXCLUDED."address", "recommended_island"."address"),
        "contact" = COALESCE(EXCLUDED."contact", "recommended_island"."contact"),
        "photo_description" = EXCLUDED."photo_description",
        "ferry_summary" = EXCLUDED."ferry_summary",
        "traffic_info" = COALESCE(EXCLUDED."traffic_info", "recommended_island"."traffic_info"),
        "lodging_info" = COALESCE(EXCLUDED."lodging_info", "recommended_island"."lodging_info"),
        "food_info" = COALESCE(EXCLUDED."food_info", "recommended_island"."food_info"),
        "nearby_attractions" = COALESCE(EXCLUDED."nearby_attractions", "recommended_island"."nearby_attractions"),
        "photo_urls" = CASE WHEN array_length(EXCLUDED."photo_urls", 1) IS NULL THEN "recommended_island"."photo_urls" ELSE EXCLUDED."photo_urls" END,
        "source_data" = COALESCE(EXCLUDED."source_data", "recommended_island"."source_data"),
        "highlights" = EXCLUDED."highlights",
        "tags" = EXCLUDED."tags",
        "travel_styles" = EXCLUDED."travel_styles",
        "source_title" = EXCLUDED."source_title",
        "source_url" = EXCLUDED."source_url",
        "source_type" = EXCLUDED."source_type",
        "priority" = EXCLUDED."priority",
        "active" = true,
        "updated_at" = CURRENT_TIMESTAMP
    `,
    item.id,
    item.islandName,
    item.displayName,
    item.provinceName,
    item.cityName,
    item.islandKey,
    item.description,
    item.address ?? null,
    item.contact ?? null,
    item.photoDescription,
    item.ferrySummary,
    item.trafficInfo ?? null,
    item.lodgingInfo ?? null,
    item.foodInfo ?? null,
    item.nearbyAttractions ?? null,
    item.sourceData ? JSON.stringify(item.sourceData) : null,
    item.sourceTitle,
    item.sourceUrl,
    item.sourceType,
    item.priority
  );
}

async function main() {
  await ensureTable();
  for (const item of rows) {
    await upsertRecommendedIsland(item);
  }
  console.log(`Seeded ${rows.length} recommended islands.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

