import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@hdp/shared';
import { Public } from '../common/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('salud')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'Estado del API y de la base de datos' })
  async check(): Promise<HealthResponse> {
    const dbUp = await this.prisma.isHealthy();
    return {
      status: dbUp ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '0.1.0',
      database: dbUp ? 'up' : 'down',
      time: new Date().toISOString(),
    };
  }
}
