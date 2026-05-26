import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { ForecastsController } from './forecasts.controller';
import { ForecastsService } from './forecasts.service';

@Module({
  imports: [CacheModule, PublicApiModule],
  controllers: [ForecastsController],
  providers: [ForecastsService]
})
export class ForecastsModule {}

