export const CACHE_TTL_SECONDS = {
  ROUTES: 24 * 60 * 60,
  PORTS: 24 * 60 * 60,
  ROUTE_STOPS: 24 * 60 * 60,
  ROUTE_OPTIONS: 24 * 60 * 60,
  VESSELS: 24 * 60 * 60,
  SCHEDULE_CANDIDATES: 5 * 60,
  SCHEDULES: 15 * 60,
  WEEKLY_SCHEDULES: 15 * 60,
  REALTIME_TRAFFIC: 60,
  ISLANDS: 24 * 60 * 60,
  TODAY_STATUS: 60,
  TOMORROW_FORECAST: 45 * 60,
  MARINE_FORECAST: 10 * 60
} as const;

export const CACHE_KEYS = {
  ports: () => 'ports:all',
  routes: () => 'routes:all',
  routeOptions: () => 'routes:options',
  departurePortOptions: () => 'routes:departures',
  arrivalPortOptions: () => 'routes:arrivals',
  route: (routeId: string) => `routes:${routeId}`,
  routeStops: (routeId: string) => `routes:${routeId}:stops`,
  vessels: () => 'vessels:all',
  scheduleCandidates: (date: string, departure?: string, arrival?: string, vesselName?: string) =>
    `schedules:candidates:${date}:${departure ?? ''}:${arrival ?? ''}:${vesselName ?? ''}`,
  schedules: (departure: string, arrival: string, date: string, vesselName?: string) =>
    `schedules:${departure}:${arrival}:${date}:${vesselName ?? ''}`,
  weeklySchedules: (date: string, departure?: string, arrival?: string, vesselName?: string, endDate?: string) =>
    `schedules:weekly:${date}:${endDate ?? ''}:${departure ?? ''}:${arrival ?? ''}:${vesselName ?? ''}`,
  realtimeTraffic: () => 'routes:traffic:realtime',
  islands: (keyword?: string) => `islands:all:${keyword ?? ''}`,
  island: (islandId: string) => `islands:${islandId}`,
  todayStatus: (departure: string, arrival: string) => `status:today:${departure}:${arrival}`,
  tomorrowForecast: (departure: string, arrival: string) => `forecast:tomorrow:${departure}:${arrival}`,
  marineForecast: (locationName: string, nx: number, ny: number, stationCode: string, salinityStationCode: string) =>
    `forecast:marine:${locationName}:${nx}:${ny}:${stationCode}:${salinityStationCode}`
};
