const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const https = require('https');
const path = require('path');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();
const BASE_URL = 'https://www.brcn.go.kr';
const LIST_URL = `${BASE_URL}/prog/attraction/tour/sub01_02/list.do`;
const SOURCE_TITLE = '보령시 문화관광 섬 상세정보';
const SOURCE_TYPE = 'official-boryeong';
const BORYEONG_REGION_TAG = '태안·보령·서천권';
const jsonOnly = process.argv.includes('--json-only');
const ISLANDS = [
  { name: '죽도 상화원', code: '5', priority: 92 },
  { name: '외연도', code: '4', priority: 90 },
  { name: '삽시도', code: '21', priority: 89 },
  { name: '원산도', code: '1', priority: 88 },
  { name: '호도', code: '32', priority: 84 },
  { name: '녹도', code: '24', priority: 82 },
  { name: '효자도', code: '3', priority: 81 },
  { name: '고대도', code: '18', priority: 80 },
  { name: '장고도', code: '17', priority: 79 },
  { name: '다보도', code: '45', priority: 78 },
  { name: '육도', code: '40', priority: 76 },
  { name: '소도', code: '43', priority: 75 },
  { name: '허육도', code: '41', priority: 74 },
  { name: '추도', code: '42', priority: 73 },
  { name: '석대도', code: '46', priority: 72 },
  { name: '월도', code: '35', priority: 71 },
  { name: '빙도', code: '44', priority: 70 }
];

async function main() {
  if (!jsonOnly) await ensureTable();
  const collected = [];
  for (const island of ISLANDS) {
    const detail = await collectIsland(island);
    if (!jsonOnly) await upsertRecommendedIsland(detail);
    collected.push(detail);
    console.log(`${collected.length}. ${detail.islandName} ${jsonOnly ? 'collected' : 'saved'}`);
    await sleep(180);
  }

  const outDir = path.resolve(__dirname, '../../../ref_data/여행추천/brcn');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'recommended-islands-boryeong.json'), JSON.stringify(collected, null, 2), 'utf8');
  console.log(`Collected ${collected.length} Boryeong recommended islands.${jsonOnly ? ' JSON only.' : ''}`);
}

