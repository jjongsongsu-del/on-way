import { useSyncExternalStore } from 'react';
import type { AppSelectionContext } from './app-selection-context';

const NOTIFICATIONS_KEY = 'badagil:app-notifications';
const NOTIFICATION_SETTINGS_KEY = 'badagil:app-notification-settings';
const SCHEDULE_FAVORITES_KEY = 'badagil:schedule:favorites';
const SCHEDULE_RECENTS_KEY = 'badagil:schedule:recents';

export type AppNotificationCategory = 'route' | 'forecast' | 'trip' | 'safety';
export type AppNotificationSeverity = 'info' | 'good' | 'warning' | 'danger';
export type AppNotificationActionTarget = 'schedule' | 'forecast' | 'island-trip' | 'islands' | 'profile';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  category: AppNotificationCategory;
  severity: AppNotificationSeverity;
  createdAt: string;
  readAt: string | null;
  source: 'condition' | 'data' | 'system' | 'manual';
  sourceKey: string;
  route?: {
    departure: string;
    arrival: string;
    vesselName?: string | null;
    departureTime?: string | null;
  };
  islandName?: string | null;
  action?: {
    label: string;
    target: AppNotificationActionTarget;
  };
};

export type AppNotificationSettings = {
  routeAlertsEnabled: boolean;
  forecastAlertsEnabled: boolean;
  tripAlertsEnabled: boolean;
  safetyAlertsEnabled: boolean;
  selectedRouteRuleEnabled: boolean;
  favoriteRouteRuleEnabled: boolean;
  forecastRouteRuleEnabled: boolean;
  recentRouteRuleEnabled: boolean;
  favoriteRoutesOnly: boolean;
  importantOnly: boolean;
  autoClearReadOnGenerate: boolean;
  departureLeadMinutes: 30 | 60 | 180;
};

type RoutePresetRaw = {
  id?: string;
  departure?: string;
  arrival?: string;
  name?: string;
  searchDate?: string;
};

type NotificationSnapshot = {
  items: AppNotification[];
};

type DataScheduleCandidate = {
  id: string;
  sailingDate?: string | null;
  departureTime?: string | null;
  vesselName?: string | null;
  status?: string | null;
};

type DataMarineForecast = {
  locationName?: string | null;
  summary?: string | null;
  riskLevel?: string | null;
  weatherWarnings?: unknown[] | null;
};

type NotificationDataFetchers = {
  fetchScheduleCandidates: (filters: { date: string; departure?: string; arrival?: string }) => Promise<DataScheduleCandidate[]>;
  fetchMarineForecast: (filters: { locationName?: string }) => Promise<DataMarineForecast>;
};

const emptySnapshot: NotificationSnapshot = {
  items: []
};

export const defaultNotificationSettings: AppNotificationSettings = {
  routeAlertsEnabled: true,
  forecastAlertsEnabled: true,
  tripAlertsEnabled: true,
  safetyAlertsEnabled: true,
  selectedRouteRuleEnabled: true,
  favoriteRouteRuleEnabled: true,
  forecastRouteRuleEnabled: true,
  recentRouteRuleEnabled: true,
  favoriteRoutesOnly: false,
  importantOnly: false,
  autoClearReadOnGenerate: false,
  departureLeadMinutes: 60
};

let memorySnapshot: NotificationSnapshot | null = null;
let memorySettings: AppNotificationSettings | null = null;
const listeners = new Set<() => void>();
const settingsListeners = new Set<() => void>();

export function useAppNotifications() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useAppNotificationSettings() {
  return useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsSnapshot);
}

export function generateConditionNotifications(context: AppSelectionContext) {
  const current = readSnapshot();
  const settings = readSettings();
  const generated = buildConditionNotifications(context, settings);
  const baseItems = settings.autoClearReadOnGenerate ? current.items.filter((item) => !item.readAt) : current.items;
  const merged = mergeNotifications(baseItems, generated);
  writeSnapshot({ items: merged });
  return generated.length;
}

