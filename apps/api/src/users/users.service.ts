import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PublicUser, UpdateMeInput } from '@hdp/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { WeatherService } from '../weather/weather.service.js';

/** ~1 km de precisión: suficiente para el clima y no guarda la ubicación exacta de tu casa. */
const round2 = (n: number) => Math.round(n * 100) / 100;

const ROLE_ORDER = { owner: 0, editor: 1, viewer: 2 } as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weather: WeatherService,
    private readonly storage: StorageService,
  ) {}

  /** Datos del usuario que se pueden enviar a la app (sin contraseña). */
  async getPublic(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          orderBy: { joinedAt: 'asc' },
          include: {
            garden: {
              select: {
                name: true,
                members: { where: { role: 'owner' }, take: 1, select: { user: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const gardens = user.memberships
      .map((m) => ({
        id: m.gardenId,
        name: m.garden.name,
        role: m.role as 'owner' | 'editor' | 'viewer',
        ownerName: m.garden.members[0]?.user.name ?? null,
      }))
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
    const active = gardens.find((g) => g.id === user.activeGardenId) ?? gardens[0] ?? null;
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
      notifyGarden: user.notifyGarden,
      defaultGardenId: active?.id ?? null,
      gardens,
    };
  }

  async update(userId: string, input: UpdateMeInput): Promise<PublicUser> {
    const data: UpdateMeInput = { ...input };
    if (input.activeGardenId) {
      const member = await this.prisma.gardenMember.findUnique({
        where: { gardenId_userId: { gardenId: input.activeGardenId, userId } },
      });
      if (!member) throw new ForbiddenException('No perteneces a ese jardín.');
    }
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

  /**
   * Borra la cuenta y todos sus datos personales (lo exige Google Play):
   * - Jardines donde eres la única persona: se borran enteros, con plantas, notas y fotos.
   * - Jardines compartidos de los que eres dueño: pasan a la persona que lleva más tiempo.
   * - En jardines compartidos, tus riegos y notas se quedan sin nombre (para no romper el
   *   calendario de los demás); tus fotos de notas se borran.
   */
  async deleteAccount(userId: string): Promise<void> {
    const memberships = await this.prisma.gardenMember.findMany({
      where: { userId },
      include: { garden: { include: { members: { orderBy: { joinedAt: 'asc' } } } } },
    });
    const keys: (string | null)[] = [];
    const soloGardens: string[] = [];

    for (const m of memberships) {
      const others = m.garden.members.filter((x) => x.userId !== userId);
      if (!others.length) {
        soloGardens.push(m.gardenId);
        continue;
      }
      if (m.role === 'owner' && !others.some((o) => o.role === 'owner')) {
        const heir = others[0]!;
        await this.prisma.gardenMember.update({
          where: { gardenId_userId: { gardenId: m.gardenId, userId: heir.userId } },
          data: { role: 'owner' },
        });
      }
    }

    if (soloGardens.length) {
      const plants = await this.prisma.userPlant.findMany({
        where: { gardenId: { in: soloGardens } },
        select: { photoKey: true, notes: { select: { photoKeys: true } }, diagnoses: { select: { photoKeys: true } } },
      });
      for (const p of plants) {
        keys.push(p.photoKey, ...p.notes.flatMap((n) => n.photoKeys), ...p.diagnoses.flatMap((d) => d.photoKeys));
      }
    }
    const myNotes = await this.prisma.note.findMany({ where: { authorId: userId }, select: { id: true, photoKeys: true } });
    keys.push(...myNotes.flatMap((n) => n.photoKeys));

    await this.prisma.$transaction([
      // Las plantas referencian especies sin cascada; se borran antes que el jardín.
      this.prisma.userPlant.deleteMany({ where: { gardenId: { in: soloGardens } } }),
      this.prisma.garden.deleteMany({ where: { id: { in: soloGardens } } }),
      this.prisma.note.deleteMany({ where: { authorId: userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    await this.storage.remove(keys);
    this.logger.log(`Cuenta borrada (${soloGardens.length} jardines propios, ${keys.filter(Boolean).length} fotos)`);
  }
}
