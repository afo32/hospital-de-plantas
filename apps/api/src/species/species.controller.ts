import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type IdentifyResponse,
  PHOTO_ORGANS,
  type PhotoOrgan,
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

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ORGAN_VALUES = new Set<string>(PHOTO_ORGANS.map((o) => o.value));

type UploadedPhoto = { buffer: Buffer; mimetype: string; size: number };

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

  /**
   * Identificar con 1–5 fotos (multipart/form-data).
   * Campos: `images` (archivos) y `organs` (uno por foto: auto, leaf, flower, fruit, bark; separados por comas).
   */
  @Post('identify')
  @HttpCode(200)
  @UseInterceptors(
    FilesInterceptor('images', MAX_PHOTOS, {
      limits: { fileSize: MAX_PHOTO_BYTES },
      fileFilter: (_req, file, cb) => cb(null, /^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.mimetype)),
    }),
  )
  identify(
    @CurrentUserId() userId: string,
    @UploadedFiles() files: UploadedPhoto[] | undefined,
    @Body() body: { organs?: string | string[] },
  ): Promise<IdentifyResponse> {
    if (!files?.length) throw new BadRequestException('Añade al menos una foto de la planta.');
    const raw = Array.isArray(body.organs) ? body.organs : (body.organs ?? '').split(',');
    const organs = raw.map((o) => o.trim()).filter(Boolean);
    const photos = files.map((f, i) => {
      const organ = organs[i] && ORGAN_VALUES.has(organs[i]) ? (organs[i] as PhotoOrgan) : 'auto';
      return { buffer: f.buffer, mimetype: f.mimetype, organ };
    });
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
