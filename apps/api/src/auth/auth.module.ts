import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../config/env.js';
import { UsersController } from '../users/users.controller.js';
import { UsersService } from '../users/users.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleService } from './google.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [
    JwtModule.register({
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: `${env.JWT_ACCESS_TTL_MIN}m` },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    GoogleService,
    TokensService,
    UsersService,
    // Todas las rutas exigen sesión salvo las marcadas con @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [TokensService, UsersService],
})
export class AuthModule {}
