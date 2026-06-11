import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MarineForecastApiStatus,
  MarineForecastOverview,
  MarineSalinity,
  MarineShortTermForecast,
  MarineTideForecast,
  MarineWaterTemperature,
  MarineWeatherWarning,
  RiskLevel
} from '@badagil/shared';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../database/prisma.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { PublicApiHttpClient } from '../public-api/clients/public-api-http.client';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type { PublicApiResult, PublicFerryApiClient, RouteSearchParams } from '../public-api/types/public-api.types';
import { findMarineForecastLocation, getMarineForecastLocations } from './marine-forecast-location-map';

const DEFAULT_SHORT_TERM_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
const DEFAULT_WEATHER_WARNING_URL = 'https://apis.data.go.kr/1360000/WthrWrnInfoService';
const DEFAULT_TIDE_URL = 'https://apis.data.go.kr/1192136/tideFcstHghLw';
const DEFAULT_WATER_TEMP_URL = 'https://apis.data.go.kr/1192136/surveyWaterTemp';
const DEFAULT_SALINITY_URL = 'https://apis.data.go.kr/1192000/apVhdService_Tgcsy15';

type MarineForecastParams = {
  locationName?: string;
  nx?: number;
  ny?: number;
  stationCode?: string;
  salinityStationCode?: string;
  latitude?: number;
  longitude?: number;
};

type SourceResult<T> = {
  items: T[];
  status: MarineForecastApiStatus;
};

