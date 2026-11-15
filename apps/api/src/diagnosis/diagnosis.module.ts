import { Module } from '@nestjs/common';
import { GardenModule } from '../garden/garden.module.js';
import { UsageService } from '../usage/usage.service.js';
import { DiagnosisAi } from './diagnosis.ai.js';
import { DiagnosisController } from './diagnosis.controller.js';
import { DiagnosisService } from './diagnosis.service.js';

@Module({
  imports: [GardenModule],
  controllers: [DiagnosisController],
  providers: [DiagnosisService, DiagnosisAi, UsageService],
})
export class DiagnosisModule {}
