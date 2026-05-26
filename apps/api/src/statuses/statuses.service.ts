import { Inject, Injectable } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type { PublicFerryApiClient, RouteSearchParams } from '../public-api/types/public-api.types';

@Injectable()
export class StatusesService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService
  ) {}

  async getTodayStatus(params: RouteSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.todayStatus(params.departure, params.arrival),
      CACHE_TTL_SECONDS.TODAY_STATUS,
      () => this.ferryApiClient.getTodayStatus(params)
    );

    return toApiResponse(cached.value, cached);
  }
}

