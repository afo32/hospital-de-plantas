import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type ActivityItem,
  createGardenSchema,
  type CreateGardenInput,
  createInviteSchema,
  type GardenDetail,
  type GardenSummary,
  type Invite,
  type InvitePreview,
  type Reminders,
  updateMemberSchema,
} from '@hdp/shared';
import { z } from 'zod';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { GardenService } from '../garden/garden.service.js';
import { SharingService } from './sharing.service.js';

const uuid = z.uuid('Id no válido');
const code = z.string().trim().min(4).max(20);

@ApiTags('jardines compartidos')
@ApiBearerAuth()
@Controller()
export class SharingController {
  constructor(
    private readonly sharing: SharingService,
    private readonly garden: GardenService,
  ) {}

  @Get('gardens')
  async list(@CurrentUserId() userId: string): Promise<{ gardens: GardenSummary[] }> {
    return { gardens: await this.sharing.list(userId) };
  }

  /** Crear otro jardín (p. ej. "Casa de la playa"). Pasa a ser el activo. */
  @Post('gardens')
  create(@CurrentUserId() userId: string, @Body({ schema: createGardenSchema }) body: CreateGardenInput): Promise<GardenSummary> {
    return this.sharing.create(userId, body.name);
  }

  @Get('gardens/:gardenId')
  detail(@CurrentUserId() userId: string, @Param('gardenId', { schema: uuid }) gardenId: string): Promise<GardenDetail> {
    return this.sharing.detail(userId, gardenId);
  }

  @Patch('gardens/:gardenId')
  rename(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
    @Body({ schema: createGardenSchema }) body: CreateGardenInput,
  ): Promise<GardenDetail> {
    return this.sharing.rename(userId, gardenId, body.name);
  }

  @Delete('gardens/:gardenId')
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string, @Param('gardenId', { schema: uuid }) gardenId: string): Promise<void> {
    await this.sharing.remove(userId, gardenId);
  }

  @Get('gardens/:gardenId/activity')
  async activity(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
  ): Promise<{ items: ActivityItem[] }> {
    return { items: await this.sharing.activity(userId, gardenId) };
  }

  /** Cambiar el permiso de alguien: { role: "editor" | "viewer" } */
  @Patch('gardens/:gardenId/members/:userId')
  setRole(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
    @Param('userId', { schema: uuid }) memberId: string,
    @Body({ schema: updateMemberSchema }) body: { role: 'editor' | 'viewer' },
  ): Promise<GardenDetail> {
    return this.sharing.setRole(userId, gardenId, memberId, body.role);
  }

  /** Quitar a alguien (dueño) o salir del jardín (tu propio id). */
  @Delete('gardens/:gardenId/members/:userId')
  @HttpCode(204)
  async removeMember(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
    @Param('userId', { schema: uuid }) memberId: string,
  ): Promise<void> {
    await this.sharing.removeMember(userId, gardenId, memberId);
  }

  /** Nueva invitación de un solo uso, válida 7 días: { role: "editor" | "viewer" } */
  @Post('gardens/:gardenId/invites')
  createInvite(
    @CurrentUserId() userId: string,
    @Param('gardenId', { schema: uuid }) gardenId: string,
    @Body({ schema: createInviteSchema }) body: { role: 'editor' | 'viewer' },
  ): Promise<Invite> {
    return this.sharing.createInvite(userId, gardenId, body.role);
  }

  @Delete('invites/:inviteId')
  @HttpCode(204)
  async deleteInvite(@CurrentUserId() userId: string, @Param('inviteId', { schema: uuid }) inviteId: string): Promise<void> {
    await this.sharing.deleteInvite(userId, inviteId);
  }

  /** Ver a qué jardín te invitan antes de aceptar. */
  @Get('invites/:code')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  preview(@CurrentUserId() userId: string, @Param('code', { schema: code }) c: string): Promise<InvitePreview> {
    return this.sharing.preview(userId, c);
  }

  @Post('invites/:code/accept')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  accept(@CurrentUserId() userId: string, @Param('code', { schema: code }) c: string): Promise<GardenSummary> {
    return this.sharing.accept(userId, c);
  }

  /** Avisos de los próximos 14 días de TODOS tus jardines, para programarlos en el móvil. */
  @Get('me/reminders')
  reminders(@CurrentUserId() userId: string): Promise<Reminders> {
    return this.garden.remindersAll(userId);
  }
}
