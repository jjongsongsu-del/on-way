import { fetchArrivalPorts, fetchDeparturePorts, type PortOption } from '@/api/routes';
import { fetchScheduleCandidates, fetchSchedules, fetchWeeklySchedules, type ScheduleCandidate } from '@/api/schedules';
import { fetchRouteOptions, type RouteOption } from '@/api/routes';
import { fetchVesselDetail } from '@/api/vessels';
import { Link } from 'expo-router';
import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';
import type { SailingScheduleSummary, VesselDetail } from '@badagil/shared';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Pencil,
  History,
  MapPin,
  Search,
  Ship,
  Star,
  Repeat2,
  Trash2,
  Waves,
  X
} from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type CandidateStatusFilter = 'ALL' | ScheduleCandidate['status'];
type CandidateSortMode = 'TIME' | 'RISK' | 'VESSEL';
type ScheduleTimeFilter = 'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING';

const statusLabel = {
  NORMAL: '정상 운항',
  SCHEDULED: '운항 예정',
  DELAYED: '지연',
  CANCELED: '결항',
  CONTROLLED: '통제',
  COMPLETED: '운항 완료',
  UNKNOWN: '확인 필요'
} as const;

const candidateStatusFilters: { value: CandidateStatusFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'NORMAL', label: '정상' },
  { value: 'SCHEDULED', label: '예정' },
  { value: 'DELAYED', label: '지연' },
  { value: 'CANCELED', label: '결항' },
  { value: 'CONTROLLED', label: '통제' },
  { value: 'UNKNOWN', label: '확인 필요' }
];

const candidateSortOptions: { value: CandidateSortMode; label: string }[] = [
  { value: 'TIME', label: '빠른 출발순' },
  { value: 'RISK', label: '주의 먼저' },
  { value: 'VESSEL', label: '선박명순' }
];

const scheduleTimeFilters: { value: ScheduleTimeFilter; label: string; description: string }[] = [
  { value: 'ALL', label: '전체', description: '전체 시간' },
  { value: 'MORNING', label: '오전', description: '00:00-11:59' },
  { value: 'AFTERNOON', label: '오후', description: '12:00-17:59' },
  { value: 'EVENING', label: '저녁', description: '18:00 이후' }
];

const quickDateOffsets = [
  { label: '오늘', offset: 0 },
  { label: '내일', offset: 1 },
  { label: '이번 주말', offset: null }
] as const;

const statusSortOrder: Record<ScheduleCandidate['status'], number> = {
  NORMAL: 0,
  SCHEDULED: 1,
  DELAYED: 2,
  CONTROLLED: 3,
  CANCELED: 4,
  COMPLETED: 5,
  UNKNOWN: 6
};

const statusTone = {
  NORMAL: 'good',
  SCHEDULED: 'neutral',
  DELAYED: 'warning',
  CANCELED: 'danger',
  CONTROLLED: 'danger',
  COMPLETED: 'neutral',
  UNKNOWN: 'neutral'
} as const;

type PortSelectMode = 'departure' | 'arrival' | 'weeklyDeparture' | 'weeklyArrival';
type DatePickerTarget = 'main' | 'weeklyStart' | 'weeklyEnd' | 'favoriteSearch';
type SchedulePortBasis = 'departure' | 'arrival';
type RoutePreset = {
  id: string;
  departure: string;
  arrival: string;
  name?: string;
  searchDate?: string;
  createdAt?: string;
  lastSearchedAt?: string;
};

type ScheduleSavedFilters = {
  date: string;
  departure: string;
  arrival: string;
  vesselName: string;
};

const SCHEDULE_FAVORITES_KEY = 'badagil:schedule:favorites';
const SCHEDULE_RECENTS_KEY = 'badagil:schedule:recents';
const SCHEDULE_FILTERS_KEY = 'badagil:schedule:filters';

