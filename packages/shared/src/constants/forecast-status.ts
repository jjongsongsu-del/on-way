export const FORECAST_STATUS = {
  AVAILABLE: 'AVAILABLE',
  CAUTION: 'CAUTION',
  UNCERTAIN: 'UNCERTAIN',
  CONTROL_POSSIBLE: 'CONTROL_POSSIBLE',
  UNAVAILABLE: 'UNAVAILABLE',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ForecastStatus = (typeof FORECAST_STATUS)[keyof typeof FORECAST_STATUS];

export const FORECAST_STATUS_LABEL: Record<ForecastStatus, string> = {
  AVAILABLE: '운항 가능',
  CAUTION: '주의',
  UNCERTAIN: '불확실',
  CONTROL_POSSIBLE: '통제 가능성',
  UNAVAILABLE: '운항 어려움',
  UNKNOWN: '정보 없음'
};
