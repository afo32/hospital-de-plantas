import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthTokens } from '@hdp/shared';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type AccessPayload = { sub: string; email: string };

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Token de acceso: JWT corto (15 min) que viaja en cada petición.
 * Token de refresco: valor aleatorio opaco "<id>.<secreto>" (30 días). En la base de datos solo
 * se guarda el hash del secreto. Cada refresco lo rota; si alguien reutiliza uno ya usado,
 * se cierran todas las sesiones del usuario (posible robo).
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async issue(user: { id: string; email: string }): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email } satisfies AccessPayload);
    const secret = randomBytes(32).toString('base64url');
    const record = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(secret),
        expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken: `${record.id}.${secret}` };
  }

  async verifyAccess(token: string): Promise<AccessPayload> {
    try {
      return await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      throw new UnauthorizedException('Tu sesión ha caducado');
    }
  }

  /** Comprueba un refresh token, lo invalida y devuelve el id del usuario. */
  async consumeRefresh(raw: string): Promise<string> {
    const [id, secret] = raw.split('.');
    const invalid = new UnauthorizedException('La sesión ya no es válida. Vuelve a entrar.');
    if (!id || !secret || !/^[0-9a-f-]{36}$/i.test(id)) throw invalid;

    const record = await this.prisma.refreshToken.findUnique({ where: { id } });
    if (!record) throw invalid;

    const given = Buffer.from(sha256(secret));
    const stored = Buffer.from(record.tokenHash);
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) throw invalid;

    if (record.revokedAt) {
      // Reutilización de un token ya rotado: cerramos todas las sesiones por seguridad.
      await this.revokeAll(record.userId);
      throw invalid;
    }
    if (record.expiresAt < new Date()) throw invalid;

    await this.prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
    return record.userId;
  }

  /** Cierra una sesión concreta (logout). No falla si el token ya no existe. */
  async revoke(raw: string): Promise<void> {
    const [id, secret] = raw.split('.');
    if (!id || !secret || !/^[0-9a-f-]{36}$/i.test(id)) return;
    await this.prisma.refreshToken.updateMany({
      where: { id, tokenHash: sha256(secret), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
