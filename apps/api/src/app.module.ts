import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { DiagnosisModule } from './diagnosis/diagnosis.module.js';
import { GardenModule } from './garden/garden.module.js';
import { NotesModule } from './notes/notes.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PropagationModule } from './propagation/propagation.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { PushModule } from './push/push.module.js';
import { SharingModule } from './sharing/sharing.module.js';
import { SpeciesModule } from './species/species.module.js';
import { StorageModule } from './storage/storage.module.js';
import { WeatherModule } from './weather/weather.module.js';

@Module({
  imports: [
    // Límite general: 120 peticiones por minuto y por IP (las rutas de acceso tienen uno más estricto).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      errorMessage: 'Demasiados intentos. Espera un minuto y vuelve a probar.',
    }),
    PrismaModule,
    WeatherModule,
    StorageModule,
    PushModule,
    HealthModule,
    AuthModule,
    SpeciesModule,
    GardenModule,
    NotesModule,
    DiagnosisModule,
    SharingModule,
    PropagationModule,
    ReportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
