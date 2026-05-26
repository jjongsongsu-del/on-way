import { Inject, Injectable } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type { PublicFerryApiClient, ScheduleSearchParams } from '../public-api/types/public-api.types';

@Injectable()
export class SchedulesService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService
  ) {}

  async getSchedules(params: ScheduleSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.schedules(params.departure, params.arrival, params.date),
      CACHE_TTL_SECONDS.SCHEDULES,
      () => this.ferryApiClient.getSchedules(params)
    );

    return toApiResponse(cached.value, cached);
  }
}

