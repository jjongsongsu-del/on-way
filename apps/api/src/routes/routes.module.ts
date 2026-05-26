import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [CacheModule, PublicApiModule],
  controllers: [RoutesController],
  providers: [RoutesService]
})
export class RoutesModule {}

