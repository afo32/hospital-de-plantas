import { Module } from '@nestjs/common';
import { GardenController, PlantsController } from './garden.controller.js';
import { GardenService } from './garden.service.js';

@Module({
  controllers: [GardenController, PlantsController],
  providers: [GardenService],
  exports: [GardenService],
})
export class GardenModule {}
