import { Injectable } from '@nestjs/common';
import type {
  IslandSummary,
  IslandTravelAttraction,
  IslandTravelCamp,
  IslandTravelInfo,
  IslandTravelDetailField,
  IslandTravelLodging,
  IslandTravelMudFlat,
  IslandTravelPension,
  IslandTravelPhoto,
  IslandTravelRestaurant,
  IslandTravelSafetyIndex,
  IslandTravelFacility,
  RecommendedIsland,
  TripRecommendationAsset,
  TripRecommendationCourse,
  TripRecommendationOverview
} from '@badagil/shared';
import { PrismaService } from '../database/prisma.service';
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

type TripRecommendationParams = {
  regionKind?: string;
  regionId?: string;
  regionName?: string;
  keyword?: string;
  assetId?: string;
  travelRegionId?: string;
  islandId?: string;
  style?: string;
  duration?: string;
  companions?: string;
  transport?: string;
  difficulty?: string;
  budget?: string;
  stayType?: string;
  facilities?: string[];
  activities?: string[];
  limit?: number;
};

type LicensePlaceRow = {
  id: string;
  license_group: string;
  license_type: string;
  source_file: string;
  management_no: string | null;
  place_name: string;
  business_status: string | null;
  detail_status: string | null;
  category_name: string | null;
  road_address: string | null;
  lot_address: string | null;
  phone: string | null;
  island_name: string | null;
  legal_dong_name: string | null;
  match_type: string | null;
  match_keyword: string | null;
  match_score: number | null;
  extra: Record<string, unknown> | null;
};

type TravelAssetRow = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source_title: string;
  source_dataset_pk: string;
  source_keywords: string[];
  travel_region_id: string | null;
  travel_region_name: string | null;
  matched_island_id: string | null;
  matched_island_name: string | null;
  match_score: number;
  tags: string[];
};

type RecommendedIslandRow = {
  id: string;
  island_name: string;
  display_name: string | null;
  province_name: string | null;
  city_name: string | null;
  island_key: string | null;
  description: string;
  address: string | null;
  contact: string | null;
  photo_description: string | null;
  ferry_summary: string | null;
  traffic_info: string | null;
  lodging_info: string | null;
  food_info: string | null;
  nearby_attractions: string | null;
  photo_urls: string[];
  source_data: Record<string, unknown> | null;
  highlights: string[];
  tags: string[];
  travel_styles: string[];
  source_title: string;
  source_url: string;
  source_type: string;
  priority: number;
  master_id: string | null;
  master_island_name: string | null;
  master_province_name: string | null;
  master_city_name: string | null;
  master_address: string | null;
  master_latitude: number | null;
  master_longitude: number | null;
  master_travel_region_id: string | null;
  master_travel_region_name: string | null;
  master_forecast_location_id: string | null;
  master_forecast_location_name: string | null;
};

type UnknownRecord = Record<string, unknown>;
type FetchResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };
type CourseAssetWithCoordinates = TripRecommendationAsset & { latitude: number; longitude: number };
type CourseRouteTemplate = {
  id: string;
  label: string;
  titleSuffix: string;
  keywords: string[];
  sourceKeywords: string[];
  categories: string[];
  preferredActivities?: string[];
  preferredStyles?: string[];
  requiresStay?: boolean;
};

@Injectable()
export class IslandTripsService {
  constructor(
    private readonly tourismApiClient: TourismApiClient,
    private readonly prismaService: PrismaService
  ) {}

  async getRecommendedIslands(params: { limit?: number; travelRegionId?: string; regionName?: string }) {
    const limit = clampNumber(params.limit ?? 12, 4, 40);
    const values: unknown[] = [];
    const regionClauses: string[] = [];
    if (params.travelRegionId) {
      values.push(params.travelRegionId);
      regionClauses.push(`im.travel_region_id = $${values.length}`);
    }
    if (params.regionName) {
      values.push(params.regionName);
      regionClauses.push(`(im.travel_region_name = $${values.length} OR r.tags @> ARRAY[$${values.length}]::text[])`);
    }
    values.push(limit);
    const limitIndex = values.length;
    const rows = await this.prismaService.$queryRawUnsafe<RecommendedIslandRow[]>(
      `
        SELECT r.id, r.island_name, r.display_name, r.province_name, r.city_name, r.island_key,
               r.description, r.address, r.contact, r.photo_description, r.ferry_summary,
               r.traffic_info, r.lodging_info, r.food_info, r.nearby_attractions,
               r.photo_urls, r.source_data, r.highlights, r.tags, r.travel_styles,
               r.source_title, r.source_url, r.source_type, r.priority,
               im.id AS master_id, im.island_name AS master_island_name, im.province_name AS master_province_name,
               im.city_name AS master_city_name, im.address AS master_address, im.latitude AS master_latitude,
               im.longitude AS master_longitude, im.travel_region_id AS master_travel_region_id,
               im.travel_region_name AS master_travel_region_name, im.forecast_location_id AS master_forecast_location_id,
               im.forecast_location_name AS master_forecast_location_name
        FROM recommended_island r
        LEFT JOIN LATERAL (
          SELECT *
          FROM island_master im
          WHERE im.island_name = r.island_name
             OR im.island_name = regexp_replace(r.island_name, '(도|섬)$', '')
             OR r.island_name = regexp_replace(im.island_name, '(도|섬)$', '')
          ORDER BY
            CASE WHEN im.province_name = r.province_name THEN 0 ELSE 1 END,
            CASE WHEN im.city_name = r.city_name THEN 0 ELSE 1 END
          LIMIT 1
        ) im ON true
        WHERE r.active = true
          ${regionClauses.length > 0 ? `AND (${regionClauses.join(' OR ')})` : ''}
        ORDER BY r.priority DESC, r.island_name ASC
        LIMIT $${limitIndex}
      `,
      ...values
    );

    return toApiResponse(this.createResult(rows.map(toRecommendedIsland), 'LOCAL', 'recommended-island-master'));
  }

  async getRecommendations(params: TripRecommendationParams) {
    const limit = clampNumber(params.limit ?? 24, 6, 60);
    const seedAsset = params.assetId ? await this.findRecommendationSeedAsset(params.assetId) : null;
    const whereClauses = ['a.match_score >= 45'];
    const values: unknown[] = [];

    if (params.travelRegionId) {
      values.push(params.travelRegionId);
      whereClauses.push(`a.travel_region_id = $${values.length}`);
    }
    addRegionFilter(whereClauses, values, params);
    addKeywordFilter(whereClauses, values, params.keyword);
    if (params.islandId) {
      values.push(params.islandId);
      whereClauses.push(`(a.matched_island_id = $${values.length} OR EXISTS (
        SELECT 1 FROM travel_asset_match m
        WHERE m.travel_asset_id = a.id AND m.target_type = 'island' AND m.target_id = $${values.length}
      ))`);
    }
    addSeedAssetFilter(whereClauses, values, seedAsset);

    const rows = await this.prismaService.$queryRawUnsafe<TravelAssetRow[]>(
      `
        SELECT a.id, a.name, a.category, a.address, a.latitude, a.longitude,
               a.source_title, a.source_dataset_pk,
               COALESCE(s.source_keywords, ARRAY[]::text[]) AS source_keywords,
               a.travel_region_id, a.travel_region_name,
               a.matched_island_id, a.matched_island_name,
               a.match_score, a.tags
        FROM travel_asset a
        LEFT JOIN travel_data_source s ON s.public_data_pk = a.source_dataset_pk
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY a.match_score DESC, a.name ASC
        LIMIT ${Math.max(limit * 8, 80)}
      `,
      ...values
    );

    const scoredAssets = rows
      .map((row) => this.toRecommendationAsset(row, params))
      .map((asset) => boostRecommendationBySeedAsset(asset, seedAsset))
      .sort((left, right) => right.recommendationScore - left.recommendationScore || left.name.localeCompare(right.name, 'ko-KR'))
      .slice(0, limit);
    const courses = this.buildRecommendationCourses(scoredAssets, params).slice(0, 6);
    const data: TripRecommendationOverview = {
      query: {
        regionKind: normalizeRegionKind(params.regionKind),
        regionId: params.regionId ?? null,
        regionName: params.regionName ?? null,
        keyword: normalizeSearchKeyword(params.keyword),
        assetId: params.assetId ?? null,
        travelRegionId: params.travelRegionId ?? null,
        islandId: params.islandId ?? null,
        style: params.style ?? null,
        duration: params.duration ?? null,
        companions: params.companions ?? null,
        transport: params.transport ?? null,
        difficulty: params.difficulty ?? null,
        budget: params.budget ?? null,
        stayType: params.stayType ?? null,
        facilities: params.facilities ?? [],
        activities: params.activities ?? [],
        limit
      },
      assets: scoredAssets,
      courses,
      summary: {
        totalAssets: scoredAssets.length,
        totalCourses: courses.length,
        regionNames: uniqueText(scoredAssets.map((asset) => asset.travelRegionName).filter(Boolean) as string[]),
        categories: countBy(scoredAssets.map((asset) => asset.category ?? 'unknown'))
      },
      updatedAt: new Date().toISOString()
    };

    return toApiResponse(this.createResult(data, 'LOCAL', 'travel-recommendation-assets'));
  }

