import { Module } from '@nestjs/common';
import { KomsaVesselScraperService } from './komsa-vessel-scraper.service';
import { VesselsController } from './vessels.controller';
import { VesselsRepository } from './vessels.repository';
import { VesselsService } from './vessels.service';

@Module({
  controllers: [VesselsController],
  providers: [KomsaVesselScraperService, VesselsRepository, VesselsService],
  exports: [VesselsService]
})
export class VesselsModule {}
