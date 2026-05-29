import type { ApiResponse, RealtimeTrafficSummary } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

export type RouteOption = {
  id: string;
  routeName: string;
  departurePortName: string;
  arrivalPortName: string;
  stopPortNames: string[];
};

export type PortOption = {
  id: string;
  portName: string;
};

export async function fetchRouteOptions() {
  return get<RouteOption[]>('/routes/options');
}

export async function fetchDeparturePorts() {
  return get<PortOption[]>('/routes/departures');
}

export async function fetchArrivalPorts() {
  return get<PortOption[]>('/routes/arrivals');
}

export async function fetchRealtimeTraffic() {
  return get<RealtimeTrafficSummary[]>('/routes/traffic/realtime');
}

async function get<T>(path: string) {
  const response = await requestJson<ApiResponse<T>>(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.body.data;
}
