import { Injectable, NotFoundException } from '@nestjs/common';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { KomsaVesselScraperService } from './komsa-vessel-scraper.service';
import type { VesselSyncResult } from './vessel-detail.types';
import { VesselsRepository } from './vessels.repository';

@Injectable()
export class VesselsService {
  constructor(
    private readonly scraper: KomsaVesselScraperService,
    private readonly repository: VesselsRepository
  ) {}

  async findDetailByName(vesselName: string) {
    const detail = await this.repository.findByName(vesselName);
    if (!detail) {
      throw new NotFoundException({
        code: 'VESSEL_DETAIL_NOT_FOUND',
        message: 'Vessel detail was not found',
        userMessage: '여객선 상세정보가 아직 수집되지 않았습니다.'
      });
    }

    return toApiResponse(
      {
        data: detail,
        meta: {
          provider: 'KOMSA',
          source: 'komsa-vessel-detail-db',
          fetchedAt: new Date().toISOString(),
          rawFormat: 'json'
        }
      },
      { cached: false, updatedAt: new Date().toISOString() }
    );
  }

  async syncFromKomsa(maxPages = 26): Promise<VesselSyncResult> {
    const startedAt = new Date().toISOString();
    const items = await this.scraper.scrapeAll(maxPages);
    const upserted = await this.repository.upsertMany(items);

    return {
      collected: items.length,
      upserted,
      failed: Math.max(items.length - upserted, 0),
      pages: maxPages,
      startedAt,
      finishedAt: new Date().toISOString()
    };
  }
}
