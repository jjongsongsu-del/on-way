import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../database/prisma.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { makeStableId } from '../public-api/public-api-response.util';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type { PortOption, PublicApiResult, PublicFerryApiClient, RouteOption, RouteSearchParams } from '../public-api/types/public-api.types';

@Injectable()
export class RoutesService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService
  ) {}

  async getRoutes() {
    const cached = await this.cacheService.remember(CACHE_KEYS.routes(), CACHE_TTL_SECONDS.ROUTES, () =>
      this.ferryApiClient.getRoutes()
    );

    return toApiResponse(cached.value, cached);
  }

  async getRouteOptions() {
    const cached = await this.cacheService.remember(CACHE_KEYS.routeOptions(), CACHE_TTL_SECONDS.ROUTE_OPTIONS, () =>
      this.getRouteOptionsFromMasterOrApi()
    );

    return toApiResponse(cached.value, cached);
  }

  async getDeparturePortOptions() {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.departurePortOptions(),
      CACHE_TTL_SECONDS.ROUTE_OPTIONS,
      () => this.getDeparturePortOptionsFromMasterOrApi()
    );

    return toApiResponse(cached.value, cached);
  }

  async getArrivalPortOptions() {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.arrivalPortOptions(),
      CACHE_TTL_SECONDS.ROUTE_OPTIONS,
      () => this.getArrivalPortOptionsFromMasterOrApi()
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
      this.searchRoutesFromMasterOrApi(params)
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

  private async getRouteOptionsFromMasterOrApi(): Promise<PublicApiResult<RouteOption[]>> {
    const routeOptions = await this.getRouteOptionsFromMaster();
    if (routeOptions.data.length > 0) return routeOptions;

    return this.ferryApiClient.getRouteOptions();
  }

  private async getDeparturePortOptionsFromMasterOrApi(): Promise<PublicApiResult<PortOption[]>> {
    const portOptions = await this.getPortOptionsFromMaster('departure');
    if (portOptions.data.length > 0) return portOptions;

    return this.ferryApiClient.getDeparturePortOptions();
  }

  private async getArrivalPortOptionsFromMasterOrApi(): Promise<PublicApiResult<PortOption[]>> {
    const portOptions = await this.getPortOptionsFromMaster('arrival');
    if (portOptions.data.length > 0) return portOptions;

    return this.ferryApiClient.getArrivalPortOptions();
  }

  private async searchRoutesFromMasterOrApi(params: RouteSearchParams) {
    const routeOptions = await this.getRouteOptionsFromMaster();
    if (routeOptions.data.length === 0) {
      return this.ferryApiClient.searchRoutes(params);
    }

    const departure = params.departure?.trim() ?? '';
    const arrival = params.arrival?.trim() ?? '';
    const data = routeOptions.data
      .filter(
        (route) =>
          (!departure || portMatches(route.departurePortName, departure) || route.stopPortNames.some((portName) => portMatches(portName, departure))) &&
          (!arrival || portMatches(route.arrivalPortName, arrival) || route.stopPortNames.some((portName) => portMatches(portName, arrival)))
      )
      .map((route) => ({
        id: route.id,
        departurePortName: route.departurePortName,
        arrivalPortName: route.arrivalPortName,
        operationRouteName: route.routeName,
        licenseRouteName: route.routeName,
        provider: 'LOCAL'
      }));

    return this.createResult(data, 'komsa-csv-route-master:search');
  }

  private async getRouteOptionsFromMaster(): Promise<PublicApiResult<RouteOption[]>> {
    const routes = await this.prismaService.ferryRouteMaster.findMany({
      orderBy: [{ departurePortName: 'asc' }, { arrivalPortName: 'asc' }, { routeName: 'asc' }]
    });

    const data = routes.map((route) => ({
      id: makeStableId('route-option', [route.routePairKey]),
      routeName: route.routeName,
      departurePortName: route.departurePortName,
      arrivalPortName: route.arrivalPortName,
      stopPortNames: route.stopPortNames
    }));

    return this.createResult(mergeRouteOptions(data, supplementalRouteOptions), 'komsa-csv-route-master:options');
  }

  private async getPortOptionsFromMaster(mode: 'departure' | 'arrival'): Promise<PublicApiResult<PortOption[]>> {
    const where =
      mode === 'departure'
        ? { departureRouteCount: { gt: 0 } }
        : { arrivalRouteCount: { gt: 0 } };
    const ports = await this.prismaService.ferryPortMaster.findMany({
      where,
      orderBy: [{ portName: 'asc' }]
    });

    const data = ports.map((port) => ({
      id: makeStableId('port-option', [port.portKey]),
      portName: port.portName
    }));

    if (mode === 'arrival') {
      supplementalArrivalPorts.forEach((portName) => {
        if (!data.some((port) => portMatches(port.portName, portName))) {
          data.push({
            id: makeStableId('port-option', ['linked-island', portName]),
            portName
          });
        }
      });
      data.sort((a, b) => a.portName.localeCompare(b.portName, 'ko'));
    }

    return this.createResult(data, `komsa-csv-route-master:${mode}-ports`);
  }

  private createResult<T>(data: T, source: string): PublicApiResult<T> {
    return {
      data,
      meta: {
        provider: 'LOCAL',
        source,
        fetchedAt: new Date().toISOString(),
        rawFormat: 'json'
      }
    };
  }
}

