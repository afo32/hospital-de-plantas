import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Weather } from '@hdp/shared';
import { z } from 'zod';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OpenMeteoProvider } from './open-meteo.provider.js';
import { WeatherService } from './weather.service.js';

@ApiTags('clima')
@ApiBearerAuth()
@Controller()
export class WeatherController {
  constructor(
    private readonly weather: WeatherService,
    private readonly meteo: OpenMeteoProvider,
    private readonly prisma: PrismaService,
  ) {}

  /** Tiempo de la ubicación guardada del usuario (null si no la ha indicado). */
  @Get('weather')
  async mine(@CurrentUserId() userId: string): Promise<{ weather: Weather | null }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.lat == null || user.lon == null) return { weather: null };
    return { weather: await this.weather.forLocation(user.lat, user.lon, user.city) };
  }

  /** Buscar una ciudad por nombre (para quien no quiera usar el GPS). */
  @Get('places')
  async places(@Query('q', { schema: z.string().trim().min(2, 'Escribe al menos 2 letras').max(60) }) q: string) {
    return { results: await this.meteo.searchPlaces(q) };
  }
}
