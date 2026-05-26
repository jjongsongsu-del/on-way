export const CACHE_TTL_SECONDS = {
  ROUTES: 24 * 60 * 60,
  PORTS: 24 * 60 * 60,
  ROUTE_STOPS: 24 * 60 * 60,
  VESSELS: 24 * 60 * 60,
  SCHEDULES: 15 * 60,
  TODAY_STATUS: 60,
  TOMORROW_FORECAST: 45 * 60
} as const;

export const CACHE_KEYS = {
  ports: () => 'ports:all',
  routes: () => 'routes:all',
  route: (routeId: string) => `routes:${routeId}`,
  routeStops: (routeId: string) => `routes:${routeId}:stops`,
  vessels: () => 'vessels:all',
  schedules: (departure: string, arrival: string, date: string) =>
    `schedules:${departure}:${arrival}:${date}`,
  todayStatus: (departure: string, arrival: string) => `status:today:${departure}:${arrival}`,
  tomorrowForecast: (departure: string, arrival: string) => `forecast:tomorrow:${departure}:${arrival}`
};
