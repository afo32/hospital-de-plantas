import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createNoteSchema, type CreateNoteInput, type Note, type NoteList, updateNoteSchema, type UpdateNoteInput } from '@hdp/shared';
import { z } from 'zod';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { NotesService } from './notes.service.js';

const uuid = z.uuid('Id no válido');

@ApiTags('notas')
@ApiBearerAuth()
@Controller()
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get('plants/:id/notes')
  async list(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<NoteList> {
    return { notes: await this.notes.list(userId, id) };
  }

  /** Nota nueva: { text?, photos?: [base64…] } (máximo 4 fotos). */
  @Post('plants/:id/notes')
  create(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: createNoteSchema }) body: CreateNoteInput,
  ): Promise<Note> {
    return this.notes.create(userId, id, body);
  }

  @Patch('notes/:noteId')
  update(
    @CurrentUserId() userId: string,
    @Param('noteId', { schema: uuid }) noteId: string,
    @Body({ schema: updateNoteSchema }) body: UpdateNoteInput,
  ): Promise<Note> {
    return this.notes.update(userId, noteId, body);
  }

  @Delete('notes/:noteId')
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string, @Param('noteId', { schema: uuid }) noteId: string): Promise<void> {
    await this.notes.remove(userId, noteId);
  }
}
