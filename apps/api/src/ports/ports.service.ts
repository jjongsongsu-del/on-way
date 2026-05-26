import { Inject, Injectable } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { FERRY_API_CLIENT } from '../public-api/public-api.tokens';
import type { PublicFerryApiClient } from '../public-api/types/public-api.types';

@Injectable()
export class PortsService {
  constructor(
    @Inject(FERRY_API_CLIENT) private readonly ferryApiClient: PublicFerryApiClient,
    private readonly cacheService: CacheService
  ) {}

  async getPorts() {
    const cached = await this.cacheService.remember(CACHE_KEYS.ports(), CACHE_TTL_SECONDS.PORTS, () =>
      this.ferryApiClient.getPorts()
    );

    return toApiResponse(cached.value, cached);
  }
}

