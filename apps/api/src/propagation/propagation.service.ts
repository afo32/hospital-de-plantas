import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  type CreatePropagationInput,
  type GuideStatus,
  PROPAGATION_METHODS,
  type PropagationDetail,
  propagationGuideSchema,
  type PropagationLogInput,
  type PropagationMethod,
  type PropagationSummary,
  speciesProfileSchema,
  type UpdatePropagationInput,
} from '@hdp/shared';
import { monthOf } from '../common/days.js';
import { env } from '../config/env.js';
import { GardenService } from '../garden/garden.service.js';
import type { Propagation, Species } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { UsageService } from '../usage/usage.service.js';
import { GuideGenerator } from './guide.generator.js';
import { currentTasks, daysBetween, parseDone, parsePlan, taskKey } from './schedule.js';

const GUIDE_VERSION = 1;
type Row = Propagation & { species: Species };

@Injectable()
export class PropagationService {
  private readonly logger = new Logger(PropagationService.name);
  private readonly generating = new Map<string, Promise<void>>();
  private readonly failures = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly garden: GardenService,
    private readonly storage: StorageService,
    private readonly usage: UsageService,
    private readonly generator: GuideGenerator,
  ) {}

  /* ---------- Guías ---------- */

  async guide(userId: string, speciesId: string, method: PropagationMethod, retry = false): Promise<GuideStatus> {
    const species = await this.prisma.species.findUnique({ where: { id: speciesId } });
    if (!species) throw new NotFoundException('Especie no encontrada');
    const base = { speciesId, method };
    const cached = await this.prisma.propagationGuide.findUnique({ where: { speciesId_method: { speciesId, method } } });
    const parsed = cached && cached.version >= GUIDE_VERSION ? propagationGuideSchema.safeParse(cached.guide) : null;
    if (parsed?.success) return { ...base, status: 'ready', guide: parsed.data, message: null };

    if (!this.generator.enabled) {
      return { ...base, status: 'unavailable', guide: null, message: 'Las guías con IA no están configuradas en el servidor (falta ANTHROPIC_API_KEY).' };
    }
    const key = `${speciesId}:${method}`;
    const failure = this.failures.get(key);
    if (failure && !retry && !this.generating.has(key)) return { ...base, status: 'failed', guide: null, message: failure };

    if (!this.generating.has(key)) {
      if ((await this.usage.used(userId, 'guide')) >= env.GUIDE_DAILY_LIMIT) {
        return {
          ...base,
          status: 'failed',
          guide: null,
          message: `Has pedido ${env.GUIDE_DAILY_LIMIT} guías nuevas hoy. Vuelve mañana (las que ya existen se pueden usar sin límite).`,
        };
      }
      await this.usage.record(userId, 'guide', env.GUIDE_DAILY_LIMIT);
      this.startGeneration(species, method);
    }
    return { ...base, status: 'generating', guide: null, message: null };
  }

  private startGeneration(species: Species, method: PropagationMethod): void {
    const key = `${species.id}:${method}`;
    this.failures.delete(key);
    const profile = speciesProfileSchema.shape.sections.safeParse((species.profileEs as { sections?: unknown } | null)?.sections);
    const reference = profile.success
      ? [profile.data.fromSeed.body, profile.data.propagation.body].join('\n\n')
      : null;
    const job = (async () => {
      try {
        const guide = await this.generator.generate({
          scientificName: species.scientificName,
          commonName: species.commonNames[0] ?? null,
          method,
          reference,
        });
        await this.prisma.propagationGuide.upsert({
          where: { speciesId_method: { speciesId: species.id, method } },
          create: { speciesId: species.id, method, guide, version: GUIDE_VERSION },
          update: { guide, version: GUIDE_VERSION },
        });
      } catch (err) {
        this.logger.error(`No se pudo generar la guía ${key}: ${(err as Error).message}`);
        this.failures.set(key, 'No se pudo escribir la guía. Vuelve a intentarlo en un momento.');
      } finally {
        this.generating.delete(key);
      }
    })();
    this.generating.set(key, job);
  }

  /* ---------- Crianzas ---------- */

  private label(p: Row): string {
    if (p.name) return p.name;
    const species = p.species.commonNames[0] ?? p.species.scientificName;
    const method = PROPAGATION_METHODS.find((m) => m.value === p.method)?.label.toLowerCase() ?? p.method;
    return `${species} (${method})`;
  }

  private summary(p: Row, today: string): PropagationSummary {
    const plan = parsePlan(p.plan);
    const stage = plan?.stages[p.stageIndex];
    const tasks = plan ? currentTasks(plan, p.stageIndex, p.stageStartDay, parseDone(p.tasksDone), today) : [];
    return {
      id: p.id,
      gardenId: p.gardenId,
      name: this.label(p),
      speciesId: p.speciesId,
      speciesName: p.species.commonNames[0] ?? p.species.scientificName,
      imageUrl: p.species.imageUrl,
      method: p.method as PropagationMethod,
      status: p.status as PropagationSummary['status'],
      startDay: p.startDay,
      day: daysBetween(p.startDay, today),
      stageIndex: p.stageIndex,
      stageCount: plan?.stages.length ?? 0,
      stageTitle: stage?.title ?? '',
      dayInStage: daysBetween(p.stageStartDay, today),
      stageMinDays: stage?.minDays ?? 0,
      stageMaxDays: stage?.maxDays ?? 0,
      count: p.count,
      successCount: p.successCount,
      dueTasks: p.status === 'active' ? tasks.filter((t) => t.due).length : 0,
      plantId: p.plantId,
    };
  }

  private async load(userId: string, id: string, write = false): Promise<Row> {
    const p = await this.prisma.propagation.findUnique({ where: { id }, include: { species: true } });
    if (!p) throw new NotFoundException('Crianza no encontrada');
    await this.garden.assertGarden(userId, p.gardenId, write);
    return p;
  }

  async list(userId: string, gardenId: string): Promise<PropagationSummary[]> {
    await this.garden.assertGarden(userId, gardenId);
    const { today } = await this.garden.todayFor(userId);
    const rows = await this.prisma.propagation.findMany({
      where: { gardenId },
      include: { species: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    // Primero las activas; dentro, las que tienen tareas hoy.
    return rows
      .map((r) => this.summary(r, today))
      .sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || b.dueTasks - a.dueTasks);
  }

  async create(userId: string, gardenId: string, input: CreatePropagationInput): Promise<PropagationDetail> {
    await this.garden.assertGarden(userId, gardenId, true);
    const active = await this.prisma.propagation.count({ where: { gardenId, status: 'active' } });
    if (active >= 50) throw new ConflictException('Tienes 50 crianzas en marcha: termina alguna antes de empezar otra.');
    const cached = await this.prisma.propagationGuide.findUnique({
      where: { speciesId_method: { speciesId: input.speciesId, method: input.method } },
    });
    const guide = cached ? propagationGuideSchema.safeParse(cached.guide) : null;
    if (!guide?.success) throw new ConflictException('La guía de esta especie aún no está lista. Espera a que se escriba y vuelve a intentarlo.');
    const { today } = await this.garden.todayFor(userId);
    const startDay = input.startDay && input.startDay <= today ? input.startDay : today;
    const created = await this.prisma.propagation.create({
      data: {
        gardenId,
        speciesId: input.speciesId,
        method: input.method,
        name: input.name || null,
        count: input.count,
        startDay,
        stageStartDay: startDay,
        plan: guide.data,
        createdById: userId,
      },
    });
    return this.detail(userId, created.id);
  }

  async detail(userId: string, id: string): Promise<PropagationDetail> {
    const p = await this.load(userId, id);
    const plan = parsePlan(p.plan);
    if (!plan) throw new ConflictException('El plan de esta crianza está dañado.');
    const { today, southern } = await this.garden.todayFor(userId);
    const logs = await this.prisma.propagationLog.findMany({
      where: { propagationId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const authors = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(logs.map((l) => l.authorId).filter((x): x is string => !!x))] } },
      select: { id: true, name: true },
    });
    const startMonth = monthOf(p.startDay);
    const month = southern ? ((startMonth + 5) % 12) + 1 : startMonth;
    return {
      propagation: this.summary(p, today),
      guide: plan,
      today,
      outOfSeason: plan.bestMonths.length > 0 && !plan.bestMonths.includes(month),
      tasks: p.status === 'active' ? currentTasks(plan, p.stageIndex, p.stageStartDay, parseDone(p.tasksDone), today) : [],
      logs: logs.map((l) => ({
        id: l.id,
        kind: l.kind as 'note' | 'stage' | 'done' | 'failed',
        stageIndex: l.stageIndex,
        text: l.text,
        photos: l.photoKeys.map((k) => this.storage.url(k)),
        authorName: authors.find((a) => a.id === l.authorId)?.name ?? null,
        mine: l.authorId === userId,
        createdAt: l.createdAt.toISOString(),
      })),
      canEdit: await this.garden.canWrite(userId, p.gardenId),
    };
  }

  async update(userId: string, id: string, input: UpdatePropagationInput): Promise<PropagationDetail> {
    await this.load(userId, id, true);
    await this.prisma.propagation.update({ where: { id }, data: input });
    return this.detail(userId, id);
  }

  /** Pasar a la siguiente etapa (o volver a la anterior con back). */
  async advance(userId: string, id: string, input: { successCount?: number; back?: boolean }): Promise<PropagationDetail> {
    const p = await this.load(userId, id, true);
    if (p.status !== 'active') throw new ConflictException('Esta crianza ya está terminada.');
    const plan = parsePlan(p.plan)!;
    const { today } = await this.garden.todayFor(userId);
    const next = input.back ? p.stageIndex - 1 : p.stageIndex + 1;
    if (next < 0) throw new BadRequestException('Ya está en la primera etapa.');
    if (next >= plan.stages.length) {
      throw new ConflictException('Es la última etapa: cuando esté lista, pásala a Mi jardín o márcala como terminada.');
    }
    await this.prisma.$transaction([
      this.prisma.propagation.update({
        where: { id },
        data: {
          stageIndex: next,
          stageStartDay: today,
          ...(input.successCount !== undefined ? { successCount: input.successCount } : {}),
        },
      }),
      this.prisma.propagationLog.create({
        data: {
          propagationId: id,
          authorId: userId,
          kind: 'stage',
          stageIndex: next,
          text: input.back
            ? `Vuelta a la etapa «${plan.stages[next]!.title}»`
            : `Empieza «${plan.stages[next]!.title}»${input.successCount !== undefined ? ` · ${input.successCount} de ${p.count} han salido adelante` : ''}`,
        },
      }),
    ]);
    return this.detail(userId, id);
  }

  /** Marcar o desmarcar una tarea de la etapa actual como hecha hoy. */
  async toggleTask(userId: string, id: string, stageIndex: number, taskIndex: number): Promise<PropagationDetail> {
    const p = await this.load(userId, id, true);
    const plan = parsePlan(p.plan)!;
    if (stageIndex !== p.stageIndex || !plan.stages[stageIndex]?.tasks[taskIndex]) {
      throw new BadRequestException('Esa tarea no es de la etapa actual.');
    }
    const { today } = await this.garden.todayFor(userId);
    const done = parseDone(p.tasksDone);
    const key = taskKey(stageIndex, taskIndex);
    if (done[key] === today) delete done[key];
    else done[key] = today;
    await this.prisma.propagation.update({ where: { id }, data: { tasksDone: done } });
    return this.detail(userId, id);
  }

  async addLog(userId: string, id: string, input: PropagationLogInput): Promise<PropagationDetail> {
    const p = await this.load(userId, id, true);
    const keys = await this.storage.putImages('prop', id, input.photos ?? []);
    try {
      await this.prisma.propagationLog.create({
        data: { propagationId: id, authorId: userId, kind: 'note', stageIndex: p.stageIndex, text: input.text?.trim() || null, photoKeys: keys },
      });
    } catch (err) {
      await this.storage.remove(keys);
      throw err;
    }
    return this.detail(userId, id);
  }

  async deleteLog(userId: string, id: string, logId: string): Promise<PropagationDetail> {
    await this.load(userId, id, true);
    const log = await this.prisma.propagationLog.findFirst({ where: { id: logId, propagationId: id } });
    if (!log) throw new NotFoundException('Nota no encontrada');
    if (log.kind !== 'note' || log.authorId !== userId) throw new ForbiddenException('Solo puedes borrar tus propias notas.');
    await this.prisma.propagationLog.delete({ where: { id: logId } });
    await this.storage.remove(log.photoKeys);
    return this.detail(userId, id);
  }

  /** Terminar: ya es una planta (y quizá está en Mi jardín) o no salió. */
  async finish(userId: string, id: string, input: { result: 'done' | 'failed'; plantId?: string; reason?: string }): Promise<PropagationDetail> {
    const p = await this.load(userId, id, true);
    if (input.plantId) {
      const plant = await this.prisma.userPlant.findFirst({ where: { id: input.plantId, gardenId: p.gardenId } });
      if (!plant) throw new BadRequestException('Esa planta no está en el mismo jardín.');
    }
    await this.prisma.$transaction([
      this.prisma.propagation.update({
        where: { id },
        data: { status: input.result, finishedAt: new Date(), plantId: input.plantId ?? p.plantId },
      }),
      this.prisma.propagationLog.create({
        data: {
          propagationId: id,
          authorId: userId,
          kind: input.result,
          stageIndex: p.stageIndex,
          text:
            input.result === 'done'
              ? input.plantId
                ? 'Ya es una planta: pasa a Mi jardín 🌱'
                : 'Crianza terminada 🌱'
              : `No salió${input.reason ? `: ${input.reason}` : ''}`,
        },
      }),
    ]);
    return this.detail(userId, id);
  }

  /** Reabrir una crianza terminada por error. */
  async reopen(userId: string, id: string): Promise<PropagationDetail> {
    await this.load(userId, id, true);
    await this.prisma.propagation.update({ where: { id }, data: { status: 'active', finishedAt: null } });
    return this.detail(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.load(userId, id, true);
    const logs = await this.prisma.propagationLog.findMany({ where: { propagationId: id }, select: { photoKeys: true } });
    await this.prisma.propagation.delete({ where: { id } });
    await this.storage.remove(logs.flatMap((l) => l.photoKeys));
  }

}
