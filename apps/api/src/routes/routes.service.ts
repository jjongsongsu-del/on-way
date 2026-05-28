import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type { PublicFerryApiClient, RouteSearchParams } from '../public-api/types/public-api.types';

@Injectable()
export class RoutesService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService
  ) {}

  async getRoutes() {
    const cached = await this.cacheService.remember(CACHE_KEYS.routes(), CACHE_TTL_SECONDS.ROUTES, () =>
      this.ferryApiClient.getRoutes()
    );

    return toApiResponse(cached.value, cached);
  }

  async getRouteOptions() {
    const cached = await this.cacheService.remember(CACHE_KEYS.routeOptions(), CACHE_TTL_SECONDS.ROUTE_OPTIONS, () =>
      this.ferryApiClient.getRouteOptions()
    );

    return toApiResponse(cached.value, cached);
  }

  async getDeparturePortOptions() {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.departurePortOptions(),
      CACHE_TTL_SECONDS.ROUTE_OPTIONS,
      () => this.ferryApiClient.getDeparturePortOptions()
    );

    return toApiResponse(cached.value, cached);
  }

  async getArrivalPortOptions() {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.arrivalPortOptions(),
      CACHE_TTL_SECONDS.ROUTE_OPTIONS,
      () => this.ferryApiClient.getArrivalPortOptions()
    );

    return toApiResponse(cached.value, cached);
  }

  async getRealtimeTraffic() {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.realtimeTraffic(),
      CACHE_TTL_SECONDS.REALTIME_TRAFFIC,
      () => this.ferryApiClient.getRealtimeTraffic()
    );

    return toApiResponse(cached.value, cached);
  }

  async searchRoutes(params: RouteSearchParams) {
    const key = `routes:search:${params.departure}:${params.arrival}`;
    const cached = await this.cacheService.remember(key, CACHE_TTL_SECONDS.ROUTES, () =>
      this.ferryApiClient.searchRoutes(params)
    );

    return toApiResponse(cached.value, cached);
  }

  async getRoute(routeId: string) {
    const cached = await this.cacheService.remember(CACHE_KEYS.route(routeId), CACHE_TTL_SECONDS.ROUTES, () =>
      this.ferryApiClient.getRoute(routeId)
    );

    if (!cached.value.data) {
      throw new NotFoundException({
        code: 'ROUTE_NOT_FOUND',
        message: 'Route was not found',
        userMessage: '요청한 항로를 찾을 수 없습니다.'
      });
    }

    return toApiResponse(cached.value, cached);
  }

  async getRouteStops(routeId: string) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.routeStops(routeId),
      CACHE_TTL_SECONDS.ROUTE_STOPS,
      () => this.ferryApiClient.getRouteStops(routeId)
    );

    return toApiResponse(cached.value, cached);
  }
}
