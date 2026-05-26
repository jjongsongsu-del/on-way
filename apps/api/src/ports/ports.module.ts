import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { PortsController } from './ports.controller';
import { PortsService } from './ports.service';

@Module({
  imports: [CacheModule, PublicApiModule],
  controllers: [PortsController],
  providers: [PortsService]
})
export class PortsModule {}

