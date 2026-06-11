import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { DatabaseModule } from '../database/database.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { ForecastsController } from './forecasts.controller';
import { ForecastsService } from './forecasts.service';

@Module({
  imports: [CacheModule, DatabaseModule, PublicApiModule],
  controllers: [ForecastsController],
  providers: [ForecastsService]
})
export class ForecastsModule {}
