import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from './jwt-auth.guard.js';

/** Inyecta el id del usuario autenticado: `@CurrentUserId() userId: string`. */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user.sub;
});
