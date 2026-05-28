import { Injectable } from '@nestjs/common';
import type { KomsaVesselScrapeItem } from './vessel-detail.types';

const KOMSA_ORIGIN = 'https://www.komsa.or.kr';
const LIST_URL = `${KOMSA_ORIGIN}/prog/psnShip/kor/sub03_0204/list.do`;
const VIEW_URL = `${KOMSA_ORIGIN}/prog/psnShip/kor/sub03_0204/view.do`;

type ListItem = {
  shipNo: string;
  vesselName: string;
  imageUrl: string | null;
};

@Injectable()
export class KomsaVesselScraperService {
  async scrapeAll(maxPages = 26): Promise<KomsaVesselScrapeItem[]> {
    const items: KomsaVesselScrapeItem[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
      const listItems = await this.scrapeListPage(page);
      if (listItems.length === 0) {
        break;
      }

      for (const listItem of listItems) {
        items.push(await this.scrapeDetail(listItem));
      }
    }

    return items;
  }

  private async scrapeListPage(pageIndex: number): Promise<ListItem[]> {
    const html = await fetchText(`${LIST_URL}?pageIndex=${pageIndex}`);
    const itemPattern =
      /fn_search_detail\('(?<shipNo>[^']+)'\)[\s\S]*?<img[^>]+src="(?<imageUrl>[^"]+)"[^>]+alt="(?<alt>[^"]*)"[\s\S]*?<strong class="title">(?<title>[\s\S]*?)<\/strong>/g;
    const items: ListItem[] = [];

    for (const match of html.matchAll(itemPattern)) {
      const shipNo = match.groups?.shipNo?.trim();
      const vesselName = cleanText(match.groups?.title ?? match.groups?.alt ?? '');
      if (!shipNo || !vesselName) {
        continue;
      }

      items.push({
        shipNo,
        vesselName,
        imageUrl: absolutizeUrl(match.groups?.imageUrl)
      });
    }

    return items;
  }

  private async scrapeDetail(listItem: ListItem): Promise<KomsaVesselScrapeItem> {
    const sourceUrl = `${VIEW_URL}?shipNo=${encodeURIComponent(listItem.shipNo)}`;
    const html = await fetchText(sourceUrl);
    const detailMap = parseDetailMap(html);
    const speeds = detailMap.get('속력') ?? [];
    const engines = detailMap.get('기관') ?? [];
    const imageUrl = absolutizeUrl(extractFirst(html, /<div class="thumb">[\s\S]*?<img[^>]+src="([^"]+)"/) ?? listItem.imageUrl);

    return {
      shipNo: listItem.shipNo,
      vesselName: cleanText(extractFirst(html, /<div class="info_box">\s*<strong>([\s\S]*?)<\/strong>/) ?? listItem.vesselName),
      imageUrl,
      imageDataUrl: await fetchDataUrl(imageUrl),
      sourceUrl,
      grossTonnage: firstListText(html, '총톤수') ?? null,
      dimensions: firstListText(html, '장*폭*심') ?? null,
      shipType: firstValue(detailMap, '선형'),
      shipKind: firstValue(detailMap, '선종'),
      maxSpeed: findPrefixedValue(speeds, '최대'),
      cruiseSpeed: findPrefixedValue(speeds, '항해'),
      engineType: findPrefixedValue(engines, '종류'),
      enginePower: findPrefixedValue(engines, '마력'),
      navigationArea: firstValue(detailMap, '항해구역'),
      passengerCapacity: firstValue(detailMap, '여객정원'),
      routeName: firstValue(detailMap, '항로명'),
      operatorName: firstValue(detailMap, '선사')
    };
  }
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Badagil/0.1 vessel-detail-sync (+https://www.komsa.or.kr)'
    }
  });

  if (!response.ok) {
    throw new Error(`KOMSA request failed: ${response.status} ${url}`);
  }

  return response.text();
}

async function fetchDataUrl(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

function parseDetailMap(html: string) {
  const map = new Map<string, string[]>();
  const itemPattern = /<strong class="h-box">([\s\S]*?)<\/strong>([\s\S]*?)<\/div>\s*<\/div>/g;

  for (const match of html.matchAll(itemPattern)) {
    const label = cleanText(match[1]);
    const values = [...match[2].matchAll(/<em class="ui-text">([\s\S]*?)<\/em>/g)]
      .map((valueMatch) => cleanText(valueMatch[1]))
      .filter(Boolean);

    if (label && values.length > 0) {
      map.set(label, values);
    }
  }

  return map;
}

function firstListText(html: string, label: string) {
  const escaped = escapeRegExp(label);
  return cleanText(extractFirst(html, new RegExp(`<li><span>${escaped}<\\/span>([\\s\\S]*?)<\\/li>`)) ?? '') || null;
}

function firstValue(map: Map<string, string[]>, key: string) {
  return map.get(key)?.[0] ?? null;
}

function findPrefixedValue(values: string[], label: string) {
  const value = values.find((item) => item.startsWith(`${label} :`));
  return value?.replace(`${label} :`, '').trim() ?? null;
}

function extractFirst(html: string, pattern: RegExp) {
  return html.match(pattern)?.[1];
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function absolutizeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.startsWith('http')) {
    return value;
  }

  return `${KOMSA_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