  async searchTravelAssets(params: { keyword?: string; limit?: number }) {
    const keyword = normalizeSearchKeyword(params.keyword);
    const limit = clampNumber(params.limit ?? 20, 5, 40);
    if (!keyword) {
      return toApiResponse(this.createResult([], 'LOCAL', 'travel-assets-search'));
    }

    const whereClauses = ['a.match_score >= 45'];
    const values: unknown[] = [];
    addKeywordFilter(whereClauses, values, keyword);

    const rows = await this.prismaService.$queryRawUnsafe<TravelAssetRow[]>(
      `
        SELECT a.id, a.name, a.category, a.address, a.latitude, a.longitude,
               a.source_title, a.source_dataset_pk,
               COALESCE(s.source_keywords, ARRAY[]::text[]) AS source_keywords,
               a.travel_region_id, a.travel_region_name,
               a.matched_island_id, a.matched_island_name,
               a.match_score, a.tags
        FROM travel_asset a
        LEFT JOIN travel_data_source s ON s.public_data_pk = a.source_dataset_pk
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY a.match_score DESC, a.name ASC
        LIMIT ${limit}
      `,
      ...values
    );

    return toApiResponse(
      this.createResult(
        rows.map((row) => this.toRecommendationAsset(row, { keyword })),
        'LOCAL',
        'travel-assets-search'
      )
    );
  }

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
      photos,
      boryeongPhotos,
      licensePlaces
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
      }),
      this.safeFetch(() => this.tourismApiClient.getBoryeongIslandPhotos()),
      this.safeFetch(() => this.getLicensePlaces(params))
    ]);

    const attractionItems = attractions.ok ? this.toAttractions(attractions.data, islandName) : [];
    const campItems = this.toCamps(goCamping.ok ? goCamping.data : null, cultureCamping.ok ? cultureCamping.data : null, generalCamping.ok ? generalCamping.data : null, params);
    const licenseItems = licensePlaces.ok ? licensePlaces.data : [];
    const localCampItems = this.toLicenseCamps(licenseItems);
    const localLodgingItems = this.toLicenseLodgings(licenseItems);
    const localRestaurantItems = this.toLicenseRestaurants(licenseItems);
    const localPensionItems = this.toLicensePensions(licenseItems);
    const localFacilityItems = this.toLicenseFacilities(licenseItems);
    const mergedCampItems = uniqueById([...campItems, ...localCampItems]).slice(0, 8);
    const lodgingItems = uniqueById([...(lodgings.ok ? this.toLodgings(lodgings.data, params) : []), ...localLodgingItems]).slice(0, 8);
    const restaurantItems = uniqueById([...(restaurants.ok ? this.toRestaurants(restaurants.data, params) : []), ...localRestaurantItems]).slice(0, 8);
    const pensionItems = uniqueById([...(pensions.ok ? this.toPensions(pensions.data, params) : []), ...localPensionItems]).slice(0, 8);
    const mudFlatItems = this.toMudFlats(mudFlatEcInfo.ok ? mudFlatEcInfo.data : null, mudFlatVillages.ok ? mudFlatVillages.data : null, params);
    const safetyItems = safetyIndexes.ok ? this.toSafetyIndexes(safetyIndexes.data, islandName) : [];
    const photoItems = uniqueById([
      ...(photos.ok ? this.toPhotos(photos.data, islandName, 'TOUR_PHOTO') : []),
      ...(boryeongPhotos.ok ? this.toPhotos(boryeongPhotos.data, islandName, 'BORYEONG_ISLAND_PHOTO') : [])
    ]).slice(0, 12);
    const data = {
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
        photo: '한국관광공사 관광사진·충청남도 보령시 섬사진'
      },
      apiStatus: {
        tourism: createApiStatus(attractions, attractionItems.length, '관광정보가 존재하지 않습니다.'),
        camping: createApiStatus(combineFetchResults([goCamping, cultureCamping, generalCamping]), campItems.length, '캠핑/차박정보가 존재하지 않습니다.'),
        lodging: createApiStatus(lodgings, lodgingItems.length, '숙박정보가 존재하지 않습니다.'),
        pension: createApiStatus(pensions, pensionItems.length, '펜션정보가 존재하지 않습니다.'),
        food: createApiStatus(restaurants, restaurantItems.length, '식당정보가 존재하지 않습니다.'),
        mudFlat: createApiStatus(combineFetchResults([mudFlatEcInfo, mudFlatVillages]), mudFlatItems.length, '갯벌정보가 존재하지 않습니다.'),
        safety: createApiStatus(safetyIndexes, safetyItems.length, '안전정보와 여행지수가 존재하지 않습니다.'),
        photo: createApiStatus(combineFetchResults([photos, boryeongPhotos]), photoItems.length, '관련 관광사진이 존재하지 않습니다.')
      },
      updatedAt: new Date().toISOString()
    } as IslandTravelInfo;

    data.camps = mergedCampItems;
    data.otherFacilities = localFacilityItems.slice(0, 8);
    data.sourceSummary.camping = '고캠핑·문화캠핑·인허가 캠핑 DB';
    data.sourceSummary.lodging = '행정안전부 숙박업·인허가 숙박 DB';
    data.sourceSummary.pension = '행정안전부 관광펜션업·인허가 숙박 DB';
    data.sourceSummary.food = '행정안전부 관광식당·인허가 식당 DB';
    data.sourceSummary.facility = '지자체 인허가 편의시설 DB';
    data.apiStatus.camping = createApiStatus(combineFetchResults([goCamping, cultureCamping, generalCamping, licensePlaces]), data.camps.length, '캠핑/차박정보가 존재하지 않습니다.');
    data.apiStatus.lodging = createApiStatus(combineFetchResults([lodgings, licensePlaces]), data.lodgings.length, '숙박정보가 존재하지 않습니다.');
    data.apiStatus.pension = createApiStatus(combineFetchResults([pensions, licensePlaces]), data.pensions.length, '펜션정보가 존재하지 않습니다.');
    data.apiStatus.food = createApiStatus(combineFetchResults([restaurants, licensePlaces]), data.restaurants.length, '식당정보가 존재하지 않습니다.');
    data.apiStatus.facility = createApiStatus(licensePlaces, data.otherFacilities.length, '편의시설 정보가 존재하지 않습니다.');

    return toApiResponse(this.createResult(data, 'TOURISM', 'island-trip-travel-info'));
  }

  private toRecommendationAsset(row: TravelAssetRow, params: TripRecommendationParams): TripRecommendationAsset {
    const tags = row.tags ?? [];
    const category = row.category ?? null;
    const styleWeights = getStyleWeights(params.style);
    const conditionKeywords = [
      params.keyword,
      ...(params.facilities ?? []),
      ...(params.activities ?? []),
      params.duration,
      params.companions,
      params.transport,
      params.difficulty,
      params.budget,
      params.stayType
    ]
      .filter(Boolean)
      .map((value) => String(value));
    const haystack = [row.name, row.category, row.address, row.travel_region_name, row.matched_island_name, row.source_title, ...tags].filter(Boolean).join(' ');
    let score = row.match_score ?? 0;
    const reasons: string[] = [];

    if (category && styleWeights[category]) {
      score += styleWeights[category];
      reasons.push(`${styleLabel(params.style)}에 맞는 ${categoryLabel(category)} 자원`);
    }
    const keyword = normalizeSearchKeyword(params.keyword);
    if (keyword && haystack.includes(keyword)) {
      score += 18;
      reasons.push(`검색어 "${keyword}"와 일치`);
    }
    tags.forEach((tag) => {
      const weight = styleWeights[tag] ?? 0;
      if (weight > 0) score += Math.min(weight, 8);
    });
    conditionKeywords.forEach((keyword) => {
      if (keyword && haystack.includes(keyword)) {
        score += 6;
        reasons.push(`${keyword} 조건과 일치`);
      }
    });
    if (params.facilities?.some((item) => ['화장실', '샤워장', '편의점', '식당', '주차장', '편의시설'].includes(item)) && category === 'facility') {
      score += 12;
      reasons.push('선택한 편의시설 조건에 적합');
    }
    if ((params.duration?.includes('1박') || params.duration?.includes('2박') || params.duration?.includes('숙박')) && category === 'accommodation') {
      score += 10;
      reasons.push('숙박 일정에 활용 가능');
    }
    const conditionScore = scoreTravelConditions(category, haystack, params);
    score += conditionScore.score;
    reasons.push(...conditionScore.reasons);
    if (row.matched_island_id) {
      score += 8;
      reasons.push(`${row.matched_island_name} 직접 매칭`);
    } else if (row.travel_region_id) {
      score += 4;
      reasons.push(`${row.travel_region_name} 권역 매칭`);
    }
    if (row.latitude !== null && row.longitude !== null) {
      score += 3;
      reasons.push('위치 좌표 보유');
    }
    if (row.address) score += 3;

    return {
      id: row.id,
      name: formatTravelAssetName(row),
      category,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      sourceTitle: row.source_title,
      sourceDatasetPk: row.source_dataset_pk,
      sourceKeywords: row.source_keywords ?? [],
      travelRegionId: row.travel_region_id,
      travelRegionName: row.travel_region_name,
      matchedIslandId: row.matched_island_id,
      matchedIslandName: row.matched_island_name,
      matchScore: row.match_score,
      recommendationScore: Math.min(Math.round(score), 100),
      tags: uniqueText(tags).slice(0, 8),
      reasons: uniqueText(reasons).slice(0, 4)
    };
  }

  private async findRecommendationSeedAsset(assetId: string) {
    const rows = await this.prismaService.$queryRawUnsafe<TravelAssetRow[]>(
      `
        SELECT a.id, a.name, a.category, a.address, a.latitude, a.longitude,
               a.source_title, a.source_dataset_pk,
               COALESCE(s.source_keywords, ARRAY[]::text[]) AS source_keywords,
               a.travel_region_id, a.travel_region_name,
               a.matched_island_id, a.matched_island_name,
               a.match_score, a.tags
        FROM travel_asset a
        LEFT JOIN travel_data_source s ON s.public_data_pk = a.source_dataset_pk
        WHERE a.id = $1
        LIMIT 1
      `,
      assetId
    );
    return rows[0] ?? null;
  }

  private buildRecommendationCourses(assets: TripRecommendationAsset[], params: TripRecommendationParams): TripRecommendationCourse[] {
    const includeStayAssets = shouldIncludeStayCourse(params);
    const assetsForCourse = assets.filter(
      (asset) => isCourseSourceAsset(asset) && !isNonTourismSupportFacility(asset) && (includeStayAssets || inferCourseStopCategory(asset) !== 'accommodation')
    );
    const regionName = assets[0]?.travelRegionName ?? null;
    const style = params.style ?? 'dayTrip';
    const duration = params.duration ?? null;
    const courseSets = getCourseTemplatesForParams(params)
      .map((template) => ({ template, assets: pickTemplateCourseAssets(assetsForCourse, template, params, 5) }))
      .filter((course) => course.assets.length >= 2);

    return courseSets.map((course) => {
      const orderedAssets = orderCourseAssets(course.assets, params, course.template.id);
      const routeMetrics = calculateRouteMetrics(orderedAssets, params.transport);
      const stops = buildTourCourseStops(orderedAssets, course.template.id);
      return {
        id: `trip-course-${course.template.id}-${style}-${orderedAssets.map((asset) => asset.id).join('-')}`.slice(0, 180),
        title: buildTourCourseTitle(course.template, regionName),
        summary: buildTourCourseSummary(stops, course.template, routeMetrics.distanceSummary),
        regionName,
        style,
        duration,
        totalDistanceKm: routeMetrics.totalDistanceKm,
        estimatedTravelMinutes: routeMetrics.estimatedTravelMinutes,
        distanceSummary: routeMetrics.distanceSummary,
        score: calculateCourseScore(orderedAssets, routeMetrics, params),
        assets: orderedAssets,
        stops,
        tags: uniqueText([styleLabel(style), duration ?? '', ...orderedAssets.flatMap((asset) => asset.tags)]).filter(Boolean).slice(0, 8),
        reasons: uniqueText([routeMetrics.distanceSummary ?? '', ...orderedAssets.flatMap((asset) => asset.reasons)]).slice(0, 5)
      };
    });
  }

  private async safeFetch<T>(fetcher: () => Promise<T>): Promise<FetchResult<T>> {
    try {
      return { ok: true, data: await fetcher() };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  private async getLicensePlaces(params: TravelInfoParams): Promise<LicensePlaceRow[]> {
    const keywordParts = createLocalBusinessKeywordParts(params);
    if (keywordParts.length === 0) return [];

    const clauses = keywordParts.flatMap((_, index) => {
      const paramIndex = index + 1;
      return [
        `k.island_name ILIKE $${paramIndex}`,
        `k.legal_dong_name ILIKE $${paramIndex}`,
        `k.match_keyword ILIKE $${paramIndex}`,
        `k.normalized_keyword ILIKE regexp_replace($${paramIndex}, '\\s+', '', 'g')`
      ];
    });
    const values = keywordParts.map((part) => `%${part}%`);

    const rows = await this.prismaService.$queryRawUnsafe<LicensePlaceRow[]>(
      `
        WITH keyword_hits AS (
          SELECT DISTINCT k.island_key
          FROM island_license_keyword k
          WHERE ${clauses.join(' OR ')}
        ),
        matched AS (
          SELECT m.*
          FROM island_license_match m
          JOIN keyword_hits k ON k.island_key = m.island_key
        )
        SELECT m.license_group, l.license_type, l.source_file, l.management_no, l.id, l.place_name,
               l.business_status, l.detail_status, l.category_name, l.road_address, l.lot_address, l.phone,
               m.island_name, m.legal_dong_name, m.match_type, m.match_keyword, m.match_score, l.extra
        FROM matched m
        JOIN license_lodging l ON l.id = m.license_id
        WHERE m.license_group = 'LODGING'
        UNION ALL
        SELECT m.license_group, l.license_type, l.source_file, l.management_no, l.id, l.place_name,
               l.business_status, l.detail_status, COALESCE(l.hygiene_category, l.category_name), l.road_address, l.lot_address, l.phone,
               m.island_name, m.legal_dong_name, m.match_type, m.match_keyword, m.match_score, l.extra
        FROM matched m
        JOIN license_restaurant l ON l.id = m.license_id
        WHERE m.license_group = 'RESTAURANT'
        UNION ALL
        SELECT m.license_group, l.license_type, l.source_file, l.management_no, l.id, l.place_name,
               l.business_status, l.detail_status, l.category_name, l.road_address, l.lot_address, l.phone,
               m.island_name, m.legal_dong_name, m.match_type, m.match_keyword, m.match_score, l.extra
        FROM matched m
        JOIN license_camping l ON l.id = m.license_id
        WHERE m.license_group = 'CAMPING'
        UNION ALL
        SELECT m.license_group, l.license_type, l.source_file, l.management_no, l.id, l.place_name,
               NULL, NULL, l.category_name, l.road_address, l.lot_address, l.phone,
               m.island_name, m.legal_dong_name, m.match_type, m.match_keyword, m.match_score, l.extra
        FROM matched m
        JOIN license_facility l ON l.id = m.license_id
        WHERE m.license_group = 'FACILITY'
        UNION ALL
        SELECT m.license_group, l.license_type, l.source_file, l.management_no, l.id, l.place_name,
               l.business_status, l.detail_status, COALESCE(l.medical_type, l.category_name), l.road_address, l.lot_address, l.phone,
               m.island_name, m.legal_dong_name, m.match_type, m.match_keyword, m.match_score, l.extra
        FROM matched m
        JOIN license_medical l ON l.id = m.license_id
        WHERE m.license_group = 'MEDICAL'
        ORDER BY match_score DESC, place_name ASC
        LIMIT 160
      `,
      ...values
    );

    return rows.filter((row) => isLicensePlaceRelevantToParams(row, params));
  }

  private toLicenseCamps(rows: LicensePlaceRow[]): IslandTravelCamp[] {
    return rows
      .filter((row) => row.license_group === 'CAMPING')
      .map((row) => ({
        id: `license-camp-${row.id}`,
        name: row.place_name,
        address: getLocalPlaceAddress(row),
        facilitySummary: row.category_name ?? row.license_type,
        reservation: row.phone,
        restriction: row.detail_status ?? row.business_status,
        status: 'CHECK_REQUIRED' as const,
        detailFields: createLocalBusinessDetailFields(row),
        source: 'LOCAL_CAMPGROUND' as const
      }));
  }

  private toLicenseLodgings(rows: LicensePlaceRow[]): IslandTravelLodging[] {
    return rows
      .filter((row) => row.license_group === 'LODGING' && row.license_type !== '관광펜션업')
      .map((row) => ({
        id: `license-lodging-${row.id}`,
        name: row.place_name,
        address: getLocalPlaceAddress(row),
        category: row.category_name ?? row.license_type,
        tel: row.phone,
        status: row.detail_status ?? row.business_status,
        detailFields: createLocalBusinessDetailFields(row),
        source: 'LOCAL_LODGING' as const
      }));
  }

  private toLicensePensions(rows: LicensePlaceRow[]): IslandTravelPension[] {
    return rows
      .filter((row) => row.license_group === 'LODGING' && row.license_type === '관광펜션업')
      .map((row) => ({
        id: `license-pension-${row.id}`,
        name: row.place_name,
        address: getLocalPlaceAddress(row),
        category: row.category_name ?? row.license_type,
        tel: row.phone,
        status: row.detail_status ?? row.business_status,
        detailFields: createLocalBusinessDetailFields(row),
        source: 'LOCAL_PENSION' as const
      }));
  }

  private toLicenseRestaurants(rows: LicensePlaceRow[]): IslandTravelRestaurant[] {
    return rows
      .filter((row) => row.license_group === 'RESTAURANT')
      .map((row) => ({
        id: `license-restaurant-${row.id}`,
        name: row.place_name,
        address: getLocalPlaceAddress(row),
        category: row.category_name ?? row.license_type,
        tel: row.phone,
        representativeMenu: null,
        status: row.detail_status ?? row.business_status,
        detailFields: createLocalBusinessDetailFields(row),
        source: 'LOCAL_RESTAURANT' as const
      }));
  }

  private toLicenseFacilities(rows: LicensePlaceRow[]): IslandTravelFacility[] {
    return rows
      .filter((row) => row.license_group === 'FACILITY' || row.license_group === 'MEDICAL')
      .map((row) => ({
        id: `license-facility-${row.id}`,
        name: row.place_name,
        address: getLocalPlaceAddress(row),
        category: row.category_name ?? row.license_type,
        tel: row.phone,
        status: row.detail_status ?? row.business_status,
        detailFields: createLocalBusinessDetailFields(row),
        source: 'LOCAL_FACILITY' as const
      }));
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
      .filter((item) => !item.areaName || item.areaName.includes(islandName.replace(/[도섬]$/, '')) || islandName.includes(item.areaName));

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
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.category], keyword))
      .filter((item) => isTravelItemRelevantToParams([item.name, item.address], params));

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
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.category, item.representativeMenu], keyword))
      .filter((item) => isTravelItemRelevantToParams([item.name, item.address], params));

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
      .filter((item) => matchesTravelKeyword([item.name, item.address, item.category], keyword))
      .filter((item) => isTravelItemRelevantToParams([item.name, item.address], params));

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

  private toPhotos(response: unknown, islandName: string, source: IslandTravelPhoto['source']): IslandTravelPhoto[] {
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
        source
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

const STYLE_CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  dayTrip: { course: 18, facility: 16, food: 12, beach: 10, viewpoint: 10, activity: 8 },
  overnight: { accommodation: 22, food: 12, facility: 10, course: 8, activity: 8 },
  family: { facility: 22, accessibility: 18, activity: 12, beach: 10, food: 8, course: 8 },
  couple: { viewpoint: 20, beach: 16, accommodation: 14, food: 10, course: 8 },
  solo: { course: 18, viewpoint: 12, beach: 10, facility: 8 },
  friends: { activity: 18, food: 14, festival: 12, viewpoint: 10, facility: 8 },
  food: { food: 24, facility: 8, accommodation: 6 },
  photo: { viewpoint: 22, beach: 14, course: 10, festival: 8 },
  healing: { beach: 18, course: 14, viewpoint: 12, accommodation: 8, facility: 6 },
  trekking: { course: 24, viewpoint: 12, beach: 8, facility: 6 },
  activity: { activity: 24, beach: 12, facility: 8 },
  camping: { accommodation: 20, facility: 18, beach: 8, activity: 8 }
};

