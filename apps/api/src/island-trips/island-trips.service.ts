import { Injectable } from '@nestjs/common';
import type {
  IslandTravelAttraction,
  IslandTravelCamp,
  IslandTravelInfo,
  IslandTravelLodging,
  IslandTravelRestaurant,
  IslandTravelSafetyIndex
} from '@badagil/shared';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { asRecord, extractItems, makeStableId, pickNumber, pickString } from '../public-api/public-api-response.util';
import { TourismApiClient } from '../public-api/clients/tourism-api.client';
import type { PublicApiResult } from '../public-api/types/public-api.types';

type TravelInfoParams = {
  islandName: string;
  provinceName?: string;
  cityName?: string;
  latitude?: number;
  longitude?: number;
};

type UnknownRecord = Record<string, unknown>;

@Injectable()
export class IslandTripsService {
  constructor(private readonly tourismApiClient: TourismApiClient) {}

  async getTravelInfo(params: TravelInfoParams) {
    const islandName = normalizeIslandName(params.islandName);
    const [attractions, goCamping, cultureCamping, generalCamping, safetyIndexes, lodgings, restaurants] = await Promise.all([
      this.safeFetch(() => this.tourismApiClient.searchTourAttractions(islandName)),
      this.safeFetch(async () => {
        const response = await this.tourismApiClient.searchGoCamping(islandName);
        const items = extractItems(response);
        return items.length > 0 ? response : this.tourismApiClient.getGoCampingList();
      }),
      this.safeFetch(() => this.tourismApiClient.getCultureCamping()),
      this.safeFetch(() => this.tourismApiClient.getGeneralCampgrounds()),
      this.safeFetch(() => this.tourismApiClient.getSeaTripIndexes()),
      this.safeFetch(() => this.tourismApiClient.getLodgings()),
      this.safeFetch(() => this.tourismApiClient.getTouristRestaurants())
    ]);

    const attractionItems = this.toAttractions(attractions, islandName);
    const campItems = this.toCamps(goCamping, cultureCamping, generalCamping, params);
    const lodgingItems = this.toLodgings(lodgings, params);
    const restaurantItems = this.toRestaurants(restaurants, params);
    const safetyItems = this.toSafetyIndexes(safetyIndexes, islandName);

    const data: IslandTravelInfo = {
      islandName,
      attractions: attractionItems,
      camps: campItems,
      lodgings: lodgingItems,
      restaurants: restaurantItems,
      safetyIndexes: safetyItems,
      sourceSummary: {
        tourism: attractionItems.some((item) => item.source !== 'MOCK') ? '한국관광공사 국문 관광정보' : '미리보기 관광정보',
        camping: campItems.some((item) => item.source !== 'MOCK') ? '고캠핑·문화캠핑·일반야영장업' : '미리보기 캠핑정보',
        lodging: lodgingItems.some((item) => item.source !== 'MOCK') ? '행정안전부 문화 숙박업' : '미리보기 숙박정보',
        food: restaurantItems.some((item) => item.source !== 'MOCK') ? '행정안전부 관광식당' : '미리보기 식당정보',
        safety: safetyItems.some((item) => item.source !== 'MOCK') ? '국립해양조사원 바다여행지수' : '미리보기 안전정보'
      },
      updatedAt: new Date().toISOString()
    };

    return toApiResponse(this.createResult(data, this.isPreview(data) ? 'MOCK' : 'KOMSA', 'island-trip-travel-info'));
  }

  private async safeFetch<T>(fetcher: () => Promise<T>) {
    try {
      return await fetcher();
    } catch {
      return null;
    }
  }

  private toAttractions(response: unknown, islandName: string): IslandTravelAttraction[] {
    const items = extractItems(response)
      .map((item) => ({
        id: makeStableId('attraction', [pickString(item, ATTRACTION_KEYS.id), pickString(item, ATTRACTION_KEYS.title)]),
        title: pickString(item, ATTRACTION_KEYS.title) ?? '',
        category: pickString(item, ATTRACTION_KEYS.category),
        address: pickString(item, ATTRACTION_KEYS.address),
        imageUrl: pickString(item, ATTRACTION_KEYS.image),
        mapX: pickNumber(item, ATTRACTION_KEYS.mapX),
        mapY: pickNumber(item, ATTRACTION_KEYS.mapY),
        source: 'TOUR_API' as const
      }))
      .filter((item) => item.title);

    return items.length > 0 ? uniqueById(items).slice(0, 6) : previewAttractions(islandName);
  }

