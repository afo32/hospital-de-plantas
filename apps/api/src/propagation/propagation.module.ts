import { Module } from '@nestjs/common';
import { GardenModule } from '../garden/garden.module.js';
import { UsageService } from '../usage/usage.service.js';
import { GuideGenerator } from './guide.generator.js';
import { PropagationController } from './propagation.controller.js';
import { PropagationService } from './propagation.service.js';

@Module({
  imports: [GardenModule],
  controllers: [PropagationController],
  providers: [PropagationService, GuideGenerator, UsageService],
})
export class PropagationModule {}
