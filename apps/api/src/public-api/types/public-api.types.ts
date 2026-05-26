import type {
  RouteStop,
  RouteSummary,
  SailingScheduleSummary,
  TodayStatusSummary,
  TomorrowForecastSummary,
  Vessel
} from '@badagil/shared';

export type PublicApiProvider = 'KOMSA' | 'INCHEON_PORT' | 'MOCK';

export type PublicApiMeta = {
  provider: PublicApiProvider;
  source: string;
  fetchedAt: string;
  rawFormat: 'json' | 'xml' | 'mock';
};

export type PublicApiResult<T> = {
  data: T;
  meta: PublicApiMeta;
};

export type RouteSearchParams = {
  departure: string;
  arrival: string;
};

export type ScheduleSearchParams = RouteSearchParams & {
  date: string;
};

export type PublicFerryApiClient = {
  getRoutes(): Promise<PublicApiResult<RouteSummary[]>>;
  searchRoutes(params: RouteSearchParams): Promise<PublicApiResult<RouteSummary[]>>;
  getRouteStops(routeId: string): Promise<PublicApiResult<RouteStop[]>>;
  getSchedules(params: ScheduleSearchParams): Promise<PublicApiResult<SailingScheduleSummary[]>>;
  getTodayStatus(params: RouteSearchParams): Promise<PublicApiResult<TodayStatusSummary | null>>;
  getTomorrowForecast(params: RouteSearchParams): Promise<PublicApiResult<TomorrowForecastSummary | null>>;
  getVessels(): Promise<PublicApiResult<Vessel[]>>;
};

