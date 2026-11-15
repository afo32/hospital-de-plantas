import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addPlantSchema,
  type AddPlantInput,
  calendarQuerySchema,
  type CalendarResponse,
  completeTaskSchema,
  type CompleteTaskInput,
  type PlantDetail,
  type PlantList,
  snoozeSchema,
  type SnoozeInput,
  TASK_TYPES,
  type TaskType,
  type TodayResponse,
  updatePlantSchema,
  type UpdatePlantInput,
} from '@hdp/shared';
import { z } from 'zod';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { GardenService } from './garden.service.js';

const uuid = z.uuid('Id no válido');

@ApiTags('jardín')
@ApiBearerAuth()
@Controller('gardens/:gardenId')
export class GardenController {
  constructor(private readonly garden: GardenService) {}

  @Get('plants')
  async list(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
  ): Promise<PlantList> {
    return { plants: await this.garden.listPlants(userId, gardenId) };
  }

  /** Añadir planta con las respuestas del cuestionario. Devuelve la planta con su plan de cuidado. */
  @Post('plants')
  add(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
    @Body({ schema: addPlantSchema }) body: AddPlantInput,
  ): Promise<PlantDetail> {
    return this.garden.addPlant(userId, gardenId, body);
  }

  @Get('today')
  today(@CurrentUserId() userId: string, @Param('gardenId', { schema: uuid }) gardenId: string): Promise<TodayResponse> {
    return this.garden.today(userId, gardenId);
  }

  @Post('today/complete-all')
  @HttpCode(200)
  async completeAll(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
  ): Promise<{ completed: number }> {
    return { completed: await this.garden.completeAll(userId, gardenId) };
  }
}

@ApiTags('plantas')
@ApiBearerAuth()
@Controller('plants/:id')
export class PlantsController {
  constructor(private readonly garden: GardenService) {}

  @Get()
  get(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<PlantDetail> {
    return this.garden.getPlant(userId, id);
  }

  @Patch()
  update(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: updatePlantSchema }) body: UpdatePlantInput,
  ): Promise<PlantDetail> {
    return this.garden.updatePlant(userId, id, body);
  }

  @Delete()
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<void> {
    await this.garden.removePlant(userId, id);
  }

  /** Marcar como hecha hoy: { type: "water" | "fertilize" | "repot" } */
  @Post('complete')
  @HttpCode(200)
  complete(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: completeTaskSchema }) body: CompleteTaskInput,
  ): Promise<PlantDetail> {
    return this.garden.complete(userId, id, body.type);
  }

  /** Deshacer la tarea marcada hoy. */
  @Delete('complete/:type')
  undo(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Param('type', { schema: z.enum(TASK_TYPES) }) type: TaskType,
  ): Promise<PlantDetail> {
    return this.garden.undo(userId, id, type);
  }

  /** Posponer el riego: { days: 1 | 2 | 3 | 5 | 7 } */
  @Post('snooze')
  @HttpCode(200)
  snooze(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: snoozeSchema }) body: SnoozeInput,
  ): Promise<PlantDetail> {
    return this.garden.snooze(userId, id, body.days);
  }

  @Get('calendar')
  calendar(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Query({ schema: calendarQuerySchema }) q: { from: string; to: string },
  ): Promise<CalendarResponse> {
    return this.garden.calendar(userId, id, q.from, q.to);
  }
}
