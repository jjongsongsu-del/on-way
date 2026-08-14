import type { ApiResponse, CruiseOverview, CruiseSchedule } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

export async function fetchCruiseOverview(limit = 12) {
  const response = await requestJson<ApiResponse<CruiseOverview>>(`${API_BASE_URL}/cruises/overview?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.body.data;
}

export type CruiseScheduleFilters = {
  portName?: string | null;
  keyword?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
};

export async function fetchCruiseSchedules(filters: CruiseScheduleFilters = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });

  const response = await requestJson<ApiResponse<CruiseSchedule[]>>(`${API_BASE_URL}/cruises/schedules?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.body.data;
}
