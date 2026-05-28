import type { VesselDetail } from '@badagil/shared';

export type VesselDetailRecord = VesselDetail;

export type KomsaVesselScrapeItem = Omit<VesselDetailRecord, 'id' | 'collectedAt'>;

export type VesselSyncResult = {
  collected: number;
  upserted: number;
  failed: number;
  pages: number;
  startedAt: string;
  finishedAt: string;
};
