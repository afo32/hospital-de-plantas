import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../common/public.decorator.js';
import { env } from '../config/env.js';
import { deleteAccountPage, invitePage, privacyPage } from './legal.pages.js';

/** https://tu-api/v1/privacidad y https://tu-api/v1/borrar-cuenta: los dos enlaces que pide Google Play. */
@ApiExcludeController()
@Public()
@Controller()
export class LegalController {
  @Get('privacidad')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy(): string {
    return privacyPage(env.SUPPORT_EMAIL, '19 de noviembre de 2026');
  }

  /** Enlace de invitación que se puede pulsar: abre la app con el código. */
  @Get('unirse/:code')
  @Header('Content-Type', 'text/html; charset=utf-8')
  invite(@Param('code') code: string): string {
    return invitePage(code.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12));
  }

  @Get('borrar-cuenta')
  @Header('Content-Type', 'text/html; charset=utf-8')
  deleteAccount(): string {
    return deleteAccountPage(env.SUPPORT_EMAIL);
  }
}
