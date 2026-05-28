import { Module } from '@nestjs/common';
import { VesselsModule } from '../vessels/vessels.module';
import { AdminVesselsController } from './admin-vessels.controller';

@Module({
  imports: [VesselsModule],
  controllers: [AdminVesselsController]
})
export class AdminModule {}