export async function generateDataNotifications(context: AppSelectionContext, fetchers: NotificationDataFetchers) {
  const current = readSnapshot();
  const settings = readSettings();
  const generated = await buildDataNotifications(context, settings, fetchers);
  const baseItems = settings.autoClearReadOnGenerate ? current.items.filter((item) => !item.readAt) : current.items;
  const merged = mergeNotifications(baseItems, generated);
  writeSnapshot({ items: merged });
  return generated.length;
}

export function updateNotificationSettings(settings: Partial<AppNotificationSettings>) {
  writeSettings({
    ...readSettings(),
    ...settings
  });
}

export function markNotificationRead(id: string) {
  const now = new Date().toISOString();
  updateItems((items) => items.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? now } : item)));
}

export function markAllNotificationsRead() {
  const now = new Date().toISOString();
  updateItems((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? now })));
}

export function removeNotification(id: string) {
  updateItems((items) => items.filter((item) => item.id !== id));
}

export function clearReadNotifications() {
  updateItems((items) => items.filter((item) => !item.readAt));
}

export function getUnreadNotificationCount(items: AppNotification[]) {
  return items.filter((item) => !item.readAt).length;
}

function buildConditionNotifications(context: AppSelectionContext, settings: AppNotificationSettings): AppNotification[] {
  const now = new Date().toISOString();
  const alerts: AppNotification[] = [];
  const favoriteRoutes = readRoutePresets(SCHEDULE_FAVORITES_KEY);
  const recentRoutes = settings.favoriteRoutesOnly || !settings.recentRouteRuleEnabled ? [] : readRoutePresets(SCHEDULE_RECENTS_KEY);
  const favoriteRouteKeys = new Set(favoriteRoutes.map((route) => routeKey(route.departure, route.arrival)));

  if (settings.routeAlertsEnabled && settings.selectedRouteRuleEnabled && context.route && (!settings.favoriteRoutesOnly || favoriteRouteKeys.has(routeKey(context.route.departure, context.route.arrival)))) {
    const routeLabel = `${context.route.departure} -> ${context.route.arrival}`;
    alerts.push({
      id: stableNotificationId('route-current', routeLabel),
      title: `${routeLabel} 운항 확인`,
      message: [
        context.route.departureTime ? `${context.route.departureTime} 출항 후보` : null,
        context.route.vesselName,
        `출항 ${leadLabel(settings.departureLeadMinutes)} 전 운항상태와 도착지 예보를 함께 확인하세요.`
      ]
        .filter(Boolean)
        .join(' · '),
      category: 'route',
      severity: 'warning',
      createdAt: now,
      readAt: null,
      source: 'condition',
      sourceKey: `route-current:${routeLabel}`,
      route: {
        departure: context.route.departure,
        arrival: context.route.arrival,
        vesselName: context.route.vesselName,
        departureTime: context.route.departureTime
      },
      action: {
        label: '시간표 보기',
        target: 'schedule'
      }
    });
  }

  if (settings.forecastAlertsEnabled && settings.forecastRouteRuleEnabled && context.route && (!settings.favoriteRoutesOnly || favoriteRouteKeys.has(routeKey(context.route.departure, context.route.arrival)))) {
    const routeLabel = `${context.route.departure} -> ${context.route.arrival}`;
    alerts.push({
      id: stableNotificationId('forecast-route', routeLabel),
      title: `${context.route.arrival} 예보 확인 필요`,
      message: '선택한 항로의 도착지 기준으로 파고, 풍속, 특보를 확인하면 여행 판단이 더 안전합니다.',
      category: 'forecast',
      severity: 'info',
      createdAt: now,
      readAt: null,
      source: 'condition',
      sourceKey: `forecast-route:${routeLabel}`,
      route: {
        departure: context.route.departure,
        arrival: context.route.arrival
      },
      action: {
        label: '예보 보기',
        target: 'forecast'
      }
    });
  }

  if (settings.safetyAlertsEnabled && context.island && !settings.favoriteRoutesOnly) {
    alerts.push({
      id: stableNotificationId('island-safety', context.island.islandName),
      title: `${context.island.islandName} 안전정보 체크`,
      message: '섬 상세의 배편, 안전정보, 여행지수를 출발 전에 다시 확인하세요.',
      category: 'safety',
      severity: 'warning',
      createdAt: now,
      readAt: null,
      source: 'condition',
      sourceKey: `island-safety:${context.island.islandName}`,
      islandName: context.island.islandName,
      action: {
        label: '섬여행 보기',
        target: 'island-trip'
      }
    });
  }

  if (settings.favoriteRouteRuleEnabled) {
    favoriteRoutes
    .slice(0, 5)
    .forEach((route, index) => {
      const routeLabel = `${route.departure} -> ${route.arrival}`;
      alerts.push({
        id: stableNotificationId('favorite-route', route.id ?? routeLabel),
        title: route.name || `${routeLabel} 즐겨찾기 항로`,
        message: `${route.departure} 출발 ${route.arrival} 도착 항로입니다. 결항, 통제, 예보 악화 알림을 우선 확인하세요.`,
        category: index === 0 ? 'forecast' : 'route',
        severity: index === 0 ? 'warning' : 'info',
        createdAt: now,
        readAt: null,
        source: 'condition',
        sourceKey: `favorite-route:${route.id ?? routeLabel}`,
        route: {
          departure: route.departure,
          arrival: route.arrival
        },
        action: {
          label: '시간표 보기',
          target: 'schedule'
        }
      });
    });
  }

  if (settings.tripAlertsEnabled && settings.recentRouteRuleEnabled) {
    recentRoutes
    .slice(0, 3)
    .forEach((route) => {
      const routeLabel = `${route.departure} -> ${route.arrival}`;
      alerts.push({
        id: stableNotificationId('recent-route', route.id ?? routeLabel),
        title: `${routeLabel} 최근 조회`,
        message: '최근 조회한 항로입니다. 같은 여정을 다시 확인하거나 즐겨찾기에 추가해 알림 우선순위를 높일 수 있습니다.',
        category: 'trip',
        severity: 'good',
        createdAt: now,
        readAt: null,
        source: 'condition',
        sourceKey: `recent-route:${route.id ?? routeLabel}`,
        route: {
          departure: route.departure,
          arrival: route.arrival
        },
        action: {
          label: '시간표 보기',
          target: 'schedule'
        }
      });
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'notification-empty-guide',
      title: '알림을 만들 항로가 아직 없어요',
      message: '시간표에서 항로를 검색하거나 섬여행에서 관심 섬을 선택하면 맞춤 알림이 생성됩니다.',
      category: 'route',
      severity: 'info',
      createdAt: now,
      readAt: null,
      source: 'system',
      sourceKey: 'empty-guide',
      action: {
        label: '시간표 보기',
        target: 'schedule'
      }
    });
  }

  return dedupeBySource(alerts).filter((alert) => notificationAllowed(alert, settings));
}

