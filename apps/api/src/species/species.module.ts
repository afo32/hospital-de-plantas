import { Module } from '@nestjs/common';
import { UsageService } from '../usage/usage.service.js';
import { GbifProvider } from './providers/gbif.provider.js';
import { PlantNetProvider } from './providers/plantnet.provider.js';
import { ProfileGenerator } from './providers/profile.generator.js';
import { WikipediaProvider } from './providers/wikipedia.provider.js';
import { SpeciesController } from './species.controller.js';
import { SpeciesService } from './species.service.js';

@Module({
  controllers: [SpeciesController],
  providers: [SpeciesService, GbifProvider, WikipediaProvider, PlantNetProvider, ProfileGenerator, UsageService],
  exports: [SpeciesService],
})
export class SpeciesModule {}
