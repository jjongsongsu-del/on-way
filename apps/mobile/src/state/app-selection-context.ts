import { useSyncExternalStore } from 'react';

const APP_SELECTION_CONTEXT_KEY = 'badagil:app-selection-context';

export type AppSelectedIsland = {
  islandName: string;
  provinceName?: string | null;
  cityName?: string | null;
  selectedAt: string;
  source: 'home' | 'schedule' | 'island-trip' | 'islands' | 'forecast';
};

export type AppSelectedRoute = {
  departure: string;
  arrival: string;
  name?: string | null;
  departureTime?: string | null;
  vesselName?: string | null;
  selectedAt: string;
  source: 'home' | 'schedule' | 'island-trip' | 'islands' | 'forecast';
};

export type AppSelectionContext = {
  island: AppSelectedIsland | null;
  route: AppSelectedRoute | null;
};

const emptyContext: AppSelectionContext = {
  island: null,
  route: null
};

let memoryContext: AppSelectionContext | null = null;
const listeners = new Set<() => void>();

export function useAppSelectionContext() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setCurrentIsland(island: Omit<AppSelectedIsland, 'selectedAt'>) {
  if (!island.islandName.trim()) return;
  updateContext({
    ...readContext(),
    island: {
      ...island,
      islandName: island.islandName.trim(),
      selectedAt: new Date().toISOString()
    }
  });
}

export function setCurrentRoute(route: Omit<AppSelectedRoute, 'selectedAt'>) {
  if (!route.departure.trim() || !route.arrival.trim()) return;
  updateContext({
    ...readContext(),
    route: {
      ...route,
      departure: route.departure.trim(),
      arrival: route.arrival.trim(),
      name: route.name ?? `${route.departure.trim()} → ${route.arrival.trim()}`,
      selectedAt: new Date().toISOString()
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return readContext();
}

function updateContext(context: AppSelectionContext) {
  memoryContext = context;
  writeContext(context);
  listeners.forEach((listener) => listener());
}

function readContext(): AppSelectionContext {
  if (memoryContext) return memoryContext;

  if (typeof globalThis.localStorage === 'undefined') {
    memoryContext = emptyContext;
    return memoryContext;
  }

  try {
    const value = globalThis.localStorage.getItem(APP_SELECTION_CONTEXT_KEY);
    const parsed = value ? JSON.parse(value) : null;
    memoryContext = normalizeContext(parsed);
    return memoryContext;
  } catch {
    memoryContext = emptyContext;
    return memoryContext;
  }
}

function writeContext(context: AppSelectionContext) {
  if (typeof globalThis.localStorage === 'undefined') return;

  try {
    globalThis.localStorage.setItem(APP_SELECTION_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Runtime memory still keeps the app flow connected if persistence is unavailable.
  }
}

function normalizeContext(value: unknown): AppSelectionContext {
  if (!value || typeof value !== 'object') return emptyContext;
  const candidate = value as Partial<AppSelectionContext>;

  return {
    island: isIsland(candidate.island) ? candidate.island : null,
    route: isRoute(candidate.route) ? candidate.route : null
  };
}

function isIsland(value: unknown): value is AppSelectedIsland {
  return Boolean(value && typeof value === 'object' && typeof (value as AppSelectedIsland).islandName === 'string');
}

function isRoute(value: unknown): value is AppSelectedRoute {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as AppSelectedRoute).departure === 'string' &&
      typeof (value as AppSelectedRoute).arrival === 'string'
  );
}