const STYLE_LABELS: Record<string, string> = {
  dayTrip: '당일치기',
  overnight: '1박 2일',
  family: '가족여행',
  couple: '커플여행',
  solo: '혼자여행',
  friends: '친구여행',
  food: '미식여행',
  photo: '사진여행',
  healing: '힐링여행',
  trekking: '트레킹',
  activity: '액티비티',
  camping: '캠핑/차박'
};

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: '숙박',
  activity: '체험/액티비티',
  accessibility: '무장애',
  beach: '해변',
  course: '코스',
  facility: '편의시설',
  festival: '축제/행사',
  food: '맛집',
  viewpoint: '전망/사진'
};

const ACTIVITY_CONDITION_RULES: Record<string, { categories: string[]; keywords: string[]; score: number }> = {
  물놀이: { categories: ['beach', 'activity'], keywords: ['해수욕', '물놀이', '해변', '해수욕장', '스노클링'], score: 10 },
  낚시: { categories: ['activity'], keywords: ['낚시', '바다낚시', '갯바위'], score: 10 },
  해루질: { categories: ['activity', 'beach'], keywords: ['해루질', '갯벌', '체험마을'], score: 10 },
  트레킹: { categories: ['course', 'viewpoint'], keywords: ['트레킹', '둘레길', '해안길', '탐방로', '전망대'], score: 10 },
  사진: { categories: ['viewpoint', 'beach', 'festival'], keywords: ['사진', '포토', '전망', '등대', '노을'], score: 9 },
  맛집: { categories: ['food'], keywords: ['맛집', '식당', '해산물', '특산물', '카페'], score: 10 },
  카페: { categories: ['food'], keywords: ['카페', '커피', '디저트', '바다뷰'], score: 9 }
};

