import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthResponse, LoginInput, RegisterInput } from '@hdp/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { GoogleService } from './google.service.js';
import { getDummyHash, hashPassword, verifyPassword } from './password.js';
import { TokensService } from './tokens.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly users: UsersService,
    private readonly google: GoogleService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (exists) throw new ConflictException('Ya hay una cuenta con ese email. Prueba a iniciar sesión.');

    const passwordHash = await hashPassword(input.password);
    const user = await this.createUserWithGarden({ email: input.email, name: input.name, passwordHash });
    return this.buildResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    // Siempre comparamos un hash, exista o no el email, para no dar pistas por el tiempo de respuesta.
    const ok = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
    if (user && !user.passwordHash) {
      throw new UnauthorizedException('Esta cuenta se creó con Google. Usa «Continuar con Google».');
    }
    if (!user || !ok) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    return this.buildResponse(user);
  }

  /**
   * Inicio con Google:
   * 1. Si esa cuenta de Google ya está vinculada, entra.
   * 2. Si existe un usuario con el mismo email (verificado por Google), vincula la cuenta y entra.
   * 3. Si no, crea el usuario (sin contraseña) con su primer jardín.
   */
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const identity = await this.google.verify(idToken);

    const linked = await this.prisma.authAccount.findUnique({
      where: { provider_providerId: { provider: 'google', providerId: identity.sub } },
      include: { user: true },
    });
    if (linked) return this.buildResponse(linked.user);

    const existing = await this.prisma.user.findUnique({ where: { email: identity.email } });
    if (existing) {
      await this.prisma.authAccount.create({
        data: { provider: 'google', providerId: identity.sub, userId: existing.id },
      });
      if (!existing.name && identity.name) {
        await this.prisma.user.update({ where: { id: existing.id }, data: { name: identity.name } });
      }
      return this.buildResponse(existing);
    }

    const user = await this.createUserWithGarden({
      email: identity.email,
      name: identity.name,
      passwordHash: null,
      google: identity.sub,
    });
    return this.buildResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const userId = await this.tokens.consumeRefresh(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('La sesión ya no es válida. Vuelve a entrar.');
    return this.buildResponse(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  /** Crea el usuario y su primer jardín ("Mi jardín") en una sola transacción. */
  private createUserWithGarden(data: {
    email: string;
    name: string | null;
    passwordHash: string | null;
    google?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          ...(data.google ? { authAccounts: { create: { provider: 'google', providerId: data.google } } } : {}),
        },
      });
      await tx.garden.create({
        data: { name: 'Mi jardín', members: { create: { userId: created.id, role: 'owner' } } },
      });
      return created;
    });
  }

  private async buildResponse(user: { id: string; email: string }): Promise<AuthResponse> {
    const tokens = await this.tokens.issue(user);
    return { ...tokens, user: await this.users.getPublic(user.id) };
  }
}
