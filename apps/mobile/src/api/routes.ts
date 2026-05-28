import type { ApiResponse, RealtimeTrafficSummary } from '@badagil/shared';
import { requestJson } from './http';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000/v1';

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