const COURSE_SOURCE_KEYWORDS = [
  '갯벌',
  '걷기',
  '공원',
  '관광',
  '낚시',
  '노을',
  '둘레길',
  '등대',
  '마리나',
  '맛집',
  '무장애',
  '서핑',
  '수상레저',
  '스노클링',
  '야영',
  '여행',
  '전통시장',
  '체험',
  '축제',
  '카약',
  '탐방로',
  '트레킹',
  '포토존',
  '해루질',
  '해안길',
  '해양레저',
  '해파랑길'
];

const COURSE_ROUTE_TEMPLATES: CourseRouteTemplate[] = [
  {
    id: 'heritage-culture',
    label: '역사탐방·문화체험',
    titleSuffix: '역사탐방·문화체험 관광코스',
    keywords: ['역사', '문화', '전통', '사찰', '박물관', '미술관', '공연', '시장', '전통시장', '체험'],
    sourceKeywords: ['관광', '전통시장', '체험', '무장애'],
    categories: ['course', 'festival', 'accessibility', 'activity'],
    preferredActivities: ['체험'],
    preferredStyles: ['family', 'friends']
  },
  {
    id: 'trekking-coast',
    label: '트레킹·해안길',
    titleSuffix: '트레킹·해안길 관광코스',
    keywords: ['걷기', '둘레길', '해안길', '탐방로', '트레킹', '해파랑길', '산책'],
    sourceKeywords: ['걷기', '둘레길', '해안길', '탐방로', '트레킹', '해파랑길'],
    categories: ['course', 'viewpoint', 'beach'],
    preferredActivities: ['트레킹'],
    preferredStyles: ['trekking', 'solo', 'healing']
  },
  {
    id: 'marine-activity',
    label: '해양레저·액티비티',
    titleSuffix: '해양레저·액티비티 관광코스',
    keywords: ['낚시', '마리나', '서핑', '수상레저', '스노클링', '카약', '해양레저', '요트', '체험'],
    sourceKeywords: ['낚시', '마리나', '서핑', '수상레저', '스노클링', '카약', '해양레저', '체험'],
    categories: ['activity', 'beach', 'course'],
    preferredActivities: ['낚시', '물놀이', '해루질'],
    preferredStyles: ['activity', 'friends']
  },
  {
    id: 'mudflat-experience',
    label: '갯벌·해루질 체험',
    titleSuffix: '갯벌·해루질 체험코스',
    keywords: ['갯벌', '해루질', '체험마을', '어촌', '체험'],
    sourceKeywords: ['갯벌', '해루질', '체험'],
    categories: ['activity', 'beach', 'course'],
    preferredActivities: ['해루질', '물놀이'],
    preferredStyles: ['family', 'activity']
  },
  {
    id: 'photo-sunset',
    label: '노을·등대·포토존',
    titleSuffix: '노을·등대·포토존 관광코스',
    keywords: ['노을', '등대', '포토존', '전망', '사진', '출렁다리', '스카이워크'],
    sourceKeywords: ['노을', '등대', '포토존', '관광'],
    categories: ['viewpoint', 'beach', 'festival', 'course'],
    preferredActivities: ['사진'],
    preferredStyles: ['photo', 'couple']
  },
  {
    id: 'food-market',
    label: '맛집·전통시장',
    titleSuffix: '맛집·전통시장 관광코스',
    keywords: ['맛집', '식당', '카페', '전통시장', '시장', '해산물', '특산물'],
    sourceKeywords: ['맛집', '전통시장', '관광', '여행'],
    categories: ['food', 'festival', 'course'],
    preferredActivities: ['맛집', '카페'],
    preferredStyles: ['food', 'friends']
  },
  {
    id: 'park-accessible',
    label: '공원·무장애 산책',
    titleSuffix: '공원·무장애 산책코스',
    keywords: ['공원', '무장애', '산책', '걷기', '편의', '전망'],
    sourceKeywords: ['공원', '무장애', '걷기', '관광'],
    categories: ['accessibility', 'facility', 'course', 'viewpoint'],
    preferredStyles: ['family', 'healing']
  },
  {
    id: 'camping-night',
    label: '야영·캠핑',
    titleSuffix: '야영·캠핑 관광코스',
    keywords: ['야영', '캠핑', '차박', '노을', '해변', '공원'],
    sourceKeywords: ['야영', '관광', '여행', '공원'],
    categories: ['accommodation', 'facility', 'beach', 'activity'],
    preferredStyles: ['camping'],
    requiresStay: true
  }
];

function addRegionFilter(whereClauses: string[], values: unknown[], params: TripRecommendationParams) {
  const kind = normalizeRegionKind(params.regionKind);
  if (!kind || kind === 'all' || params.travelRegionId) return;

  if (kind === 'travel' && params.regionId) {
    values.push(params.regionId);
    whereClauses.push(`a.travel_region_id = $${values.length}`);
    return;
  }

  if (kind === 'forecast' && params.regionId) {
    values.push(params.regionId);
    const forecastIndex = values.length;
    whereClauses.push(`EXISTS (
      SELECT 1
      FROM island_master im
      WHERE im.forecast_location_id = $${forecastIndex}
        AND (
          im.travel_region_id = a.travel_region_id
          OR im.island_key = a.matched_island_id
          OR im.island_name = a.matched_island_name
        )
    )`);
    return;
  }

  if (kind === 'admin') {
    const adminName = (params.regionName ?? params.regionId ?? '').trim();
    if (!adminName) return;

    const [provinceName, ...cityParts] = adminName.split(/\s+/).filter(Boolean);
    const cityName = cityParts.join(' ');
    values.push(provinceName);
    const provinceIndex = values.length;

    const adminClauses: string[] = [];

    if (cityName) {
      values.push(cityName);
      const cityIndex = values.length;
      adminClauses.push(
        `(a.province = $${provinceIndex} AND a.city = $${cityIndex})`,
        `(a.legal_dong_name ILIKE '%' || $${provinceIndex} || '%' AND a.legal_dong_name ILIKE '%' || $${cityIndex} || '%')`,
        `(a.address ILIKE '%' || $${provinceIndex} || '%' AND a.address ILIKE '%' || $${cityIndex} || '%')`,
        `EXISTS (
          SELECT 1
          FROM island_master im
          WHERE im.legal_dong_name ILIKE '%' || $${provinceIndex} || '%'
            AND im.legal_dong_name ILIKE '%' || $${cityIndex} || '%'
            AND (
              im.travel_region_id = a.travel_region_id
              OR im.island_key = a.matched_island_id
              OR im.island_name = a.matched_island_name
            )
        )`
      );
    } else {
      adminClauses.push(
        `a.province = $${provinceIndex}`,
        `a.legal_dong_name ILIKE '%' || $${provinceIndex} || '%'`,
        `a.address ILIKE '%' || $${provinceIndex} || '%'`,
        `EXISTS (
          SELECT 1
          FROM island_master im
          WHERE im.legal_dong_name ILIKE '%' || $${provinceIndex} || '%'
            AND (
              im.travel_region_id = a.travel_region_id
              OR im.island_key = a.matched_island_id
              OR im.island_name = a.matched_island_name
            )
        )`
      );
    }

    whereClauses.push(`(${adminClauses.join(' OR ')})`);
  }
}

function normalizeRegionKind(regionKind?: string): 'all' | 'travel' | 'forecast' | 'admin' | null {
  if (regionKind === 'all' || regionKind === 'travel' || regionKind === 'forecast' || regionKind === 'admin') return regionKind;
  return null;
}

