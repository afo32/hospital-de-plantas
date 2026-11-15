import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type AuthResponse,
  googleSignInSchema,
  type GoogleSignInInput,
  loginSchema,
  type LoginInput,
  refreshSchema,
  type RefreshInput,
  registerSchema,
  type RegisterInput,
} from '@hdp/shared';
import { Public } from '../common/public.decorator.js';
import { env } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { GoogleService } from './google.service.js';

// Máximo 10 intentos por minuto y por IP en las rutas de acceso.
const AUTH_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleService,
  ) {}

  /** Qué métodos de acceso están activos (la app oculta los que no). */
  @Get('providers')
  providers(): { email: boolean; google: boolean; apple: boolean } {
    return { email: true, google: this.google.enabled, apple: env.FEATURE_APPLE_LOGIN };
  }

  @Post('register')
  @Throttle(AUTH_LIMIT)
  register(@Body({ schema: registerSchema }) body: RegisterInput): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(AUTH_LIMIT)
  login(@Body({ schema: loginSchema }) body: LoginInput): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Post('google')
  @HttpCode(200)
  @Throttle(AUTH_LIMIT)
  loginWithGoogle(@Body({ schema: googleSignInSchema }) body: GoogleSignInInput): Promise<AuthResponse> {
    return this.auth.loginWithGoogle(body.idToken);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body({ schema: refreshSchema }) body: RefreshInput): Promise<AuthResponse> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body({ schema: refreshSchema }) body: RefreshInput): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}
