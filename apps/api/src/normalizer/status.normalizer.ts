import { FORECAST_STATUS, RISK_LEVEL, SAILING_STATUS } from '@badagil/shared';
import type { ForecastStatus, RiskLevel, SailingStatus } from '@badagil/shared';

const normalizeText = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

export function normalizeSailingStatus(rawStatus: string | null | undefined): SailingStatus {
  const value = normalizeText(rawStatus);

  if (!value) {
    return SAILING_STATUS.UNKNOWN;
  }

  if (value.includes('결항') || value.includes('취소') || value.includes('중지')) {
    return SAILING_STATUS.CANCELED;
  }

  if (value.includes('통제') || value.includes('운항통제')) {
    return SAILING_STATUS.CONTROLLED;
  }

  if (value.includes('지연') || value.includes('연착')) {
    return SAILING_STATUS.DELAYED;
  }

  if (value.includes('완료') || value.includes('입항')) {
    return SAILING_STATUS.COMPLETED;
  }

  if (value.includes('예정') || value.includes('대기') || value.includes('준비')) {
    return SAILING_STATUS.SCHEDULED;
  }

  if (value.includes('정상') || value.includes('운항') || value.includes('출항')) {
    return SAILING_STATUS.NORMAL;
  }

  return SAILING_STATUS.UNKNOWN;
}

export function normalizeForecastStatus(rawStatus: string | null | undefined): ForecastStatus {
  const value = normalizeText(rawStatus);

  if (!value) {
    return FORECAST_STATUS.UNKNOWN;
  }

  if (value.includes('불가') || value.includes('어려') || value.includes('결항')) {
    return FORECAST_STATUS.UNAVAILABLE;
  }

  if (value.includes('통제')) {
    return FORECAST_STATUS.CONTROL_POSSIBLE;
  }

  if (value.includes('불확실') || value.includes('미정')) {
    return FORECAST_STATUS.UNCERTAIN;
  }

  if (value.includes('주의') || value.includes('유의')) {
    return FORECAST_STATUS.CAUTION;
  }

  if (value.includes('가능') || value.includes('양호') || value.includes('정상')) {
    return FORECAST_STATUS.AVAILABLE;
  }

  return FORECAST_STATUS.UNKNOWN;
}

export function normalizeRiskLevel(rawValue: string | null | undefined): RiskLevel {
  const value = normalizeText(rawValue);

  if (!value) {
    return RISK_LEVEL.UNKNOWN;
  }

  if (value.includes('높') || value.includes('위험') || value.includes('강')) {
    return RISK_LEVEL.HIGH;
  }

  if (value.includes('보통') || value.includes('중')) {
    return RISK_LEVEL.MEDIUM;
  }

  if (value.includes('낮') || value.includes('양호') || value.includes('약')) {
    return RISK_LEVEL.LOW;
  }

  return RISK_LEVEL.UNKNOWN;
}
