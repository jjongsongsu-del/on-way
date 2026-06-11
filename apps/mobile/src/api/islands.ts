import type { ApiResponse, IslandSummary } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

export type IslandSearchResult = ApiResponse<IslandSummary[]>;
export type IslandMapBounds = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

export async function fetchIslands(keyword?: string) {
  const response = await fetchIslandsResponse(keyword);
  return response.data;
}

export async function fetchIslandsResponse(keyword?: string): Promise<IslandSearchResult> {
  const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return getResponse<IslandSummary[]>(`/islands${params}`);
}

export async function fetchIslandFeatures(bounds: IslandMapBounds): Promise<IslandSearchResult> {
  const bbox = boundsToBbox(bounds);
  return getResponse<IslandSummary[]>(`/islands/features?bbox=${encodeURIComponent(bbox)}`);
}

export function createIslandWmsUrl(bounds: IslandMapBounds, width = 915, height = 640) {
  const params = new URLSearchParams({
    bbox: boundsToBbox(bounds),
    width: String(width),
    height: String(height)
  });

  return `${API_BASE_URL}/islands/wms?${params.toString()}`;
}

export async function fetchIsland(islandId: string) {
  return get<IslandSummary>(`/islands/${encodeURIComponent(islandId)}`);
}

async function get<T>(path: string) {
  const response = await getResponse<T>(path);
  return response.data;
}

async function getResponse<T>(path: string) {
  const response = await requestJson<ApiResponse<T>>(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.body;
}

function boundsToBbox(bounds: IslandMapBounds) {
  return [bounds.minLongitude, bounds.minLatitude, bounds.maxLongitude, bounds.maxLatitude].join(',');
}
