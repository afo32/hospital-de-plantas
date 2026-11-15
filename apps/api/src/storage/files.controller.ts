import { Controller, ForbiddenException, Get, Param, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { Public } from '../common/public.decorator.js';
import { StorageService } from './storage.service.js';

const query = z.object({ e: z.coerce.number().int(), s: z.string().max(64) });

/**
 * Sirve las fotos guardadas. No pide sesión (las imágenes se cargan sin cabeceras),
 * pero el enlace lleva una firma que solo genera el API y que caduca.
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':kind/:plantId/:name')
  async get(
    @Param('kind') kind: string,
    @Param('plantId') plantId: string,
    @Param('name') name: string,
    @Query({ schema: query }) q: z.infer<typeof query>,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${kind}/${plantId}/${name}`;
    if (!this.storage.verify(key, q.e, q.s)) throw new ForbiddenException('Enlace de foto caducado o no válido');
    const { body, contentType } = await this.storage.read(key);
    res
      .status(200)
      .setHeader('Content-Type', contentType)
      .setHeader('Cache-Control', 'private, max-age=604800, immutable')
      .send(body);
  }
}
