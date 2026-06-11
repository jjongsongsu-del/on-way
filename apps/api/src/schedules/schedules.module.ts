import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { DatabaseModule } from '../database/database.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [CacheModule, DatabaseModule, PublicApiModule],
  controllers: [SchedulesController],
  providers: [SchedulesService]
})
export class SchedulesModule {}
