import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ForecastsModule } from './forecasts/forecasts.module';
import { HealthModule } from './health/health.module';
import { PortsModule } from './ports/ports.module';
import { RoutesModule } from './routes/routes.module';
import { SchedulesModule } from './schedules/schedules.module';
import { StatusesModule } from './statuses/statuses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env']
    }),
    HealthModule,
    PortsModule,
    RoutesModule,
    SchedulesModule,
    StatusesModule,
    ForecastsModule
  ]
})
export class AppModule {}
