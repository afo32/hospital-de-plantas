import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  arrivalTaskInputSchema,
  type ArrivalTaskInput,
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
  type Reminders,
  setPlantPhotoSchema,
  type SetPlantPhotoInput,
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

  /** Tareas de los próximos 14 días y alertas de clima, para programar los avisos locales del móvil. */
  @Get('reminders')
  reminders(@CurrentUserId() userId: string, @Param('gardenId', { schema: uuid }) gardenId: string): Promise<Reminders> {
    return this.garden.reminders(userId, gardenId);
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

  /** Foto propia de la planta: { base64 } (JPEG, PNG o WebP). */
  @Put('photo')
  setPhoto(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: setPlantPhotoSchema }) body: SetPlantPhotoInput,
  ): Promise<PlantDetail> {
    return this.garden.setPhoto(userId, id, body.base64);
  }

  /** Quitar la foto propia y volver a la de la especie. */
  @Delete('photo')
  removePhoto(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<PlantDetail> {
    return this.garden.removePhoto(userId, id);
  }

  /** Marcar como hecha hoy: { type: "water" | "fertilize" | "repot" } */
  @Post('complete')
  @HttpCode(200)
  complete(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: completeTaskSchema }) body: CompleteTaskInput,
  ): Promise<PlantDetail> {
    return this.garden.complete(userId, id, body.type, body.day);
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

  /** Plan "Recién llegada": empezarlo en una planta que ya estaba en el jardín. */
  @Post('arrival')
  @HttpCode(200)
  startArrival(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<PlantDetail> {
    return this.garden.startArrival(userId, id);
  }

  /** Marcar o desmarcar una tarea del plan: { taskId, done } */
  @Post('arrival/tasks')
  @HttpCode(200)
  arrivalTask(
    @CurrentUserId() userId: string,
    @Param('id', { schema: uuid }) id: string,
    @Body({ schema: arrivalTaskInputSchema }) body: ArrivalTaskInput,
  ): Promise<PlantDetail> {
    return this.garden.arrivalTask(userId, id, body.taskId, body.done);
  }

  /** "Ya está adaptada": cierra el plan. */
  @Delete('arrival')
  endArrival(@CurrentUserId() userId: string, @Param('id', { schema: uuid }) id: string): Promise<PlantDetail> {
    return this.garden.endArrival(userId, id);
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
