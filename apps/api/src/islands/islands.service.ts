import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { IslandSummary } from '@badagil/shared';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { extractItems, makeStableId, pickNumber, pickString } from '../public-api/public-api-response.util';
import { VworldIslandApiClient } from '../public-api/clients/vworld-island-api.client';
import type { PublicApiResult } from '../public-api/types/public-api.types';

type UnknownRecord = Record<string, unknown>;
type Bbox = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
};

const UPDATED_AT = '2026-05-28T00:00:00.000Z';

const SEED_ISLANDS: IslandSummary[] = [
  {
    id: 'baengnyeongdo',
    islandName: '백령도',
    provinceName: '인천광역시',
    cityName: '옹진군',
    address: '인천광역시 옹진군 백령면',
    latitude: 37.9661,
    longitude: 124.6306,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '서해 최북단 주요 도서로 인천 여객 항로와 함께 조회할 수 있는 대표 섬입니다.',
    source: 'MOCK',
    updatedAt: UPDATED_AT
  },
  {
    id: 'yeonpyeongdo',
    islandName: '연평도',
    provinceName: '인천광역시',
    cityName: '옹진군',
    address: '인천광역시 옹진군 연평면',
    latitude: 37.6663,
    longitude: 125.6983,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '인천권 여객선 운항 정보와 연결하기 좋은 서해 주요 도서입니다.',
    source: 'MOCK',
    updatedAt: UPDATED_AT
  },
  {
    id: 'deokjeokdo',
    islandName: '덕적도',
    provinceName: '인천광역시',
    cityName: '옹진군',
    address: '인천광역시 옹진군 덕적면',
    latitude: 37.2279,
    longitude: 126.1485,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '서해 도서 여행과 정기 여객선 스케줄 탐색을 연결할 수 있는 섬입니다.',
    source: 'MOCK',
    updatedAt: UPDATED_AT
  },
  {
    id: 'ulleungdo',
    islandName: '울릉도',
    provinceName: '경상북도',
    cityName: '울릉군',
    address: '경상북도 울릉군',
    latitude: 37.4845,
    longitude: 130.9057,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '동해 대표 도서로 기상, 예보, 여객선 운항 변동 안내와 함께 보여주기 좋습니다.',
    source: 'MOCK',
    updatedAt: UPDATED_AT
  },
  {
    id: 'jejudo',
    islandName: '제주도',
    provinceName: '제주특별자치도',
    cityName: '제주시',
    address: '제주특별자치도',
    latitude: 33.4996,
    longitude: 126.5312,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '여객선, 항공, 관광 정보를 확장하기 좋은 국내 최대 도서입니다.',
    source: 'MOCK',
    updatedAt: UPDATED_AT
  }
];

