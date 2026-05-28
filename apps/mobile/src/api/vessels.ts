import type { ApiResponse, VesselDetail } from '@badagil/shared';
import { requestJson } from './http';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000/v1';

export async function fetchVesselDetail(vesselName: string) {
  const searchParams = new URLSearchParams({ name: vesselName });
  const response = await requestJson<ApiResponse<VesselDetail>>(`${API_BASE_URL}/vessels/detail?${searchParams.toString()}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.body.data;
}
