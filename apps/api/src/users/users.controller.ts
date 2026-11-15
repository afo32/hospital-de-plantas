import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type PublicUser, updateMeSchema, type UpdateMeInput } from '@hdp/shared';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';

@ApiTags('usuario')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUserId() userId: string): Promise<PublicUser> {
    return this.users.getPublic(userId);
  }

  @Patch()
  update(@CurrentUserId() userId: string, @Body({ schema: updateMeSchema }) body: UpdateMeInput): Promise<PublicUser> {
    return this.users.update(userId, body);
  }
}