async function buildDataNotifications(context: AppSelectionContext, settings: AppNotificationSettings, fetchers: NotificationDataFetchers): Promise<AppNotification[]> {
  const now = new Date().toISOString();
  const today = formatDate(new Date());
  const alerts: AppNotification[] = [];
  const routes = collectNotificationRoutes(context, settings).slice(0, 5);

  if (settings.routeAlertsEnabled) {
    const routeResults = await Promise.allSettled(
      routes.map(async (route) => {
        const candidates = await fetchers.fetchScheduleCandidates({
          date: today,
          departure: route.departure,
          arrival: route.arrival
        });

        return {
          route,
          candidates
        };
      })
    );

    routeResults.forEach((result) => {
      if (result.status === 'rejected') {
        const fallbackRoute = routes[routeResults.indexOf(result)];
        if (!fallbackRoute) return;
        alerts.push(createRouteApiFailureNotification(fallbackRoute, today, now));
        return;
      }

      const { route, candidates } = result.value;
      const actionableCandidates = candidates.filter((candidate) => candidate.status && candidate.status !== 'COMPLETED');
      const importantCandidate = actionableCandidates.find((candidate) => ['CANCELED', 'CONTROLLED', 'DELAYED'].includes(candidate.status ?? ''));
      const nextCandidate =
        importantCandidate ??
        actionableCandidates.find((candidate) => ['NORMAL', 'SCHEDULED'].includes(candidate.status ?? '') && candidate.departureTime) ??
        actionableCandidates[0];

      if (!nextCandidate) {
        alerts.push({
          id: stableNotificationId('data-route-empty', `${today}:${route.departure}:${route.arrival}`),
          title: `${route.departure} -> ${route.arrival} 운항 후보 확인 필요`,
          message: '오늘 조회 가능한 운항 후보가 없습니다. 항만 공지 또는 다른 날짜의 시간표를 확인하세요.',
          category: 'route',
          severity: 'warning',
          createdAt: now,
          readAt: null,
          source: 'data',
          sourceKey: `data-route-empty:${today}:${routeKey(route.departure, route.arrival)}`,
          route: {
            departure: route.departure,
            arrival: route.arrival
          },
          action: {
            label: '시간표 보기',
            target: 'schedule'
          }
        });
        return;
      }

      alerts.push(createScheduleCandidateNotification(route, nextCandidate, today, now));
    });
  }

  if (settings.forecastAlertsEnabled && settings.forecastRouteRuleEnabled) {
    const forecastTargets = collectForecastTargets(context, routes).slice(0, 4);
    const forecastResults = await Promise.allSettled(
      forecastTargets.map(async (locationName) => ({
        locationName,
        forecast: await fetchers.fetchMarineForecast({ locationName })
      }))
    );

    forecastResults.forEach((result, index) => {
      const locationName = forecastTargets[index];
      if (!locationName) return;

      if (result.status === 'rejected') {
        alerts.push({
          id: stableNotificationId('data-forecast-failed', `${today}:${locationName}`),
          title: `${locationName} 예보 확인 실패`,
          message: '예보 API 응답을 확인하지 못했습니다. 출발 전 예보 메뉴에서 다시 조회하세요.',
          category: 'forecast',
          severity: 'warning',
          createdAt: now,
          readAt: null,
          source: 'data',
          sourceKey: `data-forecast-failed:${today}:${locationName}`,
          islandName: locationName,
          action: {
            label: '예보 보기',
            target: 'forecast'
          }
        });
        return;
      }

      const notification = createForecastNotification(locationName, result.value.forecast, today, now);
      if (notification) alerts.push(notification);
    });
  }

  return dedupeBySource(alerts).filter((alert) => notificationAllowed(alert, settings));
}

