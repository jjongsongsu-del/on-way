import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicApiHttpClient } from './public-api-http.client';

@Injectable()
export class KomsaApiClient {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: PublicApiHttpClient
  ) {}

  async requestJson<T>(endpoint: string, params: Record<string, string | number | undefined> = {}) {
    const serviceKey = this.configService.get<string>('KOMSA_SERVICE_KEY');
    const baseUrl = this.configService.get<string>('KOMSA_BASE_URL');

    if (!serviceKey || !baseUrl) {
      throw new Error('KOMSA API is not configured');
    }

    const url = this.httpClient.createUrl(`${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`, {
      serviceKey,
      ...params
    });

    return this.httpClient.getJson<T>(url);
  }

  async requestXml<T>(endpoint: string, params: Record<string, string | number | undefined> = {}) {
    const serviceKey = this.configService.get<string>('KOMSA_SERVICE_KEY');
    const baseUrl = this.configService.get<string>('KOMSA_BASE_URL');

    if (!serviceKey || !baseUrl) {
      throw new Error('KOMSA API is not configured');
    }

    const url = this.httpClient.createUrl(`${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`, {
      serviceKey,
      ...params
    });

    return this.httpClient.getXml<T>(url);
  }
}

