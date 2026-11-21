import { Body, Controller, HttpCode, Injectable, Logger, Module, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createReportSchema, type CreateReportInput } from '@hdp/shared';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Avisos de contenido de IA incorrecto u ofensivo (lo pide la política de Google Play). Se revisan en Prisma Studio → ContentReport. */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateReportInput): Promise<void> {
    await this.prisma.contentReport.create({ data: { ...input, userId, details: input.details || null } });
    this.logger.warn(`Aviso de contenido: ${input.targetType} ${input.targetId} · ${input.reason}${input.details ? ` · ${input.details.slice(0, 200)}` : ''}`);
  }
}

@ApiTags('avisos')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** { targetType: "profile" | "diagnosis" | "guide", targetId, reason, details? } */
  @Post()
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async create(@CurrentUserId() userId: string, @Body({ schema: createReportSchema }) body: CreateReportInput): Promise<void> {
    await this.reports.create(userId, body);
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
