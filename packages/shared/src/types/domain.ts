import type { ForecastStatus } from '../constants/forecast-status';
import type { FavoriteType } from '../constants/favorite-type';
import type { RiskLevel } from '../constants/risk-level';
import type { SailingStatus } from '../constants/sailing-status';

export type Port = {
  id: string;
  portCode: string;
  portName: string;
  regionName: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Terminal = {
  id: string;
  portId: string | null;
  terminalCode: string | null;
  terminalName: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
};

export type RouteSummary = {
  id: string;
  departurePortName: string;
  arrivalPortName: string;
  operationRouteName: string;
  licenseRouteName: string | null;
  provider: string;
};

export type RouteStop = {
  id: string;
  routeId: string;
  stopSequence: number;
  portCode: string | null;
  portName: string;
  latitude: number | null;
  longitude: number | null;
};

export type Vessel = {
  id: string;
  vesselCode: string | null;
  vesselName: string;
  passengerCapacity: number | null;
  operatorName: string | null;
};

export type SailingScheduleSummary = {
  id: string;
  sailingDate: string;
  departureTime: string;
  departurePortName: string;
  arrivalPortName: string;
  routeId: string | null;
  vesselId: string | null;
  vesselName: string | null;
  status: SailingStatus;
  controlReason: string | null;
  passengerCapacity: number | null;
};

export type TodayStatusSummary = {
  route: RouteSummary;
  status: SailingStatus;
  nextDeparture: SailingScheduleSummary | null;
  updatedAt: string;
};

export type TomorrowForecastSummary = {
  route: RouteSummary;
  status: ForecastStatus;
  reason: string | null;
  weatherSummary: string | null;
  riskLevel: RiskLevel;
  updatedAt: string;
};

export type UserFavorite = {
  id: string;
  userId: string;
  favoriteType: FavoriteType;
  targetId: string;
  notificationEnabled: boolean;
  createdAt: string;
};

export type NotificationRule = {
  id: string;
  userId: string;
  favoriteId: string | null;
  notifyStatusChange: boolean;
  notifyDepartureMinutesBefore: number | null;
  notifyForecastUpdate: boolean;
  updatedAt: string;
};