function todayText() {
  return formatDate(new Date());
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: string, days: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function nextWeekendText() {
  const date = new Date();
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return formatDate(date);
}

function formatDateTime(value: number | string | Date | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');

  return `${month}.${day} ${hour}:${minute}`;
}

function formatRecentDateTime(value: string | undefined) {
  const formatted = formatDateTime(value);
  return formatted ? `${formatted} 조회` : '최근 조회';
}

function routePresetId(departure: string, arrival: string) {
  return `${departure.trim()}__${arrival.trim()}`;
}

function makeRoutePreset(
  departure: string,
  arrival: string,
  options?: Pick<RoutePreset, 'name' | 'searchDate' | 'createdAt' | 'lastSearchedAt'>
): RoutePreset | null {
  const nextDeparture = departure.trim();
  const nextArrival = arrival.trim();

  if (!nextDeparture || !nextArrival) return null;

  return {
    id: routePresetId(nextDeparture, nextArrival),
    departure: nextDeparture,
    arrival: nextArrival,
    ...options
  };
}

function routePresetTitle(route: RoutePreset) {
  return route.name?.trim() || `${route.departure}-${route.arrival}`;
}

function normalizeRoutePreset(route: Partial<RoutePreset>) {
  if (!route.departure || !route.arrival) return null;

  return makeRoutePreset(route.departure, route.arrival, {
    name: route.name,
    searchDate: route.searchDate,
    createdAt: route.createdAt,
    lastSearchedAt: route.lastSearchedAt
  });
}

function readRoutePresets(key: string) {
  if (typeof globalThis.localStorage === 'undefined') return [];

  try {
    const value = globalThis.localStorage.getItem(key);
    if (!value) return [];

    const parsed = JSON.parse(value) as RoutePreset[];
    return Array.isArray(parsed) ? parsed.map(normalizeRoutePreset).filter((route): route is RoutePreset => route !== null) : [];
  } catch {
    return [];
  }
}

function writeRoutePresets(key: string, routes: RoutePreset[]) {
  if (typeof globalThis.localStorage === 'undefined') return;

  try {
    globalThis.localStorage.setItem(key, JSON.stringify(routes));
  } catch {
    // Storage can be unavailable in restricted environments; the in-memory state still works.
  }
}

function readScheduleFilters(): ScheduleSavedFilters {
  const fallback = { date: todayText(), departure: '', arrival: '', vesselName: '' };
  if (typeof globalThis.localStorage === 'undefined') return fallback;

  try {
    const value = globalThis.localStorage.getItem(SCHEDULE_FILTERS_KEY);
    if (!value) return fallback;

    const parsed = JSON.parse(value) as Partial<ScheduleSavedFilters>;

    return {
      date: parsed.date || fallback.date,
      departure: parsed.departure || '',
      arrival: parsed.arrival || '',
      vesselName: parsed.vesselName || ''
    };
  } catch {
    return fallback;
  }
}

function writeScheduleFilters(filters: ScheduleSavedFilters) {
  if (typeof globalThis.localStorage === 'undefined') return;

  try {
    globalThis.localStorage.setItem(SCHEDULE_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // Persisting filters is a convenience; the screen state still works without storage.
  }
}

function portMatches(portName: string, selectedPortName: string) {
  const source = portName.trim();
  const target = selectedPortName.trim();

  return Boolean(source && target && (source.includes(target) || target.includes(source)));
}

function uniquePortOptions(portNames: string[]) {
  return Array.from(new Set(portNames.filter(Boolean).map((portName) => portName.trim()))).map((portName) => ({
    id: `possible-${portName}`,
    portName
  }));
}

function getPossibleArrivalPorts(routeOptions: RouteOption[], departurePortName: string) {
  return uniquePortOptions(
    routeOptions
      .filter((route) => portMatches(route.departurePortName, departurePortName))
      .flatMap((route) => [route.arrivalPortName, ...route.stopPortNames])
      .filter((portName) => !portMatches(portName, departurePortName))
      .sort((a, b) => a.localeCompare(b, 'ko'))
  );
}

function getPossibleDeparturePorts(routeOptions: RouteOption[], arrivalPortName: string) {
  return uniquePortOptions(
    routeOptions
      .filter((route) => [route.arrivalPortName, ...route.stopPortNames].some((portName) => portMatches(portName, arrivalPortName)))
      .map((route) => route.departurePortName)
      .filter((portName) => !portMatches(portName, arrivalPortName))
      .sort((a, b) => a.localeCompare(b, 'ko'))
  );
}

function compareScheduleCandidates(a: ScheduleCandidate, b: ScheduleCandidate) {
  const dateCompare = a.sailingDate.localeCompare(b.sailingDate);
  if (dateCompare !== 0) return dateCompare;

  const timeCompare = (a.departureTime || '99:99').localeCompare(b.departureTime || '99:99');
  if (timeCompare !== 0) return timeCompare;

  const statusCompare = statusSortOrder[a.status] - statusSortOrder[b.status];
  if (statusCompare !== 0) return statusCompare;

  return a.vesselName.localeCompare(b.vesselName, 'ko');
}

function compareCandidatesBySortMode(a: ScheduleCandidate, b: ScheduleCandidate, sortMode: CandidateSortMode) {
  if (sortMode === 'RISK') {
    const statusCompare = statusSortOrder[a.status] - statusSortOrder[b.status];
    if (statusCompare !== 0) return statusCompare;
  }

  if (sortMode === 'VESSEL') {
    const vesselCompare = a.vesselName.localeCompare(b.vesselName, 'ko');
    if (vesselCompare !== 0) return vesselCompare;
  }

  return compareScheduleCandidates(a, b);
}

function countCandidateStatuses(candidates: ScheduleCandidate[]) {
  return candidates.reduce(
    (counts, candidate) => ({
      ...counts,
      [candidate.status]: (counts[candidate.status] ?? 0) + 1
    }),
    {} as Partial<Record<ScheduleCandidate['status'], number>>
  );
}

function getCandidateAlertItems(counts: Partial<Record<ScheduleCandidate['status'], number>>) {
  return [
    { status: 'CONTROLLED' as const, label: '통제', count: counts.CONTROLLED ?? 0, tone: 'danger' as const },
    { status: 'CANCELED' as const, label: '결항', count: counts.CANCELED ?? 0, tone: 'danger' as const },
    { status: 'DELAYED' as const, label: '지연', count: counts.DELAYED ?? 0, tone: 'warning' as const }
  ].filter((item) => item.count > 0);
}

function compareSailingSchedules(a: SailingScheduleSummary, b: SailingScheduleSummary) {
  const dateCompare = a.sailingDate.localeCompare(b.sailingDate);
  if (dateCompare !== 0) return dateCompare;

  const timeCompare = (a.departureTime || '99:99').localeCompare(b.departureTime || '99:99');
  if (timeCompare !== 0) return timeCompare;

  const statusCompare = statusSortOrder[a.status] - statusSortOrder[b.status];
  if (statusCompare !== 0) return statusCompare;

  return (a.vesselName ?? '').localeCompare(b.vesselName ?? '', 'ko');
}

function countScheduleStatuses(schedules: SailingScheduleSummary[]) {
  return schedules.reduce(
    (counts, schedule) => ({
      ...counts,
      [schedule.status]: (counts[schedule.status] ?? 0) + 1
    }),
    {} as Partial<Record<SailingScheduleSummary['status'], number>>
  );
}

function getDepartureHour(departureTime: string | null | undefined) {
  if (!departureTime) return null;

  const hour = Number(departureTime.slice(0, 2));
  return Number.isFinite(hour) ? hour : null;
}

function matchesScheduleTimeFilter(schedule: SailingScheduleSummary, filter: ScheduleTimeFilter) {
  if (filter === 'ALL') return true;

  const hour = getDepartureHour(schedule.departureTime);
  if (hour === null) return false;

  if (filter === 'MORNING') return hour < 12;
  if (filter === 'AFTERNOON') return hour >= 12 && hour < 18;
  return hour >= 18;
}

function groupSchedulesByDate(schedules: SailingScheduleSummary[]) {
  return schedules.reduce<{ date: string; schedules: SailingScheduleSummary[] }[]>((groups, schedule) => {
    const existingGroup = groups.find((group) => group.date === schedule.sailingDate);

    if (existingGroup) {
      existingGroup.schedules.push(schedule);
      return groups;
    }

    return [...groups, { date: schedule.sailingDate, schedules: [schedule] }];
  }, []);
}

export default function ScheduleScreen() {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const candidateSectionY = useRef(0);
  const initialFilters = useRef(readScheduleFilters()).current;
  const [date, setDate] = useState(initialFilters.date);
  const [departure, setDeparture] = useState(initialFilters.departure);
  const [arrival, setArrival] = useState(initialFilters.arrival);
  const [vesselName, setVesselName] = useState(initialFilters.vesselName);
  const [submittedFilters, setSubmittedFilters] = useState({ date, departure, arrival, vesselName });
  const [hasSearched, setHasSearched] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<CandidateStatusFilter>('ALL');
  const [candidateSortMode, setCandidateSortMode] = useState<CandidateSortMode>('TIME');
  const [selectedCandidate, setSelectedCandidate] = useState<ScheduleCandidate | null>(null);
  const [autoSelectedCandidateId, setAutoSelectedCandidateId] = useState<string | null>(null);
  const [selectedWeeklySchedule, setSelectedWeeklySchedule] = useState<SailingScheduleSummary | null>(null);
  const [selectedVesselName, setSelectedVesselName] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [portSelectMode, setPortSelectMode] = useState<PortSelectMode | null>(null);
  const [portKeyword, setPortKeyword] = useState('');
  const [showOnlyPossiblePorts, setShowOnlyPossiblePorts] = useState(false);
  const [favoriteRoutes, setFavoriteRoutes] = useState<RoutePreset[]>(() => readRoutePresets(SCHEDULE_FAVORITES_KEY));
  const [recentRoutes, setRecentRoutes] = useState<RoutePreset[]>(() => readRoutePresets(SCHEDULE_RECENTS_KEY));
  const [editingFavoriteRoute, setEditingFavoriteRoute] = useState<RoutePreset | null>(null);
  const [favoriteRouteName, setFavoriteRouteName] = useState('');
  const [favoriteRouteSearchDate, setFavoriteRouteSearchDate] = useState(date);
  const [isQuickRoutesExpanded, setQuickRoutesExpanded] = useState(false);
  const [isWeeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [weeklyStartDate, setWeeklyStartDate] = useState(date);
  const [weeklyEndDate, setWeeklyEndDate] = useState(addDays(date, 6));
  const [weeklyPortBasis, setWeeklyPortBasis] = useState<SchedulePortBasis>('departure');
  const [weeklyDeparture, setWeeklyDeparture] = useState('');
  const [weeklyArrival, setWeeklyArrival] = useState('');
  const [weeklySubmittedFilters, setWeeklySubmittedFilters] = useState<{
    date: string;
    startDate: string;
    endDate: string;
    departure?: string;
    arrival?: string;
    vesselName?: string;
  } | null>(null);

  useEffect(() => {
    writeRoutePresets(SCHEDULE_FAVORITES_KEY, favoriteRoutes);
  }, [favoriteRoutes]);

  useEffect(() => {
    writeRoutePresets(SCHEDULE_RECENTS_KEY, recentRoutes);
  }, [recentRoutes]);

  useEffect(() => {
    writeScheduleFilters({ date, departure, arrival, vesselName });
  }, [arrival, date, departure, vesselName]);

  const departurePortsQuery = useQuery({
    queryKey: ['route-departures'],
    queryFn: fetchDeparturePorts,
    retry: false,
    staleTime: 24 * 60 * 60 * 1000
  });

  const arrivalPortsQuery = useQuery({
    queryKey: ['route-arrivals'],
    queryFn: fetchArrivalPorts,
    retry: false,
    staleTime: 24 * 60 * 60 * 1000
  });

  const routeOptionsQuery = useQuery({
    queryKey: ['route-options'],
    queryFn: fetchRouteOptions,
    retry: false,
    staleTime: 24 * 60 * 60 * 1000
  });

  const candidateQuery = useQuery({
    queryKey: ['schedule-candidates', submittedFilters, searchNonce],
    queryFn: () => fetchScheduleCandidates(submittedFilters),
    enabled: hasSearched,
    retry: false,
    staleTime: 5 * 60 * 1000
  });

  const scheduleFilters = useMemo(
    () => ({
      date: submittedFilters.date,
      departure: submittedFilters.departure,
      arrival: submittedFilters.arrival,
      vesselName: selectedCandidate?.vesselName ?? ''
    }),
    [selectedCandidate?.vesselName, submittedFilters]
  );

  const scheduleQuery = useQuery({
    queryKey: ['schedules', scheduleFilters],
    queryFn: () => fetchSchedules(scheduleFilters),
    enabled: Boolean(selectedCandidate?.vesselName),
    retry: false,
    staleTime: 10 * 60 * 1000
  });

  const weeklyScheduleQuery = useQuery({
    queryKey: ['weekly-schedules', weeklySubmittedFilters],
    queryFn: () => fetchWeeklySchedules(weeklySubmittedFilters ?? { date, startDate: date, endDate: addDays(date, 6) }),
    enabled: Boolean(weeklySubmittedFilters),
    retry: false,
    staleTime: 10 * 60 * 1000
  });

  const vesselDetailQuery = useQuery({
    queryKey: ['vessel-detail', selectedVesselName],
    queryFn: () => fetchVesselDetail(selectedVesselName ?? ''),
    enabled: Boolean(selectedVesselName),
    retry: false,
    staleTime: 24 * 60 * 60 * 1000
  });

  const sortedCandidates = useMemo(
    () => [...(candidateQuery.data ?? [])].sort(compareScheduleCandidates),
    [candidateQuery.data]
  );

  const candidateStatusCounts = useMemo(() => countCandidateStatuses(sortedCandidates), [sortedCandidates]);

  const filteredCandidates = useMemo(
    () =>
      candidateStatusFilter === 'ALL'
        ? sortedCandidates
        : sortedCandidates.filter((candidate) => candidate.status === candidateStatusFilter),
    [candidateStatusFilter, sortedCandidates]
  );
  const visibleCandidates = useMemo(
    () => [...filteredCandidates].sort((a, b) => compareCandidatesBySortMode(a, b, candidateSortMode)),
    [candidateSortMode, filteredCandidates]
  );
  const candidateAlertItems = useMemo(() => getCandidateAlertItems(candidateStatusCounts), [candidateStatusCounts]);
  const recommendedCandidate = useMemo(
    () => (sortedCandidates.length > 1 ? sortedCandidates.find((candidate) => candidate.status === 'NORMAL' || candidate.status === 'SCHEDULED') ?? null : null),
    [sortedCandidates]
  );
  const vesselPreviewNames = useMemo(
    () => Array.from(new Set(visibleCandidates.slice(0, 12).map((candidate) => candidate.vesselName).filter(Boolean))),
    [visibleCandidates]
  );
  const vesselPreviewQueries = useQueries({
    queries: vesselPreviewNames.map((name) => ({
      queryKey: ['vessel-preview', name],
      queryFn: () => fetchVesselDetail(name),
      enabled: hasSearched,
      retry: false,
      staleTime: 24 * 60 * 60 * 1000
    }))
  });
  const vesselPreviewMap = useMemo(
    () =>
      vesselPreviewNames.reduce<Record<string, VesselDetail | null | undefined>>((map, name, index) => {
        map[name] = vesselPreviewQueries[index]?.data;
        return map;
      }, {}),
    [vesselPreviewNames, vesselPreviewQueries]
  );

  useEffect(() => {
    if (!hasSearched || candidateQuery.isFetching || candidateQuery.isError || sortedCandidates.length !== 1) return;

    setSelectedCandidate((candidate) => (candidate?.id === sortedCandidates[0].id ? candidate : sortedCandidates[0]));
    setAutoSelectedCandidateId(sortedCandidates[0].id);
  }, [candidateQuery.isError, candidateQuery.isFetching, hasSearched, sortedCandidates]);

  const possiblePortBasis = useMemo(() => {
    if (portSelectMode === 'arrival') return departure;
    if (portSelectMode === 'departure') return arrival;
    if (portSelectMode === 'weeklyArrival') return weeklyDeparture;
    if (portSelectMode === 'weeklyDeparture') return weeklyArrival;
    return '';
  }, [arrival, departure, portSelectMode, weeklyArrival, weeklyDeparture]);

  const canShowOnlyPossiblePorts = Boolean(possiblePortBasis.trim());

  const selectablePorts = useMemo(() => {
    const isArrivalMode = portSelectMode === 'arrival' || portSelectMode === 'weeklyArrival';
    const source =
      showOnlyPossiblePorts && canShowOnlyPossiblePorts
        ? isArrivalMode
          ? getPossibleArrivalPorts(routeOptionsQuery.data ?? [], possiblePortBasis)
          : getPossibleDeparturePorts(routeOptionsQuery.data ?? [], possiblePortBasis)
        : isArrivalMode
          ? arrivalPortsQuery.data
          : departurePortsQuery.data;
    const keyword = portKeyword.trim();

    return (source ?? []).filter((port) => !keyword || port.portName.includes(keyword));
  }, [
    arrivalPortsQuery.data,
    canShowOnlyPossiblePorts,
    departurePortsQuery.data,
    portKeyword,
    portSelectMode,
    possiblePortBasis,
    routeOptionsQuery.data,
    showOnlyPossiblePorts
  ]);

  const currentRoute = makeRoutePreset(departure, arrival, { searchDate: date });
  const hasFavoriteRoute = currentRoute ? favoriteRoutes.some((route) => route.id === currentRoute.id) : false;
  const submittedRoute = makeRoutePreset(submittedFilters.departure, submittedFilters.arrival, { searchDate: submittedFilters.date });
  const hasSubmittedFavoriteRoute = submittedRoute ? favoriteRoutes.some((route) => route.id === submittedRoute.id) : false;
  const datePickerValue =
    datePickerTarget === 'weeklyStart'
      ? weeklyStartDate
      : datePickerTarget === 'weeklyEnd'
        ? weeklyEndDate
        : datePickerTarget === 'favoriteSearch'
          ? favoriteRouteSearchDate
          : date;

  const openPortModal = (mode: PortSelectMode) => {
    setPortKeyword('');
    setPortSelectMode(mode);
  };

  const selectPort = (port: PortOption) => {
    if (portSelectMode === 'departure') {
      setDeparture(port.portName);
    }

    if (portSelectMode === 'arrival') {
      setArrival(port.portName);
    }

    if (portSelectMode === 'weeklyDeparture') {
      setWeeklyDeparture(port.portName);
    }

    if (portSelectMode === 'weeklyArrival') {
      setWeeklyArrival(port.portName);
    }

    setPortSelectMode(null);
  };

  const runSearch = (overrides?: { date?: string; departure?: string; arrival?: string; vesselName?: string }) => {
    const nextDate = overrides?.date ?? date;
    const nextDeparture = overrides?.departure ?? departure;
    const nextArrival = overrides?.arrival ?? arrival;
    const nextVesselName = overrides?.vesselName ?? vesselName;
    const nextFilters = {
      date: nextDate.trim(),
      departure: nextDeparture.trim(),
      arrival: nextArrival.trim(),
      vesselName: nextVesselName.trim()
    };

    if (overrides?.date !== undefined) {
      setDate(overrides.date);
    }

    if (overrides?.departure !== undefined) {
      setDeparture(overrides.departure);
    }

    if (overrides?.arrival !== undefined) {
      setArrival(overrides.arrival);
    }

    if (overrides?.vesselName !== undefined) {
      setVesselName(overrides.vesselName);
    }

    setSelectedCandidate(null);
    setAutoSelectedCandidateId(null);
    setSubmittedFilters(nextFilters);
    setHasSearched(true);
    setSearchNonce((value) => value + 1);

    const searchedRoute = makeRoutePreset(nextFilters.departure, nextFilters.arrival, {
      searchDate: nextFilters.date,
      lastSearchedAt: new Date().toISOString()
    });

    if (searchedRoute) {
      setRecentRoutes((routes) => [searchedRoute, ...routes.filter((route) => route.id !== searchedRoute.id)].slice(0, 5));
    }
  };

  const scrollToCandidateSection = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(candidateSectionY.current - 12, 0),
        animated: true
      });
    }, 120);
  };

  const selectQuickRoute = (route: RoutePreset) => {
    setQuickRoutesExpanded(false);
    runSearch({ date: route.searchDate, departure: route.departure, arrival: route.arrival });
    scrollToCandidateSection();
  };

  const selectQuickDate = (nextDate: string) => {
    setDate(nextDate);
  };

  const resetSearchFilters = () => {
    const nextDate = todayText();

    setDate(nextDate);
    setDeparture('');
    setArrival('');
    setVesselName('');
    setSelectedCandidate(null);
    setAutoSelectedCandidateId(null);
    setSubmittedFilters({ date: nextDate, departure: '', arrival: '', vesselName: '' });
    setHasSearched(false);
    setCandidateStatusFilter('ALL');
    setCandidateSortMode('TIME');
  };

  const clearVesselName = () => {
    setVesselName('');
  };

  const swapRoute = () => {
    if (!departure && !arrival) return;

    setDeparture(arrival);
    setArrival(departure);
    setSelectedCandidate(null);
    setAutoSelectedCandidateId(null);
  };

  const searchWithoutArrival = () => {
    runSearch({ arrival: '' });
  };

  const searchNextDay = () => {
    runSearch({ date: addDays(submittedFilters.date, 1) });
  };

  const searchWithoutVesselName = () => {
    runSearch({ vesselName: '' });
  };

  const favoriteSubmittedRoute = () => {
    if (!submittedRoute) return;
    openFavoriteEditor(submittedRoute);
  };

  const searchReverseSubmittedRoute = () => {
    if (!submittedFilters.departure && !submittedFilters.arrival) return;

    runSearch({
      departure: submittedFilters.arrival,
      arrival: submittedFilters.departure
    });
    scrollToCandidateSection();
  };

  const openScheduleSearchFromResult = () => {
    setWeeklyStartDate(submittedFilters.date);
    setWeeklyEndDate(addDays(submittedFilters.date, 6));
    setWeeklyPortBasis(submittedFilters.departure ? 'departure' : 'arrival');
    setWeeklyDeparture(submittedFilters.departure);
    setWeeklyArrival(submittedFilters.arrival);
    setWeeklySubmittedFilters(null);
    setWeeklyModalOpen(true);
  };

  const openFavoriteEditor = (route: RoutePreset) => {
    setEditingFavoriteRoute(route);
    setFavoriteRouteName(routePresetTitle(route));
    setFavoriteRouteSearchDate(route.searchDate ?? date);
  };

  const saveFavoriteRoute = () => {
    if (!editingFavoriteRoute) return;

    const nextFavorite = makeRoutePreset(editingFavoriteRoute.departure, editingFavoriteRoute.arrival, {
      ...editingFavoriteRoute,
      name: favoriteRouteName.trim() || routePresetTitle(editingFavoriteRoute),
      searchDate: favoriteRouteSearchDate,
      createdAt: editingFavoriteRoute.createdAt ?? new Date().toISOString()
    });

    if (!nextFavorite) return;

    setFavoriteRoutes((routes) => [nextFavorite, ...routes.filter((route) => route.id !== nextFavorite.id)].slice(0, 8));
    setEditingFavoriteRoute(null);
  };

  const moveFavoriteRoute = (route: RoutePreset, direction: -1 | 1) => {
    setFavoriteRoutes((routes) => {
      const currentIndex = routes.findIndex((item) => item.id === route.id);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= routes.length) return routes;

      const nextRoutes = [...routes];
      [nextRoutes[currentIndex], nextRoutes[nextIndex]] = [nextRoutes[nextIndex], nextRoutes[currentIndex]];
      return nextRoutes;
    });
  };

  const toggleFavoriteRoute = () => {
    if (!currentRoute) return;

    if (hasFavoriteRoute) {
      setFavoriteRoutes((routes) => routes.filter((route) => route.id !== currentRoute.id));
      return;
    }

    openFavoriteEditor(currentRoute);
  };

  const openWeeklyModal = () => {
    setWeeklyStartDate(date);
    setWeeklyEndDate(addDays(date, 6));
    setWeeklyPortBasis(departure ? 'departure' : 'arrival');
    setWeeklyDeparture(departure);
    setWeeklyArrival(arrival);
    setWeeklySubmittedFilters(null);
    setWeeklyModalOpen(true);
  };

  const runWeeklySearch = () => {
    const isDepartureBasis = weeklyPortBasis === 'departure';

    setWeeklySubmittedFilters({
      date: weeklyStartDate,
      startDate: weeklyStartDate,
      endDate: weeklyEndDate,
      departure: isDepartureBasis ? weeklyDeparture.trim() || undefined : undefined,
      arrival: isDepartureBasis ? undefined : weeklyArrival.trim() || undefined,
      vesselName: vesselName.trim() || undefined
    });
  };

  const selectDate = (value: string) => {
    if (datePickerTarget === 'favoriteSearch') {
      setFavoriteRouteSearchDate(value);
    } else if (datePickerTarget === 'weeklyStart') {
      setWeeklyStartDate(value);
      if (weeklyEndDate < value) {
        setWeeklyEndDate(value);
      }
    } else if (datePickerTarget === 'weeklyEnd') {
      setWeeklyEndDate(value);
    } else {
      setDate(value);
    }

    setDatePickerTarget(null);
  };

  return (
    <Screen
      title="시간표"
      subtitle="날짜와 출발·도착지를 선택해 실제 운항 후보와 상세 시간을 확인합니다."
      mascotSource={require('../../assets/mascot/boogi_bg2.png')}
      scrollRef={scrollViewRef}
    >
      <MascotBanner
        eyebrow="시간표 검색"
        title="부기가 오늘 탈 배를 함께 찾아드릴게요"
        description="출발지와 도착지를 선택하면 운항 후보를 검색하고, 즐겨찾기와 최근 조회로 빠르게 다시 찾을 수 있습니다."
        imageSource={require('../../assets/mascot/boogi-schedule.png')}
        tone="blue"
      />

      <View style={styles.scheduleSubMenu}>
        <View style={styles.scheduleSubMenuCopy}>
          <Text style={styles.scheduleSubMenuEyebrow}>시간표 하위 메뉴</Text>
          <Text style={styles.scheduleSubMenuTitle}>항로·실시간 교통정보</Text>
          <Text style={styles.scheduleSubMenuDescription}>현재 운항 중인 배의 교통정보와 해역 혼잡도를 시간표 흐름 안에서 확인합니다.</Text>
        </View>
        <Link href="/routes" asChild>
          <Pressable accessibilityRole="button" style={styles.scheduleSubMenuButton}>
            <Waves color={colors.surface} size={17} />
            <Text style={styles.scheduleSubMenuButtonText}>항로 보기</Text>
          </Pressable>
        </Link>
      </View>

      <QuickRoutesPanel
        favoriteRoutes={favoriteRoutes}
        recentRoutes={recentRoutes}
        expanded={isQuickRoutesExpanded}
        onToggle={() => setQuickRoutesExpanded((value) => !value)}
        onSelect={selectQuickRoute}
        onAddFavorite={openFavoriteEditor}
        onEditFavorite={openFavoriteEditor}
        onMoveFavorite={moveFavoriteRoute}
        onRemoveFavorite={(route) => setFavoriteRoutes((routes) => routes.filter((item) => item.id !== route.id))}
      />

      <View style={styles.searchPanel}>
        <View style={styles.inputGrid}>
          <Field icon={CalendarDays} label="날짜">
            <PickerButton value={date} placeholder="날짜 선택" onPress={() => setDatePickerTarget('main')} />
          </Field>
          <View style={styles.quickDateRow}>
            {quickDateOffsets.map((option) => {
              const quickDate = option.offset === null ? nextWeekendText() : addDays(todayText(), option.offset);
              const isSelected = date === quickDate;

              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  onPress={() => selectQuickDate(quickDate)}
                  style={[styles.quickDateChip, isSelected ? styles.quickDateChipSelected : null]}
                >
                  <Text style={[styles.quickDateChipText, isSelected ? styles.quickDateChipTextSelected : null]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field icon={MapPin} label="출발">
            <PickerButton value={departure} placeholder="출발지 선택" onPress={() => openPortModal('departure')} />
          </Field>
          <Field icon={Waves} label="도착">
            <PickerButton value={arrival} placeholder="도착지 선택" onPress={() => openPortModal('arrival')} />
          </Field>
          <Field icon={Ship} label="선박">
            <TextInput value={vesselName} onChangeText={setVesselName} placeholder="선박명 직접 입력" style={styles.input} />
          </Field>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={candidateQuery.isFetching}
          onPress={() => runSearch()}
          style={({ pressed }) => [
            styles.searchButton,
            pressed ? styles.searchButtonPressed : null,
            candidateQuery.isFetching ? styles.searchButtonDisabled : null
          ]}
        >
          {candidateQuery.isFetching ? <ActivityIndicator color={colors.surface} /> : <Search color={colors.surface} size={19} />}
          <Text style={styles.searchButtonText}>검색</Text>
        </Pressable>
        <View style={styles.quickActionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={!departure && !arrival}
            onPress={swapRoute}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.secondaryButtonPressed : null,
              !departure && !arrival ? styles.secondaryButtonDisabled : null
            ]}
          >
            <Repeat2 color={departure || arrival ? colors.primary : colors.muted} size={17} />
            <Text style={styles.secondaryButtonText}>왕복 전환</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!currentRoute}
            onPress={toggleFavoriteRoute}
            style={({ pressed }) => [
              styles.secondaryButton,
              hasFavoriteRoute ? styles.secondaryButtonActive : null,
              pressed ? styles.secondaryButtonPressed : null,
              !currentRoute ? styles.secondaryButtonDisabled : null
            ]}
          >
            <Star color={hasFavoriteRoute ? colors.surface : colors.primary} size={17} />
            <Text style={[styles.secondaryButtonText, hasFavoriteRoute ? styles.secondaryButtonTextActive : null]}>
              {hasFavoriteRoute ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={openWeeklyModal} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.secondaryButtonPressed : null]}>
            <CalendarRange color={colors.primary} size={17} />
            <Text style={styles.secondaryButtonText}>일정 검색</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={resetSearchFilters} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.secondaryButtonPressed : null]}>
            <X color={colors.primary} size={17} />
            <Text style={styles.secondaryButtonText}>전체 초기화</Text>
          </Pressable>
        </View>
      </View>

      <View onLayout={(event) => { candidateSectionY.current = event.nativeEvent.layout.y; }}>
        <InfoCard title="운항 후보" eyebrow={`${submittedFilters.date} 기준`}>
          {!hasSearched ? <Message text="날짜와 출발·도착지를 선택해 주세요. 출발지만 선택해도 후보를 찾고, 도착지를 추가하면 더 정확해집니다." /> : null}
          {candidateQuery.isFetching ? <Message text="운항 후보를 불러오는 중입니다." /> : null}
          {candidateQuery.isError ? <RetryNotice text="운항 후보를 불러오지 못했습니다. 네트워크 또는 API 서버 상태를 확인한 뒤 다시 시도해 주세요." onRetry={() => candidateQuery.refetch()} /> : null}
          {hasSearched && candidateQuery.dataUpdatedAt ? <DataTimestamp value={candidateQuery.dataUpdatedAt} /> : null}
          {autoSelectedCandidateId ? (
            <View style={styles.candidateHintPanel}>
              <Text style={styles.candidateHintTitle}>후보가 1건이라 상세 운항을 자동으로 열었습니다.</Text>
              <Text style={styles.candidateHintText}>아래 상세 운항에서 시간표를 바로 확인해 주세요.</Text>
            </View>
          ) : null}
          {!autoSelectedCandidateId && recommendedCandidate ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSelectedCandidate(recommendedCandidate);
                setAutoSelectedCandidateId(null);
              }}
              style={styles.candidateHintPanel}
            >
              <Text style={styles.candidateHintTitle}>추천 후보</Text>
              <Text style={styles.candidateHintText}>
                {recommendedCandidate.departureTime || '--:--'} · {recommendedCandidate.vesselName} · {statusLabel[recommendedCandidate.status]}
              </Text>
            </Pressable>
          ) : null}
          {hasSearched && !candidateQuery.isFetching && !candidateQuery.isError ? (
            <View style={styles.candidateQualityPanel}>
              {candidateAlertItems.length > 0 ? (
                <View style={styles.candidateAlertPanel}>
                  <Text style={styles.candidateAlertTitle}>주의가 필요한 운항이 있습니다</Text>
                  <View style={styles.candidateAlertChips}>
                    {candidateAlertItems.map((item) => (
                      <Pressable
                        key={item.status}
                        accessibilityRole="button"
                        onPress={() => setCandidateStatusFilter(item.status)}
                        style={[styles.candidateAlertChip, item.tone === 'danger' ? styles.candidateAlertChipDanger : styles.candidateAlertChipWarning]}
                      >
                        <Text style={[styles.candidateAlertChipText, item.tone === 'danger' ? styles.candidateAlertChipTextDanger : styles.candidateAlertChipTextWarning]}>
                          {item.label} {item.count.toLocaleString()}건
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryMain}>총 {sortedCandidates.length.toLocaleString()}건</Text>
                <Text style={styles.resultSummaryText}>
                  정상 {(candidateStatusCounts.NORMAL ?? 0).toLocaleString()} · 지연 {(candidateStatusCounts.DELAYED ?? 0).toLocaleString()} · 결항 {(candidateStatusCounts.CANCELED ?? 0).toLocaleString()} · 통제 {(candidateStatusCounts.CONTROLLED ?? 0).toLocaleString()}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipList}>
                {candidateStatusFilters.map((filter) => {
                  const count = filter.value === 'ALL' ? sortedCandidates.length : candidateStatusCounts[filter.value] ?? 0;
                  const isSelected = candidateStatusFilter === filter.value;

                  return (
                    <Pressable
                      key={filter.value}
                      accessibilityRole="button"
                      onPress={() => setCandidateStatusFilter(filter.value)}
                      style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
                    >
                      <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                        {filter.label} {count.toLocaleString()}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.candidateSortPanel}>
                <Text style={styles.candidateSortLabel}>정렬</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipList}>
                  {candidateSortOptions.map((option) => {
                    const isSelected = candidateSortMode === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        onPress={() => setCandidateSortMode(option.value)}
                        style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
                      >
                        <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          ) : null}
          {sortedCandidates.length === 0 && hasSearched && !candidateQuery.isFetching ? (
            <EmptyCandidateActions
              hasArrival={Boolean(submittedFilters.arrival)}
              hasVesselName={Boolean(submittedFilters.vesselName)}
              hasRecentRoute={recentRoutes.length > 0}
              onSearchWithoutArrival={searchWithoutArrival}
              onSearchNextDay={searchNextDay}
              onSearchWithoutVesselName={searchWithoutVesselName}
              onSelectRecentRoute={() => selectQuickRoute(recentRoutes[0])}
            />
          ) : null}
          {sortedCandidates.length > 0 && filteredCandidates.length === 0 ? <Message text="선택한 상태에 해당하는 운항 후보가 없습니다. 상태 필터를 전체로 바꿔 확인해 보세요." /> : null}
          {visibleCandidates.map((candidate) => (
            <Pressable
              key={candidate.id}
              accessibilityRole="button"
              onPress={() => {
                setSelectedCandidate(candidate);
                setAutoSelectedCandidateId(null);
              }}
              style={[styles.candidateRow, selectedCandidate?.id === candidate.id ? styles.candidateRowSelected : null]}
            >
              <View style={styles.candidateMain}>
                <View style={styles.candidateTopLine}>
                  <Text style={styles.time}>{candidate.departureTime || '--:--'}</Text>
                  <StatusPill label={statusLabel[candidate.status]} tone={statusTone[candidate.status]} />
                </View>
                <Text style={styles.route}>{candidate.routeName ?? candidate.licenseRouteName ?? '항로 정보 확인 중'}</Text>
                <View style={styles.candidateVesselLine}>
                  <VesselNameButton vesselName={candidate.vesselName} onPress={setSelectedVesselName} />
                </View>
                <VesselPreview detail={vesselPreviewMap[candidate.vesselName]} />
              </View>
            </Pressable>
          ))}
          {sortedCandidates.length > 0 && hasSearched && !candidateQuery.isFetching ? (
            <CandidateResultActions
              canFavorite={Boolean(submittedRoute)}
              isFavorite={hasSubmittedFavoriteRoute}
              canReverse={Boolean(submittedFilters.departure || submittedFilters.arrival)}
              onFavorite={favoriteSubmittedRoute}
              onReverse={searchReverseSubmittedRoute}
              onOpenScheduleSearch={openScheduleSearchFromResult}
            />
          ) : null}
        </InfoCard>
      </View>

      <InfoCard title="운항 일정 검색" eyebrow="서브 조회">
        <View style={styles.weeklySummaryRow}>
          <CalendarRange color={colors.primary} size={22} />
          <Text style={styles.weeklySummaryText}>기간과 항구 기준을 선택해 출발 또는 도착 일정을 따로 확인합니다.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={openWeeklyModal} style={({ pressed }) => [styles.outlineButton, pressed ? styles.secondaryButtonPressed : null]}>
          <Text style={styles.outlineButtonText}>일정 조회하기</Text>
          <ChevronRight color={colors.primary} size={18} />
        </Pressable>
      </InfoCard>

      <InfoCard title="상세 운항">
        {!selectedCandidate ? <Message text="운항 후보를 선택하면 상세 시간표를 확인할 수 있습니다." /> : null}
        {scheduleQuery.isFetching ? <Message text="상세 시간표를 불러오는 중입니다." /> : null}
        {scheduleQuery.isError ? <RetryNotice text="상세 시간표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." onRetry={() => scheduleQuery.refetch()} /> : null}
        {selectedCandidate && scheduleQuery.dataUpdatedAt ? <DataTimestamp value={scheduleQuery.dataUpdatedAt} /> : null}
        {scheduleQuery.data?.length === 0 ? <Message text="선택한 후보의 상세 시간표가 없습니다. 다른 운항 후보를 선택하거나 검색 조건을 넓혀 보세요." /> : null}
        {(scheduleQuery.data ?? []).map((item) => (
          <View key={item.id} style={styles.scheduleItem}>
            <View style={styles.timeBadge}>
              <Clock3 color={colors.primary} size={17} />
              <Text style={styles.timeBadgeText}>{item.departureTime || '--:--'}</Text>
            </View>
            <View style={styles.scheduleBody}>
              <VesselNameButton vesselName={item.vesselName ?? selectedCandidate?.vesselName} onPress={setSelectedVesselName} />
              <Text style={styles.route}>
                {item.departurePortName} → {item.arrivalPortName}
              </Text>
              {item.controlReason ? <Text style={styles.reason}>{item.controlReason}</Text> : null}
            </View>
            <StatusPill label={statusLabel[item.status]} tone={statusTone[item.status]} />
          </View>
        ))}
      </InfoCard>

      <WeeklyScheduleModal
        visible={isWeeklyModalOpen}
        startDate={weeklyStartDate}
        endDate={weeklyEndDate}
        portBasis={weeklyPortBasis}
        departure={weeklyDeparture}
        arrival={weeklyArrival}
        schedules={weeklyScheduleQuery.data ?? []}
        hasSearched={Boolean(weeklySubmittedFilters)}
        isLoading={weeklyScheduleQuery.isFetching}
        isError={weeklyScheduleQuery.isError}
        updatedAt={weeklyScheduleQuery.dataUpdatedAt}
        onClose={() => setWeeklyModalOpen(false)}
        onChangePortBasis={setWeeklyPortBasis}
        onOpenDatePicker={setDatePickerTarget}
        onOpenPortPicker={openPortModal}
        onRunSearch={runWeeklySearch}
        onRetry={() => weeklyScheduleQuery.refetch()}
        onSelectSchedule={setSelectedWeeklySchedule}
        onSelectVessel={setSelectedVesselName}
      />
      <ScheduleRouteModal schedule={selectedWeeklySchedule} onClose={() => setSelectedWeeklySchedule(null)} />
      <VesselDetailModal
        vesselName={selectedVesselName}
        detail={vesselDetailQuery.data}
        isLoading={vesselDetailQuery.isFetching}
        isError={vesselDetailQuery.isError}
        onClose={() => setSelectedVesselName(null)}
      />
      <FavoriteRouteModal
        route={editingFavoriteRoute}
        name={favoriteRouteName}
        searchDate={favoriteRouteSearchDate}
        onNameChange={setFavoriteRouteName}
        onOpenDatePicker={() => setDatePickerTarget('favoriteSearch')}
        onSave={saveFavoriteRoute}
        onClose={() => setEditingFavoriteRoute(null)}
      />
      <PortSelectModal
        mode={portSelectMode}
        ports={selectablePorts}
        isLoading={
          showOnlyPossiblePorts && canShowOnlyPossiblePorts
            ? routeOptionsQuery.isFetching
            : portSelectMode === 'arrival' || portSelectMode === 'weeklyArrival'
              ? arrivalPortsQuery.isFetching
              : departurePortsQuery.isFetching
        }
        isError={
          showOnlyPossiblePorts && canShowOnlyPossiblePorts
            ? routeOptionsQuery.isError
            : portSelectMode === 'arrival' || portSelectMode === 'weeklyArrival'
              ? arrivalPortsQuery.isError
              : departurePortsQuery.isError
        }
        keyword={portKeyword}
        onlyPossible={showOnlyPossiblePorts}
        canUseOnlyPossible={canShowOnlyPossiblePorts}
        possibleBasis={possiblePortBasis}
        onKeywordChange={setPortKeyword}
        onToggleOnlyPossible={() => setShowOnlyPossiblePorts((value) => !value)}
        onClose={() => setPortSelectMode(null)}
        onSelect={selectPort}
      />
      <DatePickerModal key={datePickerTarget ?? 'closed'} value={datePickerValue} visible={datePickerTarget !== null} onClose={() => setDatePickerTarget(null)} onSelect={selectDate} />
    </Screen>
  );
}

function Field({
  icon: Icon,
  label,
  children
}: {
  icon: ComponentType<{ color: string; size: number }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Icon color={colors.primary} size={16} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function PickerButton({ value, placeholder, onPress }: { value: string; placeholder: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.pickerButton}>
      <Text style={[styles.pickerButtonText, value ? null : styles.placeholder]}>{value || placeholder}</Text>
      <ChevronRight color={colors.primary} size={18} />
    </Pressable>
  );
}

function FavoriteRouteModal({
  route,
  name,
  searchDate,
  onNameChange,
  onOpenDatePicker,
  onSave,
  onClose
}: {
  route: RoutePreset | null;
  name: string;
  searchDate: string;
  onNameChange: (value: string) => void;
  onOpenDatePicker: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={route !== null} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <ModalHeader title="즐겨찾기 설정" onClose={onClose} />
          {route ? (
            <View style={styles.favoriteEditorStack}>
              <View style={styles.favoriteRoutePreview}>
                <Star color={colors.primary} size={18} />
                <View style={styles.routeChipTextBlock}>
                  <Text style={styles.favoriteRouteTitle}>
                    {route.departure} → {route.arrival}
                  </Text>
                  <Text style={styles.routeChipMeta}>빠른 조회에서 이 이름과 날짜로 검색합니다.</Text>
                </View>
              </View>
              <Field icon={Bookmark} label="즐겨찾기 이름">
                <TextInput value={name} onChangeText={onNameChange} placeholder="예: 인천-백령 출근 항로" style={styles.input} />
              </Field>
              <Field icon={CalendarDays} label="기본 검색일">
                <PickerButton value={searchDate} placeholder="기본 검색일 선택" onPress={onOpenDatePicker} />
              </Field>
              <Pressable accessibilityRole="button" onPress={onSave} style={({ pressed }) => [styles.searchButton, pressed ? styles.searchButtonPressed : null]}>
                <Check color={colors.surface} size={18} />
                <Text style={styles.searchButtonText}>저장</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function QuickRoutesPanel({
  favoriteRoutes,
  recentRoutes,
  expanded,
  onToggle,
  onSelect,
  onAddFavorite,
  onEditFavorite,
  onMoveFavorite,
  onRemoveFavorite
}: {
  favoriteRoutes: RoutePreset[];
  recentRoutes: RoutePreset[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: (route: RoutePreset) => void;
  onAddFavorite: (route: RoutePreset) => void;
  onEditFavorite: (route: RoutePreset) => void;
  onMoveFavorite: (route: RoutePreset, direction: -1 | 1) => void;
  onRemoveFavorite: (route: RoutePreset) => void;
}) {
  const routeCount = new Set([...favoriteRoutes, ...recentRoutes].map((route) => route.id)).size;

  return (
    <View style={styles.quickPanel}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={({ pressed }) => [styles.quickPanelHeader, pressed ? styles.secondaryButtonPressed : null]}>
        <View style={styles.quickPanelTitleRow}>
          <Bookmark color={colors.primary} size={18} />
          <Text style={styles.quickPanelTitle}>빠른 조회</Text>
          <Text style={styles.quickPanelCount}>{routeCount}개</Text>
        </View>
        <View style={styles.quickPanelToggle}>
          <Text style={styles.quickPanelToggleText}>{expanded ? '접기' : '펼치기'}</Text>
          <ChevronRight color={colors.primary} size={19} style={expanded ? styles.chevronExpanded : null} />
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.quickPanelBody}>
          <QuickRouteGroup
            title="즐겨찾기"
            icon={Star}
            emptyText="자주 이용하는 출발·도착지를 즐겨찾기로 추가해 보세요."
            routes={favoriteRoutes}
            onSelect={onSelect}
            onEdit={onEditFavorite}
            onMove={onMoveFavorite}
            onRemove={onRemoveFavorite}
          />
          <QuickRouteGroup
            title="최근 조회"
            icon={History}
            emptyText="검색하면 최근 조회 항로가 여기에 쌓입니다."
            routes={recentRoutes}
            initialVisibleCount={3}
            onSelect={onSelect}
            onFavorite={onAddFavorite}
            isFavorite={(route) => favoriteRoutes.some((favoriteRoute) => favoriteRoute.id === route.id)}
          />
        </View>
      ) : (
        <Text style={styles.quickPanelHint}>즐겨찾기와 최근 조회 항로를 펼쳐서 바로 검색합니다.</Text>
      )}
    </View>
  );
}

function QuickRouteGroup({
  title,
  icon: Icon,
  emptyText,
  routes,
  initialVisibleCount,
  onSelect,
  onEdit,
  onMove,
  onRemove,
  onFavorite,
  isFavorite
}: {
  title: string;
  icon: ComponentType<{ color: string; size: number }>;
  emptyText: string;
  routes: RoutePreset[];
  initialVisibleCount?: number;
  onSelect: (route: RoutePreset) => void;
  onEdit?: (route: RoutePreset) => void;
  onMove?: (route: RoutePreset, direction: -1 | 1) => void;
  onRemove?: (route: RoutePreset) => void;
  onFavorite?: (route: RoutePreset) => void;
  isFavorite?: (route: RoutePreset) => boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const canToggleMore = Boolean(initialVisibleCount && routes.length > initialVisibleCount);
  const visibleRoutes = canToggleMore && !showAll ? routes.slice(0, initialVisibleCount) : routes;

  return (
    <View style={styles.quickGroup}>
      <View style={styles.quickSectionHeader}>
        <Icon color={colors.primary} size={17} />
        <Text style={styles.quickGroupTitle}>{title}</Text>
        <Text style={styles.quickSectionText}>{routes.length > 0 ? '누르면 바로 조회' : emptyText}</Text>
      </View>
      {routes.length > 0 ? (
        <View style={styles.quickRouteList}>
          {visibleRoutes.map((route) => {
            const routeIndex = routes.findIndex((item) => item.id === route.id);
            const isSavedFavorite = isFavorite?.(route);
            const metaText = route.lastSearchedAt ? formatRecentDateTime(route.lastSearchedAt) : `기본일 ${route.searchDate ?? '오늘'}`;

            return (
              <Pressable key={route.id} accessibilityRole="button" onPress={() => onSelect(route)} style={[styles.routeRow, onFavorite ? styles.recentRouteRow : null]}>
                <View style={styles.routeRowBody}>
                  {onRemove ? (
                    <View style={styles.favoriteRouteNameRow}>
                      {onEdit ? (
                        <>
                          <Text style={styles.routeChipTitle} numberOfLines={1}>
                            {routePresetTitle(route)}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${routePresetTitle(route)} 즐겨찾기 이름 변경`}
                            onPress={(event) => {
                              event.stopPropagation();
                              onEdit(route);
                            }}
                            style={styles.favoriteInlineAction}
                          >
                            <Pencil color={colors.primary} size={14} />
                          </Pressable>
                        </>
                      ) : (
                        <Text style={styles.routeChipTitle} numberOfLines={1}>
                          {routePresetTitle(route)}
                        </Text>
                      )}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${route.departure}에서 ${route.arrival} 즐겨찾기 삭제`}
                        onPress={(event) => {
                          event.stopPropagation();
                          onRemove(route);
                        }}
                        style={styles.favoriteInlineAction}
                      >
                        <Trash2 color={colors.muted} size={14} />
                      </Pressable>
                    </View>
                  ) : null}
                  <Text style={onFavorite ? styles.recentRouteLine : styles.routeChipSubtitle} numberOfLines={1}>
                    {route.departure} → {route.arrival}
                    {onFavorite || onRemove ? ` · ${metaText}` : ''}
                  </Text>
                  {onFavorite || onRemove ? null : <Text style={styles.routeChipMeta}>{metaText}</Text>}
                </View>
                <View style={styles.routeRowActions}>
                  {onMove ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${routePresetTitle(route)} 위로 이동`}
                        disabled={routeIndex === 0}
                        onPress={(event) => {
                          event.stopPropagation();
                          onMove(route, -1);
                        }}
                        style={[styles.routeChipActionSmall, routeIndex === 0 ? styles.routeChipActionDisabled : null]}
                      >
                        <ChevronUp color={routeIndex === 0 ? colors.muted : colors.primary} size={15} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${routePresetTitle(route)} 아래로 이동`}
                        disabled={routeIndex === routes.length - 1}
                        onPress={(event) => {
                          event.stopPropagation();
                          onMove(route, 1);
                        }}
                        style={[styles.routeChipActionSmall, routeIndex === routes.length - 1 ? styles.routeChipActionDisabled : null]}
                      >
                        <ChevronDown color={routeIndex === routes.length - 1 ? colors.muted : colors.primary} size={15} />
                      </Pressable>
                    </>
                  ) : null}
                  {onFavorite ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isSavedFavorite
                          ? `${route.departure}에서 ${route.arrival} 이미 즐겨찾기`
                          : `${route.departure}에서 ${route.arrival} 즐겨찾기 추가`
                      }
                      disabled={isSavedFavorite}
                      onPress={(event) => {
                        event.stopPropagation();
                        onFavorite(route);
                      }}
                      style={[styles.routeChipAction, isSavedFavorite ? styles.routeChipActionActive : null]}
                    >
                      {isSavedFavorite ? <Check color={colors.primary} size={15} /> : <Star color={colors.primary} size={15} />}
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          {canToggleMore ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAll((value) => !value)} style={styles.quickMoreButton}>
              <Text style={styles.quickMoreButtonText}>{showAll ? '최근조회 접기' : `최근조회 더보기 ${routes.length - visibleRoutes.length}개`}</Text>
              {showAll ? <ChevronUp color={colors.primary} size={16} /> : <ChevronDown color={colors.primary} size={16} />}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function EmptyCandidateActions({
  hasArrival,
  hasVesselName,
  hasRecentRoute,
  onSearchWithoutArrival,
  onSearchNextDay,
  onSearchWithoutVesselName,
  onSelectRecentRoute
}: {
  hasArrival: boolean;
  hasVesselName: boolean;
  hasRecentRoute: boolean;
  onSearchWithoutArrival: () => void;
  onSearchNextDay: () => void;
  onSearchWithoutVesselName: () => void;
  onSelectRecentRoute: () => void;
}) {
  return (
    <View style={styles.emptyActionPanel}>
      <Text style={styles.emptyActionTitle}>조건에 맞는 운항 후보가 없습니다.</Text>
      <Text style={styles.emptyActionText}>검색 조건을 조금 넓혀 다시 확인해 보세요.</Text>
      <View style={styles.emptyActionGrid}>
        {hasArrival ? (
          <Pressable accessibilityRole="button" onPress={onSearchWithoutArrival} style={styles.emptyActionButton}>
            <Text style={styles.emptyActionButtonText}>도착지 비우기</Text>
          </Pressable>
        ) : null}
        {hasVesselName ? (
          <Pressable accessibilityRole="button" onPress={onSearchWithoutVesselName} style={styles.emptyActionButton}>
            <Text style={styles.emptyActionButtonText}>선박명 지우기</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onSearchNextDay} style={styles.emptyActionButton}>
          <Text style={styles.emptyActionButtonText}>다음날 검색</Text>
        </Pressable>
        {hasRecentRoute ? (
          <Pressable accessibilityRole="button" onPress={onSelectRecentRoute} style={styles.emptyActionButton}>
            <Text style={styles.emptyActionButtonText}>최근 항로 보기</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CandidateResultActions({
  canFavorite,
  isFavorite,
  canReverse,
  onFavorite,
  onReverse,
  onOpenScheduleSearch
}: {
  canFavorite: boolean;
  isFavorite: boolean;
  canReverse: boolean;
  onFavorite: () => void;
  onReverse: () => void;
  onOpenScheduleSearch: () => void;
}) {
  return (
    <View style={styles.resultActionPanel}>
      <Text style={styles.resultActionTitle}>다음 작업</Text>
      <View style={styles.resultActionGrid}>
        <Pressable
          accessibilityRole="button"
          disabled={!canFavorite || isFavorite}
          onPress={onFavorite}
          style={[styles.resultActionButton, !canFavorite || isFavorite ? styles.resultActionButtonDisabled : null]}
        >
          <Star color={isFavorite ? colors.muted : colors.primary} size={16} />
          <Text style={[styles.resultActionButtonText, isFavorite ? styles.resultActionButtonTextDisabled : null]}>
            {isFavorite ? '즐겨찾기 완료' : '이 항로 즐겨찾기'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canReverse}
          onPress={onReverse}
          style={[styles.resultActionButton, !canReverse ? styles.resultActionButtonDisabled : null]}
        >
          <Repeat2 color={canReverse ? colors.primary : colors.muted} size={16} />
          <Text style={[styles.resultActionButtonText, !canReverse ? styles.resultActionButtonTextDisabled : null]}>왕복 보기</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpenScheduleSearch} style={styles.resultActionButton}>
          <CalendarRange color={colors.primary} size={16} />
          <Text style={styles.resultActionButtonText}>일정 검색으로 보기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function VesselNameButton({
  vesselName,
  onPress
}: {
  vesselName: string | null | undefined;
  onPress: (vesselName: string) => void;
}) {
  const label = vesselName || '선박명 확인 필요';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!vesselName}
      onPress={() => vesselName && onPress(vesselName)}
      style={({ pressed }) => [styles.vesselButton, pressed ? styles.vesselButtonPressed : null]}
    >
      <Text style={styles.vessel}>{label}</Text>
    </Pressable>
  );
}

function VesselPreview({ detail }: { detail: VesselDetail | null | undefined }) {
  if (!detail) return null;

  const previewItems = [
    detail.operatorName,
    detail.passengerCapacity ? `정원 ${detail.passengerCapacity}` : null,
    detail.routeName
  ].filter(Boolean);

  return (
    <View style={styles.vesselPreview}>
      {detail.imageDataUrl || detail.imageUrl ? (
        <Image source={{ uri: detail.imageDataUrl ?? detail.imageUrl ?? '' }} style={styles.vesselPreviewImage} resizeMode="cover" />
      ) : (
        <View style={styles.vesselPreviewIcon}>
          <Ship color={colors.primary} size={14} />
        </View>
      )}
      <Text style={styles.vesselPreviewText} numberOfLines={1}>
        {previewItems.join(' · ') || '여객선 상세정보 있음'}
      </Text>
    </View>
  );
}

function DatePickerModal({
  value,
  visible,
  onClose,
  onSelect
}: {
  value: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(value));
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days = [...Array(firstDay).fill(null), ...Array.from({ length: lastDate }, (_, index) => index + 1)];

  const moveMonth = (amount: number) => {
    setVisibleMonth(new Date(year, month + amount, 1));
  };

  const chooseDate = (day: number) => {
    onSelect(formatDate(new Date(year, month, day)));
    onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <ModalHeader title="날짜 선택" onClose={onClose} />
          <View style={styles.monthHeader}>
            <Pressable accessibilityRole="button" onPress={() => moveMonth(-1)} style={styles.iconButton}>
              <ChevronLeft color={colors.primary} size={21} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {year}.{`${month + 1}`.padStart(2, '0')}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => moveMonth(1)} style={styles.iconButton}>
              <ChevronRight color={colors.primary} size={21} />
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {days.map((day, index) =>
              day ? (
                <Pressable
                  key={`${year}-${month}-${day}`}
                  accessibilityRole="button"
                  onPress={() => chooseDate(day)}
                  style={[styles.dayCell, formatDate(new Date(year, month, day)) === value ? styles.dayCellSelected : null]}
                >
                  <Text style={[styles.dayText, formatDate(new Date(year, month, day)) === value ? styles.dayTextSelected : null]}>
                    {day}
                  </Text>
                </Pressable>
              ) : (
                <View key={`empty-${index}`} style={styles.dayCell} />
              )
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PortSelectModal({
  mode,
  ports,
  isLoading,
  isError,
  keyword,
  onlyPossible,
  canUseOnlyPossible,
  possibleBasis,
  onKeywordChange,
  onToggleOnlyPossible,
  onClose,
  onSelect
}: {
  mode: PortSelectMode | null;
  ports: PortOption[];
  isLoading: boolean;
  isError: boolean;
  keyword: string;
  onlyPossible: boolean;
  canUseOnlyPossible: boolean;
  possibleBasis: string;
  onKeywordChange: (value: string) => void;
  onToggleOnlyPossible: () => void;
  onClose: () => void;
  onSelect: (port: PortOption) => void;
}) {
  const isDepartureMode = mode === 'departure' || mode === 'weeklyDeparture';
  const title = isDepartureMode ? '출발지 선택' : '도착지 선택';

  return (
    <Modal animationType="slide" transparent visible={mode !== null} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.routeModalPanel}>
          <ModalHeader title={title} onClose={onClose} />
          <View style={styles.modalSearchBox}>
            <Search color={colors.primary} size={18} />
            <TextInput value={keyword} onChangeText={onKeywordChange} placeholder={`${title} 검색`} style={styles.modalSearchInput} />
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: onlyPossible && canUseOnlyPossible, disabled: !canUseOnlyPossible }}
            disabled={!canUseOnlyPossible}
            onPress={onToggleOnlyPossible}
            style={({ pressed }) => [
              styles.possibleToggle,
              onlyPossible && canUseOnlyPossible ? styles.possibleToggleActive : null,
              pressed ? styles.secondaryButtonPressed : null,
              !canUseOnlyPossible ? styles.secondaryButtonDisabled : null
            ]}
          >
            <View style={[styles.checkboxBox, onlyPossible && canUseOnlyPossible ? styles.checkboxBoxChecked : null]}>
              {onlyPossible && canUseOnlyPossible ? <Check color={colors.surface} size={14} /> : null}
            </View>
            <View style={styles.possibleToggleTextBlock}>
              <Text style={styles.possibleToggleTitle}>가능지역만 보기</Text>
              <Text style={styles.possibleToggleDescription}>
                {canUseOnlyPossible
                  ? `${possibleBasis} 기준으로 실제 연결 가능한 지역만 표시합니다.`
                  : isDepartureMode
                    ? '도착지를 먼저 선택하면 가능한 출발지만 볼 수 있습니다.'
                    : '출발지를 먼저 선택하면 가능한 도착지만 볼 수 있습니다.'}
              </Text>
            </View>
          </Pressable>
          {isLoading ? <Message text={`${title} 목록을 불러오는 중입니다.`} /> : null}
          {isError ? <Message text={`${title} 목록을 불러오지 못했습니다. API 서버 상태를 확인해 주세요.`} /> : null}
          <ScrollView contentContainerStyle={styles.routeList}>
            {ports.map((port) => (
              <Pressable key={port.id} accessibilityRole="button" onPress={() => onSelect(port)} style={styles.routeOptionRow}>
                <View style={styles.routeOptionMain}>
                  <Text style={styles.routeOptionTitle}>{port.portName}</Text>
                  <Text style={styles.routeOptionName}>{isDepartureMode ? '운항항로 출발지' : '운항항로 도착지'}</Text>
                </View>
                <Check color={colors.primary} size={19} />
              </Pressable>
            ))}
            {!isLoading && ports.length === 0 ? <Message text="검색 조건에 맞는 항구가 없습니다." /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function WeeklyScheduleModal({
  visible,
  startDate,
  endDate,
  portBasis,
  departure,
  arrival,
  schedules,
  hasSearched,
  isLoading,
  isError,
  updatedAt,
  onClose,
  onChangePortBasis,
  onOpenDatePicker,
  onOpenPortPicker,
  onRunSearch,
  onRetry,
  onSelectSchedule,
  onSelectVessel
}: {
  visible: boolean;
  startDate: string;
  endDate: string;
  portBasis: SchedulePortBasis;
  departure: string;
  arrival: string;
  schedules: SailingScheduleSummary[];
  hasSearched: boolean;
  isLoading: boolean;
  isError: boolean;
  updatedAt: number;
  onClose: () => void;
  onChangePortBasis: (basis: SchedulePortBasis) => void;
  onOpenDatePicker: (target: DatePickerTarget) => void;
  onOpenPortPicker: (mode: PortSelectMode) => void;
  onRunSearch: () => void;
  onRetry: () => void;
  onSelectSchedule: (schedule: SailingScheduleSummary) => void;
  onSelectVessel: (vesselName: string) => void;
}) {
  const isDepartureBasis = portBasis === 'departure';
  const selectedPort = isDepartureBasis ? departure : arrival;
  const [timeFilter, setTimeFilter] = useState<ScheduleTimeFilter>('ALL');

  useEffect(() => {
    if (visible) {
      setTimeFilter('ALL');
    }
  }, [visible]);

  const sortedSchedules = useMemo(() => [...schedules].sort(compareSailingSchedules), [schedules]);
  const filteredSchedules = useMemo(
    () => sortedSchedules.filter((schedule) => matchesScheduleTimeFilter(schedule, timeFilter)),
    [sortedSchedules, timeFilter]
  );
  const scheduleStatusCounts = useMemo(() => countScheduleStatuses(filteredSchedules), [filteredSchedules]);
  const groupedSchedules = useMemo(() => groupSchedulesByDate(filteredSchedules), [filteredSchedules]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.routeModalPanel}>
          <ModalHeader title="운항 일정 검색" onClose={onClose} />
          <View style={styles.weeklyFilterGrid}>
            <View style={styles.dateRangeRow}>
              <View style={styles.dateRangeField}>
                <Field icon={CalendarDays} label="시작일">
                  <PickerButton value={startDate} placeholder="시작일 선택" onPress={() => onOpenDatePicker('weeklyStart')} />
                </Field>
              </View>
              <View style={styles.dateRangeField}>
                <Field icon={CalendarDays} label="종료일">
                  <PickerButton value={endDate} placeholder="종료일 선택" onPress={() => onOpenDatePicker('weeklyEnd')} />
                </Field>
              </View>
            </View>
            <Field icon={isDepartureBasis ? MapPin : Waves} label="조회 기준">
              <View style={styles.segmentedControl}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onChangePortBasis('departure')}
                  style={[styles.segmentButton, isDepartureBasis ? styles.segmentButtonActive : null]}
                >
                  <Text style={[styles.segmentButtonText, isDepartureBasis ? styles.segmentButtonTextActive : null]}>출발지 기준</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onChangePortBasis('arrival')}
                  style={[styles.segmentButton, !isDepartureBasis ? styles.segmentButtonActive : null]}
                >
                  <Text style={[styles.segmentButtonText, !isDepartureBasis ? styles.segmentButtonTextActive : null]}>도착지 기준</Text>
                </Pressable>
              </View>
            </Field>
            <Field icon={isDepartureBasis ? MapPin : Waves} label="항구">
              <PickerButton
                value={selectedPort}
                placeholder={isDepartureBasis ? '출발 항구 선택' : '도착 항구 선택'}
                onPress={() => onOpenPortPicker(isDepartureBasis ? 'weeklyDeparture' : 'weeklyArrival')}
              />
            </Field>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading || !selectedPort}
            onPress={onRunSearch}
            style={({ pressed }) => [
              styles.searchButton,
              pressed ? styles.searchButtonPressed : null,
              isLoading || !selectedPort ? styles.searchButtonDisabled : null
            ]}
          >
            {isLoading ? <ActivityIndicator color={colors.surface} /> : <Search color={colors.surface} size={19} />}
            <Text style={styles.searchButtonText}>일정 검색</Text>
          </Pressable>
          {!selectedPort ? <Message text={`${isDepartureBasis ? '출발' : '도착'} 항구를 먼저 선택해 주세요.`} /> : null}
          {!hasSearched && selectedPort ? <Message text="조회할 기간과 기준 항구를 선택한 뒤 일정 검색을 눌러 주세요." /> : null}
          {isError ? <RetryNotice text="운항 일정을 불러오지 못했습니다. 네트워크 또는 API 서버 상태를 확인한 뒤 다시 시도해 주세요." onRetry={onRetry} /> : null}
          {hasSearched && updatedAt ? <DataTimestamp value={updatedAt} /> : null}
          {hasSearched && !isLoading && schedules.length > 0 ? (
            <View style={styles.scheduleResultPanel}>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryMain}>
                  {startDate} ~ {endDate} · {filteredSchedules.length.toLocaleString()}건
                </Text>
                <Text style={styles.resultSummaryText}>
                  정상 {(scheduleStatusCounts.NORMAL ?? 0).toLocaleString()} · 지연 {(scheduleStatusCounts.DELAYED ?? 0).toLocaleString()} · 결항 {(scheduleStatusCounts.CANCELED ?? 0).toLocaleString()} · 통제 {(scheduleStatusCounts.CONTROLLED ?? 0).toLocaleString()}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipList}>
                {scheduleTimeFilters.map((filter) => {
                  const count =
                    filter.value === 'ALL'
                      ? sortedSchedules.length
                      : sortedSchedules.filter((schedule) => matchesScheduleTimeFilter(schedule, filter.value)).length;
                  const isSelected = timeFilter === filter.value;

                  return (
                    <Pressable
                      key={filter.value}
                      accessibilityRole="button"
                      onPress={() => setTimeFilter(filter.value)}
                      style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
                    >
                      <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                        {filter.label} {count.toLocaleString()}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          {hasSearched && !isLoading && schedules.length === 0 ? <Message text="선택 조건에 맞는 운항 일정이 없습니다. 기간을 넓히거나 기준 항구를 바꿔 보세요." /> : null}
          {hasSearched && !isLoading && schedules.length > 0 && filteredSchedules.length === 0 ? (
            <Message text="선택한 시간대에 해당하는 운항 일정이 없습니다." />
          ) : null}
          <ScrollView contentContainerStyle={styles.routeList}>
            {groupedSchedules.map((group) => (
              <View key={group.date} style={styles.scheduleDateGroup}>
                <View style={styles.scheduleDateHeader}>
                  <Text style={styles.scheduleDateTitle}>{group.date}</Text>
                  <Text style={styles.scheduleDateCount}>{group.schedules.length.toLocaleString()}건</Text>
                </View>
                {group.schedules.map((item) => (
                  <Pressable key={item.id} accessibilityRole="button" onPress={() => onSelectSchedule(item)} style={styles.weeklyRow}>
                    <View style={styles.weeklyDateBadge}>
                      <Text style={styles.weeklyDateText}>{item.sailingDate.slice(5).replace('-', '.')}</Text>
                      <Text style={styles.weeklyTimeText}>{item.departureTime || '--:--'}</Text>
                    </View>
                    <View style={styles.scheduleBody}>
                      <VesselNameButton vesselName={item.vesselName} onPress={onSelectVessel} />
                      <Text style={styles.route}>
                        {item.departurePortName} → {item.arrivalPortName}
                      </Text>
                    </View>
                    <StatusPill label={statusLabel[item.status]} tone={statusTone[item.status]} />
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ScheduleRouteModal({ schedule, onClose }: { schedule: SailingScheduleSummary | null; onClose: () => void }) {
  return (
    <Modal animationType="fade" transparent visible={schedule !== null} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <ModalHeader title="운항항로 정보" onClose={onClose} />
          {schedule ? (
            <View style={styles.detailStack}>
              <DetailLine label="운항일" value={schedule.sailingDate} />
              <DetailLine label="출항시간" value={schedule.departureTime || '--:--'} />
              <DetailLine label="항로" value={`${schedule.departurePortName} → ${schedule.arrivalPortName}`} />
              <DetailLine label="선박" value={schedule.vesselName ?? '선박명 확인 필요'} />
              <DetailLine label="상태" value={statusLabel[schedule.status]} />
              {schedule.controlReason ? <DetailLine label="통제 사유" value={schedule.controlReason} /> : null}
              {schedule.passengerCapacity ? <DetailLine label="정원" value={`${schedule.passengerCapacity.toLocaleString()}명`} /> : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function VesselDetailModal({
  vesselName,
  detail,
  isLoading,
  isError,
  onClose
}: {
  vesselName: string | null;
  detail: Awaited<ReturnType<typeof fetchVesselDetail>> | undefined;
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={vesselName !== null} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <ModalHeader title="여객선 상세정보" onClose={onClose} />
          {isLoading ? <Message text="여객선 상세정보를 불러오는 중입니다." /> : null}
          {isError ? <Message text="여객선 상세정보를 불러오지 못했습니다. 관리자 수집 상태를 확인해 주세요." /> : null}
          {!isLoading && !isError && detail === null ? (
            <Message text="아직 수집된 여객선 상세정보가 없습니다. 관리자에서 여객선 상세 수집을 먼저 실행해 주세요." />
          ) : null}
          {detail ? (
            <ScrollView contentContainerStyle={styles.detailStack}>
              <View style={styles.vesselHero}>
                {detail.imageDataUrl || detail.imageUrl ? (
                  <Image source={{ uri: detail.imageDataUrl ?? detail.imageUrl ?? '' }} style={styles.vesselImage} resizeMode="contain" />
                ) : (
                  <View style={styles.vesselImageEmpty}>
                    <Ship color={colors.primary} size={34} />
                    <Text style={styles.vesselImageEmptyText}>선박 이미지를 준비 중입니다.</Text>
                  </View>
                )}
              </View>
              <View style={styles.vesselTitleBlock}>
                <Text style={styles.vesselDetailTitle}>{detail.vesselName}</Text>
                <Text style={styles.vesselDetailSubtitle}>{detail.routeName ?? detail.operatorName ?? '여객선 상세 데이터'}</Text>
              </View>
              <DetailPairLine
                leftLabel="총톤수"
                leftValue={detail.grossTonnage ?? '확인 필요'}
                rightLabel="장·폭·심"
                rightValue={detail.dimensions ?? '확인 필요'}
              />
              <DetailPairLine
                leftLabel="선형"
                leftValue={detail.shipType ?? '확인 필요'}
                rightLabel="선종"
                rightValue={detail.shipKind ?? '확인 필요'}
              />
              <DetailLine label="속력" value={[detail.maxSpeed && `최대 ${detail.maxSpeed}`, detail.cruiseSpeed && `항해 ${detail.cruiseSpeed}`].filter(Boolean).join(' · ') || '확인 필요'} />
              <DetailLine label="기관" value={[detail.engineType && `종류 ${detail.engineType}`, detail.enginePower && `마력 ${detail.enginePower}`].filter(Boolean).join(' · ') || '확인 필요'} />
              <DetailPairLine
                leftLabel="항해구역"
                leftValue={detail.navigationArea ?? '확인 필요'}
                rightLabel="여객정원"
                rightValue={detail.passengerCapacity ?? '확인 필요'}
              />
              <DetailPairLine
                leftLabel="항로명"
                leftValue={detail.routeName ?? '확인 필요'}
                rightLabel="선사"
                rightValue={detail.operatorName ?? '확인 필요'}
              />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function DetailPairLine({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  return (
    <View style={styles.detailPairLine}>
      <View style={styles.detailPairItem}>
        <Text style={styles.detailLabel}>{leftLabel}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>
          {leftValue}
        </Text>
      </View>
      <View style={styles.detailPairDivider} />
      <View style={styles.detailPairItem}>
        <Text style={styles.detailLabel}>{rightLabel}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>
          {rightValue}
        </Text>
      </View>
    </View>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.iconButton}>
        <X color={colors.muted} size={20} />
      </Pressable>
    </View>
  );
}

function Message({ text }: { text: string }) {
  return <Text style={styles.message}>{text}</Text>;
}

function DataTimestamp({ value }: { value: number | string | Date | undefined }) {
  const formatted = formatDateTime(value);

  if (!formatted) return null;

  return <Text style={styles.dataTimestamp}>데이터 기준 {formatted}</Text>;
}

function RetryNotice({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={styles.retryNotice}>
      <Text style={styles.retryNoticeText}>{text}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed ? styles.secondaryButtonPressed : null]}>
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scheduleSubMenu: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14
  },
  scheduleSubMenuCopy: {
    flex: 1,
    minWidth: 0
  },
  scheduleSubMenuEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  scheduleSubMenuTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3
  },
  scheduleSubMenuDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4
  },
  scheduleSubMenuButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12
  },
  scheduleSubMenuButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900'
  },
  searchPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16
  },
  inputGrid: {
    gap: 10
  },
  field: {
    gap: 7
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  fieldLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  input: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 46,
    paddingHorizontal: 12
  },
  pickerButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12
  },
  pickerButtonText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '800'
  },
  placeholder: {
    color: colors.muted
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48
  },
  searchButtonPressed: {
    backgroundColor: colors.primaryDark
  },
  searchButtonDisabled: {
    opacity: 0.72
  },
  searchButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900'
  },
  quickActionRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10
  },
  secondaryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  secondaryButtonDisabled: {
    opacity: 0.48
  },
  secondaryButtonPressed: {
    opacity: 0.72
  },
  secondaryButtonText: {
    color: colors.primary,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900'
  },
  secondaryButtonTextActive: {
    color: colors.surface
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8
  },
  quickDateChip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 8
  },
  quickDateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  quickDateChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  quickDateChipTextSelected: {
    color: colors.surface
  },
  quickPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  quickPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34
  },
  quickPanelTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8
  },
  quickPanelTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  quickPanelCount: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: 8,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  quickPanelToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4
  },
  quickPanelToggleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }]
  },
  quickPanelHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  quickPanelBody: {
    gap: 12
  },
  quickGroup: {
    gap: 8
  },
  quickSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  quickGroupTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  quickSectionText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18
  },
  routeChipList: {
    gap: 8,
    paddingRight: 4
  },
  quickRouteList: {
    gap: 8
  },
  routeRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 74,
    padding: 10
  },
  recentRouteRow: {
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  routeRowBody: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  routeRowActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    maxWidth: 142
  },
  routeChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 58,
    minWidth: 190,
    padding: 10
  },
  routeChipTextBlock: {
    flex: 1,
    gap: 2
  },
  routeChipTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  routeChipSubtitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19
  },
  routeChipMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  favoriteRouteNameRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6
  },
  favoriteInlineAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 7,
    height: 26,
    justifyContent: 'center',
    width: 26
  },
  recentRouteLine: {
    color: colors.primaryDark,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18
  },
  routeChipMoveGroup: {
    gap: 4
  },
  routeChipAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  routeChipActionActive: {
    backgroundColor: colors.primarySoft
  },
  routeChipActionSmall: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 7,
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  routeChipActionDisabled: {
    opacity: 0.38
  },
  routeChipTextAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 8
  },
  routeChipTextActionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  quickMoreButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40
  },
  quickMoreButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  favoriteEditorStack: {
    gap: 12
  },
  favoriteRoutePreview: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  favoriteRouteTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  weeklySummaryRow: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  weeklySummaryText: {
    color: colors.navy,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19
  },
  outlineButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900'
  },
  candidateQualityPanel: {
    gap: 10
  },
  candidateAlertPanel: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  candidateAlertTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  candidateAlertChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  candidateAlertChip: {
    borderRadius: 8,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  candidateAlertChipDanger: {
    backgroundColor: '#ffe8e8'
  },
  candidateAlertChipWarning: {
    backgroundColor: '#fff3d6'
  },
  candidateAlertChipText: {
    fontSize: 12,
    fontWeight: '900'
  },
  candidateAlertChipTextDanger: {
    color: colors.danger
  },
  candidateAlertChipTextWarning: {
    color: '#9a5b00'
  },
  candidateSortPanel: {
    gap: 7
  },
  candidateSortLabel: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900'
  },
  candidateHintPanel: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  candidateHintTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  candidateHintText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  emptyActionPanel: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 8,
    padding: 12
  },
  emptyActionTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  emptyActionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  emptyActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  emptyActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10
  },
  emptyActionButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  resultActionPanel: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 8,
    padding: 12
  },
  resultActionTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  resultActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  resultActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 10
  },
  resultActionButtonDisabled: {
    opacity: 0.5
  },
  resultActionButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  resultActionButtonTextDisabled: {
    color: colors.muted
  },
  resultSummaryRow: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 4,
    padding: 12
  },
  resultSummaryMain: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  resultSummaryText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  filterChipList: {
    gap: 8,
    paddingRight: 4
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 11
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  filterChipTextSelected: {
    color: colors.surface
  },
  candidateRow: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 96,
    padding: 12
  },
  candidateRowSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  candidateMain: {
    gap: 7
  },
  candidateTopLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  candidateVesselLine: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  vessel: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900'
  },
  vesselButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    maxWidth: '100%'
  },
  vesselButtonPressed: {
    opacity: 0.72
  },
  vesselPreview: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    maxWidth: '100%',
    minHeight: 30,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  vesselPreviewImage: {
    borderRadius: 6,
    height: 22,
    width: 28
  },
  vesselPreviewIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 6,
    height: 22,
    justifyContent: 'center',
    width: 28
  },
  vesselPreviewText: {
    color: colors.primaryDark,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800'
  },
  route: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18
  },
  time: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  scheduleItem: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12
  },
  weeklyRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 74,
    padding: 12
  },
  weeklyFilterGrid: {
    gap: 10
  },
  scheduleResultPanel: {
    gap: 10
  },
  scheduleDateGroup: {
    gap: 8
  },
  scheduleDateHeader: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  scheduleDateTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  scheduleDateCount: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 10
  },
  dateRangeField: {
    flex: 1,
    minWidth: 0
  },
  segmentedControl: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 5
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 8
  },
  segmentButtonActive: {
    backgroundColor: colors.primary
  },
  segmentButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900'
  },
  segmentButtonTextActive: {
    color: colors.surface
  },
  weeklyDateBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 8,
    gap: 4,
    justifyContent: 'center',
    minHeight: 54,
    width: 64
  },
  weeklyDateText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  weeklyTimeText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  timeBadge: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 5,
    justifyContent: 'center',
    minHeight: 58,
    width: 68
  },
  timeBadgeText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900'
  },
  scheduleBody: {
    flex: 1,
    gap: 4
  },
  reason: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800'
  },
  message: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    padding: 12
  },
  dataTimestamp: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right'
  },
  retryNotice: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  retryNoticeText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900'
  },
  modalBackdrop: {
    backgroundColor: 'rgba(16, 42, 67, 0.38)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14
  },
  modalPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: 14,
    padding: 16
  },
  routeModalPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: 14,
    maxHeight: '84%',
    padding: 16
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  detailStack: {
    gap: 10
  },
  detailLine: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 5,
    padding: 12
  },
  detailPairLine: {
    alignItems: 'stretch',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 16,
    padding: 12
  },
  detailPairItem: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  detailPairDivider: {
    backgroundColor: colors.border,
    width: 1
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  detailValue: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21
  },
  vesselHero: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10
  },
  vesselImage: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 210,
    width: '100%'
  },
  vesselImageEmpty: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: 8,
    height: 210,
    justifyContent: 'center',
    width: '100%'
  },
  vesselImageEmptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  vesselTitleBlock: {
    gap: 4
  },
  vesselDetailTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26
  },
  vesselDetailSubtitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  monthTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  weekRow: {
    flexDirection: 'row'
  },
  weekday: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center'
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    width: `${100 / 7}%`
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: 8
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  dayTextSelected: {
    color: colors.surface
  },
  modalSearchBox: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 12
  },
  modalSearchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700'
  },
  possibleToggle: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    padding: 12
  },
  possibleToggleActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  checkboxBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  possibleToggleTextBlock: {
    flex: 1,
    gap: 3
  },
  possibleToggleTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  possibleToggleDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  routeList: {
    gap: 9,
    paddingBottom: 12
  },
  routeOptionRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 64,
    padding: 12
  },
  routeOptionMain: {
    flex: 1,
    gap: 4
  },
  routeOptionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900'
  },
  routeOptionName: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800'
  }
});
