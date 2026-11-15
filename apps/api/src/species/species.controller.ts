import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  identifyRequestSchema,
  type IdentifyRequest,
  type IdentifyResponse,
  resolveSpeciesSchema,
  type ResolveSpeciesInput,
  type SpeciesDetail,
  speciesSearchQuerySchema,
  type SpeciesSearchQuery,
  type SpeciesSearchResponse,
  type SpeciesSummary,
} from '@hdp/shared';
import { z } from 'zod';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { SpeciesService } from './species.service.js';

@ApiTags('especies')
@ApiBearerAuth()
@Controller('species')
export class SpeciesController {
  constructor(private readonly species: SpeciesService) {}

  /** Buscar por nombre (?q=romero) o listar una categoría (?category=herbs). */
  @Get('search')
  async search(@Query({ schema: speciesSearchQuerySchema }) query: SpeciesSearchQuery): Promise<SpeciesSearchResponse> {
    return { results: await this.species.search(query) };
  }

  /** Identificar con 1–5 fotos (JPEG en base64 dentro de un JSON, una por órgano: auto, leaf, flower, fruit, bark). */
  @Post('identify')
  @HttpCode(200)
  identify(
    @CurrentUserId() userId: string,
    @Body({ schema: identifyRequestSchema }) body: IdentifyRequest,
  ): Promise<IdentifyResponse> {
    const photos = body.photos.map((p) => ({
      buffer: Buffer.from(p.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
      mimetype: 'image/jpeg',
      organ: p.organ,
    }));
    return this.species.identify(userId, photos);
  }

  /** Guarda una especie elegida de una lista y devuelve su id para abrir la ficha. */
  @Post('resolve')
  @HttpCode(200)
  resolve(@Body({ schema: resolveSpeciesSchema }) body: ResolveSpeciesInput): Promise<SpeciesSummary> {
    return this.species.resolve(body);
  }

  /** Ficha de la especie. Si aún no existe, empieza a generarla y devuelve profileStatus "generating". */
  @Get(':id')
  detail(
    @Param('id', { schema: z.uuid('Id de especie no válido') }) id: string,
    @Query('retry') retry?: string,
  ): Promise<SpeciesDetail> {
    return this.species.detail(id, retry === '1');
  }
}