  private toCamps(goCamping: unknown, cultureCamping: unknown, generalCamping: unknown, params: TravelInfoParams): IslandTravelCamp[] {
    const keyword = [params.islandName, params.provinceName, params.cityName].filter(Boolean).join(' ');
    const camps = [
      ...extractItems(goCamping).map((item) => this.toCamp(item, 'GOCAMPING' as const)),
      ...extractCultureItems(cultureCamping).map((item) => this.toCamp(item, 'CULTURE_CAMPING' as const)),
      ...extractItems(generalCamping).map((item) => this.toCamp(item, 'LOCAL_CAMPGROUND' as const))
    ]
      .filter((item) => item.name)
      .filter((item) => matchesKeyword(item, keyword));

    return camps.length > 0 ? uniqueById(camps).slice(0, 6) : previewCamps(params.islandName);
  }

  private toCamp(
    item: UnknownRecord,
    source: IslandTravelCamp['source']
  ): IslandTravelCamp {
    const restriction = pickString(item, CAMP_KEYS.restriction);
    return {
      id: makeStableId('camp', [source, pickString(item, CAMP_KEYS.id), pickString(item, CAMP_KEYS.name)]),
      name: pickString(item, CAMP_KEYS.name) ?? '',
      address: pickString(item, CAMP_KEYS.address),
      facilitySummary: pickString(item, CAMP_KEYS.facilities),
      reservation: pickString(item, CAMP_KEYS.reservation),
      restriction,
      status: inferCampStatus(restriction),
      source
    };
  }

  private toSafetyIndexes(response: unknown, islandName: string): IslandTravelSafetyIndex[] {
    const items = extractItems(response)
      .map((item) => ({
        id: makeStableId('sea-trip', [pickString(item, SEA_TRIP_KEYS.id), pickString(item, SEA_TRIP_KEYS.title)]),
        title: pickString(item, SEA_TRIP_KEYS.title) ?? '바다여행지수',
        areaName: pickString(item, SEA_TRIP_KEYS.area),
        score: pickString(item, SEA_TRIP_KEYS.score),
        advisory: pickString(item, SEA_TRIP_KEYS.advisory) ?? '파고, 풍속, 기상특보와 복귀 배편을 함께 확인하세요.',
        forecastDate: pickString(item, SEA_TRIP_KEYS.forecastDate),
        source: 'KHOA_SEA_TRIP' as const
      }))
      .filter((item) => item.title)
      .filter((item) => !item.areaName || item.areaName.includes(islandName.replace(/도$/, '')) || islandName.includes(item.areaName));

    return items.length > 0 ? uniqueById(items).slice(0, 4) : previewSafetyIndexes(islandName);
  }

  private toLodgings(response: unknown, params: TravelInfoParams): IslandTravelLodging[] {
    const keyword = createTravelKeyword(params);
    const items = extractItems(response)
      .map((item) => ({
        id: makeStableId('lodging', [pickString(item, LODGING_KEYS.id), pickString(item, LODGING_KEYS.name)]),
        name: pickString(item, LODGING_KEYS.name) ?? '',
        address: pickString(item, LODGING_KEYS.address),
        category: pickString(item, LODGING_KEYS.category),
        tel: pickString(item, LODGING_KEYS.tel),
        status: pickString(item, LODGING_KEYS.status),
        source: 'LOCAL_LODGING' as const
      }))
      .filter((item) => item.name)
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.category], keyword));

    return items.length > 0 ? uniqueById(items).slice(0, 6) : previewLodgings(params.islandName);
  }

  private toRestaurants(response: unknown, params: TravelInfoParams): IslandTravelRestaurant[] {
    const keyword = createTravelKeyword(params);
    const items = extractItems(response)
      .map((item) => ({
        id: makeStableId('restaurant', [pickString(item, RESTAURANT_KEYS.id), pickString(item, RESTAURANT_KEYS.name)]),
        name: pickString(item, RESTAURANT_KEYS.name) ?? '',
        address: pickString(item, RESTAURANT_KEYS.address),
        category: pickString(item, RESTAURANT_KEYS.category),
        tel: pickString(item, RESTAURANT_KEYS.tel),
        representativeMenu: pickString(item, RESTAURANT_KEYS.menu),
        status: pickString(item, RESTAURANT_KEYS.status),
        source: 'TOURIST_RESTAURANT' as const
      }))
      .filter((item) => item.name)
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.category, item.representativeMenu], keyword));

    return items.length > 0 ? uniqueById(items).slice(0, 6) : previewRestaurants(params.islandName);
  }

  private isPreview(data: IslandTravelInfo) {
    return (
      data.attractions.every((item) => item.source === 'MOCK') &&
      data.camps.every((item) => item.source === 'MOCK') &&
      data.lodgings.every((item) => item.source === 'MOCK') &&
      data.restaurants.every((item) => item.source === 'MOCK') &&
      data.safetyIndexes.every((item) => item.source === 'MOCK')
    );
  }

  private createResult<T>(
    data: T,
    provider: PublicApiResult<T>['meta']['provider'],
    source: string
  ): PublicApiResult<T> {
    return {
      data,
      meta: {
        provider,
        source,
        fetchedAt: new Date().toISOString(),
        rawFormat: provider === 'MOCK' ? 'mock' : 'json'
      }
    };
  }
}

