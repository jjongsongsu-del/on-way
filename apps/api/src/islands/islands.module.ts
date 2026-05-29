import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { IslandsController } from './islands.controller';
import { IslandsService } from './islands.service';

@Module({
  imports: [CacheModule, PublicApiModule],
  controllers: [IslandsController],
  providers: [IslandsService]
})
export class IslandsModule {}
