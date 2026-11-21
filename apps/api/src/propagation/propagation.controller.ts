import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  advancePropagationSchema,
  createPropagationSchema,
  type CreatePropagationInput,
  finishPropagationSchema,
  type GuideStatus,
  type PropagationDetail,
  propagationLogInputSchema,
  type PropagationLogInput,
  propagationMethodSchema,
  type PropagationMethod,
  type PropagationSummary,
  propagationTaskSchema,
  updatePropagationSchema,
  type UpdatePropagationInput,
} from '@hdp/shared';
import { z } from 'zod';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { PropagationService } from './propagation.service.js';

const uuid = z.uuid('Id no válido');

@ApiTags('crianza')
@ApiBearerAuth()
@Controller()
export class PropagationController {
  constructor(private readonly service: PropagationService) {}

  /** Guía de una especie para un método. La primera vez se escribe con IA (≈1 min): consulta de nuevo hasta "ready". */
  @Get('species/:id/propagation/:method')
  guide(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Param('method', { schema: propagationMethodSchema }) method: PropagationMethod,
    @Query({ schema: z.object({ retry: z.string().optional() }) }) q: { retry?: string },
  ): Promise<GuideStatus> {
    return this.service.guide(userId, id, method, q.retry === '1');
  }

  @Get('gardens/:gardenId/propagations')
  async list(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
  ): Promise<{ propagations: PropagationSummary[] }> {
    return { propagations: await this.service.list(userId, gardenId) };
  }

  @Post('gardens/:gardenId/propagations')
  create(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
    @Body({ schema: createPropagationSchema }) body: CreatePropagationInput,
  ): Promise<PropagationDetail> {
    return this.service.create(userId, gardenId, body);
  }

  @Get('propagations/:id')
  detail(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<PropagationDetail> {
    return this.service.detail(userId, id);
  }

  @Patch('propagations/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: updatePropagationSchema }) body: UpdatePropagationInput,
  ): Promise<PropagationDetail> {
    return this.service.update(userId, id, body);
  }

  /** Pasar de etapa: { successCount?, back? } */
  @Post('propagations/:id/advance')
  @HttpCode(200)
  advance(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: advancePropagationSchema }) body: { successCount?: number; back?: boolean },
  ): Promise<PropagationDetail> {
    return this.service.advance(userId, id, body);
  }

  /** Marcar o desmarcar una tarea de hoy: { stageIndex, taskIndex } */
  @Post('propagations/:id/tasks')
  @HttpCode(200)
  task(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: propagationTaskSchema }) body: { stageIndex: number; taskIndex: number },
  ): Promise<PropagationDetail> {
    return this.service.toggleTask(userId, id, body.stageIndex, body.taskIndex);
  }

  @Post('propagations/:id/logs')
  addLog(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: propagationLogInputSchema }) body: PropagationLogInput,
  ): Promise<PropagationDetail> {
    return this.service.addLog(userId, id, body);
  }

  @Delete('propagations/:id/logs/:logId')
  deleteLog(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Param('logId', { schema: uuid }) logId: string,
  ): Promise<PropagationDetail> {
    return this.service.deleteLog(userId, id, logId);
  }

  /** Terminar: { result: "done" | "failed", plantId?, reason? } */
  @Post('propagations/:id/finish')
  @HttpCode(200)
  finish(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: finishPropagationSchema }) body: { result: 'done' | 'failed'; plantId?: string; reason?: string },
  ): Promise<PropagationDetail> {
    return this.service.finish(userId, id, body);
  }

  @Post('propagations/:id/reopen')
  @HttpCode(200)
  reopen(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<PropagationDetail> {
    return this.service.reopen(userId, id);
  }

  @Delete('propagations/:id')
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<void> {
    await this.service.remove(userId, id);
  }
}
