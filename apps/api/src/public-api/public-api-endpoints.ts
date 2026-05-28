export type PublicDataFormat = 'json' | 'xml' | 'json+xml';

export type PublicDataEndpoint = {
  id: string;
  provider: 'KOMSA' | 'INCHEON_PORT';
  name: string;
  dataGoKrUrl: string;
  baseUrl: string;
  operationPath: string;
  format: PublicDataFormat;
  defaultParams?: Record<string, string | number>;
  note?: string;
};

export const KOMSA_ENDPOINTS = {
  schedule: {
    id: 'komsa-operation-schedule',
    provider: 'KOMSA',
    name: 'KOMSA operation schedule',
    dataGoKrUrl: 'https://www.data.go.kr/data/15142302/openapi.do',
    baseUrl: 'https://apis.data.go.kr/B554035/oprt-schd-info-v2',
    operationPath: '/get-oprt-schd-info-v2',
    format: 'json+xml',
    defaultParams: { pageNo: 1, numOfRows: 100, dataType: 'JSON' }
  },
  route: {
    id: 'komsa-operation-route',
    provider: 'KOMSA',
    name: 'KOMSA operation route',
    dataGoKrUrl: 'https://www.data.go.kr/data/15142301/openapi.do',
    baseUrl: 'https://apis.data.go.kr/B554035/oprt-rt-info-v3',
    operationPath: '/get-oprt-rt-info-v3',
    format: 'json',
    defaultParams: { pageNo: 1, numOfRows: 100 }
  },
  ferryStatus: {
    id: 'komsa-ferry-route-status',
    provider: 'KOMSA',
    name: 'KOMSA ferry route status',
    dataGoKrUrl: 'https://www.data.go.kr/data/15142304/openapi.do',
    baseUrl: 'https://apis.data.go.kr/B554035/ferry-route-info-v4',
    operationPath: '/get-ferry-route-info-v4',
    format: 'json+xml',
    defaultParams: { pageNo: 1, numOfRows: 100, dataType: 'JSON' },
    note: 'May be unavailable while vessel position integration is suspended.'
  },
  tomorrowForecast: {
    id: 'komsa-tomorrow-forecast',
    provider: 'KOMSA',
    name: 'KOMSA tomorrow forecast',
    dataGoKrUrl: 'https://www.data.go.kr/data/15131259/openapi.do',
    baseUrl: 'https://apis.data.go.kr/B554035/tmr-forecast',
    operationPath: '/get_tmr-forecast',
    format: 'json',
    defaultParams: { pageNo: 1, numOfRows: 100 }
  },
  realtimeTraffic: {
    id: 'komsa-realtime-traffic',
    provider: 'KOMSA',
    name: 'KOMSA realtime marine traffic',
    dataGoKrUrl: 'https://www.data.go.kr/data/15128233/openapi.do',
    baseUrl: 'https://apis.data.go.kr/B554035/realtime',
    operationPath: '/get_realtime',
    format: 'json+xml',
    defaultParams: { pageNo: 1, numOfRows: 100, dataType: 'JSON' }
  },
  tomorrowForecastDetail: {
    id: 'komsa-tomorrow-forecast-detail',
    provider: 'KOMSA',
    name: 'KOMSA tomorrow forecast detail',
    dataGoKrUrl: 'https://www.data.go.kr/data/15144520/openapi.do',
    baseUrl: 'https://apis.data.go.kr/B554035/tmr-forecastnew',
    operationPath: '/get_tmr_forecastnew',
    format: 'json',
    defaultParams: { pageNo: 1, numOfRows: 100 }
  },
  operationLine: {
    id: 'komsa-operation-line',
    provider: 'KOMSA',
    name: 'KOMSA operation line',
    dataGoKrUrl: 'https://www.data.go.kr/data/15157337/openapi.do',
    baseUrl: 'https://apis.data.go.kr/B554035/oprt-line-info-v2',
    operationPath: '/get-oprt-line-info-v2',
    format: 'json+xml',
    defaultParams: { pageNo: 1, numOfRows: 100, dataType: 'JSON' }
  }
} satisfies Record<string, PublicDataEndpoint>;

export const INCHEON_PORT_ENDPOINTS = {
  terminalNavigation: {
    id: 'incheon-terminal-navigation',
    provider: 'INCHEON_PORT',
    name: 'Incheon passenger terminal realtime navigation',
    dataGoKrUrl: 'https://www.data.go.kr/data/15157686/openapi.do',
    baseUrl: 'https://apis.data.go.kr/B551504/ipaFerryNavigatInfo',
    operationPath: '/getIntrlNvgList',
    format: 'xml',
    defaultParams: { pageNo: 1, numOfRows: 100, skipRow: 0, endRow: 100 }
  }
} satisfies Record<string, PublicDataEndpoint>;

export const PUBLIC_DATA_ENDPOINTS = {
  ...KOMSA_ENDPOINTS,
  ...INCHEON_PORT_ENDPOINTS
} as const;
