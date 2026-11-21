import { z } from 'zod';
import { daySchema } from './garden.js';
import { photoBase64Schema } from './health.js';

/* =====================================================================
 * Crianza: de la semilla (o el esqueje, la división, el acodo) a la planta
 * ===================================================================== */

export const PROPAGATION_METHODS = [
  { value: 'seed', label: 'Semilla', hint: 'Sembrar y criar desde la semilla.' },
  { value: 'cutting', label: 'Esqueje', hint: 'Enraizar un trozo de tallo u hoja de una planta.' },
  { value: 'division', label: 'División de mata', hint: 'Separar una planta grande en varias con sus raíces.' },
  { value: 'layering', label: 'Acodo', hint: 'Hacer que una rama eche raíces sin separarla de la madre.' },
] as const;
export type PropagationMethod = (typeof PROPAGATION_METHODS)[number]['value'];
export const propagationMethodSchema = z.enum(['seed', 'cutting', 'division', 'layering']);

export const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' } as const;

/** Guía paso a paso que escribe la IA (una por especie y método, compartida por todos). */
export const propagationGuideSchema = z.object({
  suitable: z.boolean().describe('false si este método casi nunca funciona con esta especie'),
  suitabilityNote: z.string().describe('1-2 frases: si es buena idea este método y, si no, cuál usar'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  bestMonths: z.array(z.number().int()).describe('Meses buenos para empezar (1-12, hemisferio norte)'),
  successRate: z.string().describe('Qué proporción suele salir, p. ej. "70-90 % germinan"'),
  materials: z.array(z.string()).describe('Lo que hace falta, concreto: tipo de sustrato y proporciones, recipientes, etc.'),
  stages: z
    .array(
      z.object({
        title: z.string().describe('Nombre corto de la etapa, p. ej. "Germinación"'),
        summary: z.string().describe('Una frase: qué pasa en esta etapa'),
        steps: z.array(z.string()).describe('Pasos concretos con cifras (mm, °C, %, horas, días)'),
        minDays: z.number().int().describe('Duración mínima habitual en días (0 si se hace en el día)'),
        maxDays: z.number().int().describe('Duración máxima habitual en días'),
        doneWhen: z.string().describe('Señal clara de que ya se puede pasar a la siguiente etapa'),
        tasks: z
          .array(
            z.object({
              text: z.string().describe('Tarea corta en imperativo, p. ej. "Pulveriza la superficie"'),
              everyDays: z.number().int().describe('Cada cuántos días repetirla; 0 si se hace una vez en la etapa'),
            }),
          )
          .describe('Tareas de esta etapa (0-4)'),
        tips: z.array(z.string()).describe('Consejos o errores típicos de esta etapa (0-3)'),
      }),
    )
    .describe('De 3 a 8 etapas, en orden, desde la preparación hasta que es una planta lista para su maceta definitiva'),
  problems: z
    .array(z.object({ problem: z.string(), solution: z.string() }))
    .describe('Problemas frecuentes (hongos, no germina, se pudre…) y qué hacer'),
});
export type PropagationGuide = z.infer<typeof propagationGuideSchema>;
export type PropagationStage = PropagationGuide['stages'][number];

export const guideStatusSchema = z.object({
  speciesId: z.uuid(),
  method: propagationMethodSchema,
  status: z.enum(['ready', 'generating', 'failed', 'unavailable']),
  guide: propagationGuideSchema.nullable(),
  message: z.string().nullable(),
});
export type GuideStatus = z.infer<typeof guideStatusSchema>;

export const createPropagationSchema = z.object({
  speciesId: z.uuid(),
  method: propagationMethodSchema,
  name: z.string().trim().max(50).optional(),
  count: z.number().int().min(1, 'Al menos 1').max(1000, 'Máximo 1000'),
  /** Día en que empezó (por defecto, hoy) */
  startDay: daySchema.optional(),
});
export type CreatePropagationInput = z.infer<typeof createPropagationSchema>;

export const updatePropagationSchema = z.object({
  name: z.string().trim().max(50).nullable().optional(),
  count: z.number().int().min(1).max(1000).optional(),
  successCount: z.number().int().min(0).max(1000).nullable().optional(),
});
export type UpdatePropagationInput = z.infer<typeof updatePropagationSchema>;

export const advancePropagationSchema = z.object({
  /** Cuántas han germinado o enraizado (opcional, al pasar de etapa) */
  successCount: z.number().int().min(0).max(1000).optional(),
  /** true para volver a la etapa anterior */
  back: z.boolean().optional(),
});

export const propagationTaskSchema = z.object({
  stageIndex: z.number().int().min(0),
  taskIndex: z.number().int().min(0),
});

export const propagationLogInputSchema = z
  .object({
    text: z.string().trim().max(2000).optional(),
    photos: z.array(photoBase64Schema).max(4).default([]),
  })
  .refine((n) => (n.text?.length ?? 0) > 0 || n.photos.length > 0, {
    message: 'Escribe algo o añade una foto',
    path: ['text'],
  });
export type PropagationLogInput = z.input<typeof propagationLogInputSchema>;

export const finishPropagationSchema = z.object({
  /** done = ya es una planta; failed = no salió */
  result: z.enum(['done', 'failed']),
  /** Planta creada en Mi jardín a partir de esta crianza */
  plantId: z.uuid().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const PROPAGATION_STATUSES = ['active', 'done', 'failed'] as const;

export const propagationSummarySchema = z.object({
  id: z.uuid(),
  gardenId: z.uuid(),
  name: z.string(),
  speciesId: z.uuid(),
  speciesName: z.string(),
  imageUrl: z.string().nullable(),
  method: propagationMethodSchema,
  status: z.enum(PROPAGATION_STATUSES),
  startDay: daySchema,
  /** Días desde que empezó */
  day: z.number().int(),
  stageIndex: z.number().int(),
  stageCount: z.number().int(),
  stageTitle: z.string(),
  /** Días en la etapa actual */
  dayInStage: z.number().int(),
  stageMinDays: z.number().int(),
  stageMaxDays: z.number().int(),
  count: z.number().int(),
  successCount: z.number().int().nullable(),
  /** Tareas pendientes hoy */
  dueTasks: z.number().int(),
  plantId: z.uuid().nullable(),
});
export type PropagationSummary = z.infer<typeof propagationSummarySchema>;

export const propagationListSchema = z.object({ propagations: z.array(propagationSummarySchema) });

export const propagationLogSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['note', 'stage', 'done', 'failed']),
  stageIndex: z.number().int(),
  text: z.string().nullable(),
  photos: z.array(z.string()),
  authorName: z.string().nullable(),
  mine: z.boolean(),
  createdAt: z.string(),
});
export type PropagationLog = z.infer<typeof propagationLogSchema>;

