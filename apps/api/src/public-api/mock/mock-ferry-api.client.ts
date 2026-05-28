import { Injectable } from '@nestjs/common';
import {
  mockRouteStops,
  mockPorts,
  mockRoutes,
  mockSchedules,
  mockTodayStatuses,
  mockTomorrowForecasts,
  mockVessels
} from './mock-ferry-data';
import type {
  PublicApiResult,
  PublicFerryApiClient,
  RouteSearchParams,
  ScheduleCandidateSearchParams,
  ScheduleSearchParams,
  WeeklyScheduleSearchParams
} from '../types/public-api.types';

@Injectable()
export class MockFerryApiClient implements PublicFerryApiClient {
  async getPorts() {
    return this.result(mockPorts);
  }

  async getRoutes() {
    return this.result(mockRoutes);
  }

  async getRouteOptions() {
    return this.result(
      mockRoutes.map((route) => ({
        id: route.id,
        routeName: route.operationRouteName,
        departurePortName: route.departurePortName,
        arrivalPortName: route.arrivalPortName,
        stopPortNames: mockRouteStops[route.id]?.map((stop) => stop.portName) ?? [
          route.departurePortName,
          route.arrivalPortName
        ]
      }))
    );
  }

  async getDeparturePortOptions() {
    return this.result(toPortOptions(mockRoutes.map((route) => route.departurePortName)));
  }

  async getArrivalPortOptions() {
    return this.result(toPortOptions(mockRoutes.map((route) => route.arrivalPortName)));
  }

  async getRoute(routeId: string) {
    return this.result(mockRoutes.find((route) => route.id === routeId) ?? null);
  }

  async searchRoutes(params: RouteSearchParams) {
    const routes = mockRoutes.filter(
      (route) =>
        route.departurePortName.includes(params.departure) &&
        route.arrivalPortName.includes(params.arrival)
    );

    return this.result(routes);
  }

  async getRouteStops(routeId: string) {
    return this.result(mockRouteStops[routeId] ?? []);
  }

  async getScheduleCandidates(params: ScheduleCandidateSearchParams) {
    const candidates = mockSchedules
      .filter(
        (schedule) =>
          schedule.sailingDate === params.date &&
          (!params.departure || schedule.departurePortName.includes(params.departure)) &&
          (!params.arrival || schedule.arrivalPortName.includes(params.arrival)) &&
          (!params.vesselName || (schedule.vesselName ?? '').includes(params.vesselName))
      )
      .map((schedule) => ({
        id: schedule.id,
        sailingDate: schedule.sailingDate,
        departureTime: schedule.departureTime,
        vesselCode: schedule.vesselId,
        vesselName: schedule.vesselName ?? '',
        routeCode: schedule.routeId,
        routeName: `${schedule.departurePortName}-${schedule.arrivalPortName}`,
        licenseRouteName: null,
        currentPortName: schedule.departurePortName,
        status: schedule.status
      }));

    return this.result(candidates);
  }

  async getSchedules(params: ScheduleSearchParams) {
    const schedules = mockSchedules.filter(
      (schedule) =>
        schedule.sailingDate === params.date &&
        schedule.departurePortName.includes(params.departure) &&
        schedule.arrivalPortName.includes(params.arrival) &&
        (!params.vesselName || (schedule.vesselName ?? '').includes(params.vesselName))
    );

    return this.result(schedules);
  }

  async getWeeklySchedules(params: WeeklyScheduleSearchParams) {
    const startDate = params.startDate ?? params.date;
    const endDate = params.endDate ?? params.date;
    const schedules = mockSchedules.filter(
      (schedule) =>
        schedule.sailingDate >= startDate &&
        schedule.sailingDate <= endDate &&
        (!params.departure || schedule.departurePortName.includes(params.departure)) &&
        (!params.arrival || schedule.arrivalPortName.includes(params.arrival)) &&
        (!params.vesselName || (schedule.vesselName ?? '').includes(params.vesselName))
    );

    return this.result(schedules);
  }

  async getRealtimeTraffic() {
    return this.result([
      {
        id: 'traffic-gr4-g3b33-p2',
        gridId: 'GR4_G3B33_P2',
        vesselTrafficCount: 117,
        density: 38.3,
        congestionLevel: 'MEDIUM' as const,
        observedAt: new Date().toISOString()
      },
      {
        id: 'traffic-gr4-g3b14-w4',
        gridId: 'GR4_G3B14_W4',
        vesselTrafficCount: 66,
        density: 100,
        congestionLevel: 'HIGH' as const,
        observedAt: new Date().toISOString()
      }
    ]);
  }

  async getTodayStatus(params: RouteSearchParams) {
    const status = mockTodayStatuses.find(
      (item) =>
        item.route.departurePortName.includes(params.departure) &&
        item.route.arrivalPortName.includes(params.arrival)
    );

    return this.result(status ?? null);
  }

  async getTomorrowForecast(params: RouteSearchParams) {
    const forecast = mockTomorrowForecasts.find(
      (item) =>
        item.route.departurePortName.includes(params.departure) &&
        item.route.arrivalPortName.includes(params.arrival)
    );

    return this.result(forecast ?? null);
  }

  async getVessels() {
    return this.result(mockVessels);
  }

  private result<T>(data: T): PublicApiResult<T> {
    return {
      data,
      meta: {
        provider: 'MOCK',
        source: 'mock-ferry-data',
        fetchedAt: new Date().toISOString(),
        rawFormat: 'mock'
      }
    };
  }
}

function toPortOptions(portNames: string[]) {
  return [...new Set(portNames.filter(Boolean))]
    .sort()
    .map((portName) => ({
      id: `port-option-${portName}`,
      portName
    }));
}
