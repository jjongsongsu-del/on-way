import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { DatabaseModule } from '../database/database.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [CacheModule, DatabaseModule, PublicApiModule],
  controllers: [RoutesController],
  providers: [RoutesService]
})
export class RoutesModule {}