@Injectable()
export class IslandsService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly vworldIslandApiClient: VworldIslandApiClient
  ) {}

  async getIslands(keyword?: string) {
    const normalizedKeyword = keyword?.trim();
    const cached = await this.cacheService.remember(
      CACHE_KEYS.islands(normalizedKeyword),
      CACHE_TTL_SECONDS.ISLANDS,
      async () => this.fetchIslands(normalizedKeyword)
    );

    return toApiResponse(cached.value, cached);
  }

  async getIsland(islandId: string) {
    const cached = await this.cacheService.remember(CACHE_KEYS.island(islandId), CACHE_TTL_SECONDS.ISLANDS, async () => {
      const list = await this.fetchIslands();
      return this.createResult(list.data.find((island) => island.id === islandId) ?? null, list.meta.provider, list.meta.source);
    });

    if (!cached.value.data) {
      throw new NotFoundException({
        code: 'ISLAND_NOT_FOUND',
        message: 'Island was not found',
        userMessage: '요청한 섬 정보를 찾을 수 없습니다.'
      });
    }

    return toApiResponse(cached.value, cached);
  }

  async getIslandFeatures(bboxText: string) {
    const bbox = parseBbox(bboxText);

    try {
      const response = await this.vworldIslandApiClient.getIslandFeatures({
        bbox: bboxText,
        maxFeatures: 100,
        resultType: 'results'
      });
      const islands = extractItems(response).map((item) => this.toIsland(item)).filter((island) => island.islandName);
      const islandsInBounds = uniqueById(islands).filter((island) => isIslandInBbox(island, bbox));

      if (islandsInBounds.length > 0) {
        return toApiResponse(this.createResult(islandsInBounds, 'VWORLD', 'vworld-island-wfs', 'json'));
      }
    } catch {
      // Local development and static preview can run without a VWorld key.
    }

    return toApiResponse(this.createResult(this.filterSeedIslandsByBbox(bbox), 'MOCK', 'badanuri-island-preview-seed', 'mock'));
  }

  async getIslandWms(params: { bbox: string; width: number; height: number }) {
    parseBbox(params.bbox);

    return this.vworldIslandApiClient.getWmsImage({
      bbox: params.bbox,
      width: clampInteger(params.width, 256, 1600, 915),
      height: clampInteger(params.height, 256, 1600, 640),
      format: 'image/png',
      transparent: 'true'
    });
  }

  async getBaseMapTile(params: { z: number; x: number; y: number }) {
    return this.vworldIslandApiClient.getBaseTileImage({
      z: clampInteger(params.z, 5, 13, 7),
      x: clampInteger(params.x, 0, Number.MAX_SAFE_INTEGER, 0),
      y: clampInteger(params.y, 0, Number.MAX_SAFE_INTEGER, 0),
      layer: 'Base'
    });
  }

  private async fetchIslands(keyword?: string): Promise<PublicApiResult<IslandSummary[]>> {
    try {
      const response = await this.vworldIslandApiClient.getIslandAttributes({
        islndsNm: keyword,
        numOfRows: 100,
        pageNo: 1
      });
      const islands = extractItems(response).map((item) => this.toIsland(item)).filter((island) => island.islandName);

      if (islands.length > 0) {
        return this.createResult(uniqueById(islands), 'VWORLD', 'vworld-island-attributes', 'json');
      }
    } catch {
      // Local development and static preview can run without a VWorld key.
    }

    return this.createResult(this.filterSeedIslands(keyword), 'MOCK', 'badanuri-island-preview-seed', 'mock');
  }

  private toIsland(item: UnknownRecord): IslandSummary {
    const islandName = pickString(item, ISLAND_FIELD_KEYS.name) ?? '';
    const provinceName = pickString(item, ISLAND_FIELD_KEYS.province);
    const cityName = pickString(item, ISLAND_FIELD_KEYS.city);
    const address = pickString(item, ISLAND_FIELD_KEYS.address) ?? [provinceName, cityName].filter(Boolean).join(' ');
    const latitude = pickNumber(item, ISLAND_FIELD_KEYS.latitude);
    const longitude = pickNumber(item, ISLAND_FIELD_KEYS.longitude);

    return {
      id: makeStableId('island', [
        pickString(item, ISLAND_FIELD_KEYS.idCode),
        islandName,
        provinceName,
        cityName
      ]),
      islandName,
      provinceName,
      cityName,
      address: address || null,
      latitude,
      longitude,
      areaSquareMeters: pickNumber(item, ISLAND_FIELD_KEYS.area),
      coastlineLengthMeters: pickNumber(item, ISLAND_FIELD_KEYS.coastline),
      population: pickNumber(item, ISLAND_FIELD_KEYS.population),
      description: pickString(item, ISLAND_FIELD_KEYS.description),
      source: 'VWORLD',
      updatedAt: new Date().toISOString()
    };
  }

  private filterSeedIslands(keyword?: string) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    if (!normalizedKeyword) {
      return SEED_ISLANDS;
    }

    return SEED_ISLANDS.filter((island) =>
      [island.islandName, island.provinceName, island.cityName, island.address]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedKeyword))
    );
  }

  private filterSeedIslandsByBbox(bbox: Bbox) {
    return SEED_ISLANDS.filter((island) => isIslandInBbox(island, bbox));
  }

  private createResult<T>(
    data: T,
    provider: PublicApiResult<T>['meta']['provider'],
    source: string,
    rawFormat: PublicApiResult<T>['meta']['rawFormat'] = provider === 'VWORLD' ? 'json' : 'mock'
  ): PublicApiResult<T> {
    return {
      data,
      meta: {
        provider,
        source,
        fetchedAt: new Date().toISOString(),
        rawFormat
      }
    };
  }
}

const ISLAND_FIELD_KEYS = {
  idCode: ['idCode', 'ldCode', 'ldCpsgCode', 'sigCd', 'emdCd', '법정동코드'],
  name: ['islndsNm', 'islandsNm', 'islandNm', 'islndNm', 'isldNm', 'islandName', 'name', '도서명'],
  province: ['ctprvnNm', 'sidoNm', 'provNm', 'provinceName', '시도명'],
  city: ['signguNm', 'sggNm', 'sigunguNm', 'cityName', '시군구명'],
  address: ['addr', 'address', 'rnAdres', 'lnmAdres', '소재지', '주소'],
  latitude: ['lat', 'latitude', 'la', '위도'],
  longitude: ['lon', 'lng', 'longitude', 'lo', '경도'],
  area: ['area', 'ar', 'islandsAr', 'isldArea', '면적'],
  coastline: ['coastline', 'coastlineLen', 'coastLen', '해안선길이'],
  population: ['population', 'popltn', '인구'],
  description: ['rm', 'remark', 'description', '설명']
} as const;

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function parseBbox(value?: string): Bbox {
  const numbers = value?.split(',').map((item) => Number(item.trim())) ?? [];

  if (numbers.length !== 4 || numbers.some((item) => !Number.isFinite(item))) {
    throw new BadRequestException({
      code: 'INVALID_BBOX',
      message: 'bbox must be minLongitude,minLatitude,maxLongitude,maxLatitude',
      userMessage: '지도 조회 범위가 올바르지 않습니다.'
    });
  }

  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = numbers;
  if (minLongitude >= maxLongitude || minLatitude >= maxLatitude) {
    throw new BadRequestException({
      code: 'INVALID_BBOX_RANGE',
      message: 'bbox min values must be smaller than max values',
      userMessage: '지도 조회 범위가 올바르지 않습니다.'
    });
  }

  return { minLongitude, minLatitude, maxLongitude, maxLatitude };
}

function isIslandInBbox(island: IslandSummary, bbox: Bbox) {
  if (typeof island.latitude !== 'number' || typeof island.longitude !== 'number') {
    return false;
  }

  return (
    island.latitude >= bbox.minLatitude &&
    island.latitude <= bbox.maxLatitude &&
    island.longitude >= bbox.minLongitude &&
    island.longitude <= bbox.maxLongitude
  );
}

function clampInteger(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}