function createScheduleCandidateNotification(route: Required<Pick<RoutePresetRaw, 'departure' | 'arrival'>> & RoutePresetRaw, candidate: DataScheduleCandidate, date: string, now: string): AppNotification {
  const severity = scheduleSeverity(candidate.status);
  const statusText = scheduleStatusLabel(candidate.status);
  const departureText = candidate.departureTime ? `${candidate.departureTime} 출항` : '출항 시간 확인 필요';
  const vesselText = candidate.vesselName ? ` · ${candidate.vesselName}` : '';
  const routeLabel = `${route.departure} -> ${route.arrival}`;

  return {
    id: stableNotificationId('data-route-status', `${date}:${routeLabel}:${candidate.id}:${candidate.status ?? 'UNKNOWN'}`),
    title: `${routeLabel} ${statusText}`,
    message: `${departureText}${vesselText}. 오늘 실제 운항 후보 기준으로 확인한 알림입니다.`,
    category: 'route',
    severity,
    createdAt: now,
    readAt: null,
    source: 'data',
    sourceKey: `data-route-status:${date}:${routeKey(route.departure, route.arrival)}:${candidate.id}:${candidate.status ?? 'UNKNOWN'}`,
    route: {
      departure: route.departure,
      arrival: route.arrival,
      vesselName: candidate.vesselName,
      departureTime: candidate.departureTime
    },
    action: {
      label: '시간표 보기',
      target: 'schedule'
    }
  };
}

