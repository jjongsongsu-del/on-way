import type { ApiResponse, IslandSummary } from '@badagil/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000/v1';

export async function fetchIslands(keyword?: string) {
  const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return get<IslandSummary[]>(`/islands${params}`);
}

export async function fetchIsland(islandId: string) {
  return get<IslandSummary>(`/islands/${encodeURIComponent(islandId)}`);
}

async function get<T>(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}
