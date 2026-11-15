import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/** Módulo global: cualquier servicio puede inyectar PrismaService. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