@Injectable()
export class ForecastsService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly httpClient: PublicApiHttpClient,
    private readonly prismaService: PrismaService
  ) {}

  async getTomorrowForecast(params: RouteSearchParams) {
    const cached = await this.cacheService.remember(
      CACHE_KEYS.tomorrowForecast(params.departure, params.arrival),
      CACHE_TTL_SECONDS.TOMORROW_FORECAST,
      () => this.ferryApiClient.getTomorrowForecast(params)
    );

    return toApiResponse(cached.value, cached);
  }

  async getMarineForecast(params: MarineForecastParams) {
    const normalized = normalizeMarineForecastParams(params);
    const cached = await this.cacheService.remember(
      CACHE_KEYS.marineForecast(normalized.locationName, normalized.nx, normalized.ny, normalized.stationCode, normalized.salinityStationCode),
      CACHE_TTL_SECONDS.MARINE_FORECAST,
      () => this.fetchMarineForecast(normalized)
    );

    return toApiResponse(cached.value, cached);
  }

  async getMarineForecastLocations() {
    const now = new Date().toISOString();
    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{
        id: string;
        label: string;
        helper: string;
        kind: 'PORT' | 'ISLAND' | 'SEA_AREA';
        aliases: string[];
        nx: number;
        ny: number;
        station_code: string;
        station_name: string;
        salinity_grid_code: string | null;
        latitude: unknown;
        longitude: unknown;
        source_note: string;
      }>
    >(
      `
        SELECT id, label, helper, kind, aliases, nx, ny, station_code, station_name,
               salinity_grid_code, latitude, longitude, source_note
        FROM marine_forecast_location
        ORDER BY label ASC
      `
    );
    const locations = rows.length > 0 ? rows.map((row) => ({
      id: row.id,
      label: row.label,
      helper: row.helper,
      kind: row.kind,
      aliases: row.aliases ?? [],
      nx: row.nx,
      ny: row.ny,
      stationCode: row.station_code,
      stationName: row.station_name,
      salinityGridCode: row.salinity_grid_code,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      sourceNote: row.source_note
    })) : getMarineForecastLocations();

    return {
      data: locations,
      meta: {
        source: rows.length > 0 ? 'marine-forecast-location-db' : 'marine-forecast-location-map',
        cached: false,
        fallback: rows.length === 0,
        updatedAt: now
      }
    };
  }

  private async fetchMarineForecast(params: Required<MarineForecastParams>): Promise<PublicApiResult<MarineForecastOverview>> {
    const [shortTerm, warning, tide, waterTemperature, salinity] = await Promise.all([
      this.fetchShortTermForecast(params),
      this.fetchWeatherWarnings(),
      this.fetchTideForecast(params),
      this.fetchWaterTemperature(params),
      this.fetchSalinity(params)
    ]);

    const riskLevel = calculateRiskLevel({
      shortTerm: shortTerm.items,
      warnings: warning.items,
      tides: tide.items,
      salinities: salinity.items
    });

    return {
      data: {
        locationName: params.locationName,
        generatedAt: new Date().toISOString(),
        summary: createMarineSummary(riskLevel, shortTerm.items, warning.items),
        riskLevel,
        shortTermForecasts: shortTerm.items,
        weatherWarnings: warning.items,
        tideForecasts: tide.items,
        waterTemperatures: waterTemperature.items,
        salinities: salinity.items,
        sourceSummary: {
          shortTerm: '기상청 단기예보 조회서비스',
          warning: '기상청 기상특보 조회서비스',
          tide: '국립해양조사원 조석예보(고, 저조)',
          waterTemperature: '국립해양조사원 조위관측소 실측 수온 조회',
          salinity: '해양수산부 연속정보 염분(15분)'
        },
        apiStatus: {
          shortTerm: shortTerm.status,
          warning: warning.status,
          tide: tide.status,
          waterTemperature: waterTemperature.status,
          salinity: salinity.status
        }
      },
      meta: {
        provider: 'KOMSA',
        source: 'weather-marine-integrated',
        fetchedAt: new Date().toISOString(),
        rawFormat: 'json'
      }
    };
  }

  private async fetchShortTermForecast(params: Required<MarineForecastParams>): Promise<SourceResult<MarineShortTermForecast>> {
    const serviceKey = this.getServiceKey();
    if (!serviceKey) return emptySource('단기예보 인증키가 설정되지 않았습니다.');

    try {
      const base = getShortTermBaseTime();
      const raw = await this.httpClient.getJson<unknown>(
        this.httpClient.createUrl(`${this.getShortTermUrl()}/getVilageFcst`, {
          serviceKey,
          pageNo: 1,
          numOfRows: 120,
          dataType: 'JSON',
          base_date: base.date,
          base_time: base.time,
          nx: params.nx,
          ny: params.ny
        })
      );
      const items = extractItems(raw)
        .map((item, index) => toShortTermForecast(item, index))
        .filter((item): item is MarineShortTermForecast => Boolean(item))
        .filter((item) => ['TMP', 'PTY', 'POP', 'SKY', 'WSD', 'WAV', 'PCP', 'REH'].includes(item.category))
        .slice(0, 16);

      return sourceFromItems(items, '단기예보 정보가 존재하지 않습니다.');
    } catch (error) {
      return errorSource(`단기예보 API 실패: ${toErrorMessage(error)}`);
    }
  }

  private async fetchWeatherWarnings(): Promise<SourceResult<MarineWeatherWarning>> {
    const serviceKey = this.getServiceKey();
    if (!serviceKey) return emptySource('기상특보 인증키가 설정되지 않았습니다.');

    try {
      const today = formatDate(new Date());
      const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const raw = await this.httpClient.getJson<unknown>(
        this.httpClient.createUrl(`${this.getWeatherWarningUrl()}/getWthrWrnMsg`, {
          serviceKey,
          pageNo: 1,
          numOfRows: 10,
          dataType: 'JSON',
          stnId: 108,
          fromTmFc: yesterday,
          toTmFc: today
        })
      );
      const items = extractItems(raw)
        .map((item, index) => toWeatherWarning(item, index))
        .filter((item): item is MarineWeatherWarning => Boolean(item))
        .slice(0, 5);

      return sourceFromItems(items, '기상특보 정보가 존재하지 않습니다.');
    } catch (error) {
      return errorSource(`기상특보 API 실패: ${toErrorMessage(error)}`);
    }
  }

  private async fetchTideForecast(params: Required<MarineForecastParams>): Promise<SourceResult<MarineTideForecast>> {
    const serviceKey = this.getServiceKey();
    if (!serviceKey) return emptySource('조석예보 인증키가 설정되지 않았습니다.');

    try {
      const raw = await this.httpClient.getXml<unknown>(
        this.httpClient.createUrl(`${this.getTideUrl()}/GetTideFcstHghLwApiService`, {
          serviceKey,
          type: 'xml',
          obsCode: params.stationCode,
          reqDate: formatDate(new Date())
        })
      );
      const items = extractItems(raw)
        .map((item, index) => toTideForecast(item, index))
        .filter((item): item is MarineTideForecast => Boolean(item))
        .slice(0, 8);

      return sourceFromItems(items, '조석예보 정보가 존재하지 않습니다.');
    } catch (error) {
      return errorSource(`조석예보 API 실패: ${toErrorMessage(error)}`);
    }
  }

  private async fetchWaterTemperature(params: Required<MarineForecastParams>): Promise<SourceResult<MarineWaterTemperature>> {
    const serviceKey = this.getServiceKey();
    if (!serviceKey) return emptySource('수온 인증키가 설정되지 않았습니다.');

    try {
      const raw = await this.httpClient.getXml<unknown>(
        this.httpClient.createUrl(`${this.getWaterTempUrl()}/GetSurveyWaterTempApiService`, {
          serviceKey,
          type: 'xml',
          obsCode: params.stationCode,
          reqDate: formatDate(new Date()),
          min: 60,
          pageNo: 1,
          numOfRows: 24
        })
      );
      const items = extractItems(raw)
        .map((item, index) => toWaterTemperature(item, index))
        .filter((item): item is MarineWaterTemperature => Boolean(item))
        .slice(0, 6);

      return sourceFromItems(items, '수온 정보가 존재하지 않습니다.');
    } catch (error) {
      return errorSource(`수온 API 실패: ${toErrorMessage(error)}`);
    }
  }

  private async fetchSalinity(params: Required<MarineForecastParams>): Promise<SourceResult<MarineSalinity>> {
    const serviceKey = this.getServiceKey();
    if (!serviceKey) return emptySource('염분 인증키가 설정되지 않았습니다.');

    try {
      const raw = await this.httpClient.getXml<unknown>(
        this.httpClient.createUrl(`${this.getSalinityUrl()}/getOpnTgcsy15`, {
          ServiceKey: serviceKey,
          pageNo: 1,
          numOfRows: 10,
          analsYmd: formatYearMonth(new Date()),
          gridCd: params.salinityStationCode
        })
      );
      const items = extractItems(raw)
        .map((item, index) => toSalinity(item, index))
        .filter((item): item is MarineSalinity => Boolean(item))
        .slice(0, 6);

      return sourceFromItems(items, '염분 정보가 존재하지 않습니다.');
    } catch (error) {
      return errorSource(`염분 API 실패: ${toErrorMessage(error)}`);
    }
  }

  private getServiceKey() {
    return (
      this.configService.get<string>('WEATHER_SERVICE_KEY') ??
      this.configService.get<string>('KHOA_SERVICE_KEY') ??
      this.configService.get<string>('DATA_GO_KR_SERVICE_KEY') ??
      this.configService.get<string>('PUBLIC_DATA_SERVICE_KEY')
    );
  }

  private getShortTermUrl() {
    return this.configService.get<string>('SHORT_TERM_FORECAST_API_URL') ?? DEFAULT_SHORT_TERM_URL;
  }

  private getWeatherWarningUrl() {
    return this.configService.get<string>('WEATHER_WARNING_API_URL') ?? DEFAULT_WEATHER_WARNING_URL;
  }

  private getTideUrl() {
    return this.configService.get<string>('TIDE_FORECAST_API_URL') ?? DEFAULT_TIDE_URL;
  }

  private getWaterTempUrl() {
    return this.configService.get<string>('WATER_TEMPERATURE_API_URL') ?? DEFAULT_WATER_TEMP_URL;
  }

  private getSalinityUrl() {
    return this.configService.get<string>('SALINITY_API_URL') ?? DEFAULT_SALINITY_URL;
  }
}

