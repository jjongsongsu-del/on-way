import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INCHEON_PORT_ENDPOINTS, type PublicDataEndpoint } from '../public-api-endpoints';
import { PublicApiHttpClient } from './public-api-http.client';

@Injectable()
export class IncheonPortApiClient {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: PublicApiHttpClient
  ) {}

  async getTerminalNavigation<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestXml<T>(INCHEON_PORT_ENDPOINTS.terminalNavigation, params);
  }

  async requestXml<T>(endpoint: PublicDataEndpoint, params: Record<string, string | number | undefined> = {}) {
    const serviceKey = this.getServiceKey();

    if (!serviceKey) {
      throw new Error('Incheon Port API is not configured');
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
      this.configService.get<string>('INCHEON_PORT_SERVICE_KEY') ??
      this.configService.get<string>('DATA_GO_KR_SERVICE_KEY') ??
      this.configService.get<string>('PUBLIC_DATA_SERVICE_KEY')
    );
  }
}
