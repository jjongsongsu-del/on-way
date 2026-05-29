import type { ApiResponse, IslandTravelInfo } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

export type IslandTravelInfoFilters = {
  islandName: string;
  provinceName?: string | null;
  cityName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function fetchIslandTravelInfo(filters: IslandTravelInfoFilters) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });

  const response = await requestJson<ApiResponse<IslandTravelInfo>>(
    `${API_BASE_URL}/island-trips/travel-info?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.body.data;
}
