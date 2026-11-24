import { z } from 'zod';
import { REPOT_SIGNS } from './catalog.js';
import { arrivalPlanSchema } from './arrival.js';
import { speciesSummarySchema } from './species.js';

const REPOT_SIGN_VALUES = REPOT_SIGNS.map((s) => s.value) as [string, ...string[]];
import { climateSchema } from './weather.js';

/** Fechas de calendario sin hora, en la zona horaria del usuario: "2026-11-15". */
export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida');
export type Day = z.infer<typeof daySchema>;

export const TASK_TYPES = ['water', 'fertilize', 'repot'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_LABELS: Record<TaskType, string> = {
  water: 'Regar',
  fertilize: 'Fertilizar',
  repot: 'Trasplantar',
};

/* ---------- Plan de cuidado (lo calcula el motor del servidor) ---------- */

export const POT_VERDICTS = ['ok', 'bigger', 'smaller', 'no_drainage', 'need_size'] as const;
export type PotVerdict = (typeof POT_VERDICTS)[number];

export const carePlanSchema = z.object({
  water: z.object({
    everyDays: z.number().int(),
    amountMl: z.number().int(),
    lastDay: daySchema.nullable(),
    nextDay: daySchema,
    snoozedUntil: daySchema.nullable(),
    /** Cómo regar, en una frase */
    howTo: z.string(),
    /** Factores que han cambiado la frecuencia (estación, luz, maceta…) */
    factors: z.array(z.string()),
  }),
  fertilize: z.object({
    everyDays: z.number().int().nullable(),
    lastDay: daySchema.nullable(),
    nextDay: daySchema.nullable(),
    /** Por qué no toca ahora (reposo invernal, trasplante reciente…), o null */
    pausedReason: z.string().nullable(),
    product: z.string(),
  }),
  repot: z.object({
    everyMonths: z.number().int(),
    lastDay: daySchema.nullable(),
    nextDay: daySchema.nullable(),
    note: z.string(),
    /** Señales de trasplante marcadas en la última comprobación */
    signs: z.array(z.string()).default([]),
    /** 2 o más señales: toca trasplantar ya */
    urgent: z.boolean().default(false),
  }),
  pot: z.object({
    verdict: z.enum(POT_VERDICTS),
    message: z.string(),
    volumeL: z.number(),
    recommendedDiameterCm: z.number().nullable(),
  }),
  /** Interior/exterior según el tiempo de tu zona (null si no hay datos del tiempo) */
  climate: climateSchema.nullable(),
  /** Consejos extra: "Has pospuesto 2 veces seguidas…", "Hoy llueve: no hace falta regar…" */
  suggestions: z.array(z.string()),
});
export type CarePlan = z.infer<typeof carePlanSchema>;

/* ---------- Plantas ---------- */

export const plantSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  nickname: z.string().nullable(),
  imageUrl: z.string().nullable(),
  room: z.string().nullable(),
  location: z.string(),
  species: speciesSummarySchema,
  nextWaterDay: daySchema,
  /** Días hasta el próximo riego (negativo = atrasado) */
  waterInDays: z.number().int(),
  waterAmountMl: z.number().int(),
});
export type PlantSummary = z.infer<typeof plantSummarySchema>;

export const plantListSchema = z.object({ plants: z.array(plantSummarySchema) });
export type PlantList = z.infer<typeof plantListSchema>;

export const plantDetailSchema = z.object({
  plant: plantSummarySchema.extend({
    gardenId: z.uuid(),
    lightLevel: z.string(),
    potShape: z.string(),
    potDiameterCm: z.number(),
    potHeightCm: z.number(),
    potLengthCm: z.number().nullable(),
    potMaterial: z.string().nullable(),
    hasDrainage: z.boolean(),
    soilType: z.string().nullable(),
    overwateringGuard: z.array(z.string()),
    plantHeightCm: z.number().nullable(),
    plantWidthCm: z.number().nullable(),
    lightLux: z.number().nullable(),
    createdAt: z.string(),
  }),
  care: carePlanSchema,
  /** Plan de las primeras semanas si la acaba de comprar (null si no) */
  arrival: arrivalPlanSchema.nullable().default(null),
  today: daySchema,
});
export type PlantDetail = z.infer<typeof plantDetailSchema>;

/** Campos editables de una planta (todos opcionales). */
export const updatePlantSchema = z.object({
  nickname: z.string().trim().max(40).nullable().optional(),
  room: z.string().trim().max(40).nullable().optional(),
  location: z.enum(['indoor', 'outdoor', 'indoor_night_outdoor_day']).optional(),
  lightLevel: z.enum(['full_sun', 'partial_sun', 'bright_indirect', 'low']).optional(),
  lightLux: z.number().int().min(0).max(200_000).nullable().optional(),
  potShape: z.enum(['round', 'rectangular']).optional(),
  potDiameterCm: z.number().min(3).max(200).optional(),
  potHeightCm: z.number().min(3).max(200).optional(),
  potLengthCm: z.number().min(3).max(300).nullable().optional(),
  potMaterial: z.enum(['terracotta', 'plastic', 'glazed_ceramic', 'fabric', 'other']).optional(),
  hasDrainage: z.boolean().optional(),
  plantHeightCm: z.number().min(1).max(2000).nullable().optional(),
  plantWidthCm: z.number().min(1).max(2000).nullable().optional(),
  /** Señales de trasplante que se ven ahora (comprobación en la pestaña Cuidado) */
  repotSigns: z.array(z.enum(REPOT_SIGN_VALUES)).max(REPOT_SIGN_VALUES.length).optional(),
});
export type UpdatePlantInput = z.infer<typeof updatePlantSchema>;

/* ---------- Tareas de "Hoy" ---------- */

export const taskSchema = z.object({
  plantId: z.uuid(),
  plantName: z.string(),
  imageUrl: z.string().nullable(),
  type: z.enum(TASK_TYPES),
  dueDay: daySchema,
  /** Días de retraso (0 = hoy, negativo = faltan días) */
  daysLate: z.number().int(),
  amountMl: z.number().int().nullable(),
  done: z.boolean(),
  doneBy: z.string().nullable(),
  doneAt: z.string().nullable(),
});
export type Task = z.infer<typeof taskSchema>;

export const todaySchema = z.object({
  today: daySchema,
  tasks: z.array(taskSchema),
});
export type TodayResponse = z.infer<typeof todaySchema>;

export const completeTaskSchema = z.object({
  type: z.enum(TASK_TYPES),
  /** Día en que se hizo (para acciones guardadas sin conexión); por defecto, hoy */
  day: daySchema.optional(),
});
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

export const completeAllResponseSchema = z.object({ completed: z.number().int() });

/* ---------- Calendario ---------- */

export const calendarItemSchema = z.object({
  day: daySchema,
  type: z.enum(TASK_TYPES),
  status: z.enum(['done', 'planned', 'snoozed']),
  plantId: z.uuid(),
  plantName: z.string(),
});
export type CalendarItem = z.infer<typeof calendarItemSchema>;

export const calendarSchema = z.object({
  from: daySchema,
  to: daySchema,
  items: z.array(calendarItemSchema),
});
export type CalendarResponse = z.infer<typeof calendarSchema>;

export const calendarQuerySchema = z.object({ from: daySchema, to: daySchema });
