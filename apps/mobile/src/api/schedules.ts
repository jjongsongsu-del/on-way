import type { ApiResponse, SailingScheduleSummary, SailingStatus } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

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

  const response = await requestJson<ApiResponse<T>>(`${API_BASE_URL}${path}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.body.data;
}
