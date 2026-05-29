import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { ForecastsModule } from './forecasts/forecasts.module';
import { HealthModule } from './health/health.module';
import { IslandsModule } from './islands/islands.module';
import { IslandTripsModule } from './island-trips/island-trips.module';
import { PortsModule } from './ports/ports.module';
import { RoutesModule } from './routes/routes.module';
import { SchedulesModule } from './schedules/schedules.module';
import { StatusesModule } from './statuses/statuses.module';
import { VesselsModule } from './vessels/vessels.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env']
    }),
    DatabaseModule,
    AdminModule,
    HealthModule,
    IslandsModule,
    IslandTripsModule,
    PortsModule,
    RoutesModule,
    SchedulesModule,
    StatusesModule,
    ForecastsModule,
    VesselsModule
  ]
})
export class AppModule {}
