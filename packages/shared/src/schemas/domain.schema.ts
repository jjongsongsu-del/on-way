import { z } from 'zod';
import { FAVORITE_TYPE } from '../constants/favorite-type';
import { FORECAST_STATUS } from '../constants/forecast-status';
import { PLATFORM } from '../constants/platform';
import { RISK_LEVEL } from '../constants/risk-level';
import { SAILING_STATUS } from '../constants/sailing-status';

export const sailingStatusSchema = z.enum([
  SAILING_STATUS.NORMAL,
  SAILING_STATUS.SCHEDULED,
  SAILING_STATUS.DELAYED,
  SAILING_STATUS.CANCELED,
  SAILING_STATUS.CONTROLLED,
  SAILING_STATUS.COMPLETED,
  SAILING_STATUS.UNKNOWN
]);

export const forecastStatusSchema = z.enum([
  FORECAST_STATUS.AVAILABLE,
  FORECAST_STATUS.CAUTION,
  FORECAST_STATUS.UNCERTAIN,
  FORECAST_STATUS.CONTROL_POSSIBLE,
  FORECAST_STATUS.UNAVAILABLE,
  FORECAST_STATUS.UNKNOWN
]);

export const riskLevelSchema = z.enum([
  RISK_LEVEL.LOW,
  RISK_LEVEL.MEDIUM,
  RISK_LEVEL.HIGH,
  RISK_LEVEL.UNKNOWN
]);

export const favoriteTypeSchema = z.enum([
  FAVORITE_TYPE.ROUTE,
  FAVORITE_TYPE.VESSEL,
  FAVORITE_TYPE.TERMINAL,
  FAVORITE_TYPE.PORT
]);

export const platformSchema = z.enum([
  PLATFORM.IOS,
  PLATFORM.ANDROID,
  PLATFORM.WEB,
  PLATFORM.UNKNOWN
]);

export const portSchema = z.object({
  id: z.string(),
  portCode: z.string(),
  portName: z.string(),
  regionName: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable()
});

export const terminalSchema = z.object({
  id: z.string(),
  portId: z.string().nullable(),
  terminalCode: z.string().nullable(),
  terminalName: z.string(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  mapUrl: z.string().nullable()
});

export const routeSummarySchema = z.object({
  id: z.string(),
  departurePortName: z.string(),
  arrivalPortName: z.string(),
  operationRouteName: z.string(),
  licenseRouteName: z.string().nullable(),
  provider: z.string()
});

export const routeStopSchema = z.object({
  id: z.string(),
  routeId: z.string(),
  stopSequence: z.number().int(),
  portCode: z.string().nullable(),
  portName: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable()
});

export const vesselSchema = z.object({
  id: z.string(),
  vesselCode: z.string().nullable(),
  vesselName: z.string(),
  passengerCapacity: z.number().int().nullable(),
  operatorName: z.string().nullable()
});

export const sailingScheduleSummarySchema = z.object({
  id: z.string(),
  sailingDate: z.string(),
  departureTime: z.string(),
  departurePortName: z.string(),
  arrivalPortName: z.string(),
  routeId: z.string().nullable(),
  vesselId: z.string().nullable(),
  vesselName: z.string().nullable(),
  status: sailingStatusSchema,
  controlReason: z.string().nullable(),
  passengerCapacity: z.number().int().nullable()
});

export const todayStatusSummarySchema = z.object({
  route: routeSummarySchema,
  status: sailingStatusSchema,
  nextDeparture: sailingScheduleSummarySchema.nullable(),
  updatedAt: z.string()
});

export const tomorrowForecastSummarySchema = z.object({
  route: routeSummarySchema,
  status: forecastStatusSchema,
  reason: z.string().nullable(),
  weatherSummary: z.string().nullable(),
  riskLevel: riskLevelSchema,
  updatedAt: z.string()
});

export const favoriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  favoriteType: favoriteTypeSchema,
  targetId: z.string(),
  notificationEnabled: z.boolean(),
  createdAt: z.string()
});

export const notificationRuleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  favoriteId: z.string().nullable(),
  notifyStatusChange: z.boolean(),
  notifyDepartureMinutesBefore: z.number().int().nullable(),
  notifyForecastUpdate: z.boolean(),
  updatedAt: z.string()
});