function createRouteApiFailureNotification(route: Required<Pick<RoutePresetRaw, 'departure' | 'arrival'>> & RoutePresetRaw, date: string, now: string): AppNotification {
  return {
    id: stableNotificationId('data-route-failed', `${date}:${route.departure}:${route.arrival}`),
    title: `${route.departure} -> ${route.arrival} 운항 조회 실패`,
    message: '운항 API 응답을 확인하지 못했습니다. 네트워크 또는 API 서버 상태를 확인한 뒤 다시 생성하세요.',
    category: 'route',
    severity: 'warning',
    createdAt: now,
    readAt: null,
    source: 'data',
    sourceKey: `data-route-failed:${date}:${routeKey(route.departure, route.arrival)}`,
    route: {
      departure: route.departure,
      arrival: route.arrival
    },
    action: {
      label: '시간표 보기',
      target: 'schedule'
    }
  };
}

function createForecastNotification(locationName: string, forecast: DataMarineForecast, date: string, now: string): AppNotification | null {
  const riskLevel = forecast.riskLevel ?? 'UNKNOWN';
  const warningCount = forecast.weatherWarnings?.length ?? 0;
  const severity: AppNotificationSeverity = riskLevel === 'HIGH' ? 'danger' : riskLevel === 'MEDIUM' || warningCount > 0 ? 'warning' : 'good';

  if (severity === 'good') {
    return {
      id: stableNotificationId('data-forecast-good', `${date}:${locationName}`),
      title: `${locationName} 예보 안정`,
      message: forecast.summary || '현재 예보 기준으로 큰 위험 신호는 없습니다. 출발 전 최신 예보는 한 번 더 확인하세요.',
      category: 'forecast',
      severity: 'good',
      createdAt: now,
      readAt: null,
      source: 'data',
      sourceKey: `data-forecast-good:${date}:${locationName}`,
      islandName: forecast.locationName ?? locationName,
      action: {
        label: '예보 보기',
        target: 'forecast'
      }
    };
  }

  return {
    id: stableNotificationId('data-forecast-risk', `${date}:${locationName}:${riskLevel}:${warningCount}`),
    title: `${locationName} 해상 예보 주의`,
    message: forecast.summary || `위험도 ${forecastRiskLabel(riskLevel)} 상태입니다. 운항 공지와 복귀 배편을 함께 확인하세요.`,
    category: 'forecast',
    severity,
    createdAt: now,
    readAt: null,
    source: 'data',
    sourceKey: `data-forecast-risk:${date}:${locationName}:${riskLevel}:${warningCount}`,
    islandName: forecast.locationName ?? locationName,
    action: {
      label: '예보 보기',
      target: 'forecast'
    }
  };
}