function normalizeMarineForecastParams(params: MarineForecastParams): Required<MarineForecastParams> {
  const preset = findMarineForecastLocation({
    locationName: params.locationName,
    latitude: params.latitude,
    longitude: params.longitude
  });

  return {
    locationName: params.locationName?.trim() || preset.label,
    nx: Number.isFinite(params.nx) ? Number(params.nx) : preset.nx,
    ny: Number.isFinite(params.ny) ? Number(params.ny) : preset.ny,
    stationCode: params.stationCode?.trim() || preset.stationCode,
    salinityStationCode: params.salinityStationCode?.trim() || preset.salinityStationCode,
    latitude: Number.isFinite(params.latitude) ? Number(params.latitude) : preset.latitude ?? 0,
    longitude: Number.isFinite(params.longitude) ? Number(params.longitude) : preset.longitude ?? 0
  };
}

function extractItems(raw: unknown): Record<string, unknown>[] {
  const candidates = [
    getPath(raw, ['response', 'body', 'items', 'item']),
    getPath(raw, ['response', 'body', 'item']),
    getPath(raw, ['response', 'body', 'body', 'item']),
    getPath(raw, ['body', 'items', 'item']),
    getPath(raw, ['body', 'item']),
    getPath(raw, ['items', 'item']),
    getPath(raw, ['result', 'data']),
    getPath(raw, ['data']),
    getPath(raw, ['response', 'body', 'items'])
  ];
  const found = candidates.find((value) => Array.isArray(value) || isRecord(value));
  const array = Array.isArray(found) ? found : found ? [found] : [];
  return array.filter(isRecord);
}