const ATTRACTION_KEYS = {
  id: ['contentid', 'contentId', 'id'],
  title: ['title', 'name', 'facltNm'],
  category: ['cat3', 'cat2', 'contenttypeid', 'category'],
  address: ['addr1', 'addr', 'address', 'rdnmadr', 'lnmadr'],
  image: ['firstimage', 'firstImage', 'imageUrl'],
  mapX: ['mapx', 'mapX', 'longitude', 'lon'],
  mapY: ['mapy', 'mapY', 'latitude', 'lat']
} as const;

const CAMP_KEYS = {
  id: ['contentId', 'contentid', 'id', 'manageNo', 'opnsfTeamCode'],
  name: ['facltNm', 'name', 'fcltyNm', 'bplcNm', 'cmpingNm', '사업장명', '시설명'],
  address: ['addr1', 'addr', 'address', 'rdnmadr', 'lnmadr', 'siteWhlAddr', '소재지전체주소', '도로명전체주소'],
  facilities: ['sbrsCl', 'posblFcltyCl', 'induty', 'intro', 'featureNm', '편의시설', '시설특징'],
  reservation: ['resveUrl', 'homepage', 'tel', '예약방법', '전화번호'],
  restriction: ['allar', 'manageSttus', 'trlerAcmpnyAt', 'caravAcmpnyAt', '상태', '영업상태명']
} as const;

const SEA_TRIP_KEYS = {
  id: ['beachCode', 'areaCode', 'id'],
  title: ['beachName', 'spotName', 'title', 'name'],
  area: ['areaName', 'sidoName', 'sigunguName', 'addr'],
  score: ['totalIndex', 'index', 'score', 'grade'],
  advisory: ['weather', 'summary', 'remark', 'advisory'],
  forecastDate: ['baseDate', 'forecastDate', 'fcstDate']
} as const;

const LODGING_KEYS = {
  id: ['mgtNo', 'manageNo', 'opnsfTeamCode', 'id'],
  name: ['bplcNm', 'name', 'facltNm', '사업장명', '업소명'],
  address: ['siteWhlAddr', 'rdnWhlAddr', 'rdnmadr', 'lnmadr', 'address', '소재지전체주소', '도로명전체주소'],
  category: ['uptaeNm', 'siteTel', 'induty', '업태구분명', '업종명'],
  tel: ['siteTel', 'tel', 'phone', '전화번호'],
  status: ['trdStateNm', 'dtlStateNm', 'manageSttus', '영업상태명', '상세영업상태명']
} as const;

const RESTAURANT_KEYS = {
  id: ['mgtNo', 'manageNo', 'opnsfTeamCode', 'id'],
  name: ['bplcNm', 'name', 'title', '사업장명', '업소명'],
  address: ['siteWhlAddr', 'rdnWhlAddr', 'rdnmadr', 'lnmadr', 'address', '소재지전체주소', '도로명전체주소'],
  category: ['uptaeNm', 'foodType', 'induty', '업태구분명', '음식유형'],
  tel: ['siteTel', 'tel', 'phone', '전화번호'],
  menu: ['repsntMenu', 'mainMenu', 'menu', '대표메뉴', '주메뉴'],
  status: ['trdStateNm', 'dtlStateNm', 'manageSttus', '영업상태명', '상세영업상태명']
} as const;

