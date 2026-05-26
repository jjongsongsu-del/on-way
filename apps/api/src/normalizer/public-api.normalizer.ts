import type { ApiResponse } from '@badagil/shared';
import type { PublicApiResult } from '../public-api/types/public-api.types';

export function toApiResponse<T>(
  result: PublicApiResult<T>,
  options: {
    cached?: boolean;
    fallback?: boolean;
    updatedAt?: string;
  } = {}
): ApiResponse<T> {
  return {
    data: result.data,
    meta: {
      source: result.meta.source,
      cached: options.cached ?? false,
      fallback: options.fallback ?? false,
      updatedAt: options.updatedAt ?? result.meta.fetchedAt
    }
  };
}

