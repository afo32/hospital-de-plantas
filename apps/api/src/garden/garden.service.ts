import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AddPlantInput,
  ARRIVAL_DAYS,
  type ArrivalPlan,
  arrivalDrafts,
  arrivalIntro,
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
  type Reminders,
  type Weather,
} from '@hdp/shared';
import { addDays, dayToDate, diffDays, localDay, monthOf } from '../common/days.js';
import type { CareEvent, Species, User, UserPlant } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PushService } from '../push/push.service.js';
import { StorageService } from '../storage/storage.service.js';
import { WeatherService } from '../weather/weather.service.js';
import { parseDone, parsePlan, reminderDays } from '../propagation/schedule.js';
import { computeCarePlan } from './care-engine.js';

/** Cuántos días por delante se muestran en "Próximamente". */
const UPCOMING_DAYS = 7;
const careSchema = speciesProfileSchema.shape.care;

export type PlantWithRelations = UserPlant & { species: Species; events: (CareEvent & { doneBy: { name: string | null } | null })[] };
export type Ctx = { user: User; today: string; tz: string; southern: boolean; weather: Weather | null };

@Injectable()
export class GardenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly storage: StorageService,
    private readonly push: PushService,
  ) {}

  /* ---------- Permisos y contexto ---------- */

  private async context(userId: string): Promise<Ctx> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tz = user.timezone || 'Europe/Madrid';
    const weather =
      user.lat != null && user.lon != null
        ? await this.weatherService.forLocation(user.lat, user.lon, user.city).catch(() => null)
        : null;
    return { user, tz, today: localDay(new Date(), tz), southern: (user.lat ?? 40) < 0, weather };
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
      arrivedDay: this.arrivedDay(plant, ctx),
      snoozedUntil: plant.snoozedUntil ? localDay(plant.snoozedUntil, ctx.tz) : null,
      southern: ctx.southern,
      recentWaterEvents: plant.events
        .filter((e) => e.type === 'water' || e.type === 'snooze')
        .map((e) => e.type as 'water' | 'snooze'),
      weather: ctx.weather,
      plantName: plant.nickname ?? plant.species.commonNames[0] ?? plant.species.scientificName,
    });
  }

  /* ---------- Recién llegada ---------- */

  /** Día en que llegó, si sigue dentro del plan "Recién llegada". */
  private arrivedDay(plant: UserPlant, ctx: Ctx): string | null {
    if (!plant.arrivedAt) return null;
    const day = plant.arrivedAt.toISOString().slice(0, 10);
    return diffDays(day, ctx.today) <= ARRIVAL_DAYS + 3 ? day : null;
  }

  private arrivalPlan(plant: PlantWithRelations, ctx: Ctx, otherPlants: number): ArrivalPlan | null {
    const start = this.arrivedDay(plant, ctx);
    if (!start) return null;
    let care: SpeciesCare;
    try {
      care = this.careOf(plant.species);
    } catch {
      return null;
    }
    // Animales para los que es tóxica, según la ficha (si ya está lista).
    const profile = speciesProfileSchema.safeParse(plant.species.profileEs);
    const toxicFor = profile.success
      ? profile.data.quickFacts.toxicityPets.filter((t) => t.level === 'toxic' || t.level === 'severe').map((t) => t.animal)
      : [];
    const done = new Set(plant.arrivalDone);
    const drafts = arrivalDrafts({
      category: plant.species.category,
      location: plant.location,
      lightLevel: plant.lightLevel,
      hasDrainage: plant.hasDrainage,
      waterStyle: care.waterStyle,
      humidityMinPct: care.humidityMinPct,
      luxMin: care.luxMin,
      frostTolerant: care.frostTolerant,
      tempMinC: care.tempMinC,
      toxicFor,
      otherPlants,
      month: monthOf(start),
      southern: ctx.southern,
    });
    return {
      startDay: start,
      endDay: addDays(start, ARRIVAL_DAYS),
      dayNumber: Math.max(0, diffDays(start, ctx.today)),
      intro: arrivalIntro(plant.species.category),
      tasks: drafts.map((d) => ({ ...d, dueDay: addDays(start, d.offset), done: done.has(d.id) })),
    };
  }

  private otherPlantsCount(plant: UserPlant) {
    return this.prisma.userPlant.count({ where: { gardenId: plant.gardenId, archivedAt: null, id: { not: plant.id } } });
  }

  /** Empieza el plan "Recién llegada" en una planta que ya estaba en el jardín. */
  async startArrival(userId: string, plantId: string): Promise<PlantDetail> {
    const plant = await this.loadPlant(userId, plantId, true);
    const ctx = await this.context(userId);
    // Si la añadiste hace poco, el plan cuenta desde ese día.
    const created = localDay(plant.createdAt, ctx.tz);
    const start = diffDays(created, ctx.today) <= 14 ? created : ctx.today;
    await this.prisma.userPlant.update({ where: { id: plantId }, data: { arrivedAt: dayToDate(start), arrivalDone: [] } });
    return this.getPlant(userId, plantId);
  }

  async arrivalTask(userId: string, plantId: string, taskId: string, done: boolean): Promise<PlantDetail> {
    const plant = await this.loadPlant(userId, plantId, true);
    const set = new Set(plant.arrivalDone);
    if (done) set.add(taskId);
    else set.delete(taskId);
    await this.prisma.userPlant.update({ where: { id: plantId }, data: { arrivalDone: [...set].slice(0, 60) } });
    return this.getPlant(userId, plantId);
  }

  /** "Ya está adaptada": cierra el plan (y deja de frenar el abono y el trasplante). */
  async endArrival(userId: string, plantId: string): Promise<PlantDetail> {
    await this.loadPlant(userId, plantId, true);
    await this.prisma.userPlant.update({ where: { id: plantId }, data: { arrivedAt: null, arrivalDone: [] } });
    return this.getPlant(userId, plantId);
  }

  private summary(plant: PlantWithRelations, plan: CarePlan, ctx: Ctx): PlantSummary {
    const s = plant.species;
    return {
      id: plant.id,
      name: plant.nickname ?? s.commonNames[0] ?? s.scientificName,
      nickname: plant.nickname,
      imageUrl: this.storage.url(plant.photoKey) ?? s.imageUrl,
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
        addedById: userId,
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
        arrivedAt: input.justBought ? dayToDate(ctx.today) : null,
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
    this.push.record({
      gardenId,
      actorId: userId,
      kind: 'plant_added',
      plantId: created.id,
      plantName: input.nickname || species.commonNames[0] || species.scientificName,
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
        lightLux: plant.lightLux,
        createdAt: plant.createdAt.toISOString(),
      },
      care: plan,
      arrival: plant.arrivedAt ? this.arrivalPlan(plant, ctx, await this.otherPlantsCount(plant)) : null,
      today: ctx.today,
    };
  }

  async updatePlant(userId: string, plantId: string, input: UpdatePlantInput): Promise<PlantDetail> {
    await this.loadPlant(userId, plantId, true);
    await this.prisma.userPlant.update({
      where: { id: plantId },
      data: { ...input, ...(input.repotSigns ? { repotSignsCheckedAt: new Date() } : {}) },
    });
    return this.getPlant(userId, plantId);
  }

  async removePlant(userId: string, plantId: string): Promise<void> {
    const plant = await this.loadPlant(userId, plantId, true);
    // Se borran sus fotos, notas y diagnósticos; la planta queda archivada con su historial de cuidados.
    const [notes, diagnoses] = await Promise.all([
      this.prisma.note.findMany({ where: { plantId }, select: { photoKeys: true } }),
      this.prisma.diagnosis.findMany({ where: { plantId }, select: { photoKeys: true } }),
    ]);
    await this.prisma.$transaction([
      this.prisma.note.deleteMany({ where: { plantId } }),
      this.prisma.diagnosis.deleteMany({ where: { plantId } }),
      this.prisma.userPlant.update({ where: { id: plantId }, data: { archivedAt: new Date(), photoKey: null } }),
    ]);
    await this.storage.remove([plant.photoKey, ...notes.flatMap((n) => n.photoKeys), ...diagnoses.flatMap((d) => d.photoKeys)]);
  }

  /* ---------- Foto propia ---------- */

  async setPhoto(userId: string, plantId: string, base64: string): Promise<PlantDetail> {
    const plant = await this.loadPlant(userId, plantId, true);
    const key = await this.storage.putImage('plant', plantId, base64);
    await this.prisma.userPlant.update({ where: { id: plantId }, data: { photoKey: key } });
    await this.storage.remove([plant.photoKey]);
    return this.getPlant(userId, plantId);
  }

  /** Vuelve a la foto de la especie. */
  async removePhoto(userId: string, plantId: string): Promise<PlantDetail> {
    const plant = await this.loadPlant(userId, plantId, true);
    await this.prisma.userPlant.update({ where: { id: plantId }, data: { photoKey: null } });
    await this.storage.remove([plant.photoKey]);
    return this.getPlant(userId, plantId);
  }

  /* ---------- Para otros módulos (salud, notas) ---------- */

  /** Comprueba que perteneces al jardín (y que puedes editar si `write`). */
  assertGarden(userId: string, gardenId: string, write = false): Promise<void> {
    return this.assertMember(userId, gardenId, write);
  }

  /** ¿Puede esta persona cambiar cosas en el jardín? */
  async canWrite(userId: string, gardenId: string): Promise<boolean> {
    const m = await this.prisma.gardenMember.findUnique({ where: { gardenId_userId: { gardenId, userId } } });
    return !!m && m.role !== 'viewer';
  }

  /** Día de hoy en la zona horaria de la persona. */
  async todayFor(userId: string): Promise<{ today: string; tz: string; southern: boolean }> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true, lat: true } });
    const tz = u.timezone || 'Europe/Madrid';
    return { today: localDay(new Date(), tz), tz, southern: (u.lat ?? 40) < 0 };
  }

  /** Comprueba que puedes ver (o editar, con `write`) la planta y la devuelve. */
  accessPlant(userId: string, plantId: string, write = false): Promise<PlantWithRelations> {
    return this.loadPlant(userId, plantId, write);
  }

  /** Comprueba permisos y devuelve la planta con su plan y el contexto (zona, clima, día local). */
  async plantContext(userId: string, plantId: string, write = false) {
    const plant = await this.loadPlant(userId, plantId, write);
    const ctx = await this.context(userId);
    let plan: CarePlan | null = null;
    try {
      plan = this.plan(plant, ctx);
    } catch {
      plan = null;
    }
    const name = plant.nickname ?? plant.species.commonNames[0] ?? plant.species.scientificName;
    return { plant, plan, ctx, name };
  }

  /* ---------- Tareas ---------- */

  /** Marca una tarea como hecha hoy. Si otra persona del jardín ya la hizo, no la duplica. */
  async complete(userId: string, plantId: string, type: TaskType, day?: string): Promise<PlantDetail> {
    const plant = await this.loadPlant(userId, plantId, true);
    const ctx = await this.context(userId);
    // Acciones guardadas sin conexión: se aceptan hasta 3 días atrás.
    const taskDay = day && day <= ctx.today && diffDays(day, ctx.today) <= 3 ? day : ctx.today;
    let isNew = true;
    try {
      await this.prisma.careEvent.create({
        data: {
          plantId,
          type,
          taskDay,
          doneAt: taskDay === ctx.today ? new Date() : dayToDate(taskDay),
          doneById: userId,
          ...(type === 'water' ? { amountMl: plant.waterAmountMl } : {}),
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2002') throw err; // ya estaba hecha hoy
      isNew = false;
    }
    if (isNew) {
      this.push.record({
        gardenId: plant.gardenId,
        actorId: userId,
        kind: type,
        plantId,
        plantName: plant.nickname ?? plant.species.commonNames[0] ?? plant.species.scientificName,
      });
    }
    const when = taskDay === ctx.today ? new Date() : dayToDate(taskDay);
    await this.prisma.userPlant.update({
      where: { id: plantId },
      data:
        type === 'water'
          ? { lastWateredAt: when, snoozedUntil: null }
          : type === 'repot'
            ? { lastRepottedAt: when, repotSigns: [] }
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
      const base = { plantId: p.id, plantName: name, imageUrl: this.storage.url(p.photoKey) ?? p.species.imageUrl };

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
            doneBy: doneToday.doneBy?.name ?? null,
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

  /* ---------- Fechas futuras previstas ---------- */

  /** Días previstos de riego, abono y trasplante entre `from` y `to` según el plan. */
  private projectTasks(plant: PlantWithRelations, plan: CarePlan, ctx: Ctx, from: string, to: string) {
    const care = this.careOf(plant.species);
    const growing = ctx.southern ? care.growingMonths.map((m) => ((m + 5) % 12) + 1) : care.growingMonths;
    const out: { day: string; type: TaskType }[] = [];
    const inRange = (d: string) => d >= from && d <= to && d >= ctx.today;
    for (let d = plan.water.nextDay, i = 0; d <= to && i < 200; d = addDays(d, plan.water.everyDays), i++) {
      if (inRange(d)) out.push({ day: d, type: 'water' });
    }
    if (plan.fertilize.nextDay && plan.fertilize.everyDays) {
      for (let d = plan.fertilize.nextDay, i = 0; d <= to && i < 100; d = addDays(d, plan.fertilize.everyDays), i++) {
        if (inRange(d) && growing.includes(monthOf(d))) out.push({ day: d, type: 'fertilize' });
      }
    }
    if (plan.repot.nextDay && inRange(plan.repot.nextDay)) out.push({ day: plan.repot.nextDay, type: 'repot' });
    return out;
  }

  /* ---------- Recordatorios para los avisos locales del móvil ---------- */

  /** Tareas de los próximos `days` días agrupadas por día, y alertas de clima. */
  async reminders(userId: string, gardenId: string, days = 14): Promise<Reminders> {
    await this.assertMember(userId, gardenId);
    const ctx = await this.context(userId);
    const to = addDays(ctx.today, days);
    const plants = await this.plantsOfGarden(gardenId);
    type DayEntry = {
      water: string[];
      fertilize: string[];
      repot: string[];
      checkup: string[];
      propagation: string[];
      arrival: string[];
    };
    const byDay = new Map<string, DayEntry>();
    const entryOf = (day: string) => {
      const entry = byDay.get(day) ?? { water: [], fertilize: [], repot: [], checkup: [], propagation: [], arrival: [] };
      byDay.set(day, entry);
      return entry;
    };
    const alerts = new Map<string, string[]>();

    for (const p of plants) {
      let plan: CarePlan;
      try {
        plan = this.plan(p, ctx);
      } catch {
        continue;
      }
      const name = p.nickname ?? p.species.commonNames[0] ?? p.species.scientificName;
      const doneToday = new Set(p.events.filter((e) => e.taskDay === ctx.today).map((e) => e.type));
      for (const t of this.projectTasks(p, plan, ctx, ctx.today, to)) {
        if (t.day === ctx.today && doneToday.has(t.type)) continue;
        entryOf(t.day)[t.type].push(name);
      }
      for (const a of plan.climate?.alerts ?? []) {
        alerts.set(a.day, [...(alerts.get(a.day) ?? []), a.message]);
      }
      // Recién llegadas: las tareas de seguimiento (revisiones, sol, abono…).
      const arrival = p.arrivedAt ? this.arrivalPlan(p, ctx, plants.length - 1) : null;
      for (const t of arrival?.tasks ?? []) {
        if (t.done || t.offset === 0 || t.dueDay < ctx.today || t.dueDay > to) continue;
        entryOf(t.dueDay).arrival.push(`${name}: ${t.title.charAt(0).toLowerCase()}${t.title.slice(1)}`);
      }
    }

    // Revisiones de salud pendientes (diagnósticos sin marcar como curados).
    const checkups = await this.prisma.diagnosis.findMany({
      where: {
        plantId: { in: plants.map((p) => p.id) },
        status: 'done',
        followUpAt: { gte: dayToDate(ctx.today), lte: dayToDate(to) },
      },
      select: { plantId: true, followUpAt: true },
    });
    for (const c of checkups) {
      const p = plants.find((x) => x.id === c.plantId)!;
      const name = p.nickname ?? p.species.commonNames[0] ?? p.species.scientificName;
      const entry = entryOf(c.followUpAt!.toISOString().slice(0, 10));
      if (!entry.checkup.includes(name)) entry.checkup.push(name);
    }

    // Crianzas en marcha: tareas de su etapa y aviso para revisar si toca pasar de etapa.
    const propagations = await this.prisma.propagation.findMany({
      where: { gardenId, status: 'active' },
      include: { species: { select: { commonNames: true, scientificName: true } } },
    });
    for (const pr of propagations) {
      const plan = parsePlan(pr.plan);
      if (!plan) continue;
      const name = pr.name ?? pr.species.commonNames[0] ?? pr.species.scientificName;
      const days = reminderDays(
        { name, plan, stageIndex: pr.stageIndex, stageStartDay: pr.stageStartDay, done: parseDone(pr.tasksDone) },
        ctx.today,
        to,
      );
      for (const [day, line] of days) entryOf(day).propagation.push(line);
    }

    return {
      reminderHour: ctx.user.reminderHour,
      notifyWater: ctx.user.notifyWater,
      notifyCare: ctx.user.notifyCare,
      notifyWeather: ctx.user.notifyWeather,
      days: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
      alerts: [...alerts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, messages]) => ({
          day,
          title: messages.length > 1 ? `Aviso de clima para ${messages.length} plantas` : 'Aviso de clima',
          body: messages.join('\n'),
        })),
    };
  }

  /** Recordatorios de todos tus jardines juntos (el móvil programa los avisos de todos). */
  async remindersAll(userId: string, days = 14): Promise<Reminders> {
    const memberships = await this.prisma.gardenMember.findMany({ where: { userId }, select: { gardenId: true } });
    const parts = await Promise.all(memberships.map((m) => this.reminders(userId, m.gardenId, days)));
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const byDay = new Map<string, Reminders['days'][number]>();
    const alerts = new Map<string, Reminders['alerts'][number]>();
    for (const r of parts) {
      for (const d of r.days) {
        const e = byDay.get(d.day) ?? {
          day: d.day,
          water: [],
          fertilize: [],
          repot: [],
          checkup: [],
          propagation: [],
          arrival: [],
        };
        e.water.push(...d.water);
        e.fertilize.push(...d.fertilize);
        e.repot.push(...d.repot);
        e.checkup.push(...d.checkup);
        e.propagation.push(...d.propagation);
        e.arrival.push(...d.arrival);
        byDay.set(d.day, e);
      }
      for (const a of r.alerts) {
        const prev = alerts.get(a.day);
        alerts.set(a.day, prev ? { day: a.day, title: 'Aviso de clima para varias plantas', body: `${prev.body}\n${a.body}` } : a);
      }
    }
    return {
      reminderHour: user.reminderHour,
      notifyWater: user.notifyWater,
      notifyCare: user.notifyCare,
      notifyWeather: user.notifyWeather,
      days: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
      alerts: [...alerts.values()].sort((a, b) => a.day.localeCompare(b.day)),
    };
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
    const doneToday = (type: TaskType) => history.some((e) => e.type === type && e.taskDay === ctx.today);
    for (const t of this.projectTasks(plant, plan, ctx, from, to)) {
      if (!(t.day === ctx.today && doneToday(t.type))) push(t.day, t.type, 'planned');
    }

    items.sort((a, b) => a.day.localeCompare(b.day));
    return { from, to, items };
  }
}
