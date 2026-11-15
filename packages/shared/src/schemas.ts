import { z } from 'zod';
import {
  CARE_EVENT_TYPES,
  LAST_REPOT_OPTIONS,
  LAST_WATER_OPTIONS,
  LIGHT_LEVELS,
  OVERWATERING_GUARDS,
  PLANT_LOCATIONS,
  POT_MATERIALS,
  POT_SHAPES,
  SNOOZE_DAYS,
  SOIL_TYPES,
  valuesOf,
} from './catalog.js';

/* ---------- Autenticación (fase 2) ---------- */

export const registerSchema = z.object({
  email: z.email('Email no válido').toLowerCase(),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres').max(128),
  name: z.string().trim().min(1, 'Dinos cómo te llamas').max(60),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email('Email no válido').toLowerCase(),
  password: z.string().min(1, 'Escribe tu contraseña'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

/* ---------- Alta de planta: cuestionario (fase 4) ---------- */

export const addPlantSchema = z
  .object({
    speciesId: z.uuid(),
    nickname: z.string().trim().max(40).optional(),
    photoUrl: z.url().optional(),
    location: z.enum(valuesOf(PLANT_LOCATIONS)),
    room: z.string().trim().max(40).optional(),
    lightLevel: z.enum(valuesOf(LIGHT_LEVELS)),
    lightLux: z.number().int().min(0).max(150_000).optional(),
    potShape: z.enum(valuesOf(POT_SHAPES)),
    potDiameterCm: z.number().min(3).max(200),
    potLengthCm: z.number().min(3).max(300).optional(),
    potHeightCm: z.number().min(3).max(200),
    potMaterial: z.enum(valuesOf(POT_MATERIALS)),
    hasDrainage: z.boolean(),
    soilType: z.enum(valuesOf(SOIL_TYPES)),
    overwateringGuard: z.array(z.enum(valuesOf(OVERWATERING_GUARDS))).min(1),
    lastRepotted: z.enum(valuesOf(LAST_REPOT_OPTIONS)),
    lastWatered: z.enum(valuesOf(LAST_WATER_OPTIONS)),
    plantHeightCm: z.number().min(1).max(2000).optional(),
    plantWidthCm: z.number().min(1).max(2000).optional(),
  })
  .refine((v) => v.potShape === 'round' || v.potLengthCm !== undefined, {
    message: 'Para macetas rectangulares indica el largo',
    path: ['potLengthCm'],
  });
export type AddPlantInput = z.infer<typeof addPlantSchema>;

/* ---------- Tareas y eventos (fase 4) ---------- */

export const careEventSchema = z.object({
  type: z.enum(CARE_EVENT_TYPES),
  amountMl: z.number().int().positive().optional(),
  doneAt: z.iso.datetime().optional(),
});
export type CareEventInput = z.infer<typeof careEventSchema>;

export const snoozeSchema = z.object({
  days: z
    .number()
    .int()
    .refine((d) => (SNOOZE_DAYS as readonly number[]).includes(d), {
      message: `Solo se puede posponer ${SNOOZE_DAYS.join(', ')} días`,
    }),
});
export type SnoozeInput = z.infer<typeof snoozeSchema>;

/* ---------- Salud del API ---------- */

export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  database: z.enum(['up', 'down']),
  time: z.string(),
});
export type HealthResponse = z.infer<typeof healthSchema>;

/* ---------- Usuario y sesión (fase 2) ---------- */

export const publicUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string().nullable(),
  city: z.string().nullable(),
  reminderHour: z.number().int(),
  defaultGardenId: z.uuid().nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const authResponseSchema = authTokensSchema.extend({
  user: publicUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

/** Forma de los errores del API: `message` listo para mostrar al usuario. */
export const apiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

/* ---------- Inicio con Google (fase 2) ---------- */

export const googleSignInSchema = z.object({
  /** idToken que devuelve Google Sign-In en el móvil */
  idToken: z.string().min(20),
});
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