function toRecommendedIsland(row: RecommendedIslandRow): RecommendedIsland {
  const matchedIsland: IslandSummary | null = row.master_id
    ? {
        id: row.master_id,
        islandName: row.master_island_name ?? row.island_name,
        provinceName: row.master_province_name,
        cityName: row.master_city_name,
        address: row.master_address,
        latitude: row.master_latitude,
        longitude: row.master_longitude,
        areaSquareMeters: null,
        coastlineLengthMeters: null,
        population: null,
        description: row.description,
        forecastLocationId: row.master_forecast_location_id,
        forecastLocationName: row.master_forecast_location_name,
        travelRegionId: row.master_travel_region_id,
        travelRegionName: row.master_travel_region_name,
        source: 'LOCAL_ISLAND_MASTER',
        updatedAt: new Date().toISOString()
      }
    : null;

  return {
    id: row.id,
    islandName: row.island_name,
    displayName: row.display_name,
    provinceName: row.province_name,
    cityName: row.city_name,
    islandKey: row.island_key,
    description: row.description,
    address: row.address,
    contact: row.contact,
    photoDescription: row.photo_description,
    ferrySummary: row.ferry_summary,
    trafficInfo: row.traffic_info,
    lodgingInfo: row.lodging_info,
    foodInfo: row.food_info,
    nearbyAttractions: row.nearby_attractions,
    photoUrls: row.photo_urls ?? [],
    sourceData: row.source_data,
    highlights: row.highlights ?? [],
    tags: row.tags ?? [],
    travelStyles: row.travel_styles ?? [],
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    priority: row.priority,
    matchedIsland,
    photo: null
  };
}

function addKeywordFilter(whereClauses: string[], values: unknown[], keyword?: string) {
  const normalizedKeyword = normalizeSearchKeyword(keyword);
  if (!normalizedKeyword) return;

  values.push(`%${normalizedKeyword}%`);
  const keywordIndex = values.length;
  whereClauses.push(`(
    a.name ILIKE $${keywordIndex}
    OR a.category ILIKE $${keywordIndex}
    OR a.address ILIKE $${keywordIndex}
    OR a.province ILIKE $${keywordIndex}
    OR a.city ILIKE $${keywordIndex}
    OR a.legal_dong_name ILIKE $${keywordIndex}
    OR a.travel_region_name ILIKE $${keywordIndex}
    OR a.matched_island_name ILIKE $${keywordIndex}
    OR a.source_title ILIKE $${keywordIndex}
    OR array_to_string(a.tags, ' ') ILIKE $${keywordIndex}
    OR EXISTS (
      SELECT 1
      FROM travel_asset_match m
      WHERE m.travel_asset_id = a.id
        AND (
          m.target_name ILIKE $${keywordIndex}
          OR m.match_type ILIKE $${keywordIndex}
          OR m.evidence::text ILIKE $${keywordIndex}
        )
    )
  )`);
}

function addSeedAssetFilter(whereClauses: string[], values: unknown[], seedAsset: TravelAssetRow | null) {
  if (!seedAsset) return;
  const seedClauses: string[] = [];

  if (seedAsset.travel_region_id) {
    values.push(seedAsset.travel_region_id);
    whereClauses.push(`a.travel_region_id = $${values.length}`);
    values.push(seedAsset.id);
    whereClauses.push(`a.id <> $${values.length}`);
    return;
  }
  if (seedAsset.matched_island_id) {
    values.push(seedAsset.matched_island_id);
    seedClauses.push(`a.matched_island_id = $${values.length}`);
  }
  if (seedAsset.category) {
    values.push(seedAsset.category);
    seedClauses.push(`a.category = $${values.length}`);
  }

  const specificKeywords = (seedAsset.source_keywords ?? []).filter((keyword) => !['관광', '여행'].includes(keyword)).slice(0, 6);
  if (specificKeywords.length > 0) {
    values.push(specificKeywords);
    seedClauses.push(`EXISTS (
      SELECT 1
      FROM unnest(COALESCE(s.source_keywords, ARRAY[]::text[])) AS source_keyword
      WHERE source_keyword = ANY($${values.length}::text[])
    )`);
  }

  if (seedClauses.length > 0) {
    values.push(seedAsset.id);
    whereClauses.push(`a.id <> $${values.length}`);
    whereClauses.push(`(${seedClauses.join(' OR ')})`);
  } else if (seedAsset.travel_region_id) {
    values.push(seedAsset.id);
    whereClauses.push(`a.id <> $${values.length}`);
  }
}

function boostRecommendationBySeedAsset(asset: TripRecommendationAsset, seedAsset: TravelAssetRow | null): TripRecommendationAsset {
  if (!seedAsset) return asset;
  let score = asset.recommendationScore;
  const reasons = [...asset.reasons];

  if (seedAsset.category && asset.category === seedAsset.category) {
    score += 8;
    reasons.push('선택한 항목과 같은 여행 성격');
  }
  if (seedAsset.matched_island_id && asset.matchedIslandId === seedAsset.matched_island_id) {
    score += 10;
    reasons.push('선택한 항목과 같은 섬 주변');
  }
  if (seedAsset.latitude !== null && seedAsset.longitude !== null && asset.latitude !== null && asset.longitude !== null) {
    const distanceKm = haversineCoordinateKm(seedAsset.latitude, seedAsset.longitude, asset.latitude, asset.longitude);
    if (distanceKm <= 5) {
      score += 14;
      reasons.push('선택한 항목 반경 5km 이내');
    } else if (distanceKm <= 15) {
      score += 9;
      reasons.push('선택한 항목 반경 15km 이내');
    } else if (distanceKm <= 30) {
      score += 5;
      reasons.push('선택한 항목 반경 30km 이내');
    }
  }

  return {
    ...asset,
    recommendationScore: Math.min(Math.round(score), 100),
    reasons: uniqueText(reasons).slice(0, 4)
  };
}

function haversineCoordinateKm(leftLatitude: number, leftLongitude: number, rightLatitude: number, rightLongitude: number) {
  return haversineKm(
    { latitude: leftLatitude, longitude: leftLongitude } as CourseAssetWithCoordinates,
    { latitude: rightLatitude, longitude: rightLongitude } as CourseAssetWithCoordinates
  );
}

function normalizeSearchKeyword(keyword?: string) {
  const normalized = keyword?.trim();
  return normalized && normalized.length >= 2 ? normalized : null;
}

function scoreTravelConditions(category: string | null, haystack: string, params: TripRecommendationParams) {
  let score = 0;
  const reasons: string[] = [];
  const text = haystack.toLowerCase();
  const includesAny = (words: string[]) => words.some((word) => haystack.includes(word) || text.includes(word.toLowerCase()));

  if (params.stayType === '숙박 안 함' || params.duration === '반나절' || params.duration === '당일치기') {
    if (category === 'course' || category === 'activity' || category === 'food' || category === 'facility') {
      score += 8;
      reasons.push('짧은 일정에 바로 활용 가능');
    }
    if (category === 'accommodation') score -= 8;
  }

  if (params.stayType === '숙소 이용' || params.duration?.includes('1박') || params.duration?.includes('2박')) {
    if (category === 'accommodation') {
      score += 14;
      reasons.push('숙박 포함 일정에 적합');
    }
    if (category === 'food' || category === 'facility') score += 4;
  }

  if (params.stayType === '캠핑' || params.stayType === '차박') {
    if (category === 'accommodation' || includesAny(['캠핑', '야영', '차박', '오토캠핑', '백패킹'])) {
      score += 16;
      reasons.push(`${params.stayType} 조건과 적합`);
    }
    if (category === 'facility') score += 5;
  }

  if (params.transport === '대중교통') {
    if (includesAny(['버스', '터미널', '정류장', '역', '도보', '여객선', '항'])) {
      score += 8;
      reasons.push('대중교통 이동 단서 보유');
    }
    if (params.difficulty === '쉬움' && category === 'facility') score += 4;
  }

  if (params.transport === '자가용') {
    if (includesAny(['주차', '주차장', '드라이브', '도로'])) {
      score += 8;
      reasons.push('자가용 이동 편의 단서 보유');
    }
  }

  if (params.transport === '차량 선적') {
    if (includesAny(['선적', '차량', '카페리', '여객선', '항'])) {
      score += 10;
      reasons.push('차량 선적 여행 단서 보유');
    }
  }

  if (params.transport === '도보 중심') {
    if (category === 'course' || includesAny(['둘레길', '해안길', '산책', '트레킹', '탐방로', '도보'])) {
      score += 10;
      reasons.push('도보 중심 여행에 적합');
    }
  }

  if (params.difficulty === '쉬움') {
    if (category === 'facility' || includesAny(['무장애', '편의', '화장실', '주차', '쉬움'])) score += 8;
    if (includesAny(['난이도 상', '어려움', '급경사', '암릉'])) score -= 10;
  }

  if (params.difficulty === '어려움') {
    if (category === 'course' || includesAny(['트레킹', '등산', '전망대', '능선', '해안길'])) {
      score += 8;
      reasons.push('난이도 있는 코스 선호에 적합');
    }
  }

  if (params.budget === '저예산') {
    if (category === 'course' || category === 'beach' || category === 'facility' || includesAny(['무료', '공원', '산책', '둘레길'])) {
      score += 8;
      reasons.push('저예산 여행에 적합');
    }
    if (includesAny(['프리미엄', '호텔', '리조트', '고급'])) score -= 8;
  }

  if (params.budget === '프리미엄') {
    if (category === 'accommodation' || includesAny(['호텔', '리조트', '풀빌라', '프리미엄', '전망'])) {
      score += 9;
      reasons.push('프리미엄 여행 선호와 적합');
    }
  }

  (params.activities ?? []).forEach((activity) => {
    const activityRule = ACTIVITY_CONDITION_RULES[activity];
    if (!activityRule) return;
    if (activityRule.categories.includes(category ?? '') || includesAny(activityRule.keywords)) {
      score += activityRule.score;
      reasons.push(`${activity} 활동 조건과 적합`);
    }
  });

  return { score, reasons: uniqueText(reasons).slice(0, 5) };
}

function getStyleWeights(style?: string) {
  return STYLE_CATEGORY_WEIGHTS[style ?? ''] ?? STYLE_CATEGORY_WEIGHTS.dayTrip;
}