const supplementalRouteOptions: RouteOption[] = [
  {
    id: makeStableId('route-option', ['supplemental', 'incheon', 'baengnyeong']),
    routeName: '\uC778\uCC9C-\uBC31\uB839\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uBC31\uB839\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uBC31\uB839', '\uBC31\uB839\uB3C4']
  },
  {
    id: makeStableId('route-option', ['supplemental', 'incheon', 'daecheong']),
    routeName: '\uC778\uCC9C-\uB300\uCCAD\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uB300\uCCAD\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uB300\uCCAD', '\uB300\uCCAD\uB3C4']
  },
  {
    id: makeStableId('route-option', ['supplemental', 'incheon', 'socheong']),
    routeName: '\uC778\uCC9C-\uC18C\uCCAD\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uC18C\uCCAD\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uC18C\uCCAD', '\uC18C\uCCAD\uB3C4']
  },
  {
    id: makeStableId('route-option', ['supplemental', 'incheon', 'yeonpyeong']),
    routeName: '\uC778\uCC9C-\uC5F0\uD3C9\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uC5F0\uD3C9\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uC5F0\uD3C9', '\uC5F0\uD3C9\uB3C4']
  },
  {
    id: makeStableId('route-option', ['linked-island', 'incheon', 'guleop']),
    routeName: '\uC778\uCC9C-\uB355\uC801-\uAD74\uC5C5\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uAD74\uC5C5\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uB355\uC801', '\uAD74\uC5C5\uB3C4']
  },
  {
    id: makeStableId('route-option', ['linked-island', 'incheon', 'mungap']),
    routeName: '\uC778\uCC9C-\uB355\uC801-\uBB38\uAC11\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uBB38\uAC11\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uB355\uC801', '\uBB38\uAC11\uB3C4']
  },
  {
    id: makeStableId('route-option', ['linked-island', 'incheon', 'baeka']),
    routeName: '\uC778\uCC9C-\uB355\uC801-\uBC31\uC544\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uBC31\uC544\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uB355\uC801', '\uBC31\uC544\uB3C4']
  },
  {
    id: makeStableId('route-option', ['linked-island', 'incheon', 'uldo']),
    routeName: '\uC778\uCC9C-\uB355\uC801-\uC6B8\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uC6B8\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uB355\uC801', '\uC6B8\uB3C4']
  },
  {
    id: makeStableId('route-option', ['linked-island', 'incheon', 'jido']),
    routeName: '\uC778\uCC9C-\uB355\uC801-\uC9C0\uB3C4',
    departurePortName: '\uC778\uCC9C',
    arrivalPortName: '\uC9C0\uB3C4',
    stopPortNames: ['\uC778\uCC9C', '\uB355\uC801', '\uC9C0\uB3C4']
  }
];

const supplementalArrivalPorts = supplementalRouteOptions.map((route) => route.arrivalPortName);

function mergeRouteOptions(routeOptions: RouteOption[], supplementalOptions: RouteOption[]) {
  const merged = [...routeOptions];

  supplementalOptions.forEach((option) => {
    const existing = merged.find(
      (route) => portMatches(route.departurePortName, option.departurePortName) && portMatches(route.arrivalPortName, option.arrivalPortName)
    );

    if (existing) {
      existing.stopPortNames = [...new Set([...existing.stopPortNames, ...option.stopPortNames])];
      return;
    }

    merged.push(option);
  });

  return merged;
}

function portMatches(sourcePortName: string, targetPortName: string) {
  const source = normalizePortName(sourcePortName);
  const target = normalizePortName(targetPortName);

  return Boolean(source && target && (source.includes(target) || target.includes(source)));
}

function normalizePortName(value: string) {
  return value
    .replace(/\s/g, '')
    .replace(/여객선터미널/g, '')
    .replace(/연안여객터미널/g, '')
    .replace(/항구/g, '')
    .replace(/항$/g, '')
    .replace(/도$/g, '')
    .replace(/섬$/g, '')
    .toLowerCase();
}
