import { z } from 'zod';
import { favoriteTypeSchema, platformSchema, sailingStatusSchema } from './domain.schema';

export const routeSearchQuerySchema = z.object({
  departure: z.string().min(1),
  arrival: z.string().min(1)
});

export const scheduleQuerySchema = routeSearchQuerySchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const todayStatusQuerySchema = routeSearchQuerySchema;

export const tomorrowForecastQuerySchema = routeSearchQuerySchema;

export const createFavoriteRequestSchema = z.object({
  userId: z.string().min(1),
  favoriteType: favoriteTypeSchema,
  targetId: z.string().min(1),
  notificationEnabled: z.boolean().default(true)
});

export const updateNotificationRuleRequestSchema = z.object({
  notifyStatusChange: z.boolean().optional(),
  notifyDepartureMinutesBefore: z.number().int().min(5).max(1440).nullable().optional(),
  notifyForecastUpdate: z.boolean().optional()
});

export const registerPushTokenRequestSchema = z.object({
  deviceId: z.string().min(1),
  platform: platformSchema,
  token: z.string().min(1),
  provider: z.enum(['EXPO', 'FCM', 'APNS'])
});

export const scheduleFilterSchema = z.object({
  status: sailingStatusSchema.optional(),
  onlyDisrupted: z.boolean().optional()
});

