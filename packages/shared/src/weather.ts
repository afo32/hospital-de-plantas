import { z } from 'zod';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Tiempo actual y previsión de 7 días de la zona del usuario (Open-Meteo). */
export const weatherSchema = z.object({
  place: z.string().nullable(),
  fetchedAt: z.string(),
  current: z.object({
    tempC: z.number(),
    humidityPct: z.number(),
    weatherCode: z.number().int(),
    isDay: z.boolean(),
  }),
  days: z.array(
    z.object({
      day,
      minC: z.number(),
      maxC: z.number(),
      rainMm: z.number(),
      uvMax: z.number(),
      weatherCode: z.number().int(),
    }),
  ),
});
export type Weather = z.infer<typeof weatherSchema>;

export const CLIMATE_VERDICTS = [
  'ok_outside',
  'day_out_night_in',
  'keep_inside',
  'shade_midday',
  'indoor_ok',
  'no_location',
] as const;
export type ClimateVerdict = (typeof CLIMATE_VERDICTS)[number];

/** Veredicto de clima para una planta concreta. */
export const climateSchema = z.object({
  verdict: z.enum(CLIMATE_VERDICTS),
  title: z.string(),
  message: z.string(),
  nowC: z.number().nullable(),
  todayMaxC: z.number().nullable(),
  tonightMinC: z.number().nullable(),
  place: z.string().nullable(),
  /** Avisos de los próximos días (helada, calor) para plantas que están fuera */
  alerts: z.array(z.object({ day, message: z.string() })),
});
export type Climate = z.infer<typeof climateSchema>;

/** Resultado de buscar una ciudad (geocodificación de Open-Meteo). */
export const placeSchema = z.object({
  name: z.string(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  timezone: z.string().nullable(),
});
export type Place = z.infer<typeof placeSchema>;
export const placeSearchSchema = z.object({ results: z.array(placeSchema) });

/** Lo que la app necesita para programar los avisos locales de los próximos días. */
export const remindersSchema = z.object({
  reminderHour: z.number().int(),
  notifyWater: z.boolean(),
  notifyCare: z.boolean(),
  notifyWeather: z.boolean(),
  days: z.array(
    z.object({
      day,
      water: z.array(z.string()),
      fertilize: z.array(z.string()),
      repot: z.array(z.string()),
      /** Plantas con revisión de salud pendiente ese día */
      checkup: z.array(z.string()).default([]),
      /** Crianzas con tareas ese día: "Tomates: pulverizar" */
      propagation: z.array(z.string()).default([]),
    }),
  ),
  /** Alertas de clima: se avisan la tarde anterior */
  alerts: z.array(z.object({ day, title: z.string(), body: z.string() })),
});
export type Reminders = z.infer<typeof remindersSchema>;

/** Descripción corta en español de un código WMO de Open-Meteo. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Despejado';
  if (code <= 2) return 'Poco nuboso';
  if (code === 3) return 'Nublado';
  if (code === 45 || code === 48) return 'Niebla';
  if (code >= 51 && code <= 57) return 'Llovizna';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Lluvia';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Nieve';
  if (code >= 95) return 'Tormenta';
  return 'Variable';
}
