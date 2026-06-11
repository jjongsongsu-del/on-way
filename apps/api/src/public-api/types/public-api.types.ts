import type {
  Port,
  RealtimeTrafficSummary,
  RouteStop,
  RouteSummary,
  SailingScheduleSummary,
  TodayStatusSummary,
  TomorrowForecastSummary,
  Vessel
} from '@badagil/shared';

export type PublicApiProvider = 'KOMSA' | 'INCHEON_PORT' | 'VWORLD' | 'TOURISM' | 'TAGO' | 'LOCAL' | 'MOCK';

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
  vesselName?: string;
  routeContexts?: ScheduleRouteContext[];
};

export type WeeklyScheduleSearchParams = {
  date: string;
  startDate?: string;
  endDate?: string;
  departure?: string;
  arrival?: string;
  vesselName?: string;
  routeContexts?: ScheduleRouteContext[];
};

export type ScheduleCandidateSearchParams = {
  date: string;
  departure?: string;
  arrival?: string;
  vesselName?: string;
  routeContexts?: ScheduleRouteContext[];
};

export type ScheduleRouteContext = {
  routeKey: string;
  routePairKey: string;
  routeName: string;
  departurePortName: string;
  arrivalPortName: string;
  stopPortNames: string[];
  vesselNames: string[];
};

export type ScheduleSearchCandidate = {
  id: string;
  sailingDate: string;
  departureTime: string | null;
  departurePortName?: string | null;
  arrivalPortName?: string | null;
  vesselCode: string | null;
  vesselName: string;
  routeCode: string | null;
  routeName: string | null;
  licenseRouteName: string | null;
  currentPortName: string | null;
  status: SailingScheduleSummary['status'];
};

export type RouteOption = {
  id: string;
  routeName: string;
  departurePortName: string;
  arrivalPortName: string;
  stopPortNames: string[];
};

export type PortOption = {
  id: string;
  portName: string;
};

export type PublicFerryApiClient = {
  getPorts(): Promise<PublicApiResult<Port[]>>;
  getRoutes(): Promise<PublicApiResult<RouteSummary[]>>;
  getRouteOptions(): Promise<PublicApiResult<RouteOption[]>>;
  getDeparturePortOptions(): Promise<PublicApiResult<PortOption[]>>;
  getArrivalPortOptions(): Promise<PublicApiResult<PortOption[]>>;
  getRoute(routeId: string): Promise<PublicApiResult<RouteSummary | null>>;
  searchRoutes(params: RouteSearchParams): Promise<PublicApiResult<RouteSummary[]>>;
  getRouteStops(routeId: string): Promise<PublicApiResult<RouteStop[]>>;
  getScheduleCandidates(params: ScheduleCandidateSearchParams): Promise<PublicApiResult<ScheduleSearchCandidate[]>>;
  getSchedules(params: ScheduleSearchParams): Promise<PublicApiResult<SailingScheduleSummary[]>>;
  getWeeklySchedules(params: WeeklyScheduleSearchParams): Promise<PublicApiResult<SailingScheduleSummary[]>>;
  getRealtimeTraffic(): Promise<PublicApiResult<RealtimeTrafficSummary[]>>;
  getTodayStatus(params: RouteSearchParams): Promise<PublicApiResult<TodayStatusSummary | null>>;
  getTomorrowForecast(params: RouteSearchParams): Promise<PublicApiResult<TomorrowForecastSummary | null>>;
  getVessels(): Promise<PublicApiResult<Vessel[]>>;
};
