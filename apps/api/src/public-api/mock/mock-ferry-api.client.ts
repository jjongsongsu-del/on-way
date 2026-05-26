import { Injectable } from '@nestjs/common';
import {
  mockRouteStops,
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
  ScheduleSearchParams
} from '../types/public-api.types';

@Injectable()
export class MockFerryApiClient implements PublicFerryApiClient {
  async getRoutes() {
    return this.result(mockRoutes);
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

  async getSchedules(params: ScheduleSearchParams) {
    const schedules = mockSchedules.filter(
      (schedule) =>
        schedule.sailingDate === params.date &&
        schedule.departurePortName.includes(params.departure) &&
        schedule.arrivalPortName.includes(params.arrival)
    );

    return this.result(schedules);
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

