import type { ApiResponse, MarineForecastLocation, MarineForecastOverview } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

export type MarineForecastFilters = {
  locationName?: string;
  nx?: number;
  ny?: number;
  stationCode?: string;
  salinityStationCode?: string;
};

export async function fetchMarineForecast(filters: MarineForecastFilters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });

  const suffix = searchParams.toString();
  const response = await requestJson<ApiResponse<MarineForecastOverview>>(
    `${API_BASE_URL}/forecasts/marine${suffix ? `?${suffix}` : ''}`
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return normalizeMarineForecast(response.body.data);
}

export async function fetchMarineForecastLocations() {
  const response = await requestJson<ApiResponse<MarineForecastLocation[]>>(`${API_BASE_URL}/forecasts/marine/locations`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.body.data ?? [];
}

function normalizeMarineForecast(data: MarineForecastOverview): MarineForecastOverview {
  return {
    ...data,
    shortTermForecasts: data.shortTermForecasts ?? [],
    weatherWarnings: data.weatherWarnings ?? [],
    tideForecasts: data.tideForecasts ?? [],
    waterTemperatures: data.waterTemperatures ?? [],
    salinities: data.salinities ?? [],
    sourceSummary: {
      shortTerm: data.sourceSummary?.shortTerm ?? '기상청 단기예보 조회서비스',
      warning: data.sourceSummary?.warning ?? '기상청 기상특보 조회서비스',
      tide: data.sourceSummary?.tide ?? '국립해양조사원 조석예보',
      waterTemperature: data.sourceSummary?.waterTemperature ?? '국립해양조사원 수온 조회',
      salinity: data.sourceSummary?.salinity ?? '해양수산부 염분 조회'
    },
    apiStatus: {
      shortTerm: data.apiStatus?.shortTerm ?? { status: 'EMPTY', message: '단기예보 정보가 존재하지 않습니다.' },
      warning: data.apiStatus?.warning ?? { status: 'EMPTY', message: '기상특보 정보가 존재하지 않습니다.' },
      tide: data.apiStatus?.tide ?? { status: 'EMPTY', message: '조석예보 정보가 존재하지 않습니다.' },
      waterTemperature: data.apiStatus?.waterTemperature ?? { status: 'EMPTY', message: '수온 정보가 존재하지 않습니다.' },
      salinity: data.apiStatus?.salinity ?? { status: 'EMPTY', message: '염분 정보가 존재하지 않습니다.' }
    }
  };
}
