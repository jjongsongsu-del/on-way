import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KOMSA_ENDPOINTS, type PublicDataEndpoint } from '../public-api-endpoints';
import { PublicApiHttpClient } from './public-api-http.client';

@Injectable()
export class KomsaApiClient {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: PublicApiHttpClient
  ) {}

  async getOperationSchedules<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(KOMSA_ENDPOINTS.schedule, params);
  }

  async getOperationRoutes<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(KOMSA_ENDPOINTS.route, params);
  }

  async getFerryRouteStatus<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(KOMSA_ENDPOINTS.ferryStatus, params);
  }

  async getTomorrowForecast<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(KOMSA_ENDPOINTS.tomorrowForecast, params);
  }

  async getRealtimeTraffic<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(KOMSA_ENDPOINTS.realtimeTraffic, params);
  }

  async getTomorrowForecastDetail<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(KOMSA_ENDPOINTS.tomorrowForecastDetail, params);
  }

  async getOperationLines<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(KOMSA_ENDPOINTS.operationLine, params);
  }

  async requestJson<T>(endpoint: PublicDataEndpoint, params: Record<string, string | number | undefined> = {}) {
    const serviceKey = this.getServiceKey();

    if (!serviceKey) {
      throw new Error('KOMSA API is not configured');
    }

    const url = this.httpClient.createUrl(this.createEndpointUrl(endpoint), {
      ...endpoint.defaultParams,
      serviceKey,
      ...params
    });

    return this.httpClient.getJson<T>(url);
  }

  async requestXml<T>(endpoint: PublicDataEndpoint, params: Record<string, string | number | undefined> = {}) {
    const serviceKey = this.getServiceKey();

    if (!serviceKey) {
      throw new Error('KOMSA API is not configured');
    }

    const url = this.httpClient.createUrl(this.createEndpointUrl(endpoint), {
      ...endpoint.defaultParams,
      serviceKey,
      ...params
    });

    return this.httpClient.getXml<T>(url);
  }

  private createEndpointUrl(endpoint: PublicDataEndpoint) {
    return `${endpoint.baseUrl.replace(/\/$/, '')}/${endpoint.operationPath.replace(/^\//, '')}`;
  }

  private getServiceKey() {
    return (
      this.configService.get<string>('KOMSA_SERVICE_KEY') ??
      this.configService.get<string>('DATA_GO_KR_SERVICE_KEY') ??
      this.configService.get<string>('PUBLIC_DATA_SERVICE_KEY')
    );
  }
}
