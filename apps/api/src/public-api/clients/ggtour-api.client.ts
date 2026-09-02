import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GgTourApiClient {
  constructor(private readonly configService: ConfigService) {}

  async getOpenApiSpec<T = unknown>() {
    return this.getJson<T>('/v3/api-docs');
  }

  async getContents<T = unknown>(path: string, params: Record<string, string | number | undefined> = {}) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return this.getJson<T>(normalizedPath, params);
  }

  private async getJson<T>(path: string, params: Record<string, string | number | undefined> = {}) {
    const apiKey = this.configService.get<string>('GGTOUR_API_KEY');
    if (!apiKey) {
      throw new Error('GGTOUR_API_KEY is not configured.');
    }

    const baseUrl = this.configService.get<string>('GGTOUR_API_BASE_URL', 'https://ggtour.or.kr/ggapi-svc/api/v1').replace(/\/$/, '');
    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url, {
      headers: { 'GGTOUR-API-KEY': apiKey },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      throw new Error(`GGTOUR API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }
}
