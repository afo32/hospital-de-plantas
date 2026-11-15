import { Injectable } from '@nestjs/common';
import { type Weather, weatherSchema } from '@hdp/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { OpenMeteoProvider } from './open-meteo.provider.js';

/** Una hora de caché por celda de ~10 km: los usuarios cercanos comparten la misma consulta. */
const TTL_MS = 60 * 60 * 1000;
const cell = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class WeatherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meteo: OpenMeteoProvider,
  ) {}

  /** Tiempo de una ubicación, desde la caché si es reciente. Null si no hay datos. */
  async forLocation(lat: number, lon: number, place: string | null): Promise<Weather | null> {
    const latKey = cell(lat);
    const lonKey = cell(lon);
    const cached = await this.prisma.weatherCache.findUnique({ where: { latKey_lonKey: { latKey, lonKey } } });
    if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) {
      const parsed = weatherSchema.omit({ place: true }).safeParse(cached.data);
      if (parsed.success) return { ...parsed.data, place };
    }

    const fresh = await this.meteo.forecast(latKey, lonKey);
    if (!fresh) {
      // Sin conexión con Open-Meteo: mejor un dato de hace unas horas que ninguno.
      const stale = cached ? weatherSchema.omit({ place: true }).safeParse(cached.data) : null;
      return stale?.success ? { ...stale.data, place } : null;
    }
    await this.prisma.weatherCache.upsert({
      where: { latKey_lonKey: { latKey, lonKey } },
      create: { latKey, lonKey, data: fresh.weather, fetchedAt: new Date() },
      update: { data: fresh.weather, fetchedAt: new Date() },
    });
    return { ...fresh.weather, place };
  }

  timezoneFor(lat: number, lon: number): Promise<string | null> {
    return this.meteo.forecast(cell(lat), cell(lon)).then((r) => r?.timezone ?? null);
  }
}
