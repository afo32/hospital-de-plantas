import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type PublicUser,
  pushTokenSchema,
  type PushTokenInput,
  removePushTokenSchema,
  updateMeSchema,
  type UpdateMeInput,
} from '@hdp/shared';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { PushService } from '../push/push.service.js';
import { UsersService } from './users.service.js';

@ApiTags('usuario')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly push: PushService,
  ) {}

  @Get()
  me(@CurrentUserId() userId: string): Promise<PublicUser> {
    return this.users.getPublic(userId);
  }

  @Patch()
  update(@CurrentUserId() userId: string, @Body({ schema: updateMeSchema }) body: UpdateMeInput): Promise<PublicUser> {
    return this.users.update(userId, body);
  }

  /** Borra tu cuenta y tus datos. No se puede deshacer. */
  @Delete()
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string): Promise<void> {
    await this.users.deleteAccount(userId);
  }

  /** Registra el token de avisos push de este móvil. */
  @Post('push-tokens')
  @HttpCode(204)
  async addToken(@CurrentUserId() userId: string, @Body({ schema: pushTokenSchema }) body: PushTokenInput): Promise<void> {
    await this.push.saveToken(userId, body.token, body.platform);
  }

  /** Al cerrar sesión: este móvil deja de recibir avisos de tu cuenta. */
  @Post('push-tokens/remove')
  @HttpCode(204)
  async removeToken(@CurrentUserId() userId: string, @Body({ schema: removePushTokenSchema }) body: { token: string }): Promise<void> {
    await this.push.removeToken(userId, body.token);
  }
}