function styleLabel(style?: string) {
  return STYLE_LABELS[style ?? ''] ?? '추천여행';
}

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function uniqueText(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function getCourseTemplatesForParams(params: TripRecommendationParams) {
  const preferredTemplates = COURSE_ROUTE_TEMPLATES.filter((template) => isPreferredCourseTemplate(template, params));
  const templates = preferredTemplates.length > 0 ? preferredTemplates : COURSE_ROUTE_TEMPLATES;
  return templates.filter((template) => !template.requiresStay || shouldIncludeStayCourse(params));
}

function isPreferredCourseTemplate(template: CourseRouteTemplate, params: TripRecommendationParams) {
  const activities = params.activities ?? [];
  return (
    activities.some((activity) => template.preferredActivities?.includes(activity)) ||
    Boolean(params.style && template.preferredStyles?.includes(params.style)) ||
    Boolean(params.keyword && matchesTemplateText(template, params.keyword))
  );
}

function pickTemplateCourseAssets(assets: TripRecommendationAsset[], template: CourseRouteTemplate, params: TripRecommendationParams, limit: number) {
  const candidates = limitCourseCandidatesToDominantRegion(sortCourseCandidates(assets.filter((asset) => isTemplateCourseAsset(asset, template, params))));
  const unique: TripRecommendationAsset[] = [];
  candidates.forEach((asset) => {
    if (unique.length >= limit) return;
    if (!hasPickedCourseAsset(unique, asset)) unique.push(asset);
  });
  return unique;
}

function isTemplateCourseAsset(asset: TripRecommendationAsset, template: CourseRouteTemplate, params: TripRecommendationParams) {
  if (!matchesTemplateAsset(asset, template)) return false;
  return matchesSelectedCourseConditions(asset, params);
}

function buildAssetSearchText(asset: TripRecommendationAsset) {
  return [
    asset.name,
    asset.category,
    asset.address,
    asset.travelRegionName,
    asset.matchedIslandName,
    asset.sourceTitle,
    ...(asset.tags ?? []),
    ...(asset.sourceKeywords ?? [])
  ]
    .filter(Boolean)
    .join(' ');
}

function isGenericCourseKeyword(keyword: string) {
  return keyword === '관광' || keyword === '여행';
}

function limitCourseCandidatesToDominantRegion(assets: TripRecommendationAsset[]) {
  if (assets.length <= 2) return assets;
  const regionCounts = countBy(assets.map((asset) => asset.travelRegionId ?? asset.travelRegionName ?? '').filter(Boolean));
  const dominantRegion = Object.entries(regionCounts).sort((left, right) => right[1] - left[1])[0]?.[0];
  if (!dominantRegion) return assets;
  const clustered = assets.filter((asset) => asset.travelRegionId === dominantRegion || asset.travelRegionName === dominantRegion);
  return clustered.length >= 2 ? clustered : assets;
}

function matchesTemplateAsset(asset: TripRecommendationAsset, template: CourseRouteTemplate) {
  const category = inferCourseStopCategory(asset);
  const sourceKeywords = asset.sourceKeywords ?? [];
  const text = buildAssetSearchText(asset);
  const categoryMatch = template.categories.includes(category);
  const specificSourceMatch = sourceKeywords.some((keyword) => template.sourceKeywords.includes(keyword) && !isGenericCourseKeyword(keyword));
  const keywordMatch = template.keywords.some((keyword) => text.includes(keyword));
  return (specificSourceMatch || keywordMatch) && (categoryMatch || keywordMatch);
}

function matchesSelectedCourseConditions(asset: TripRecommendationAsset, params: TripRecommendationParams) {
  const text = buildAssetSearchText(asset);
  const selectedActivities = params.activities ?? [];
  if (selectedActivities.length > 0) {
    const matchesActivity = selectedActivities.some((activity) => {
      const rule = ACTIVITY_CONDITION_RULES[activity];
      if (!rule) return text.includes(activity);
      return rule.categories.includes(inferCourseStopCategory(asset)) || rule.keywords.some((keyword) => text.includes(keyword));
    });
    if (!matchesActivity) return false;
  }

  const selectedFacilities = params.facilities ?? [];
  if (selectedFacilities.length > 0 && inferCourseStopCategory(asset) === 'facility') {
    return selectedFacilities.some((facility) => text.includes(facility) || text.includes(facility.replace('시설', '')));
  }

  return true;
}

function matchesTemplateText(template: CourseRouteTemplate, keyword: string) {
  return [template.label, template.titleSuffix, ...template.keywords, ...template.sourceKeywords].some((value) => value.includes(keyword));
}

function pickCourseAssets(byCategory: Map<string, TripRecommendationAsset[]>, categories: string[], limit: number) {
  const picked: TripRecommendationAsset[] = [];
  categories.forEach((category) => {
    const candidate = sortCourseCandidates(byCategory.get(category) ?? []).find((asset) => !hasPickedCourseAsset(picked, asset));
    if (candidate) picked.push(candidate);
  });
  if (picked.length < limit) {
    const all = sortCourseCandidates([...byCategory.values()].flat());
    all.forEach((asset) => {
      if (picked.length >= limit) return;
      if (!hasPickedCourseAsset(picked, asset)) picked.push(asset);
    });
  }
  return picked.slice(0, limit);
}

function sortCourseCandidates(assets: TripRecommendationAsset[]) {
  return [...assets].sort((left, right) => {
    const coordinateDelta = Number(hasCoordinates(right)) - Number(hasCoordinates(left));
    return coordinateDelta || right.recommendationScore - left.recommendationScore || left.name.localeCompare(right.name, 'ko-KR');
  });
}

function hasPickedCourseAsset(picked: TripRecommendationAsset[], asset: TripRecommendationAsset) {
  return picked.some((item) => item.id === asset.id || item.name === asset.name);
}

function orderCourseAssets(assets: TripRecommendationAsset[], params: TripRecommendationParams, courseId: string) {
  const withCoords = assets.filter(hasCoordinates);
  const withoutCoords = assets.filter((asset) => !hasCoordinates(asset));
  if (withCoords.length < 2) return assets;

  const stayAssets = courseId === 'camping-night' ? withCoords.filter((asset) => inferCourseStopCategory(asset) === 'accommodation') : [];
  const stayAsset = stayAssets[0] ?? null;
  const routeCandidates = stayAsset ? withCoords.filter((asset) => asset.id !== stayAsset.id) : withCoords;
  const start = chooseCourseStart(routeCandidates, params);
  const ordered = nearestNeighborOrder(start, routeCandidates.filter((asset) => asset.id !== start.id));
  const withStay = stayAsset ? [...ordered, stayAsset] : ordered;
  return [...withStay, ...withoutCoords];
}

function chooseCourseStart(assets: CourseAssetWithCoordinates[], params: TripRecommendationParams) {
  const preferred = assets.find((asset) => inferCourseStopCategory(asset) === 'course') ?? assets.find((asset) => inferCourseStopCategory(asset) === 'facility');
  if (params.transport === '대중교통') {
    return assets.find((asset) => /항|터미널|정류장|역|도보/.test([asset.name, asset.address].filter(Boolean).join(' '))) ?? preferred ?? assets[0];
  }
  return preferred ?? assets[0];
}

function nearestNeighborOrder(start: CourseAssetWithCoordinates, rest: CourseAssetWithCoordinates[]) {
  const ordered = [start];
  const remaining = [...rest];
  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((candidate, index) => {
      const distance = haversineKm(current, candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }
  return ordered;
}

function calculateRouteMetrics(assets: TripRecommendationAsset[], transport?: string) {
  const distances: number[] = [];
  for (let index = 1; index < assets.length; index += 1) {
    const previous = assets[index - 1];
    const current = assets[index];
    if (!hasCoordinates(previous) || !hasCoordinates(current)) continue;
    distances.push(haversineKm(previous, current));
  }

  if (distances.length === 0) {
    return { totalDistanceKm: null, estimatedTravelMinutes: null, distanceSummary: '좌표가 부족해 이동거리는 참고용입니다' };
  }

  const totalDistanceKm = roundDistance(distances.reduce((sum, distance) => sum + distance, 0));
  const estimatedTravelMinutes = Math.max(5, Math.round((totalDistanceKm / getTransportSpeedKmh(transport)) * 60));
  return {
    totalDistanceKm,
    estimatedTravelMinutes,
    distanceSummary: `총 이동거리 약 ${totalDistanceKm.toLocaleString('ko-KR')}km · 예상 이동 ${estimatedTravelMinutes}분`
  };
}

function calculateCourseScore(assets: TripRecommendationAsset[], routeMetrics: ReturnType<typeof calculateRouteMetrics>, params: TripRecommendationParams) {
  const baseScore = Math.round(assets.reduce((sum, asset) => sum + asset.recommendationScore, 0) / assets.length);
  if (routeMetrics.totalDistanceKm === null) return baseScore;

  const target = getDistanceTarget(params);
  const distance = routeMetrics.totalDistanceKm;
  let score = baseScore;
  if (distance <= target.goodKm) score += 4;
  if (distance > target.maxKm) score -= Math.min(18, Math.round((distance - target.maxKm) * 1.5));
  return Math.max(0, Math.min(100, score));
}

function getDistanceTarget(params: TripRecommendationParams) {
  if (params.transport === '도보 중심') return { goodKm: 4, maxKm: 8 };
  if (params.transport === '자가용') return { goodKm: 20, maxKm: params.duration?.includes('1박') || params.duration?.includes('2박') ? 80 : 60 };
  if (params.transport === '차량 선적') return { goodKm: 25, maxKm: 70 };
  if (params.transport === '대중교통') return { goodKm: 8, maxKm: 25 };
  if (params.duration === '반나절') return { goodKm: 6, maxKm: 15 };
  return { goodKm: 12, maxKm: 35 };
}

function getTransportSpeedKmh(transport?: string) {
  if (transport === '도보 중심') return 4;
  if (transport === '대중교통') return 18;
  if (transport === '자가용' || transport === '차량 선적') return 32;
  return 22;
}

function hasCoordinates(asset: TripRecommendationAsset): asset is CourseAssetWithCoordinates {
  return Number.isFinite(asset.latitude) && Number.isFinite(asset.longitude);
}

function haversineKm(left: CourseAssetWithCoordinates, right: CourseAssetWithCoordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(right.latitude - left.latitude);
  const dLon = toRadians(right.longitude - left.longitude);
  const lat1 = toRadians(left.latitude);
  const lat2 = toRadians(right.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function roundDistance(value: number) {
  return Math.round(value * 10) / 10;
}

function formatTravelAssetName(row: TravelAssetRow) {
  const name = row.name.trim();
  if (name && !isDatasetLikeName(name)) return name;

  const placeName = row.matched_island_name ?? extractPlaceFromAddress(row.address) ?? row.travel_region_name ?? '추천 여행지';
  const categoryName = categoryLabel(row.category ?? 'unknown');
  return `${placeName} ${categoryName}`;
}

function isDatasetLikeName(name: string) {
  return (
    name.includes('_') ||
    ['내맘대로스탬프투어'].includes(name) ||
    /(현황|목록|정보|데이터|DB|마을캠핑장|마을숙박업소|관광공사)/.test(name)
  );
}

function extractPlaceFromAddress(address?: string | null) {
  if (!address) return null;
  const parenthesized = address.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (parenthesized && parenthesized.length >= 2) return parenthesized.replace(/\s*내$/, '');
  const parts = address.split(/\s+/).filter(Boolean);
  return parts.reverse().find((part) => /(도|섬|해수욕장|공원|항|길|리)$/.test(part)) ?? null;
}

function buildTourCourseTitle(template: CourseRouteTemplate, regionName: string | null) {
  const regionLabel = regionName ?? '선택 권역';
  return `${regionLabel} ${template.titleSuffix}`;
}

function buildTourCourseSummary(stops: string[], template: CourseRouteTemplate, distanceSummary: string | null) {
  const suffix = distanceSummary ? ` ${distanceSummary}.` : '';
  if (stops.length === 0) return `${template.label} 성격에 맞춰 관광지와 섬 여행 동선을 묶은 코스입니다.${suffix}`;
  if (stops.length === 1) return `${stops[0]} 중심으로 가볍게 다녀오는 관광코스입니다.${suffix}`;
  return `${stops[0]} 후 ${stops.slice(1, 4).join(', ')}까지 이어지는 ${template.label} 코스입니다.${suffix}`;
}

function buildTourCourseStops(assets: TripRecommendationAsset[], courseId: string) {
  const stops = assets.map((asset, index) => formatTourCourseStop(asset, index, courseId));
  return uniqueText(stops).slice(0, 6);
}

function formatTourCourseStop(asset: TripRecommendationAsset, index: number, courseId: string) {
  const name = asset.name;
  const category = inferCourseStopCategory(asset);
  if (index === 0 && courseId !== 'stay') return `${name} 들르기`;
  if (category === 'course') return `${name} 관광코스 둘러보기`;
  if (category === 'festival') return `${name} 축제·행사 즐기기`;
  if (category === 'viewpoint') return `${name} 전망·사진 스팟 방문`;
  if (category === 'activity' || category === 'beach') return `${name} 체험·해변 활동`;
  if (category === 'food') return `${name}에서 식사·휴식`;
  if (category === 'facility') return `${name}에서 편의시설 확인`;
  if (category === 'accommodation') return `${name} 숙박·캠핑 거점`;
  if (category === 'accessibility') return `${name} 무장애 관광지 방문`;
  return `${name} 방문`;
}

function inferCourseStopCategory(asset: TripRecommendationAsset) {
  const text = [asset.name, asset.category, ...asset.tags].filter(Boolean).join(' ');
  if (/(축제|행사|공연|콘서트|페스티벌)/.test(text)) return 'festival';
  if (/(전망|등대|노을|포토|사진|출렁다리|스카이워크)/.test(text)) return 'viewpoint';
  if (/(낚시|레저|체험|해루질|요트|서핑|스노클링|모노레일|해양레저)/.test(text)) return 'activity';
  if (/(해수욕|해변|바닷가|갯벌)/.test(text)) return 'beach';
  if (/(맛집|식당|카페|음식|해산물|특산물)/.test(text)) return 'food';
  if (/(캠핑|야영|차박|민박|펜션|호텔|숙박|리조트)/.test(text)) return 'accommodation';
  if (/(화장실|주차|편의점|쉼터|안내소|매점)/.test(text)) return 'facility';
  return asset.category ?? 'unknown';
}

function isNonTourismSupportFacility(asset: TripRecommendationAsset) {
  const text = [asset.name, asset.category, asset.address, ...asset.tags].filter(Boolean).join(' ');
  return /(파출소|경찰|소방|보건소|병원|의원|약국|초소|치안|행정복지센터|주민센터|공중화장실|전기차충전소|충전소|묘지|주차장)/.test(text);
}

function isCourseSourceAsset(asset: TripRecommendationAsset) {
  const sourceKeywords = asset.sourceKeywords ?? [];
  return sourceKeywords.some((keyword) => COURSE_SOURCE_KEYWORDS.includes(keyword));
}

function shouldIncludeStayCourse(params: TripRecommendationParams) {
  return (
    params.stayType === '숙소 이용' ||
    params.stayType === '캠핑' ||
    params.stayType === '차박' ||
    Boolean(params.duration?.includes('1박') || params.duration?.includes('2박') || params.duration?.includes('숙박'))
  );
}

const ATTRACTION_KEYS = {
  id: ['contentid', 'contentId', 'id'],
  title: ['title', 'name', 'facltNm', '사업장명', '시설명'],
  category: ['cat3', 'cat2', 'contenttypeid', 'category', '업태구분명', '문화체육업종명'],
  address: ['addr1', 'addr', 'address', 'rdnmadr', 'lnmadr', '도로명주소', '지번주소'],
  image: ['firstimage', 'firstImage', 'imageUrl'],
  mapX: ['mapx', 'mapX', 'longitude', 'lon', 'WGS84경도'],
  mapY: ['mapy', 'mapY', 'latitude', 'lat', 'WGS84위도']
} as const;

const CAMP_KEYS = {
  id: ['contentId', 'contentid', 'id', 'manageNo', 'mgtNo', '관리번호'],
  name: ['facltNm', 'name', 'fcltyNm', 'bplcNm', 'cmpingNm', '사업장명', '시설명'],
  address: ['addr1', 'addr', 'address', 'rdnmadr', 'lnmadr', 'siteWhlAddr', '도로명주소', '지번주소'],
  facilities: ['sbrsCl', 'posblFcltyCl', 'induty', 'intro', 'featureNm', '편익시설현황', '시설규모', '시설면적'],
  reservation: ['resveUrl', 'homepage', 'tel', 'siteTel', '전화번호'],
  restriction: ['allar', 'manageSttus', 'trlerAcmpnyAt', 'caravAcmpnyAt', '영업상태명', '상세영업상태명']
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
  id: ['mgtNo', 'manageNo', 'opnsfTeamCode', 'id', '관리번호'],
  name: ['bplcNm', 'name', 'facltNm', '사업장명', '업소명'],
  address: ['siteWhlAddr', 'rdnWhlAddr', 'rdnmadr', 'lnmadr', 'address', '도로명주소', '지번주소'],
  category: ['uptaeNm', 'siteTel', 'induty', '업태구분명', '문화체육업종명', '위생업태명'],
  tel: ['siteTel', 'tel', 'phone', '전화번호'],
  status: ['trdStateNm', 'dtlStateNm', 'manageSttus', '영업상태명', '상세영업상태명']
} as const;

const RESTAURANT_KEYS = {
  id: ['mgtNo', 'manageNo', 'opnsfTeamCode', 'id', '관리번호'],
  name: ['bplcNm', 'name', 'title', '사업장명', '업소명'],
  address: ['siteWhlAddr', 'rdnWhlAddr', 'rdnmadr', 'lnmadr', 'address', '도로명주소', '지번주소'],
  category: ['uptaeNm', 'foodType', 'induty', '업태구분명', '위생업태명'],
  tel: ['siteTel', 'tel', 'phone', '전화번호'],
  menu: ['repsntMenu', 'mainMenu', 'menu', '전통업소주된음식', '대표메뉴'],
  status: ['trdStateNm', 'dtlStateNm', 'manageSttus', '영업상태명', '상세영업상태명']
} as const;

const PENSION_KEYS = {
  id: ['mgtNo', 'manageNo', 'opnsfTeamCode', 'id', '관리번호'],
  name: ['bplcNm', 'name', 'facltNm', '사업장명', '업소명'],
  address: ['siteWhlAddr', 'rdnWhlAddr', 'rdnmadr', 'lnmadr', 'address', '도로명주소', '지번주소'],
  category: ['uptaeNm', 'induty', '업태구분명', '문화체육업종명'],
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
  id: ['galContentId', 'contentid', 'contentId', 'id', 'sn', 'photoSn', 'islandPhotoId', '사진ID'],
  title: ['galTitle', 'title', 'name', 'photoTitle', 'photoNm', 'photoSj', 'sj', '섬명', '사진명', '제목'],
  image: ['galWebImageUrl', 'firstimage', 'imageUrl', 'originimgurl', 'photoUrl', 'imgUrl', 'fileUrl', 'orignlFileUrl', '사진URL', '이미지URL'],
  thumbnail: ['galWebImageUrl', 'smallimageurl', 'thumbnailUrl', 'thumbUrl', 'thumbImageUrl', 'thumbnail'],
  location: ['galPhotographyLocation', 'addr1', 'addr', 'location', 'islandNm', 'islandName', 'placeNm', '촬영장소', '섬명', '지역명'],
  photographer: ['galPhotographer', 'photographer', 'copyright', 'author', '촬영자'],
  searchKeywords: ['galSearchKeyword', 'searchKeyword', 'keyword', 'photoDc', 'description', 'cn', '설명', '키워드']
} as const;

const ATTRACTION_DETAIL_FIELDS = [
  { label: '콘텐츠ID', keys: ['contentid', 'contentId'] },
  { label: '콘텐츠유형', keys: ['contenttypeid', 'contentTypeId'] },
  { label: '대분류', keys: ['cat1'] },
  { label: '중분류', keys: ['cat2'] },
  { label: '소분류', keys: ['cat3'] },
  { label: '도로명주소', keys: ['addr2'] },
  { label: '우편번호', keys: ['zipcode'] },
  { label: '전화', keys: ['tel'] },
  { label: '좌표', keys: ['mapx', 'mapX', 'mapy', 'mapY'], combine: true }
] as const;

const CAMP_DETAIL_FIELDS = [
  { label: '업종', keys: ['induty', '문화체육업종명'] },
  { label: '입지', keys: ['lctCl', '주변환경명'] },
  { label: '운영상태', keys: ['manageSttus', '영업상태명', '상세영업상태명'] },
  { label: '문의처', keys: ['tel', 'siteTel', '전화번호'] },
  { label: '홈페이지', keys: ['homepage'] },
  { label: '예약 URL', keys: ['resveUrl'] },
  { label: '주요시설', keys: ['gnrlSiteCo', 'autoSiteCo', 'glampSiteCo', 'caravSiteCo', '시설규모', '시설면적'], combine: true },
  { label: '부대시설', keys: ['sbrsCl', 'posblFcltyCl'] },
  { label: '반려동물', keys: ['animalCmgCl'] },
  { label: '트레일러 동반', keys: ['trlerAcmpnyAt'] },
  { label: '카라반 동반', keys: ['caravAcmpnyAt'] }
] as const;

const LODGING_DETAIL_FIELDS = [
  { label: '관리번호', keys: ['mgtNo', 'manageNo', '관리번호'] },
  { label: '인허가일자', keys: ['apvPermYmd', '인허가일자'] },
  { label: '영업상태', keys: ['trdStateNm', '영업상태명'] },
  { label: '상세상태', keys: ['dtlStateNm', '상세영업상태명'] },
  { label: '전화', keys: ['siteTel', '전화번호'] },
  { label: '지번주소', keys: ['siteWhlAddr', '지번주소'] },
  { label: '도로명주소', keys: ['rdnWhlAddr', '도로명주소'] },
  { label: '업태', keys: ['uptaeNm', '업태구분명', '문화체육업종명'] }
] as const;

const RESTAURANT_DETAIL_FIELDS = [
  { label: '관리번호', keys: ['mgtNo', 'manageNo', '관리번호'] },
  { label: '인허가일자', keys: ['apvPermYmd', '인허가일자'] },
  { label: '영업상태', keys: ['trdStateNm', '영업상태명'] },
  { label: '상세상태', keys: ['dtlStateNm', '상세영업상태명'] },
  { label: '전화', keys: ['siteTel', '전화번호'] },
  { label: '지번주소', keys: ['siteWhlAddr', '지번주소'] },
  { label: '도로명주소', keys: ['rdnWhlAddr', '도로명주소'] },
  { label: '업태', keys: ['uptaeNm', '위생업태명', '업태구분명'] },
  { label: '대표메뉴', keys: ['repsntMenu', 'mainMenu', 'menu', '전통업소주된음식'] }
] as const;

const PENSION_DETAIL_FIELDS = LODGING_DETAIL_FIELDS;

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
      const value = definition.combine ? uniqueValues.join(' 쨌 ') : uniqueValues[0];

      return value ? { label: definition.label, value } : null;
    })
    .filter((field): field is { label: string; value: string } => Boolean(field));

  return fields.length > 0 ? fields : undefined;
}

function normalizeIslandName(value: string | undefined) {
  return (value ?? '').trim();
}

function normalizeCompact(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, '').trim();
}

function matchesKeyword(item: IslandTravelCamp, keyword: string) {
  const normalized = keyword.replace(/\s+/g, '');
  if (!normalized) return true;
  const target = [item.name, item.address, item.facilitySummary].filter(Boolean).join('').replace(/\s+/g, '');
  return normalized
    .split(/[쨌,-]/)
    .filter((part) => part.length >= 2)
    .some((part) => target.includes(part) || part.includes(target.slice(0, 2)));
}

function createTravelKeyword(params: TravelInfoParams) {
  return createTravelKeywordParts(params).join(' ');
}

function createLocalBusinessKeywordParts(params: TravelInfoParams) {
  const islandName = normalizeIslandName(params.islandName);
  const islandStem = islandName.replace(/[도섬]$/, '');
  const aliases = [
    islandName,
    islandStem,
    islandStem ? `${islandStem}도` : null,
    islandStem ? `${islandStem}면` : null,
    islandStem ? `${islandStem}리` : null,
    params.cityName,
    params.provinceName
  ];

  return [...new Set(aliases.filter((value): value is string => Boolean(value && value.trim().length >= 2)))];
}

function getLocalPlaceAddress(row: LicensePlaceRow) {
  return row.road_address ?? row.lot_address;
}

function isLicensePlaceRelevantToParams(row: LicensePlaceRow, params: TravelInfoParams) {
  const address = normalizeCompact([row.road_address, row.lot_address].filter(Boolean).join(' '));
  const legalDongName = normalizeCompact(row.legal_dong_name);
  const searchableText = normalizeCompact([row.place_name, row.road_address, row.lot_address, row.legal_dong_name, row.island_name].filter(Boolean).join(' '));
  if (!searchableText) return false;

  const addressProvince = findKoreanProvince(address);
  const legalProvince = findKoreanProvince(legalDongName);
  if (addressProvince && legalProvince && addressProvince !== legalProvince) return false;

  const cityName = normalizeCompact(params.cityName);
  const provinceName = normalizeCompact(params.provinceName);
  const islandName = normalizeCompact(normalizeIslandName(params.islandName));
  const islandStem = islandName.replace(/[도섬]$/, '');

  if (cityName && searchableText.includes(cityName)) return true;
  if (islandName && searchableText.includes(islandName)) return true;
  if (islandStem && islandStem.length >= 2 && searchableText.includes(islandStem)) return true;
  if (provinceName && cityName) return false;
  if (provinceName && searchableText.includes(provinceName)) return true;

  return false;
}

function isTravelItemRelevantToParams(values: Array<string | null | undefined>, params: TravelInfoParams) {
  const text = normalizeCompact(values.filter(Boolean).join(' '));
  if (!text) return false;

  const textProvince = findKoreanProvince(text);
  const requestedProvince = findKoreanProvince(normalizeCompact(params.provinceName));
  if (textProvince && requestedProvince && textProvince !== requestedProvince) return false;

  const cityName = normalizeCompact(params.cityName);
  const islandName = normalizeCompact(normalizeIslandName(params.islandName));
  const islandStem = islandName.replace(/[도섬]$/, '');
  if (cityName && text.includes(cityName)) return true;
  if (islandName && text.includes(islandName)) return true;
  if (islandStem && islandStem.length >= 2 && text.includes(islandStem)) return true;
  if (requestedProvince && text.includes(requestedProvince)) return true;

  return !textProvince;
}

function findKoreanProvince(value: string) {
  return [
    '서울특별시',
    '부산광역시',
    '대구광역시',
    '인천광역시',
    '광주광역시',
    '대전광역시',
    '울산광역시',
    '세종특별자치시',
    '경기도',
    '강원특별자치도',
    '강원도',
    '충청북도',
    '충청남도',
    '전북특별자치도',
    '전라북도',
    '전라남도',
    '경상북도',
    '경상남도',
    '제주특별자치도',
    '제주도'
  ].find((province) => value.includes(province)) ?? null;
}

function createLocalBusinessDetailFields(row: LicensePlaceRow): IslandTravelDetailField[] {
  return [
    { label: '분류', value: row.license_type },
    { label: '업종', value: row.category_name },
    { label: '영업상태', value: row.business_status },
    { label: '상세상태', value: row.detail_status },
    { label: '전화번호', value: row.phone },
    { label: '도로명주소', value: row.road_address },
    { label: '지번주소', value: row.lot_address },
    { label: '매칭 도서', value: row.island_name },
    { label: '매칭 법정동', value: row.legal_dong_name },
    { label: '매칭 기준', value: row.match_type },
    { label: '매칭 키워드', value: row.match_keyword },
    { label: '매칭 점수', value: row.match_score === null ? null : String(row.match_score) },
    { label: '출처 파일', value: row.source_file }
  ].filter((field): field is IslandTravelDetailField => Boolean(field.value));
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
  const islandStem = islandName.replace(/[도섬]$/, '');
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
      const stem = part.replace(/[도섬]$/, '');
      return [part, stem, stem ? `${stem}면` : null].filter((value): value is string => Boolean(value && value.length >= 2));
    });
}

