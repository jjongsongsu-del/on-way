import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { StatusesController } from './statuses.controller';
import { StatusesService } from './statuses.service';

@Module({
  imports: [CacheModule, PublicApiModule],
  controllers: [StatusesController],
  providers: [StatusesService]
})
export class StatusesModule {}

