import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  answerDiagnosisSchema,
  type AnswerDiagnosisInput,
  type Diagnosis,
  type DiagnosisList,
  startDiagnosisSchema,
  type StartDiagnosisInput,
  updateDiagnosisSchema,
} from '@hdp/shared';
import { z } from 'zod';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { DiagnosisService } from './diagnosis.service.js';

const uuid = z.uuid('Id no válido');

@ApiTags('salud')
@ApiBearerAuth()
@Controller()
export class DiagnosisController {
  constructor(private readonly diagnosis: DiagnosisService) {}

  @Get('plants/:id/diagnoses')
  async list(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<DiagnosisList> {
    return { diagnoses: await this.diagnosis.list(userId, id) };
  }

  /** Paso 1: { photos: [base64] (1-3), symptoms? }. Devuelve lo que se ve y las preguntas. */
  @Post('plants/:id/diagnoses')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  start(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: startDiagnosisSchema }) body: StartDiagnosisInput,
  ): Promise<Diagnosis> {
    return this.diagnosis.start(userId, id, body);
  }

  @Get('diagnoses/:diagId')
  get(@CurrentUserId() userId: string, @Param('diagId', { schema: uuid }) diagId: string): Promise<Diagnosis> {
    return this.diagnosis.get(userId, diagId);
  }

  /** Paso 2: { answers: [{ questionId, value }] }. Devuelve el diagnóstico con el plan de tratamiento. */
  @Post('diagnoses/:diagId/answers')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  answer(
    @CurrentUserId() userId: string,
    @Param('diagId', { schema: uuid }) diagId: string,
    @Body({ schema: answerDiagnosisSchema }) body: AnswerDiagnosisInput,
  ): Promise<Diagnosis> {
    return this.diagnosis.answer(userId, diagId, body.answers);
  }

  /** { status: "resolved" } para marcarla como curada, "done" para reabrir. */
  @Patch('diagnoses/:diagId')
  update(
    @CurrentUserId() userId: string,
    @Param('diagId', { schema: uuid }) diagId: string,
    @Body({ schema: updateDiagnosisSchema }) body: { status: 'done' | 'resolved' },
  ): Promise<Diagnosis> {
    return this.diagnosis.setStatus(userId, diagId, body.status);
  }

  @Delete('diagnoses/:diagId')
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string, @Param('diagId', { schema: uuid }) diagId: string): Promise<void> {
    await this.diagnosis.remove(userId, diagId);
  }
}