function collectNotificationRoutes(context: AppSelectionContext, settings: AppNotificationSettings) {
  const favoriteRoutes = settings.favoriteRouteRuleEnabled ? readRoutePresets(SCHEDULE_FAVORITES_KEY) : [];
  const recentRoutes = settings.favoriteRoutesOnly || !settings.recentRouteRuleEnabled ? [] : readRoutePresets(SCHEDULE_RECENTS_KEY);
  const routes: (Required<Pick<RoutePresetRaw, 'departure' | 'arrival'>> & RoutePresetRaw)[] = [];

  if (settings.selectedRouteRuleEnabled && context.route && (!settings.favoriteRoutesOnly || favoriteRoutes.some((route) => routeKey(route.departure, route.arrival) === routeKey(context.route!.departure, context.route!.arrival)))) {
    routes.push({
      departure: context.route.departure,
      arrival: context.route.arrival,
      name: context.route.name ?? undefined
    });
  }

  routes.push(...favoriteRoutes, ...recentRoutes);

  const seen = new Set<string>();
  return routes.filter((route) => {
    const key = routeKey(route.departure, route.arrival);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectForecastTargets(context: AppSelectionContext, routes: (Required<Pick<RoutePresetRaw, 'departure' | 'arrival'>> & RoutePresetRaw)[]) {
  const targets = [
    context.island?.islandName,
    context.route?.arrival,
    ...routes.map((route) => route.arrival)
  ].filter((value): value is string => Boolean(value && value.trim()));

  return [...new Set(targets.map((value) => value.trim()))];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return readSnapshot();
}

function subscribeSettings(listener: () => void) {
  settingsListeners.add(listener);
  return () => settingsListeners.delete(listener);
}

function getSettingsSnapshot() {
  return readSettings();
}

function updateItems(updater: (items: AppNotification[]) => AppNotification[]) {
  const current = readSnapshot();
  writeSnapshot({ items: updater(current.items) });
}

function readSnapshot(): NotificationSnapshot {
  if (memorySnapshot) return memorySnapshot;

  if (typeof globalThis.localStorage === 'undefined') {
    memorySnapshot = emptySnapshot;
    return memorySnapshot;
  }

  try {
    const raw = globalThis.localStorage.getItem(NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    memorySnapshot = normalizeSnapshot(parsed);
  } catch {
    memorySnapshot = emptySnapshot;
  }

  return memorySnapshot;
}

function writeSnapshot(snapshot: NotificationSnapshot) {
  memorySnapshot = {
    items: snapshot.items
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 80)
  };

  if (typeof globalThis.localStorage !== 'undefined') {
    try {
      globalThis.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(memorySnapshot));
    } catch {
      // In-memory state still keeps the notification center usable.
    }
  }

  listeners.forEach((listener) => listener());
}

function readSettings(): AppNotificationSettings {
  if (memorySettings) return memorySettings;

  if (typeof globalThis.localStorage === 'undefined') {
    memorySettings = defaultNotificationSettings;
    return memorySettings;
  }

  try {
    const raw = globalThis.localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    memorySettings = normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    memorySettings = defaultNotificationSettings;
  }

  return memorySettings;
}

function writeSettings(settings: AppNotificationSettings) {
  memorySettings = normalizeSettings(settings);

  if (typeof globalThis.localStorage !== 'undefined') {
    try {
      globalThis.localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(memorySettings));
    } catch {
      // In-memory settings remain usable if persistence is unavailable.
    }
  }

  settingsListeners.forEach((listener) => listener());
}

function normalizeSettings(value: unknown): AppNotificationSettings {
  if (!value || typeof value !== 'object') return defaultNotificationSettings;
  const candidate = value as Partial<AppNotificationSettings>;
  const departureLeadMinutes =
    candidate.departureLeadMinutes === 30 || candidate.departureLeadMinutes === 60 || candidate.departureLeadMinutes === 180
      ? candidate.departureLeadMinutes
      : defaultNotificationSettings.departureLeadMinutes;

  return {
    routeAlertsEnabled: candidate.routeAlertsEnabled ?? defaultNotificationSettings.routeAlertsEnabled,
    forecastAlertsEnabled: candidate.forecastAlertsEnabled ?? defaultNotificationSettings.forecastAlertsEnabled,
    tripAlertsEnabled: candidate.tripAlertsEnabled ?? defaultNotificationSettings.tripAlertsEnabled,
    safetyAlertsEnabled: candidate.safetyAlertsEnabled ?? defaultNotificationSettings.safetyAlertsEnabled,
    selectedRouteRuleEnabled: candidate.selectedRouteRuleEnabled ?? defaultNotificationSettings.selectedRouteRuleEnabled,
    favoriteRouteRuleEnabled: candidate.favoriteRouteRuleEnabled ?? defaultNotificationSettings.favoriteRouteRuleEnabled,
    forecastRouteRuleEnabled: candidate.forecastRouteRuleEnabled ?? defaultNotificationSettings.forecastRouteRuleEnabled,
    recentRouteRuleEnabled: candidate.recentRouteRuleEnabled ?? defaultNotificationSettings.recentRouteRuleEnabled,
    favoriteRoutesOnly: candidate.favoriteRoutesOnly ?? defaultNotificationSettings.favoriteRoutesOnly,
    importantOnly: candidate.importantOnly ?? defaultNotificationSettings.importantOnly,
    autoClearReadOnGenerate: candidate.autoClearReadOnGenerate ?? defaultNotificationSettings.autoClearReadOnGenerate,
    departureLeadMinutes
  };
}

function normalizeSnapshot(value: unknown): NotificationSnapshot {
  if (!value || typeof value !== 'object') return emptySnapshot;
  const candidate = value as Partial<NotificationSnapshot>;
  if (!Array.isArray(candidate.items)) return emptySnapshot;

  return {
    items: candidate.items.filter(isNotification)
  };
}

function isNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== 'object') return false;
  const item = value as AppNotification;
  return Boolean(
    typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.message === 'string' &&
      typeof item.category === 'string' &&
      typeof item.severity === 'string' &&
      typeof item.createdAt === 'string'
  );
}

