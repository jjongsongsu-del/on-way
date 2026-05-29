import type { ApiResponse, VesselDetail } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

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
