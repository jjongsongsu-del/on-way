import { Injectable, NotFoundException } from '@nestjs/common';
import type { IslandSummary } from '@badagil/shared';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import type { PublicApiResult } from '../public-api/types/public-api.types';

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
  constructor(private readonly cacheService: CacheService) {}

  async getIslands(keyword?: string) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const cached = await this.cacheService.remember(
      CACHE_KEYS.islands(normalizedKeyword),
      CACHE_TTL_SECONDS.ISLANDS,
      async () => this.createResult(this.filterIslands(normalizedKeyword))
    );

    return toApiResponse(cached.value, cached);
  }

  async getIsland(islandId: string) {
    const cached = await this.cacheService.remember(CACHE_KEYS.island(islandId), CACHE_TTL_SECONDS.ISLANDS, async () =>
      this.createResult(SEED_ISLANDS.find((island) => island.id === islandId) ?? null)
    );

    if (!cached.value.data) {
      throw new NotFoundException({
        code: 'ISLAND_NOT_FOUND',
        message: 'Island was not found',
        userMessage: '요청한 섬 정보를 찾을 수 없습니다.'
      });
    }

    return toApiResponse(cached.value, cached);
  }

  private filterIslands(keyword?: string) {
    if (!keyword) {
      return SEED_ISLANDS;
    }

    return SEED_ISLANDS.filter((island) =>
      [island.islandName, island.provinceName, island.cityName, island.address]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword))
    );
  }

  private createResult<T>(data: T): PublicApiResult<T> {
    return {
      data,
      meta: {
        provider: 'MOCK',
        source: 'VWorld 2D island information API scaffold',
        fetchedAt: new Date().toISOString(),
        rawFormat: 'mock'
      }
    };
  }
}
