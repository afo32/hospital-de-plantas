import { existsSync } from 'node:fs';
import { z } from 'zod';

// Carga apps/api/.env en desarrollo (en Railway las variables llegan del entorno).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const boolFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ message: 'DATABASE_URL es obligatoria (mira .env.example)' }),
  REDIS_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  /** Minutos de vida del token de acceso */
  JWT_ACCESS_TTL_MIN: z.coerce.number().int().positive().default(15),
  /** Días de vida de la sesión (refresh token) */
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  FEATURE_APPLE_LOGIN: boolFromString,
  /** ID de cliente OAuth de tipo "Aplicación web" de Google Cloud. Vacío = inicio con Google desactivado. */
  GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  PLANTNET_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Modelo de Claude para las fichas y el diagnóstico */
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5-5'),
  /** Identificaciones por foto por usuario y día */
  IDENTIFY_DAILY_LIMIT: z.coerce.number().int().positive().default(10),
  /** Diagnósticos de salud por usuario y día */
  DIAGNOSE_DAILY_LIMIT: z.coerce.number().int().positive().default(3),
  /** Guías de crianza nuevas (especie + método) que cada persona puede pedir al día */
  GUIDE_DAILY_LIMIT: z.coerce.number().int().positive().default(10),
  /* Fotos en Cloudflare R2. Si faltan, se guardan en el disco del servidor (UPLOADS_DIR). */
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** Solo para pruebas con otro servicio compatible con S3; normalmente vacío */
  R2_ENDPOINT: z.string().optional(),
  /** Token de acceso de Expo para enviar push (opcional; solo si activas "push security" en expo.dev) */
  EXPO_ACCESS_TOKEN: z.string().optional(),
  /** Segundos que se esperan para juntar varias acciones en un solo aviso ("Ana regó 3 plantas") */
  PUSH_BATCH_SECONDS: z.coerce.number().int().min(0).default(60),
  /** URL pública del API sin /v1 (p. ej. https://xxx.up.railway.app). Con ella, las invitaciones llevan un enlace https que se puede pulsar en WhatsApp. */
  PUBLIC_URL: z.string().optional(),
  /** Email de contacto para la política de privacidad y el borrado de cuentas */
  SUPPORT_EMAIL: z.string().optional(),
  /** Carpeta para las fotos cuando no hay R2 configurado */
  UPLOADS_DIR: z.string().default('uploads'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables de entorno no válidas:\n${problems}`);
  }
  return parsed.data;
}

/** Configuración validada al arrancar. Si falta algo, el API no arranca y dice qué. */
export const env = loadEnv();
