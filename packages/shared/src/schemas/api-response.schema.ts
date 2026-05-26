import { z } from 'zod';

export const apiMetaSchema = z.object({
  source: z.string().optional(),
  cached: z.boolean().optional(),
  updatedAt: z.string()
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  userMessage: z.string().optional()
});

export const createApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: apiMetaSchema
  });

export type ApiMeta = z.infer<typeof apiMetaSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