function extractCultureItems(response: unknown) {
  const record = asRecord(response);
  const data = record?.data;

  if (Array.isArray(data)) {
    return data.flatMap((item) => {
      const itemRecord = asRecord(item);
      return itemRecord ? [itemRecord] : [];
    });
  }

  return extractItems(response);
}

function normalizeIslandName(value: string) {
  return (value || '덕적도').trim();
}

function matchesKeyword(item: IslandTravelCamp, keyword: string) {
  const normalized = keyword.replace(/\s+/g, '');
  if (!normalized) return true;
  const target = [item.name, item.address, item.facilitySummary].filter(Boolean).join('').replace(/\s+/g, '');
  return normalized
    .split(/[·,-]/)
    .filter((part) => part.length >= 2)
    .some((part) => target.includes(part) || part.includes(target.slice(0, 2)));
}

function createTravelKeyword(params: TravelInfoParams) {
  return [params.islandName, params.provinceName, params.cityName].filter(Boolean).join(' ');
}

function matchesTravelKeyword(values: Array<string | null | undefined>, keyword: string) {
  const parts = keyword
    .replace(/\s+/g, '')
    .split(/[·,-]/)
    .filter((part) => part.length >= 2);

  if (parts.length === 0) return true;

  const target = values.filter(Boolean).join('').replace(/\s+/g, '');
  if (!target) return false;

  return parts.some((part) => target.includes(part) || part.includes(target.slice(0, 2)));
}

function inferCampStatus(restriction: string | null): IslandTravelCamp['status'] {
  const text = restriction ?? '';
  if (/금지|폐업|취소|제한/.test(text)) return 'RESTRICTED';
  if (/가능|운영|영업/.test(text)) return 'AVAILABLE';
  return 'CHECK_REQUIRED';
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function previewAttractions(islandName: string): IslandTravelAttraction[] {
  return [
    {
      id: `preview-attraction-${islandName}-beach`,
      title: `${islandName} 해변 산책`,
      category: '관광지',
      address: null,
      imageUrl: null,
      mapX: null,
      mapY: null,
      source: 'MOCK'
    },
    {
      id: `preview-attraction-${islandName}-view`,
      title: `${islandName} 전망 포인트`,
      category: '자연',
      address: null,
      imageUrl: null,
      mapX: null,
      mapY: null,
      source: 'MOCK'
    }
  ];
}

function previewCamps(islandName: string): IslandTravelCamp[] {
  return [
    {
      id: `preview-camp-${islandName}`,
      name: `${islandName} 캠핑·차박 후보지`,
      address: null,
      facilitySummary: '화장실, 주차장, 급수대 여부 확인 필요',
      reservation: '현장 안내문 또는 지자체 문의',
      restriction: '현장 확인 필요',
      status: 'CHECK_REQUIRED',
      source: 'MOCK'
    }
  ];
}

function previewLodgings(islandName: string): IslandTravelLodging[] {
  return [
    {
      id: `preview-lodging-${islandName}`,
      name: `${islandName} 숙박 후보`,
      address: null,
      category: '숙박업',
      tel: null,
      status: '확인 필요',
      source: 'MOCK'
    }
  ];
}

function previewRestaurants(islandName: string): IslandTravelRestaurant[] {
  return [
    {
      id: `preview-restaurant-${islandName}`,
      name: `${islandName} 식당 후보`,
      address: null,
      category: '관광식당',
      tel: null,
      representativeMenu: '현장 메뉴 확인 필요',
      status: '확인 필요',
      source: 'MOCK'
    }
  ];
}

function previewSafetyIndexes(islandName: string): IslandTravelSafetyIndex[] {
  return [
    {
      id: `preview-safety-${islandName}`,
      title: `${islandName} 바다여행 체크`,
      areaName: islandName,
      score: '확인 필요',
      advisory: '파고, 풍속, 기상특보와 마지막 복귀 배편을 먼저 확인하세요.',
      forecastDate: null,
      source: 'MOCK'
    }
  ];
}
