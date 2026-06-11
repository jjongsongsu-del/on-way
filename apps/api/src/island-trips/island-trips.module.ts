import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { IslandTripsController } from './island-trips.controller';
import { IslandTripsService } from './island-trips.service';

@Module({
  imports: [DatabaseModule, PublicApiModule],
  controllers: [IslandTripsController],
  providers: [IslandTripsService]
})
export class IslandTripsModule {}
