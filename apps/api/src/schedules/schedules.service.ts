import { Inject, Injectable } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../database/prisma.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type {
  PublicFerryApiClient,
  ScheduleCandidateSearchParams,
  ScheduleRouteContext,
  ScheduleSearchParams,
  WeeklyScheduleSearchParams
} from '../public-api/types/public-api.types';

@Injectable()
export class SchedulesService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService
  ) {}

  async getScheduleCandidates(params: ScheduleCandidateSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.scheduleCandidates(params.date, params.departure, params.arrival, params.vesselName),
      CACHE_TTL_SECONDS.SCHEDULE_CANDIDATES,
      async () => {
        const routeContexts = await this.findRouteContexts(params);
        return this.ferryApiClient.getScheduleCandidates({ ...params, routeContexts });
      }
    );

    return toApiResponse(cached.value, cached);
  }

  async getSchedules(params: ScheduleSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.schedules(params.departure, params.arrival, params.date, params.vesselName),
      CACHE_TTL_SECONDS.SCHEDULES,
      async () => {
        const routeContexts = await this.findRouteContexts(params);
        return this.ferryApiClient.getSchedules({ ...params, routeContexts });
      }
    );

    return toApiResponse(cached.value, cached);
  }

  async getWeeklySchedules(params: WeeklyScheduleSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.weeklySchedules(params.startDate ?? params.date, params.departure, params.arrival, params.vesselName, params.endDate),
      CACHE_TTL_SECONDS.WEEKLY_SCHEDULES,
      async () => {
        const routeContexts = await this.findRouteContexts(params);
        return this.ferryApiClient.getWeeklySchedules({ ...params, routeContexts });
      }
    );

    return toApiResponse(cached.value, cached);
  }

  private async findRouteContexts(params: ScheduleCandidateSearchParams): Promise<ScheduleRouteContext[]> {
    const departure = params.departure?.trim();
    const arrival = params.arrival?.trim();

    if (!departure || !arrival) {
      return [];
    }

    const routePairs = await this.prismaService.ferryRouteMaster.findMany({
      where: {
        departurePortName: { equals: departure, mode: 'insensitive' },
        arrivalPortName: { equals: arrival, mode: 'insensitive' }
      },
      orderBy: [{ routeName: 'asc' }, { departurePortName: 'asc' }, { arrivalPortName: 'asc' }],
      take: 50
    });

    if (routePairs.length > 0) {
      return routePairs.map(toScheduleRouteContext);
    }

    const linkedRoute = findLinkedIslandRoute(departure, arrival);
    if (linkedRoute) {
      const linkedRoutePairs = await this.prismaService.ferryRouteMaster.findMany({
        where: {
          departurePortName: { equals: linkedRoute.departurePortName, mode: 'insensitive' },
          arrivalPortName: { equals: linkedRoute.viaPortName, mode: 'insensitive' }
        },
        orderBy: [{ routeName: 'asc' }, { departurePortName: 'asc' }, { arrivalPortName: 'asc' }],
        take: 50
      });

      return linkedRoutePairs.map((route) => ({
        ...toScheduleRouteContext(route),
        stopPortNames: [...new Set([...route.stopPortNames, linkedRoute.viaPortName, linkedRoute.arrivalPortName])]
      }));
    }

    return [];
  }
}

type FerryRouteMasterRecord = {
  routeKey: string;
  routePairKey: string;
  routeName: string;
  departurePortName: string;
  arrivalPortName: string;
  stopPortNames: string[];
  vesselNames: string[];
};

function toScheduleRouteContext(route: FerryRouteMasterRecord): ScheduleRouteContext {
  return {
    routeKey: route.routeKey,
    routePairKey: route.routePairKey,
    routeName: route.routeName,
    departurePortName: route.departurePortName,
    arrivalPortName: route.arrivalPortName,
    stopPortNames: route.stopPortNames,
    vesselNames: route.vesselNames
  };
}

const linkedIslandRoutes = [
  {
    departurePortName: '\uC778\uCC9C',
    viaPortName: '\uB355\uC801',
    arrivalPortName: '\uAD74\uC5C5\uB3C4',
    aliases: ['\uAD74\uC5C5', '\uAD74\uC5C5\uB3C4']
  },
  {
    departurePortName: '\uC778\uCC9C',
    viaPortName: '\uB355\uC801',
    arrivalPortName: '\uBB38\uAC11\uB3C4',
    aliases: ['\uBB38\uAC11', '\uBB38\uAC11\uB3C4']
  },
  {
    departurePortName: '\uC778\uCC9C',
    viaPortName: '\uB355\uC801',
    arrivalPortName: '\uBC31\uC544\uB3C4',
    aliases: ['\uBC31\uC544', '\uBC31\uC544\uB3C4']
  },
  {
    departurePortName: '\uC778\uCC9C',
    viaPortName: '\uB355\uC801',
    arrivalPortName: '\uC6B8\uB3C4',
    aliases: ['\uC6B8\uB3C4']
  },
  {
    departurePortName: '\uC778\uCC9C',
    viaPortName: '\uB355\uC801',
    arrivalPortName: '\uC9C0\uB3C4',
    aliases: ['\uC9C0\uB3C4']
  }
];

function findLinkedIslandRoute(departurePortName: string, arrivalPortName: string) {
  const departure = normalizePortName(departurePortName);
  const arrival = normalizePortName(arrivalPortName);

  return linkedIslandRoutes.find(
    (route) =>
      normalizePortName(route.departurePortName) === departure &&
      route.aliases.some((alias) => normalizePortName(alias) === arrival)
  );
}

function normalizePortName(value: string) {
  return value.replace(/\s/g, '').replace(/도$/g, '').toLowerCase();
}
