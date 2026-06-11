import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TAGO_SHIP_ENDPOINTS, type PublicDataEndpoint } from '../public-api-endpoints';
import { PublicApiHttpClient } from './public-api-http.client';

@Injectable()
export class TagoShipApiClient {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: PublicApiHttpClient
  ) {}

  async getPortList<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(TAGO_SHIP_ENDPOINTS.portList, params);
  }

  async getShipOperationInfoList<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(TAGO_SHIP_ENDPOINTS.operationInfo, params);
  }

  async getPassengerShipTerminalList<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(TAGO_SHIP_ENDPOINTS.terminalList, params);
  }

  async getShipKindList<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(TAGO_SHIP_ENDPOINTS.shipKindList, params);
  }

  private async requestJson<T>(endpoint: PublicDataEndpoint, params: Record<string, string | number | undefined> = {}) {
    const serviceKey = this.getServiceKey();

    if (!serviceKey) {
      throw new Error('TAGO ship API is not configured');
    }

    const url = this.httpClient.createUrl(this.createEndpointUrl(endpoint), {
      ...endpoint.defaultParams,
      serviceKey,
      ...params
    });

    return this.httpClient.getJson<T>(url);
  }

  private createEndpointUrl(endpoint: PublicDataEndpoint) {
    return `${endpoint.baseUrl.replace(/\/$/, '')}/${endpoint.operationPath.replace(/^\//, '')}`;
  }

  private getServiceKey() {
    return (
      this.configService.get<string>('TAGO_SERVICE_KEY') ??
      this.configService.get<string>('DATA_GO_KR_SERVICE_KEY') ??
      this.configService.get<string>('PUBLIC_DATA_SERVICE_KEY')
    );
  }
}
