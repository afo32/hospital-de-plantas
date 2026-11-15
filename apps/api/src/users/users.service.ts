import { Injectable, NotFoundException } from '@nestjs/common';
import type { PublicUser, UpdateMeInput } from '@hdp/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { WeatherService } from '../weather/weather.service.js';

/** ~1 km de precisión: suficiente para el clima y no guarda la ubicación exacta de tu casa. */
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weather: WeatherService,
  ) {}

  /** Datos del usuario que se pueden enviar a la app (sin contraseña). */
  async getPublic(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { where: { role: 'owner' }, orderBy: { joinedAt: 'asc' }, take: 1 },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      city: user.city,
      lat: user.lat,
      lon: user.lon,
      timezone: user.timezone,
      reminderHour: user.reminderHour,
      notifyWater: user.notifyWater,
      notifyCare: user.notifyCare,
      notifyWeather: user.notifyWeather,
      defaultGardenId: user.memberships[0]?.gardenId ?? null,
    };
  }

  async update(userId: string, input: UpdateMeInput): Promise<PublicUser> {
    const data: UpdateMeInput = { ...input };
    if (input.lat != null && input.lon != null) {
      data.lat = round2(input.lat);
      data.lon = round2(input.lon);
      // Si la app no manda la zona horaria, la deducimos de la ubicación (para que "hoy" sea tu hoy).
      if (!input.timezone) {
        const tz = await this.weather.timezoneFor(input.lat, input.lon).catch(() => null);
        if (tz) data.timezone = tz;
      }
    }
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getPublic(userId);
  }
}
