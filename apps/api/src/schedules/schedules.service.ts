import { Inject, Injectable } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type {
  PublicFerryApiClient,
  ScheduleCandidateSearchParams,
  ScheduleSearchParams,
  WeeklyScheduleSearchParams
} from '../public-api/types/public-api.types';

@Injectable()
export class SchedulesService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService
  ) {}

  async getScheduleCandidates(params: ScheduleCandidateSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.scheduleCandidates(params.date, params.departure, params.arrival, params.vesselName),
      CACHE_TTL_SECONDS.SCHEDULE_CANDIDATES,
      () => this.ferryApiClient.getScheduleCandidates(params)
    );

    return toApiResponse(cached.value, cached);
  }

  async getSchedules(params: ScheduleSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.schedules(params.departure, params.arrival, params.date, params.vesselName),
      CACHE_TTL_SECONDS.SCHEDULES,
      () => this.ferryApiClient.getSchedules(params)
    );

    return toApiResponse(cached.value, cached);
  }

  async getWeeklySchedules(params: WeeklyScheduleSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.weeklySchedules(params.startDate ?? params.date, params.departure, params.arrival, params.vesselName, params.endDate),
      CACHE_TTL_SECONDS.WEEKLY_SCHEDULES,
      () => this.ferryApiClient.getWeeklySchedules(params)
    );

    return toApiResponse(cached.value, cached);
  }
}
