import { Module } from '@nestjs/common';
import { LegalController } from '../legal/legal.controller.js';
import { HealthController } from './health.controller.js';

@Module({ controllers: [HealthController, LegalController] })
export class HealthModule {}
