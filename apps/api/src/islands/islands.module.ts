import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { IslandsController } from './islands.controller';
import { IslandsService } from './islands.service';

@Module({
  imports: [CacheModule],
  controllers: [IslandsController],
  providers: [IslandsService]
})
export class IslandsModule {}
