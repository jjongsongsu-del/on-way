import type { ForecastStatus } from '../constants/forecast-status';
import type { SailingStatus } from '../constants/sailing-status';

export type RouteSummary = {
  id: string;
  departurePortName: string;
  arrivalPortName: string;
  operationRouteName: string;
};

export type SailingScheduleSummary = {
  id: string;
  sailingDate: string;
  departureTime: string;
  departurePortName: string;
  arrivalPortName: string;
  vesselName: string;
  status: SailingStatus;
  controlReason?: string;
};

export type TodayStatusSummary = {
  route: RouteSummary;
  status: SailingStatus;
  nextDeparture?: SailingScheduleSummary;
  updatedAt: string;
};

export type TomorrowForecastSummary = {
  route: RouteSummary;
  status: ForecastStatus;
  reason?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  updatedAt: string;
};