export const propagationDetailSchema = z.object({
  propagation: propagationSummarySchema,
  guide: propagationGuideSchema,
  today: daySchema,
  /** Fuera de los meses buenos para empezar */
  outOfSeason: z.boolean(),
  /** Tareas de la etapa actual con su estado */
  tasks: z.array(
    z.object({
      stageIndex: z.number().int(),
      taskIndex: z.number().int(),
      text: z.string(),
      everyDays: z.number().int(),
      lastDone: daySchema.nullable(),
      due: z.boolean(),
    }),
  ),
  logs: z.array(propagationLogSchema),
  canEdit: z.boolean(),
});
export type PropagationDetail = z.infer<typeof propagationDetailSchema>;

/* =====================================================================
 * Informar de un problema en contenido generado con IA
 * ===================================================================== */

export const REPORT_REASONS = [
  { value: 'wrong', label: 'Información incorrecta' },
  { value: 'dangerous', label: 'Consejo peligroso (tóxico, dañino…)' },
  { value: 'offensive', label: 'Contenido ofensivo o inapropiado' },
  { value: 'other', label: 'Otro problema' },
] as const;

export const createReportSchema = z.object({
  targetType: z.enum(['profile', 'diagnosis', 'guide']),
  /** Id de la especie, del diagnóstico, o "especie:método" para las guías */
  targetId: z.string().min(1).max(80),
  reason: z.enum(['wrong', 'dangerous', 'offensive', 'other']),
  details: z.string().trim().max(1000).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;
