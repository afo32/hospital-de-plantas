import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type DiagnosisAnswer,
  diagnosisResultSchema,
  diagnosisTriageSchema,
  diagnosisAnswerSchema,
  type Diagnosis,
  type StartDiagnosisInput,
} from '@hdp/shared';
import { z } from 'zod';
import { addDays, dayToDate, localDay } from '../common/days.js';
import { env } from '../config/env.js';
import { GardenService } from '../garden/garden.service.js';
import type { Diagnosis as DiagnosisRow } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PushService } from '../push/push.service.js';
import { StorageService } from '../storage/storage.service.js';
import { UsageService } from '../usage/usage.service.js';
import { DiagnosisAi, type PlantFacts } from './diagnosis.ai.js';

const answersSchema = z.array(diagnosisAnswerSchema);

@Injectable()
export class DiagnosisService {
  private readonly logger = new Logger(DiagnosisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly garden: GardenService,
    private readonly storage: StorageService,
    private readonly usage: UsageService,
    private readonly ai: DiagnosisAi,
    private readonly push: PushService,
  ) {}

  private toDto(d: DiagnosisRow, remainingToday: number | null = null): Diagnosis {
    const triage = diagnosisTriageSchema.safeParse(d.triage);
    const result = diagnosisResultSchema.safeParse(d.result);
    const answers = answersSchema.safeParse(d.answers);
    return {
      id: d.id,
      plantId: d.plantId,
      status: d.status === 'resolved' || d.status === 'done' ? d.status : 'questions',
      photos: d.photoKeys.map((k) => this.storage.url(k)),
      symptoms: d.symptoms,
      triage: triage.success ? triage.data : null,
      answers: answers.success ? answers.data : [],
      result: result.success ? result.data : null,
      followUpDay: d.followUpAt ? d.followUpAt.toISOString().slice(0, 10) : null,
      createdAt: d.createdAt.toISOString(),
      remainingToday,
    };
  }

  private async facts(userId: string, plantId: string, write: boolean, excludeId?: string): Promise<PlantFacts> {
    const { plant, plan, ctx, name } = await this.garden.plantContext(userId, plantId, write);
    const prev = await this.prisma.diagnosis.findFirst({
      where: {
        plantId,
        status: { in: ['done', 'resolved'] },
        createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    const prevResult = prev ? diagnosisResultSchema.safeParse(prev.result) : null;
    return {
      plant,
      plan,
      name,
      today: ctx.today,
      tz: ctx.tz,
      weather: ctx.weather,
      southern: ctx.southern,
      previous:
        prev && prevResult?.success
          ? { day: localDay(prev.createdAt, ctx.tz), title: prevResult.data.title, summary: prevResult.data.summary }
          : null,
    };
  }

  private assertAi() {
    if (!this.ai.enabled) {
      throw new ServiceUnavailableException('El diagnóstico con IA no está configurado en el servidor (falta ANTHROPIC_API_KEY).');
    }
  }

  private async load(userId: string, id: string, write = false): Promise<DiagnosisRow> {
    const d = await this.prisma.diagnosis.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Diagnóstico no encontrado');
    await this.garden.accessPlant(userId, d.plantId, write);
    return d;
  }

  async list(userId: string, plantId: string): Promise<Diagnosis[]> {
    await this.garden.accessPlant(userId, plantId);
    const rows = await this.prisma.diagnosis.findMany({ where: { plantId }, orderBy: { createdAt: 'desc' }, take: 30 });
    return rows.map((r) => this.toDto(r));
  }

  async get(userId: string, id: string): Promise<Diagnosis> {
    return this.toDto(await this.load(userId, id));
  }

  /** Paso 1: guarda las fotos, Claude las mira y prepara las preguntas. */
  async start(userId: string, plantId: string, input: StartDiagnosisInput): Promise<Diagnosis> {
    this.assertAi();
    const facts = await this.facts(userId, plantId, true);
    await this.usage.assertAvailable(userId, 'diagnose', env.DIAGNOSE_DAILY_LIMIT);

    const keys = await this.storage.putImages('diag', plantId, input.photos);
    let triage;
    try {
      triage = await this.ai.triage(facts, input.photos, input.symptoms ?? null);
    } catch (err) {
      await this.storage.remove(keys);
      this.logger.error(`Fallo en el triaje: ${(err as Error).message}`);
      throw new BadGatewayException('No se pudieron analizar las fotos ahora mismo. Inténtalo de nuevo en un momento.');
    }

    // Si no hay planta en las fotos no se gasta un diagnóstico del día.
    const remaining = triage.isPlant
      ? await this.usage.record(userId, 'diagnose', env.DIAGNOSE_DAILY_LIMIT)
      : Math.max(0, env.DIAGNOSE_DAILY_LIMIT - (await this.usage.used(userId, 'diagnose')));

    const row = await this.prisma.diagnosis.create({
      data: {
        plantId,
        photoKeys: keys,
        symptoms: input.symptoms?.trim() || null,
        triage,
        status: 'questions',
        createdById: userId,
      },
    });
    return this.toDto(row, remaining);
  }

  /** Paso 2: con las respuestas, Claude da el diagnóstico y el plan de tratamiento. */
  async answer(userId: string, id: string, answers: DiagnosisAnswer[]): Promise<Diagnosis> {
    this.assertAi();
    const d = await this.load(userId, id, true);
    if (d.status !== 'questions') throw new ConflictException('Este diagnóstico ya está terminado.');
    const triage = diagnosisTriageSchema.safeParse(d.triage);
    if (!triage.success) throw new ConflictException('Faltan los datos del primer análisis. Empieza un diagnóstico nuevo.');
    if (!triage.data.isPlant) throw new ConflictException('En las fotos no se ve una planta. Empieza un diagnóstico nuevo.');

    const known = new Set(triage.data.questions.map((q) => q.id));
    const clean = answers.filter((a) => known.has(a.questionId));

    const facts = await this.facts(userId, d.plantId, true, d.id);
    const photos = await Promise.all(d.photoKeys.map(async (k) => (await this.storage.read(k)).body.toString('base64')));

    let result;
    try {
      result = await this.ai.result(facts, photos, d.symptoms, triage.data, clean);
    } catch (err) {
      this.logger.error(`Fallo en el diagnóstico: ${(err as Error).message}`);
      throw new BadGatewayException('No se pudo preparar el diagnóstico ahora mismo. Vuelve a enviar las respuestas en un momento.');
    }

    const followUp = result.severity === 'none' ? null : dayToDate(addDays(facts.today, result.followUpDays));
    const row = await this.prisma.diagnosis.update({
      where: { id },
      data: { answers: clean, result, status: 'done', followUpAt: followUp },
    });
    this.push.record({
      gardenId: facts.plant.gardenId,
      actorId: userId,
      kind: 'diagnosis',
      plantId: d.plantId,
      plantName: facts.name,
      extra: result.title,
    });
    return this.toDto(row);
  }

  /** Marcar como curada ("resolved") o volver a abrirla ("done"). */
  async setStatus(userId: string, id: string, status: 'done' | 'resolved'): Promise<Diagnosis> {
    const d = await this.load(userId, id, true);
    if (d.status === 'questions') throw new ConflictException('Primero responde a las preguntas.');
    return this.toDto(await this.prisma.diagnosis.update({ where: { id }, data: { status } }));
  }

  async remove(userId: string, id: string): Promise<void> {
    const d = await this.load(userId, id, true);
    await this.prisma.diagnosis.delete({ where: { id } });
    await this.storage.remove(d.photoKeys);
  }
}
