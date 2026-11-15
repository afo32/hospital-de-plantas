import { Module } from '@nestjs/common';
import { GardenModule } from '../garden/garden.module.js';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';

@Module({
  imports: [GardenModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
