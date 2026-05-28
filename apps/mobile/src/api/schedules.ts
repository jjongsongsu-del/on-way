import type { ApiResponse, SailingScheduleSummary, SailingStatus } from '@badagil/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000/v1';

export type ScheduleCandidate = {
  id: string;
  sailingDate: string;
  departureTime: string | null;
  vesselCode: string | null;
  vesselName: string;
  routeCode: string | null;
  routeName: string | null;
  licenseRouteName: string | null;
  currentPortName: string | null;
  status: SailingStatus;
};

export type ScheduleSearchFilters = {
  date: string;
  departure?: string;
  arrival?: string;
  vesselName?: string;
};

export type WeeklyScheduleSearchFilters = ScheduleSearchFilters & {
  startDate?: string;
  endDate?: string;
};

export async function fetchScheduleCandidates(filters: ScheduleSearchFilters) {
  return get<ScheduleCandidate[]>('/schedules/candidates', filters);
}

export async function fetchSchedules(filters: Required<ScheduleSearchFilters>) {
  return get<SailingScheduleSummary[]>('/schedules', filters);
}

export async function fetchWeeklySchedules(filters: WeeklyScheduleSearchFilters) {
  return get<SailingScheduleSummary[]>('/schedules/weekly', filters);
}

async function get<T>(path: string, query: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });

  const response = await fetch(`${API_BASE_URL}${path}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}
