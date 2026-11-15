import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { GardenModule } from './garden/garden.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SpeciesModule } from './species/species.module.js';

@Module({
  imports: [
    // Límite general: 120 peticiones por minuto y por IP (las rutas de acceso tienen uno más estricto).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      errorMessage: 'Demasiados intentos. Espera un minuto y vuelve a probar.',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SpeciesModule,
    GardenModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