function createPhotoKeywordParts(islandName: string) {
  const normalized = islandName.replace(/\s+/g, '');
  return [...new Set([normalized, normalized.replace(/[도섬]$/, '')].filter((part) => part.length >= 2))];
}

function matchesPhotoKeyword(item: IslandTravelPhoto, keywordParts: string[]) {
  if (keywordParts.length === 0) return true;

  const target = [item.title, item.locationName, item.photographer, item.searchKeywords].filter(Boolean).join('').replace(/\s+/g, '');
  if (!target) return false;

  return keywordParts.some((part) => target.includes(part) || part.includes(target.slice(0, 2)));
}

function inferCampStatus(restriction: string | null): IslandTravelCamp['status'] {
  const text = restriction ?? '';
  if (/금지|폐업|취소|제한|말소/.test(text)) return 'RESTRICTED';
  if (/가능|운영|영업|정상/.test(text)) return 'AVAILABLE';
  return 'CHECK_REQUIRED';
}

function createApiStatus(result: FetchResult, itemCount: number, emptyMessage: string) {
  if (!result.ok) {
    return {
      status: 'ERROR' as const,
      message: `API ?몄텧???ㅽ뙣?덉뒿?덈떎. ${result.error}`
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
    message: `${itemCount}嫄댁쓽 ?뺣낫瑜?遺덈윭?붿뒿?덈떎.`
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
      .join(' / ') || '?????녿뒗 ?ㅻ쪟'
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
