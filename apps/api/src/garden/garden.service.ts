import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AddPlantInput,
  type CalendarItem,
  type CalendarResponse,
  type CarePlan,
  LAST_REPOT_OPTIONS,
  LAST_WATER_OPTIONS,
  type PlantDetail,
  type PlantSummary,
  type SpeciesCare,
  speciesProfileSchema,
  type Task,
  type TaskType,
  type TodayResponse,
  type UpdatePlantInput,
} from '@hdp/shared';
import { addDays, dayToDate, diffDays, localDay, monthOf } from '../common/days.js';
import type { CareEvent, Species, User, UserPlant } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { computeCarePlan } from './care-engine.js';

/** Cuántos días por delante se muestran en "Próximamente". */
const UPCOMING_DAYS = 7;
const careSchema = speciesProfileSchema.shape.care;

type PlantWithRelations = UserPlant & { species: Species; events: (CareEvent & { doneBy: { name: string | null } })[] };
type Ctx = { user: User; today: string; tz: string; southern: boolean };

@Injectable()
export class GardenService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------- Permisos y contexto ---------- */

  private async context(userId: string): Promise<Ctx> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tz = user.timezone || 'Europe/Madrid';
    return { user, tz, today: localDay(new Date(), tz), southern: (user.lat ?? 40) < 0 };
  }

  /** Comprueba que el usuario es miembro del jardín (y que puede editar si `write`). */
  private async assertMember(userId: string, gardenId: string, write = false): Promise<void> {
    const member = await this.prisma.gardenMember.findUnique({ where: { gardenId_userId: { gardenId, userId } } });
    if (!member) throw new NotFoundException('Jardín no encontrado');
    if (write && member.role === 'viewer') throw new ForbiddenException('Solo puedes ver este jardín, no editarlo.');
  }

  private async loadPlant(userId: string, plantId: string, write = false): Promise<PlantWithRelations> {
    const plant = await this.prisma.userPlant.findFirst({
      where: { id: plantId, archivedAt: null },
      include: {
        species: true,
        events: { orderBy: { doneAt: 'desc' }, take: 60, include: { doneBy: { select: { name: true } } } },
      },
    });
    if (!plant) throw new NotFoundException('Planta no encontrada');
    await this.assertMember(userId, plant.gardenId, write);
    return plant;
  }

  /* ---------- Cálculo del plan ---------- */

  private careOf(species: Species): SpeciesCare {
    const parsed = careSchema.safeParse(species.care);
    if (!parsed.success) {
      throw new ConflictException('La ficha de esta especie aún se está preparando. Inténtalo en un minuto.');
    }
    return parsed.data;
  }

  private lastDayOf(plant: PlantWithRelations, type: TaskType, ctx: Ctx): string | null {
    const ev = plant.events.find((e) => e.type === type);
    if (ev) return ev.taskDay ?? localDay(ev.doneAt, ctx.tz);
    if (type === 'water' && plant.lastWateredAt) return localDay(plant.lastWateredAt, ctx.tz);
    if (type === 'repot' && plant.lastRepottedAt) return localDay(plant.lastRepottedAt, ctx.tz);
    return null;
  }

  private plan(plant: PlantWithRelations, ctx: Ctx): CarePlan {
    return computeCarePlan({
      care: this.careOf(plant.species),
      category: plant.species.category,
      plant,
      today: ctx.today,
      lastWaterDay: this.lastDayOf(plant, 'water', ctx),
      lastFertilizeDay: this.lastDayOf(plant, 'fertilize', ctx),
      lastRepotDay: this.lastDayOf(plant, 'repot', ctx),
      snoozedUntil: plant.snoozedUntil ? localDay(plant.snoozedUntil, ctx.tz) : null,
      southern: ctx.southern,
      recentWaterEvents: plant.events
        .filter((e) => e.type === 'water' || e.type === 'snooze')
        .map((e) => e.type as 'water' | 'snooze'),
    });
  }

  private summary(plant: PlantWithRelations, plan: CarePlan, ctx: Ctx): PlantSummary {
    const s = plant.species;
    return {
      id: plant.id,
      name: plant.nickname ?? s.commonNames[0] ?? s.scientificName,
      nickname: plant.nickname,
      imageUrl: plant.photoUrl ?? s.imageUrl,
      room: plant.room,
      location: plant.location,
      species: {
        id: s.id,
        scientificName: s.scientificName,
        commonName: s.commonNames[0] ?? null,
        family: s.family,
        imageUrl: s.imageUrl,
        category: s.category === 'unknown' ? null : s.category,
        gbifKey: null,
      },
      nextWaterDay: plan.water.nextDay,
      waterInDays: diffDays(ctx.today, plan.water.nextDay),
      waterAmountMl: plan.water.amountMl,
    };
  }

  /** Guarda en la planta la frecuencia y cantidad calculadas (para consultas rápidas y avisos). */
  private async cachePlan(plantId: string, plan: CarePlan) {
    await this.prisma.userPlant.update({
      where: { id: plantId },
      data: {
        waterEveryDays: plan.water.everyDays,
        waterAmountMl: plan.water.amountMl,
        fertilizeEveryDays: plan.fertilize.everyDays,
        repotEveryMonths: plan.repot.everyMonths,
      },
    });
  }

  /* ---------- Plantas ---------- */

  private plantsOfGarden(gardenId: string) {
    return this.prisma.userPlant.findMany({
      where: { gardenId, archivedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        species: true,
        events: { orderBy: { doneAt: 'desc' }, take: 60, include: { doneBy: { select: { name: true } } } },
      },
    });
  }

  async listPlants(userId: string, gardenId: string): Promise<PlantSummary[]> {
    await this.assertMember(userId, gardenId);
    const ctx = await this.context(userId);
    const plants = await this.plantsOfGarden(gardenId);
    return plants
      .map((p) => this.summary(p, this.plan(p, ctx), ctx))
      .sort((a, b) => a.waterInDays - b.waterInDays || a.name.localeCompare(b.name, 'es'));
  }

  async addPlant(userId: string, gardenId: string, input: AddPlantInput): Promise<PlantDetail> {
    await this.assertMember(userId, gardenId, true);
    const ctx = await this.context(userId);
    const species = await this.prisma.species.findUnique({ where: { id: input.speciesId } });
    if (!species) throw new NotFoundException('Especie no encontrada');
    this.careOf(species); // falla con un mensaje claro si la ficha aún no está lista

    const watered = LAST_WATER_OPTIONS.find((o) => o.value === input.lastWatered)?.daysAgo ?? null;
    const repotted = LAST_REPOT_OPTIONS.find((o) => o.value === input.lastRepotted)?.daysAgo ?? null;
    const waterDay = watered === null ? null : addDays(ctx.today, -watered);
    const repotDay = repotted === null ? null : addDays(ctx.today, -repotted);

    const created = await this.prisma.userPlant.create({
      data: {
        gardenId,
        speciesId: species.id,
        nickname: input.nickname || null,
        location: input.location,
        room: input.room || null,
        lightLevel: input.lightLevel,
        lightLux: input.lightLux ?? null,
        potShape: input.potShape,
        potDiameterCm: input.potDiameterCm,
        potHeightCm: input.potHeightCm,
        potLengthCm: input.potShape === 'rectangular' ? (input.potLengthCm ?? null) : null,
        potMaterial: input.potMaterial,
        hasDrainage: input.hasDrainage,
        soilType: input.soilType,
        overwateringGuard: input.overwateringGuard,
        plantHeightCm: input.plantHeightCm ?? null,
        plantWidthCm: input.plantWidthCm ?? null,
        lastWateredAt: waterDay ? dayToDate(waterDay) : null,
        lastRepottedAt: repotDay ? dayToDate(repotDay) : null,
        waterEveryDays: 7,
        waterAmountMl: 200,
        events: {
          create: [
            ...(waterDay ? [{ type: 'water', taskDay: waterDay, doneAt: dayToDate(waterDay), doneById: userId }] : []),
            ...(repotDay ? [{ type: 'repot', taskDay: repotDay, doneAt: dayToDate(repotDay), doneById: userId }] : []),
          ],
        },
      },
    });
    return this.getPlant(userId, created.id);
  }

  async getPlant(userId: string, plantId: string): Promise<PlantDetail> {
    const plant = await this.loadPlant(userId, plantId);
    const ctx = await this.context(userId);
    const plan = this.plan(plant, ctx);
    if (plant.waterEveryDays !== plan.water.everyDays || plant.waterAmountMl !== plan.water.amountMl) {
      await this.cachePlan(plant.id, plan);
    }
    return {
      plant: {
        ...this.summary(plant, plan, ctx),
        gardenId: plant.gardenId,
        lightLevel: plant.lightLevel,
        potShape: plant.potShape,
        potDiameterCm: plant.potDiameterCm,
        potHeightCm: plant.potHeightCm,
        potLengthCm: plant.potLengthCm,
        potMaterial: plant.potMaterial,
        hasDrainage: plant.hasDrainage,
        soilType: plant.soilType,
        overwateringGuard: plant.overwateringGuard,
        plantHeightCm: plant.plantHeightCm,
        plantWidthCm: plant.plantWidthCm,
        createdAt: plant.createdAt.toISOString(),
      },
      care: plan,
      today: ctx.today,
    };
  }

  async updatePlant(userId: string, plantId: string, input: UpdatePlantInput): Promise<PlantDetail> {
    await this.loadPlant(userId, plantId, true);
    await this.prisma.userPlant.update({ where: { id: plantId }, data: input });
    return this.getPlant(userId, plantId);
  }

  async removePlant(userId: string, plantId: string): Promise<void> {
    await this.loadPlant(userId, plantId, true);
    await this.prisma.userPlant.update({ where: { id: plantId }, data: { archivedAt: new Date() } });
  }

  /* ---------- Tareas ---------- */

  /** Marca una tarea como hecha hoy. Si otra persona del jardín ya la hizo, no la duplica. */
  async complete(userId: string, plantId: string, type: TaskType): Promise<PlantDetail> {
    const plant = await this.loadPlant(userId, plantId, true);
    const ctx = await this.context(userId);
    try {
      await this.prisma.careEvent.create({
        data: { plantId, type, taskDay: ctx.today, doneById: userId, ...(type === 'water' ? { amountMl: plant.waterAmountMl } : {}) },
      });
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2002') throw err; // ya estaba hecha hoy
    }
    const now = new Date();
    await this.prisma.userPlant.update({
      where: { id: plantId },
      data:
        type === 'water'
          ? { lastWateredAt: now, snoozedUntil: null }
          : type === 'repot'
            ? { lastRepottedAt: now }
            : {},
    });
    return this.getPlant(userId, plantId);
  }

  /** Deshace la tarea marcada hoy (por si se tocó sin querer). */
  async undo(userId: string, plantId: string, type: TaskType): Promise<PlantDetail> {
    await this.loadPlant(userId, plantId, true);
    const ctx = await this.context(userId);
    await this.prisma.careEvent.deleteMany({ where: { plantId, type, taskDay: ctx.today } });
    if (type === 'water' || type === 'repot') {
      const previous = await this.prisma.careEvent.findFirst({ where: { plantId, type }, orderBy: { doneAt: 'desc' } });
      await this.prisma.userPlant.update({
        where: { id: plantId },
        data: type === 'water' ? { lastWateredAt: previous?.doneAt ?? null } : { lastRepottedAt: previous?.doneAt ?? null },
      });
    }
    return this.getPlant(userId, plantId);
  }

  /** Pospone el próximo riego `days` días (desde la fecha prevista, o desde hoy si ya tocaba). */
  async snooze(userId: string, plantId: string, days: number): Promise<PlantDetail> {
    const plant = await this.loadPlant(userId, plantId, true);
    const ctx = await this.context(userId);
    const due = this.plan(plant, ctx).water.nextDay;
    const until = addDays(due > ctx.today ? due : ctx.today, days);
    await this.prisma.$transaction([
      this.prisma.userPlant.update({ where: { id: plantId }, data: { snoozedUntil: dayToDate(until) } }),
      this.prisma.careEvent.create({ data: { plantId, type: 'snooze', snoozeDays: days, doneById: userId } }),
    ]);
    return this.getPlant(userId, plantId);
  }

  /** Tareas atrasadas, de hoy y de los próximos 7 días, más las ya hechas hoy. */
  async today(userId: string, gardenId: string): Promise<TodayResponse> {
    await this.assertMember(userId, gardenId);
    const ctx = await this.context(userId);
    const plants = await this.plantsOfGarden(gardenId);
    const horizon = addDays(ctx.today, UPCOMING_DAYS);
    const tasks: Task[] = [];

    for (const p of plants) {
      let plan: CarePlan;
      try {
        plan = this.plan(p, ctx);
      } catch {
        continue; // especie sin ficha todavía
      }
      const name = p.nickname ?? p.species.commonNames[0] ?? p.species.scientificName;
      const base = { plantId: p.id, plantName: name, imageUrl: p.photoUrl ?? p.species.imageUrl };

      for (const type of ['water', 'fertilize', 'repot'] as const) {
        const doneToday = p.events.find((e) => e.type === type && e.taskDay === ctx.today);
        if (doneToday) {
          tasks.push({
            ...base,
            type,
            dueDay: ctx.today,
            daysLate: 0,
            amountMl: type === 'water' ? plan.water.amountMl : null,
            done: true,
            doneBy: doneToday.doneBy.name,
            doneAt: doneToday.doneAt.toISOString(),
          });
          continue;
        }
        const due = type === 'water' ? plan.water.nextDay : type === 'fertilize' ? plan.fertilize.nextDay : plan.repot.nextDay;
        if (!due || due > horizon) continue;
        tasks.push({
          ...base,
          type,
          dueDay: due,
          daysLate: diffDays(due, ctx.today),
          amountMl: type === 'water' ? plan.water.amountMl : null,
          done: false,
          doneBy: null,
          doneAt: null,
        });
      }
    }
    tasks.sort((a, b) => a.dueDay.localeCompare(b.dueDay) || a.plantName.localeCompare(b.plantName, 'es'));
    return { today: ctx.today, tasks };
  }

  /** Completa todas las tareas atrasadas y de hoy. */
  async completeAll(userId: string, gardenId: string): Promise<number> {
    const { today, tasks } = await this.today(userId, gardenId);
    const pending = tasks.filter((t) => !t.done && t.dueDay <= today);
    for (const t of pending) await this.complete(userId, t.plantId, t.type);
    return pending.length;
  }

  /* ---------- Calendario ---------- */

  async calendar(userId: string, plantId: string, from: string, to: string): Promise<CalendarResponse> {
    if (diffDays(from, to) > 400 || to < from) throw new ConflictException('Rango de fechas no válido');
    const plant = await this.loadPlant(userId, plantId);
    const ctx = await this.context(userId);
    const plan = this.plan(plant, ctx);
    const name = plant.nickname ?? plant.species.commonNames[0] ?? plant.species.scientificName;
    const items: CalendarItem[] = [];
    const seen = new Set<string>();
    const push = (day: string, type: TaskType, status: CalendarItem['status']) => {
      const key = `${day}|${type}|${status}`;
      if (day < from || day > to || seen.has(key)) return;
      seen.add(key);
      items.push({ day, type, status, plantId, plantName: name });
    };

    // Pasado: lo que se hizo de verdad.
    const history = await this.prisma.careEvent.findMany({
      where: { plantId, doneAt: { gte: dayToDate(addDays(from, -1)), lte: dayToDate(addDays(to, 1)) } },
    });
    for (const e of history) {
      const day = e.taskDay ?? localDay(e.doneAt, ctx.tz);
      if (e.type === 'snooze') push(day, 'water', 'snoozed');
      else if (e.type === 'water' || e.type === 'fertilize' || e.type === 'repot') push(day, e.type, 'done');
    }

    // Futuro: lo previsto por el plan, repitiendo cada N días.
    const care = this.careOf(plant.species);
    const growing = ctx.southern ? care.growingMonths.map((m) => ((m + 5) % 12) + 1) : care.growingMonths;
    const doneToday = (type: TaskType) => history.some((e) => e.type === type && e.taskDay === ctx.today);

    for (let d = plan.water.nextDay, i = 0; d <= to && i < 200; d = addDays(d, plan.water.everyDays), i++) {
      if (d >= ctx.today && !(d === ctx.today && doneToday('water'))) push(d, 'water', 'planned');
    }
    if (plan.fertilize.nextDay && plan.fertilize.everyDays) {
      for (let d = plan.fertilize.nextDay, i = 0; d <= to && i < 100; d = addDays(d, plan.fertilize.everyDays), i++) {
        if (d >= ctx.today && growing.includes(monthOf(d)) && !(d === ctx.today && doneToday('fertilize'))) {
          push(d, 'fertilize', 'planned');
        }
      }
    }
    if (plan.repot.nextDay && plan.repot.nextDay >= ctx.today) push(plan.repot.nextDay, 'repot', 'planned');

    items.sort((a, b) => a.day.localeCompare(b.day));
    return { from, to, items };
  }
}
