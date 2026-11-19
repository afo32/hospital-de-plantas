import { Module } from '@nestjs/common';
import { GardenModule } from '../garden/garden.module.js';
import { SharingController } from './sharing.controller.js';
import { SharingService } from './sharing.service.js';

@Module({
  imports: [GardenModule],
  controllers: [SharingController],
  providers: [SharingService],
})
export class SharingModule {}
