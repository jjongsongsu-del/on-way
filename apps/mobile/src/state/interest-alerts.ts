import type { AppSelectionContext } from './app-selection-context';

const SCHEDULE_FAVORITES_KEY = 'badagil:schedule:favorites';

export type InterestAlert = {
  id: string;
  title: string;
  description: string;
  tone: 'good' | 'warning' | 'danger' | 'neutral';
  category: 'route' | 'forecast' | 'trip';
};

type RoutePresetRaw = {
  id?: string;
  departure?: string;
  arrival?: string;
  name?: string;
  searchDate?: string;
};

type FavoriteRoute = RoutePresetRaw & {
  departure: string;
  arrival: string;
};

export function buildInterestAlerts(context: AppSelectionContext): InterestAlert[] {
  const favoriteRoutes = readFavoriteRoutes();
  const alerts: InterestAlert[] = [];

  if (context.route) {
    alerts.push({
      id: 'current-route',
      title: `${context.route.departure} -> ${context.route.arrival}`,
      description: [context.route.departureTime && `${context.route.departureTime} 출항`, context.route.vesselName, '예보와 운항상태를 함께 확인하세요']
        .filter(Boolean)
        .join(' · '),
      tone: 'warning',
      category: 'route'
    });
  }

  if (context.island) {
    alerts.push({
      id: 'current-island',
      title: `${context.island.islandName} 안전정보`,
      description: '섬상세, 예보, 지도 정보를 현재 선택한 섬 기준으로 이어서 확인할 수 있습니다.',
      tone: 'neutral',
      category: 'trip'
    });
  }

  favoriteRoutes.slice(0, 3).forEach((route, index) => {
    alerts.push({
      id: `favorite-route-${route.id ?? index}`,
      title: route.name || `${route.departure} -> ${route.arrival}`,
      description: `${route.departure} 출발 ${route.arrival} 도착 관심 항로입니다. 결항, 통제, 예보 악화 시 우선 확인 대상입니다.`,
      tone: index === 0 ? 'warning' : 'neutral',
      category: 'forecast'
    });
  });

  if (alerts.length === 0) {
    alerts.push({
      id: 'empty',
      title: '관심 항로를 등록해 보세요',
      description: '시간표에서 자주 보는 출발지와 도착지를 즐겨찾기로 저장하면 홈과 알림 센터가 개인화됩니다.',
      tone: 'neutral',
      category: 'route'
    });
  }

  return dedupeAlerts(alerts).slice(0, 6);
}

function readFavoriteRoutes(): FavoriteRoute[] {
  const memoryStore = globalThis as typeof globalThis & {
    __badagilScheduleRoutePresets?: Record<string, RoutePresetRaw[]>;
  };
  const memoryFavorites = normalizeFavoriteRoutes(memoryStore.__badagilScheduleRoutePresets?.[SCHEDULE_FAVORITES_KEY]);
  if (memoryFavorites.length) return memoryFavorites;

  if (typeof globalThis.localStorage === 'undefined') return [];

  try {
    const value = globalThis.localStorage.getItem(SCHEDULE_FAVORITES_KEY);
    const parsed = value ? JSON.parse(value) : null;
    return normalizeFavoriteRoutes(parsed);
  } catch {
    return [];
  }
}

function normalizeFavoriteRoutes(value: unknown): FavoriteRoute[] {
  if (!Array.isArray(value)) return [];

  return value.filter((route): route is FavoriteRoute =>
    Boolean(route && typeof route === 'object' && typeof route.departure === 'string' && typeof route.arrival === 'string')
  );
}

function dedupeAlerts(alerts: InterestAlert[]) {
  const seen = new Set<string>();
  return alerts.filter((alert) => {
    const key = `${alert.category}:${alert.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
