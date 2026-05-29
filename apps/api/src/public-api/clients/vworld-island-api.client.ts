import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicApiHttpClient } from './public-api-http.client';

const DEFAULT_ATTR_URL = 'https://api.vworld.kr/ned/data/getIslandsAttr';
const DEFAULT_WFS_URL = 'https://api.vworld.kr/ned/wfs/getIslandsWFS';
const DEFAULT_WMS_URL = 'https://api.vworld.kr/ned/wms/getIslandsWMS';
const DEFAULT_WMTS_URL = 'https://api.vworld.kr/req/wmts/1.0.0';

@Injectable()
export class VworldIslandApiClient {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: PublicApiHttpClient
  ) {}

  async getIslandAttributes<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(this.getAttrUrl(), {
      format: 'json',
      numOfRows: 100,
      pageNo: 1,
      ...params
    });
  }

  async getIslandFeatures<T = unknown>(params: Record<string, string | number | undefined> = {}) {
    return this.requestJson<T>(this.getWfsUrl(), {
      typename: 'dt_d158',
      ...params
    });
  }

  getWmsTileUrl(params: Record<string, string | number | undefined> = {}) {
    return this.httpClient.createUrl(this.getWmsUrl(), {
      service: 'WMS',
      request: 'GetMap',
      version: '1.3.0',
      layers: 'dt_d158',
      crs: 'EPSG:4326',
      styles: '',
      ...params,
      key: this.getApiKey()
    });
  }

  async getWmsImage(params: Record<string, string | number | undefined> = {}) {
    const url = this.getWmsTileUrl(params);
    return this.httpClient.getArrayBuffer(url);
  }

  getBaseTileUrl(params: { z: number; x: number; y: number; layer?: 'Base' | 'gray' | 'midnight' | 'Satellite' }) {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new Error('VWorld base map API is not configured');
    }

    const layer = params.layer ?? 'Base';
    return `${this.getWmtsUrl()}/${apiKey}/${layer}/${params.z}/${params.y}/${params.x}.png`;
  }

  async getBaseTileImage(params: { z: number; x: number; y: number; layer?: 'Base' | 'gray' | 'midnight' | 'Satellite' }) {
    return this.httpClient.getArrayBuffer(this.getBaseTileUrl(params));
  }

  private async requestJson<T>(endpointUrl: string, params: Record<string, string | number | undefined>) {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new Error('VWorld island API is not configured');
    }

    const url = this.httpClient.createUrl(endpointUrl, {
      ...params,
      key: apiKey
    });

    return this.httpClient.getJson<T>(url);
  }

  private getAttrUrl() {
    return this.configService.get<string>('VWORLD_ISLAND_ATTR_URL') ?? DEFAULT_ATTR_URL;
  }

  private getWfsUrl() {
    return this.configService.get<string>('VWORLD_ISLAND_WFS_URL') ?? DEFAULT_WFS_URL;
  }

  private getWmsUrl() {
    return this.configService.get<string>('VWORLD_ISLAND_WMS_URL') ?? DEFAULT_WMS_URL;
  }

  private getWmtsUrl() {
    return this.configService.get<string>('VWORLD_WMTS_URL') ?? DEFAULT_WMTS_URL;
  }

  private getApiKey() {
    return this.configService.get<string>('VWORLD_API_KEY') ?? this.configService.get<string>('VWORLD_SERVICE_KEY');
  }
}
