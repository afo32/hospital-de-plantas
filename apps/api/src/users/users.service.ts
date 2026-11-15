import { Injectable, NotFoundException } from '@nestjs/common';
import type { PublicUser, UpdateMeInput } from '@hdp/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
      reminderHour: user.reminderHour,
      defaultGardenId: user.memberships[0]?.gardenId ?? null,
    };
  }

  async update(userId: string, input: UpdateMeInput): Promise<PublicUser> {
    await this.prisma.user.update({ where: { id: userId }, data: input });
    return this.getPublic(userId);
  }
}