async function collectIsland(island) {
  const detailUrl = `${BASE_URL}/prog/attraction/tour/sub01_02/view.do?listOrder=&searchCondition=&searchKeyword=&searchLocalCode=&searchMonth=&themeCode=1064&attractionCode=${island.code}`;
  const html = await fetchText(detailUrl);
  const summaryBlock = matchFirst(html, /<div class="attractions_summery">([\s\S]*?)<div class="line_box/);
  const title = cleanText(matchFirst(summaryBlock, /<strong>([^<]+)<\/strong>/)) || island.name;
  const summary = cleanText(matchFirst(summaryBlock, /<h4>\s*([\s\S]*?)<strong>/));
  const address = cleanText(matchFirst(html, /소재지\s*:<\/strong>\s*([\s\S]*?)<\/li>/));
  const contact = cleanText(matchFirst(html, /문의처\s*:<\/strong>\s*([\s\S]*?)<\/li>\s*<\/ul>/));
  const content = cleanText(matchFirst(html, /<div class="attractions_content">\s*([\s\S]*?)<\/div>/));
  const contentIndex = html.indexOf('<div class="attractions_content">');
  const trafficInfo = cleanText(sectionAfter(html, '교통정보', '주변관광지', Math.max(contentIndex, 0)));
  const nearbyAttractions = extractNearbyAttractions(html).join(', ');
  const photoItems = extractPhotoItems(html);
  const lodgingUrl = absoluteUrl(matchFirst(html, /href="([^"]*tour_hotel[^"]*)"/));
  const foodUrl = absoluteUrl(matchFirst(html, /href="([^"]*tour_restaurant[^"]*)"/));
  const [lodgingInfo, foodInfo] = await Promise.all([fetchLinkedNames(lodgingUrl), fetchLinkedNames(foodUrl)]);
  const description = summarizeText(content || summary || `${title} 보령 추천섬`);
  const photoDescription = photoItems.map((item) => item.alt).filter(Boolean).slice(0, 4).join(', ') || `${title} 대표 사진`;

  return {
    id: `boryeong-${island.code}-${normalizeId(title)}`,
    islandName: title.replace(/\s*상화원$/, ''),
    displayName: title,
    provinceName: '충청남도',
    cityName: '보령시',
    islandKey: null,
    description,
    address,
    contact,
    photoDescription,
    ferrySummary: extractFerrySummary(trafficInfo),
    trafficInfo,
    lodgingInfo: lodgingInfo.join(', '),
    foodInfo: foodInfo.join(', '),
    nearbyAttractions,
    photoUrls: unique([`${BASE_URL}/prog/attraction/tour/sub01_02/attractionImage_down.do?attractionCode=${island.code}`, ...photoItems.map((item) => item.url)]),
    highlights: inferHighlights(title, content, nearbyAttractions),
    tags: unique([BORYEONG_REGION_TAG, '보령', '섬', '관광', ...inferTags(content)]).slice(0, 12),
    travelStyles: inferTravelStyles(content),
    sourceTitle: SOURCE_TITLE,
    sourceUrl: detailUrl,
    sourceType: SOURCE_TYPE,
    priority: island.priority,
    sourceData: {
      attractionCode: island.code,
      summary,
      content,
      photos: photoItems,
      lodgingUrl,
      foodUrl,
      license: '공공누리 4유형: 출처표시+상업적이용금지+변경금지'
    }
  };
}

async function fetchLinkedNames(url) {
  if (!url) return [];
  try {
    const html = await fetchText(url);
    return unique(
      [...html.matchAll(/<p class="title">([\s\S]*?)<\/p>/g)]
        .map((match) => cleanText(match[1]))
        .filter(Boolean)
        .slice(0, 12)
    );
  } catch {
    return [];
  }
}

function extractPhotoItems(html) {
  return uniqueByUrl(
    [...html.matchAll(/<img src="([^"]*tourImage_down\.do\?imageCode=\d+)" alt="([^"]*)"/g)].map((match) => ({
      url: absoluteUrl(match[1]),
      alt: decodeHtml(match[2])
    }))
  );
}

function extractNearbyAttractions(html) {
  const block = matchFirst(html, /<ul class="aside_attractions">([\s\S]*?)<\/ul>/);
  return [...block.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].map((match) => cleanText(match[1])).filter(Boolean).slice(0, 20);
}

function sectionAfter(html, startLabel, endLabel, fromIndex = 0) {
  const startIndex = html.indexOf(startLabel, fromIndex);
  if (startIndex < 0) return '';
  const endIndex = endLabel ? html.indexOf(endLabel, startIndex + startLabel.length) : -1;
  return html.slice(startIndex, endIndex > startIndex ? endIndex : startIndex + 6000);
}

function extractFerrySummary(value) {
  const text = value || '';
  const route = text.match(/대천\s*→\s*[^0-9\s]+/);
  if (route) return `${route[0]} 운항시간은 계절·조석·선박 사정에 따라 변동될 수 있습니다.`;
  if (text.includes('대천')) return '대천항 또는 대천신항 출발 항로 기준으로 운항 변동 확인이 필요합니다.';
  return '보령시 교통정보와 선사 공지를 기준으로 운항 여부 확인이 필요합니다.';
}

function inferHighlights(title, content, nearby) {
  const text = `${title} ${content} ${nearby}`;
  const highlights = [];
  if (/둘레길|산책|트레킹|봉우리|산/.test(text)) highlights.push('걷기');
  if (/해수욕|해변|자갈|모래/.test(text)) highlights.push('해변');
  if (/상록수림|천연기념물|문화|유적/.test(text)) highlights.push('문화·자연');
  if (/낚시|어장|어업/.test(text)) highlights.push('낚시');
  if (/정원|상화원|휴양/.test(text)) highlights.push('휴양');
  return unique(highlights.length > 0 ? highlights : ['보령 섬여행', '해안 풍경', '관광']).slice(0, 4);
}

function inferTags(content) {
  const tags = [];
  const rules = ['둘레길', '해변', '낚시', '상록수림', '천연기념물', '해수욕', '정원', '휴양', '트레킹', '사진'];
  rules.forEach((rule) => {
    if ((content ?? '').includes(rule)) tags.push(rule);
  });
  return tags;
}

function inferTravelStyles(content) {
  const text = content ?? '';
  const styles = ['dayTrip', 'healing'];
  if (/둘레길|산책|트레킹|봉우리/.test(text)) styles.push('trekking');
  if (/낚시|어장/.test(text)) styles.push('activity');
  if (/정원|상화원|문화|천연기념물/.test(text)) styles.push('family');
  if (/해변|해수욕|사진|해무|경관/.test(text)) styles.push('photo');
  return unique(styles).slice(0, 5);
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
  for (const statement of [
    `ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "address" TEXT`,
    `ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "contact" TEXT`,
    `ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "traffic_info" TEXT`,
    `ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "lodging_info" TEXT`,
    `ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "food_info" TEXT`,
    `ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "nearby_attractions" TEXT`,
    `ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "photo_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::text[]`,
    `ALTER TABLE "recommended_island" ADD COLUMN IF NOT EXISTS "source_data" JSONB`,
    `CREATE INDEX IF NOT EXISTS "recommended_island_island_name_idx" ON "recommended_island"("island_name")`,
    `CREATE INDEX IF NOT EXISTS "recommended_island_province_city_idx" ON "recommended_island"("province_name", "city_name")`,
    `CREATE INDEX IF NOT EXISTS "recommended_island_source_type_idx" ON "recommended_island"("source_type")`,
    `CREATE INDEX IF NOT EXISTS "recommended_island_priority_idx" ON "recommended_island"("priority")`,
    `CREATE INDEX IF NOT EXISTS "recommended_island_active_idx" ON "recommended_island"("active")`
  ]) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function upsertRecommendedIsland(item) {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "recommended_island" (
        "id", "island_name", "display_name", "province_name", "city_name", "island_key",
        "description", "address", "contact", "photo_description", "ferry_summary",
        "traffic_info", "lodging_info", "food_info", "nearby_attractions", "photo_urls", "source_data",
        "highlights", "tags", "travel_styles", "source_title", "source_url", "source_type", "priority", "active", "created_at", "updated_at"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, ${pgTextArray(item.photoUrls)}, $16::jsonb, ${pgTextArray(item.highlights)}, ${pgTextArray(item.tags)}, ${pgTextArray(item.travelStyles)}, $17, $18, $19, $20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "island_name" = EXCLUDED."island_name",
        "display_name" = EXCLUDED."display_name",
        "province_name" = EXCLUDED."province_name",
        "city_name" = EXCLUDED."city_name",
        "island_key" = EXCLUDED."island_key",
        "description" = EXCLUDED."description",
        "address" = EXCLUDED."address",
        "contact" = EXCLUDED."contact",
        "photo_description" = EXCLUDED."photo_description",
        "ferry_summary" = EXCLUDED."ferry_summary",
        "traffic_info" = EXCLUDED."traffic_info",
        "lodging_info" = EXCLUDED."lodging_info",
        "food_info" = EXCLUDED."food_info",
        "nearby_attractions" = EXCLUDED."nearby_attractions",
        "photo_urls" = EXCLUDED."photo_urls",
        "source_data" = EXCLUDED."source_data",
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
    item.address,
    item.contact,
    item.photoDescription,
    item.ferrySummary,
    item.trafficInfo,
    item.lodgingInfo,
    item.foodInfo,
    item.nearbyAttractions,
    JSON.stringify(item.sourceData),
    item.sourceTitle,
    item.sourceUrl,
    item.sourceType,
    item.priority
  );
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'badagil-data-collector/1.0' } }, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          resolve(fetchText(absoluteUrl(response.headers.location)));
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${url}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

function pgTextArray(values) {
  return `ARRAY[${(values ?? []).map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ')}]::text[]`;
}

function matchFirst(value, regex) {
  return value.match(regex)?.[1] ?? '';
}

function summarizeText(value) {
  const text = cleanText(value);
  if (text.length <= 260) return text;
  return `${text.slice(0, 260).replace(/\s+\S*$/, '')}...`;
}

function cleanText(value) {
  return decodeHtml(String(value ?? ''))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|div|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function absoluteUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${decodeHtml(url)}`;
}

function normalizeId(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣-]/g, '')
    .toLowerCase();
}

function unique(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function uniqueByUrl(values) {
  const seen = new Set();
  return values.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
