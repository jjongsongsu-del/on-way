import { Inject, Injectable } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type { PublicFerryApiClient, RouteSearchParams } from '../public-api/types/public-api.types';

@Injectable()
export class ForecastsService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService
  ) {}

  async getTomorrowForecast(params: RouteSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.tomorrowForecast(params.departure, params.arrival),
      CACHE_TTL_SECONDS.TOMORROW_FORECAST,
      () => this.ferryApiClient.getTomorrowForecast(params)
    );

    return toApiResponse(cached.value, cached);
  }
}