function mergeNotifications(current: AppNotification[], generated: AppNotification[]) {
  const bySource = new Map<string, AppNotification>();

  current.forEach((item) => {
    bySource.set(item.sourceKey, item);
  });

  generated.forEach((item) => {
    const existing = bySource.get(item.sourceKey);
    bySource.set(item.sourceKey, existing ? { ...item, id: existing.id, readAt: existing.readAt, createdAt: existing.createdAt } : item);
  });

  return [...bySource.values()];
}

function readRoutePresets(key: string) {
  const memoryStore = globalThis as typeof globalThis & {
    __badagilScheduleRoutePresets?: Record<string, RoutePresetRaw[]>;
  };
  const memoryValue = normalizeRoutePresets(memoryStore.__badagilScheduleRoutePresets?.[key]);
  if (memoryValue.length) return memoryValue;

  if (typeof globalThis.localStorage === 'undefined') return [];

  try {
    const raw = globalThis.localStorage.getItem(key);
    return normalizeRoutePresets(raw ? JSON.parse(raw) : null);
  } catch {
    return [];
  }
}

function normalizeRoutePresets(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (route): route is Required<Pick<RoutePresetRaw, 'departure' | 'arrival'>> & RoutePresetRaw =>
      Boolean(route && typeof route === 'object' && typeof route.departure === 'string' && typeof route.arrival === 'string')
  );
}

function dedupeBySource(items: AppNotification[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.sourceKey)) return false;
    seen.add(item.sourceKey);
    return true;
  });
}

function notificationAllowed(notification: AppNotification, settings: AppNotificationSettings) {
  if (notification.category === 'route' && !settings.routeAlertsEnabled) return false;
  if (notification.category === 'forecast' && !settings.forecastAlertsEnabled) return false;
  if (notification.category === 'trip' && !settings.tripAlertsEnabled) return false;
  if (notification.category === 'safety' && !settings.safetyAlertsEnabled) return false;
  if (settings.importantOnly && notification.severity !== 'warning' && notification.severity !== 'danger') return false;
  return true;
}

function scheduleSeverity(status: string | null | undefined): AppNotificationSeverity {
  if (status === 'CANCELED' || status === 'CONTROLLED') return 'danger';
  if (status === 'DELAYED' || status === 'UNKNOWN') return 'warning';
  if (status === 'NORMAL' || status === 'SCHEDULED') return 'good';
  return 'info';
}

function scheduleStatusLabel(status: string | null | undefined) {
  if (status === 'NORMAL') return '정상 운항';
  if (status === 'SCHEDULED') return '운항 예정';
  if (status === 'DELAYED') return '지연 주의';
  if (status === 'CANCELED') return '결항';
  if (status === 'CONTROLLED') return '통제';
  if (status === 'COMPLETED') return '운항 완료';
  return '상태 확인 필요';
}

function forecastRiskLabel(riskLevel: string | null | undefined) {
  if (riskLevel === 'HIGH') return '높음';
  if (riskLevel === 'MEDIUM') return '주의';
  if (riskLevel === 'LOW') return '낮음';
  return '확인 필요';
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function routeKey(departure: string, arrival: string) {
  return `${departure.trim()}->${arrival.trim()}`;
}

function leadLabel(minutes: AppNotificationSettings['departureLeadMinutes']) {
  if (minutes === 180) return '3시간';
  if (minutes === 60) return '1시간';
  return '30분';
}

function stableNotificationId(prefix: string, value: string) {
  return `${prefix}-${value.replace(/\s/g, '').replace(/[^\w가-힣-]/g, '-')}`;
}
