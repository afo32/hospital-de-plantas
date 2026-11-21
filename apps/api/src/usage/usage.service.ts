import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type UsageKind = 'identify' | 'diagnose' | 'guide';

/** Contador diario por usuario para no disparar el gasto en APIs externas. */
@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async used(userId: string, kind: UsageKind): Promise<number> {
    const row = await this.prisma.apiUsage.findUnique({
      where: { userId_day_kind: { userId, day: this.today(), kind } },
    });
    return row?.count ?? 0;
  }

  /** Lanza 429 si ya se alcanzó el límite de hoy. */
  async assertAvailable(userId: string, kind: UsageKind, limit: number): Promise<void> {
    if ((await this.used(userId, kind)) >= limit) {
      throw new HttpException(
        `Has llegado al límite de ${limit} por hoy. Vuelve a intentarlo mañana.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Suma un uso y devuelve cuántos quedan hoy. */
  async record(userId: string, kind: UsageKind, limit: number): Promise<number> {
    const row = await this.prisma.apiUsage.upsert({
      where: { userId_day_kind: { userId, day: this.today(), kind } },
      create: { userId, day: this.today(), kind, count: 1 },
      update: { count: { increment: 1 } },
    });
    return Math.max(0, limit - row.count);
  }
}