function getPath(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function pickString(item: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return null;
}

function toShortTermForecast(item: Record<string, unknown>, index: number): MarineShortTermForecast | null {
  const category = pickString(item, ['category']);
  const value = pickString(item, ['fcstValue']);
  if (!category || !value) return null;

  const meta = SHORT_TERM_CATEGORY_META[category] ?? { label: category, unit: null };
  return {
    id: `short-term-${category}-${index}`,
    forecastDate: pickString(item, ['fcstDate']),
    forecastTime: pickString(item, ['fcstTime']),
    category,
    label: meta.label,
    value: formatShortTermValue(category, value),
    unit: meta.unit
  };
}

function toWeatherWarning(item: Record<string, unknown>, index: number): MarineWeatherWarning | null {
  const title = pickString(item, ['title', 'wrnTitle', 'tmSeq']) ?? '기상특보';
  const message = pickString(item, ['t6', 'other', 'warnVar', 'content', 'wrnMsg', 'msg']) ?? title;

  return {
    id: `weather-warning-${index}`,
    title,
    areaName: pickString(item, ['stnNm', 'areaName', 'regUp', 'regUpKo']),
    issuedAt: pickString(item, ['tmFc', 'announceTime', 'issuedAt']),
    message
  };
}

function toTideForecast(item: Record<string, unknown>, index: number): MarineTideForecast | null {
  return {
    id: `tide-${index}`,
    stationName: pickString(item, ['obsvtrNm', 'obsName', 'obsPostName', 'stationName', 'obsnm']),
    eventType: formatTideEventType(pickString(item, ['extrSe', 'hlCode', 'tideType', 'eventType', 'hl_code'])),
    eventTime: pickString(item, ['predcDt', 'tphTime', 'tideTime', 'eventTime', 'tph_time']),
    tideLevel: pickString(item, ['predcTdlvVl', 'tphLevel', 'tideLevel', 'level', 'tph_level'])
  };
}

function toWaterTemperature(item: Record<string, unknown>, index: number): MarineWaterTemperature | null {
  return {
    id: `water-temp-${index}`,
    stationName: pickString(item, ['obsvtrNm', 'obsName', 'obsPostName', 'stationName', 'obsnm']),
    observedAt: pickString(item, ['obsrvnDt', 'obsTime', 'recordTime', 'observedAt', 'obs_time']),
    temperature: pickString(item, ['wtem', 'waterTemp', 'wtemp', 'temp', 'temperature', 'water_temp'])
  };
}

function toSalinity(item: Record<string, unknown>, index: number): MarineSalinity | null {
  return {
    id: `salinity-${index}`,
    stationName: pickString(item, ['gridCd', 'obsName', 'obsPostName', 'stationName', 'obsnm']),
    observedAt: pickString(item, ['analsYmd', 'obsTime', 'recordTime', 'observedAt', 'obs_time']),
    salinity: pickString(item, ['salinity', 'salt', 'slnty', 'value'])
  };
}

function sourceFromItems<T>(items: T[], emptyMessage: string): SourceResult<T> {
  return {
    items,
    status: items.length > 0 ? { status: 'OK', message: '정상 조회되었습니다.' } : { status: 'EMPTY', message: emptyMessage }
  };
}

function emptySource<T>(message: string): SourceResult<T> {
  return { items: [], status: { status: 'EMPTY', message } };
}

function errorSource<T>(message: string): SourceResult<T> {
  return { items: [], status: { status: 'ERROR', message } };
}

function calculateRiskLevel(params: {
  shortTerm: MarineShortTermForecast[];
  warnings: MarineWeatherWarning[];
  tides: MarineTideForecast[];
  salinities: MarineSalinity[];
}): RiskLevel {
  if (params.warnings.length > 0) return 'HIGH';

  const highWind = params.shortTerm.some((item) => item.category === 'WSD' && Number(item.value) >= 9);
  const precipitation = params.shortTerm.some((item) => item.category === 'PTY' && item.value !== '없음' && item.value !== '0');

  if (highWind || precipitation) return 'MEDIUM';
  return 'LOW';
}

function createMarineSummary(riskLevel: RiskLevel, shortTerm: MarineShortTermForecast[], warnings: MarineWeatherWarning[]) {
  if (riskLevel === 'HIGH') return '기상특보가 있어 출발 전 운항 공지와 항만 안내를 반드시 확인하세요.';
  if (riskLevel === 'MEDIUM') return '바람이나 강수 영향이 있을 수 있어 출항 전 최신 예보를 다시 확인하세요.';
  if (shortTerm.length === 0 && warnings.length === 0) return '일부 예보 API 응답이 비어 있습니다. 화면의 API 상태를 함께 확인하세요.';
  return '현재 조회 기준으로 큰 위험 신호는 낮지만, 출발 직전 운항 상태를 다시 확인하세요.';
}

function getShortTermBaseTime() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const ymd = formatDate(kst);
  const hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();
  const candidates = [2, 5, 8, 11, 14, 17, 20, 23];
  const available = candidates.filter((candidate) => candidate < hour || (candidate === hour && minute >= 10));
  const baseHour = available.at(-1);

  if (baseHour !== undefined) {
    return { date: ymd, time: `${String(baseHour).padStart(2, '0')}00` };
  }

  const yesterday = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
  return { date: formatDate(yesterday), time: '2300' };
}

function formatDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatYearMonth(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

function formatShortTermValue(category: string, value: string) {
  if (category === 'PTY') {
    return (
      {
        '0': '없음',
        '1': '비',
        '2': '비/눈',
        '3': '눈',
        '4': '소나기'
      }[value] ?? value
    );
  }

  if (category === 'SKY') {
    return (
      {
        '1': '맑음',
        '3': '구름많음',
        '4': '흐림'
      }[value] ?? value
    );
  }

  return value;
}

function formatTideEventType(value: string | null) {
  if (!value) return null;
  return (
    {
      '1': '고조',
      '2': '저조',
      '3': '고조',
      '4': '저조'
    }[value] ?? value
  );
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

const SHORT_TERM_CATEGORY_META: Record<string, { label: string; unit: string | null }> = {
  TMP: { label: '기온', unit: '°C' },
  PTY: { label: '강수형태', unit: null },
  POP: { label: '강수확률', unit: '%' },
  SKY: { label: '하늘상태', unit: null },
  WSD: { label: '풍속', unit: 'm/s' },
  WAV: { label: '파고', unit: 'm' },
  PCP: { label: '강수량', unit: null },
  REH: { label: '습도', unit: '%' }
};
