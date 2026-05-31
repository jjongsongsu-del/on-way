import { Injectable } from '@nestjs/common';
import type {
  IslandTravelAttraction,
  IslandTravelCamp,
  IslandTravelInfo,
  IslandTravelLodging,
  IslandTravelMudFlat,
  IslandTravelPension,
  IslandTravelPhoto,
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
type FetchResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

@Injectable()
export class IslandTripsService {
  constructor(private readonly tourismApiClient: TourismApiClient) {}

  async getTravelInfo(params: TravelInfoParams) {
    const islandName = normalizeIslandName(params.islandName);
    const [
      attractions,
      goCamping,
      cultureCamping,
      generalCamping,
      safetyIndexes,
      lodgings,
      restaurants,
      pensions,
      mudFlatEcInfo,
      mudFlatVillages,
      photos
    ] = await Promise.all([
      this.safeFetch(() => this.tourismApiClient.searchTourAttractions(islandName)),
      this.safeFetch(async () => {
        const response = await this.tourismApiClient.searchGoCamping(islandName);
        const items = extractItems(response);
        return items.length > 0 ? response : this.tourismApiClient.getGoCampingList();
      }),
      this.safeFetch(() => this.tourismApiClient.getCultureCamping()),
      this.safeFetch(() => this.tourismApiClient.getGeneralCampgrounds()),
      this.safeFetch(() => this.tourismApiClient.getSeaTripIndexes()),
      this.safeFetch(() => this.tourismApiClient.getLodgings(islandName)),
      this.safeFetch(() => this.tourismApiClient.getTouristRestaurants(islandName)),
      this.safeFetch(() => this.tourismApiClient.getTouristPensions(islandName)),
      this.safeFetch(() => this.tourismApiClient.getMudFlatEcInfo()),
      this.safeFetch(() => this.tourismApiClient.getMudFlatExperienceVillages()),
      this.safeFetch(async () => {
        const response = await this.tourismApiClient.searchPhotoGallery(islandName);
        const items = extractItems(response);
        return items.length > 0 ? response : this.tourismApiClient.getPhotoGalleryList();
      })
    ]);

    const attractionItems = attractions.ok ? this.toAttractions(attractions.data, islandName) : [];
    const campItems = this.toCamps(goCamping.ok ? goCamping.data : null, cultureCamping.ok ? cultureCamping.data : null, generalCamping.ok ? generalCamping.data : null, params);
    const lodgingItems = lodgings.ok ? this.toLodgings(lodgings.data, params) : [];
    const restaurantItems = restaurants.ok ? this.toRestaurants(restaurants.data, params) : [];
    const pensionItems = pensions.ok ? this.toPensions(pensions.data, params) : [];
    const mudFlatItems = this.toMudFlats(mudFlatEcInfo.ok ? mudFlatEcInfo.data : null, mudFlatVillages.ok ? mudFlatVillages.data : null, params);
    const safetyItems = safetyIndexes.ok ? this.toSafetyIndexes(safetyIndexes.data, islandName) : [];
    const photoItems = photos.ok ? this.toPhotos(photos.data, islandName) : [];
    const data: IslandTravelInfo = {
      islandName,
      attractions: attractionItems,
      camps: campItems,
      lodgings: lodgingItems,
      pensions: pensionItems,
      restaurants: restaurantItems,
      mudFlats: mudFlatItems,
      safetyIndexes: safetyItems,
      photos: photoItems,
      sourceSummary: {
        tourism: '한국관광공사 국문 관광정보',
        camping: '고캠핑·문화캠핑·일반야영장업',
        lodging: '행정안전부 문화 숙박업',
        pension: '행정안전부 문화 관광펜션업',
        food: '행정안전부 관광식당',
        mudFlat: '해양수산부 갯벌 정보',
        safety: '국립해양조사원 바다여행지수',
        photo: '한국관광공사 관광사진'
      },
      apiStatus: {
        tourism: createApiStatus(attractions, attractionItems.length, '관광정보가 존재하지 않습니다.'),
        camping: createApiStatus(combineFetchResults([goCamping, cultureCamping, generalCamping]), campItems.length, '캠핑/차박정보가 존재하지 않습니다.'),
        lodging: createApiStatus(lodgings, lodgingItems.length, '숙박정보가 존재하지 않습니다.'),
        pension: createApiStatus(pensions, pensionItems.length, '펜션정보가 존재하지 않습니다.'),
        food: createApiStatus(restaurants, restaurantItems.length, '식당정보가 존재하지 않습니다.'),
        mudFlat: createApiStatus(combineFetchResults([mudFlatEcInfo, mudFlatVillages]), mudFlatItems.length, '갯벌정보가 존재하지 않습니다.'),
        safety: createApiStatus(safetyIndexes, safetyItems.length, '안전정보와 여행지수가 존재하지 않습니다.'),
        photo: createApiStatus(photos, photoItems.length, '관련 관광사진이 존재하지 않습니다.')
      },
      updatedAt: new Date().toISOString()
    };

    return toApiResponse(this.createResult(data, 'TOURISM', 'island-trip-travel-info'));
  }

  private async safeFetch<T>(fetcher: () => Promise<T>): Promise<FetchResult<T>> {
    try {
      return { ok: true, data: await fetcher() };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
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
        detailFields: createDetailFields(item, ATTRACTION_DETAIL_FIELDS),
        source: 'TOUR_API' as const
      }))
      .filter((item) => item.title);

    return uniqueById(items).slice(0, 6);
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

    return uniqueById(camps).slice(0, 6);
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
      detailFields: createDetailFields(item, CAMP_DETAIL_FIELDS),
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

    return uniqueById(items).slice(0, 4);
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
        detailFields: createDetailFields(item, LODGING_DETAIL_FIELDS),
        source: 'LOCAL_LODGING' as const
      }))
      .filter((item) => item.name)
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.category], keyword));

    return uniqueById(items).slice(0, 6);
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
        detailFields: createDetailFields(item, RESTAURANT_DETAIL_FIELDS),
        source: 'TOURIST_RESTAURANT' as const
      }))
      .filter((item) => item.name)
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.category, item.representativeMenu], keyword));

    return uniqueById(items).slice(0, 6);
  }

  private toPensions(response: unknown, params: TravelInfoParams): IslandTravelPension[] {
    const keyword = createTravelKeyword(params);
    const items = extractItems(response)
      .map((item) => ({
        id: makeStableId('pension', [pickString(item, PENSION_KEYS.id), pickString(item, PENSION_KEYS.name)]),
        name: pickString(item, PENSION_KEYS.name) ?? '',
        address: pickString(item, PENSION_KEYS.address),
        category: pickString(item, PENSION_KEYS.category),
        tel: pickString(item, PENSION_KEYS.tel),
        status: pickString(item, PENSION_KEYS.status),
        detailFields: createDetailFields(item, PENSION_DETAIL_FIELDS),
        source: 'TOURIST_PENSION' as const
      }))
      .filter((item) => item.name)
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.category], keyword));

    return uniqueById(items).slice(0, 6);
  }

  private toMudFlats(ecInfo: unknown, villages: unknown, params: TravelInfoParams): IslandTravelMudFlat[] {
    const keyword = createTravelKeyword(params);
    const items = [...extractItems(ecInfo), ...extractItems(villages)]
      .map((item) => ({
        id: makeStableId('mudflat', [pickString(item, MUD_FLAT_KEYS.id), pickString(item, MUD_FLAT_KEYS.name)]),
        name: pickString(item, MUD_FLAT_KEYS.name) ?? '',
        address: pickString(item, MUD_FLAT_KEYS.address),
        areaName: pickString(item, MUD_FLAT_KEYS.areaName),
        description: pickString(item, MUD_FLAT_KEYS.description),
        experience: pickString(item, MUD_FLAT_KEYS.experience),
        tel: pickString(item, MUD_FLAT_KEYS.tel),
        source: 'MUD_FLAT' as const
      }))
      .filter((item) => item.name)
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.areaName, item.description], keyword));

    return uniqueById(items).slice(0, 6);
  }

  private toPhotos(response: unknown, islandName: string): IslandTravelPhoto[] {
    const keywordParts = createPhotoKeywordParts(islandName);
    const items = extractItems(response)
      .map((item) => ({
        id: makeStableId('photo', [pickString(item, PHOTO_KEYS.id), pickString(item, PHOTO_KEYS.title), pickString(item, PHOTO_KEYS.image)]),
        title: pickString(item, PHOTO_KEYS.title) ?? `${islandName} 사진`,
        imageUrl: pickString(item, PHOTO_KEYS.image),
        thumbnailUrl: pickString(item, PHOTO_KEYS.thumbnail),
        locationName: pickString(item, PHOTO_KEYS.location),
        photographer: pickString(item, PHOTO_KEYS.photographer),
        searchKeywords: pickString(item, PHOTO_KEYS.searchKeywords),
        source: 'TOUR_PHOTO' as const
      }))
      .filter((item) => item.imageUrl || item.thumbnailUrl)
      .filter((item) => matchesPhotoKeyword(item, keywordParts));

    return uniqueById(items).slice(0, 12);
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

const PENSION_KEYS = {
  id: ['mgtNo', 'manageNo', 'opnsfTeamCode', 'id'],
  name: ['bplcNm', 'name', 'facltNm', '사업장명', '업소명'],
  address: ['siteWhlAddr', 'rdnWhlAddr', 'rdnmadr', 'lnmadr', 'address', '소재지전체주소', '도로명전체주소'],
  category: ['uptaeNm', 'induty', '업태구분명', '업종명'],
  tel: ['siteTel', 'tel', 'phone', '전화번호'],
  status: ['trdStateNm', 'dtlStateNm', 'manageSttus', '영업상태명', '상세영업상태명']
} as const;

const MUD_FLAT_KEYS = {
  id: ['sn', 'id', 'manageNo', 'mfNo', 'vllgNo'],
  name: ['exprnVllgNm', 'vllgNm', 'mudFlatNm', 'mfNm', 'name', 'title', '갯벌명', '체험마을명'],
  address: ['addr', 'address', 'rdnmadr', 'lnmadr', 'siteWhlAddr', '소재지', '주소'],
  areaName: ['areaNm', 'sidoNm', 'sigunguNm', 'region', '지역명'],
  description: ['intro', 'cn', 'description', 'ecInfo', 'rm', '내용', '소개'],
  experience: ['exprnCn', 'exprnInfo', 'program', 'experience', '체험내용', '체험프로그램'],
  tel: ['tel', 'phone', 'telNo', '전화번호']
} as const;

const PHOTO_KEYS = {
  id: ['galContentId', 'contentid', 'contentId', 'id'],
  title: ['galTitle', 'title', 'name'],
  image: ['galWebImageUrl', 'firstimage', 'imageUrl', 'originimgurl'],
  thumbnail: ['galWebImageUrl', 'smallimageurl', 'thumbnailUrl', 'thumbUrl'],
  location: ['galPhotographyLocation', 'addr1', 'addr', 'location'],
  photographer: ['galPhotographer', 'photographer'],
  searchKeywords: ['galSearchKeyword', 'searchKeyword', 'keyword']
} as const;

const ATTRACTION_DETAIL_FIELDS = [
  { label: '콘텐츠 ID', keys: ['contentid', 'contentId'] },
  { label: '콘텐츠 유형', keys: ['contenttypeid', 'contentTypeId'] },
  { label: '대분류', keys: ['cat1'] },
  { label: '중분류', keys: ['cat2'] },
  { label: '소분류', keys: ['cat3'] },
  { label: '도로명주소', keys: ['addr2'] },
  { label: '우편번호', keys: ['zipcode'] },
  { label: '전화', keys: ['tel'] },
  { label: '좌표', keys: ['mapx', 'mapX', 'mapy', 'mapY'], combine: true }
] as const;

const CAMP_DETAIL_FIELDS = [
  { label: '업종', keys: ['induty'] },
  { label: '입지', keys: ['lctCl'] },
  { label: '캠핑장 유형', keys: ['facltDivNm'] },
  { label: '운영상태', keys: ['manageSttus', '영업상태명'] },
  { label: '운영주체', keys: ['manageNmpr'] },
  { label: '문의처', keys: ['tel', 'siteTel', '전화번호'] },
  { label: '홈페이지', keys: ['homepage'] },
  { label: '예약 URL', keys: ['resveUrl'] },
  { label: '주요시설', keys: ['gnrlSiteCo', 'autoSiteCo', 'glampSiteCo', 'caravSiteCo'], combine: true },
  { label: '부대시설', keys: ['sbrsCl', 'posblFcltyCl'] },
  { label: '반려동물', keys: ['animalCmgCl'] },
  { label: '트레일러 동반', keys: ['trlerAcmpnyAt'] },
  { label: '카라반 동반', keys: ['caravAcmpnyAt'] }
] as const;

const LODGING_DETAIL_FIELDS = [
  { label: '관리번호', keys: ['mgtNo', 'manageNo'] },
  { label: '인허가일자', keys: ['apvPermYmd'] },
  { label: '영업상태', keys: ['trdStateNm'] },
  { label: '상세상태', keys: ['dtlStateNm'] },
  { label: '폐업일자', keys: ['dcbYmd'] },
  { label: '소재지전화', keys: ['siteTel'] },
  { label: '지번주소', keys: ['siteWhlAddr'] },
  { label: '도로명주소', keys: ['rdnWhlAddr'] },
  { label: '우편번호', keys: ['rdnPostNo'] },
  { label: '업태', keys: ['uptaeNm'] }
] as const;

const RESTAURANT_DETAIL_FIELDS = [
  { label: '관리번호', keys: ['mgtNo', 'manageNo'] },
  { label: '인허가일자', keys: ['apvPermYmd'] },
  { label: '영업상태', keys: ['trdStateNm'] },
  { label: '상세상태', keys: ['dtlStateNm'] },
  { label: '폐업일자', keys: ['dcbYmd'] },
  { label: '소재지전화', keys: ['siteTel'] },
  { label: '지번주소', keys: ['siteWhlAddr'] },
  { label: '도로명주소', keys: ['rdnWhlAddr'] },
  { label: '업태', keys: ['uptaeNm'] },
  { label: '대표메뉴', keys: ['repsntMenu', 'mainMenu', 'menu'] }
] as const;

const PENSION_DETAIL_FIELDS = [
  { label: '관리번호', keys: ['mgtNo', 'manageNo'] },
  { label: '인허가일자', keys: ['apvPermYmd'] },
  { label: '영업상태', keys: ['trdStateNm'] },
  { label: '상세상태', keys: ['dtlStateNm'] },
  { label: '폐업일자', keys: ['dcbYmd'] },
  { label: '소재지전화', keys: ['siteTel'] },
  { label: '지번주소', keys: ['siteWhlAddr'] },
  { label: '도로명주소', keys: ['rdnWhlAddr'] },
  { label: '업태', keys: ['uptaeNm'] }
] as const;

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

function createDetailFields(
  item: UnknownRecord,
  definitions: ReadonlyArray<{ label: string; keys: readonly string[]; combine?: boolean }>
) {
  const fields = definitions
    .map((definition) => {
      const values = definition.keys.map((key) => pickString(item, [key])).filter((value): value is string => Boolean(value));
      const uniqueValues = [...new Set(values)];
      const value = definition.combine ? uniqueValues.join(' · ') : uniqueValues[0];

      return value ? { label: definition.label, value } : null;
    })
    .filter((field): field is { label: string; value: string } => Boolean(field));

  return fields.length > 0 ? fields : undefined;
}

function normalizeIslandName(value: string | undefined) {
  return (value ?? '').trim();
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
  return createTravelKeywordParts(params).join(' ');
}

function matchesTravelKeyword(values: Array<string | null | undefined>, keyword: string) {
  const parts = createKeywordParts(keyword);

  if (parts.length === 0) return true;

  const target = values.filter(Boolean).join('').replace(/\s+/g, '');
  if (!target) return false;

  return parts.some((part) => target.includes(part) || part.includes(target.slice(0, 2)));
}

function createTravelKeywordParts(params: TravelInfoParams) {
  const islandName = normalizeIslandName(params.islandName);
  const islandStem = islandName.replace(/도$/, '');
  const islandAliases = [
    islandName,
    islandStem,
    islandStem ? `${islandStem}면` : null,
    islandStem ? `${islandStem}리` : null
  ];

  return [...new Set([...islandAliases, params.cityName, params.provinceName].filter((value): value is string => Boolean(value && value.trim().length >= 2)))];
}

function createKeywordParts(keyword: string) {
  return keyword
    .replace(/\s+/g, '')
    .split(/[·,|/-]/)
    .flatMap((part) => {
      const stem = part.replace(/도$/, '');
      return [part, stem, stem ? `${stem}면` : null].filter((value): value is string => Boolean(value && value.length >= 2));
    });
}

function createPhotoKeywordParts(islandName: string) {
  const normalized = islandName.replace(/\s+/g, '');
  return [...new Set([normalized, normalized.replace(/도$/, '')].filter((part) => part.length >= 2))];
}

function matchesPhotoKeyword(item: IslandTravelPhoto, keywordParts: string[]) {
  if (keywordParts.length === 0) return true;

  const target = [item.title, item.locationName, item.photographer, item.searchKeywords].filter(Boolean).join('').replace(/\s+/g, '');
  if (!target) return false;

  return keywordParts.some((part) => target.includes(part) || part.includes(target.slice(0, 2)));
}

function inferCampStatus(restriction: string | null): IslandTravelCamp['status'] {
  const text = restriction ?? '';
  if (/금지|폐업|취소|제한/.test(text)) return 'RESTRICTED';
  if (/가능|운영|영업/.test(text)) return 'AVAILABLE';
  return 'CHECK_REQUIRED';
}

function createApiStatus(result: FetchResult, itemCount: number, emptyMessage: string) {
  if (!result.ok) {
    return {
      status: 'ERROR' as const,
      message: `API 호출에 실패했습니다. ${result.error}`
    };
  }

  if (itemCount === 0) {
    return {
      status: 'EMPTY' as const,
      message: emptyMessage
    };
  }

  return {
    status: 'OK' as const,
    message: `${itemCount}건의 정보를 불러왔습니다.`
  };
}

function combineFetchResults(results: FetchResult[]): FetchResult {
  const success = results.some((result) => result.ok);
  if (success) {
    return { ok: true, data: null };
  }

  return {
    ok: false,
    error: results
      .filter((result): result is Extract<FetchResult, { ok: false }> => !result.ok)
      .map((result) => result.error)
      .filter(Boolean)
      .join(' / ') || '알 수 없는 오류'
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
