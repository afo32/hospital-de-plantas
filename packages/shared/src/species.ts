import { z } from 'zod';
import { PLANT_CATEGORIES, valuesOf } from './catalog.js';

/* ---------- Resultados de búsqueda e identificación ---------- */

/** Una especie tal como aparece en listas (búsqueda, categorías, identificación). */
export const speciesSummarySchema = z.object({
  /** id en nuestra base de datos; null si aún no se ha guardado (resultado externo) */
  id: z.uuid().nullable(),
  scientificName: z.string(),
  commonName: z.string().nullable(),
  family: z.string().nullable(),
  imageUrl: z.string().nullable(),
  category: z.string().nullable(),
  gbifKey: z.number().int().nullable(),
});
export type SpeciesSummary = z.infer<typeof speciesSummarySchema>;

export const speciesSearchQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.enum(valuesOf(PLANT_CATEGORIES)).optional(),
});
export type SpeciesSearchQuery = z.infer<typeof speciesSearchQuerySchema>;

export const speciesSearchResponseSchema = z.object({
  results: z.array(speciesSummarySchema),
});
export type SpeciesSearchResponse = z.infer<typeof speciesSearchResponseSchema>;

/** Órganos que acepta Pl@ntNet para cada foto. */
export const PHOTO_ORGANS = [
  { value: 'auto', label: 'Planta entera' },
  { value: 'leaf', label: 'Hoja' },
  { value: 'flower', label: 'Flor' },
  { value: 'fruit', label: 'Fruto' },
  { value: 'bark', label: 'Tallo / corteza' },
] as const;
export type PhotoOrgan = (typeof PHOTO_ORGANS)[number]['value'];

/** Fotos para identificar: JPEG en base64 (sin el prefijo data:), una por órgano. */
export const identifyRequestSchema = z.object({
  photos: z
    .array(
      z.object({
        base64: z.string().min(100, 'Foto vacía').max(14_000_000, 'Foto demasiado grande'),
        organ: z.enum(['auto', 'leaf', 'flower', 'fruit', 'bark']),
      }),
    )
    .min(1, 'Añade al menos una foto de la planta.')
    .max(5, 'Como máximo 5 fotos.'),
});
export type IdentifyRequest = z.infer<typeof identifyRequestSchema>;

export const identifyCandidateSchema = speciesSummarySchema.extend({
  /** Probabilidad 0–1 */
  score: z.number(),
});
export type IdentifyCandidate = z.infer<typeof identifyCandidateSchema>;

export const identifyResponseSchema = z.object({
  candidates: z.array(identifyCandidateSchema),
  /** Identificaciones que te quedan hoy */
  remainingToday: z.number().int(),
});
export type IdentifyResponse = z.infer<typeof identifyResponseSchema>;

/** Guarda (o encuentra) una especie elegida de una lista para poder abrir su ficha. */
export const resolveSpeciesSchema = z.object({
  scientificName: z.string().trim().min(2).max(120),
  commonName: z.string().trim().max(80).nullish(),
  family: z.string().trim().max(80).nullish(),
  imageUrl: z.url().nullish(),
  gbifKey: z.number().int().nullish(),
});
export type ResolveSpeciesInput = z.infer<typeof resolveSpeciesSchema>;

/* ---------- Ficha Info (generada con IA) ---------- */

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Difícil' },
] as const;

export const TOXICITY_LEVELS = [
  { value: 'none', label: 'No tóxica' },
  { value: 'mild', label: 'Levemente tóxica' },
  { value: 'toxic', label: 'Tóxica' },
  { value: 'severe', label: 'Muy tóxica' },
  { value: 'unknown', label: 'Sin datos fiables' },
] as const;

export const WATER_STYLES = [
  { value: 'keep_moist', label: 'Mantener húmedo' },
  { value: 'dry_top_2cm', label: 'Dejar secar los 2 cm de arriba' },
  { value: 'dry_top_half', label: 'Dejar secar la mitad del sustrato' },
  { value: 'dry_fully', label: 'Dejar secar del todo' },
] as const;

const section = z.object({
  /** Texto en párrafos. Las líneas que empiezan por "- " son viñetas y "1. " pasos numerados. */
  body: z.string(),
});

/** Ficha completa. Cada campo de texto está en español. */
export const speciesProfileSchema = z.object({
  commonNames: z.array(z.string()).describe('Nombres comunes en español, el más usado primero'),
  category: z.enum(valuesOf(PLANT_CATEGORIES)).describe('Categoría de la app que mejor encaja'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  difficultyReason: z.string().describe('Una frase: por qué es fácil o difícil'),
  quickFacts: z.object({
    watering: z.string().describe('Frecuencia orientativa y estilo de riego, en una frase corta'),
    sunType: z.string().describe('Sol directo, semisombra, luz indirecta o sombra, con horas'),
    lightLux: z.object({ min: z.number(), ideal: z.number(), max: z.number() }),
    plantType: z.string().describe('Herbácea perenne, suculenta, trepadora, árbol…'),
    matureSize: z.string().describe('Altura y anchura adultas en cm, en maceta y en suelo'),
    sunExposure: z.string(),
    soilType: z.string(),
    soilPh: z.string().describe('Rango, p. ej. "5,5–7,0 (ligeramente ácido a neutro)"'),
    bloomTime: z.string().describe('Meses de floración en el hemisferio norte, o "No florece en interior"'),
    colors: z.string().describe('Colores de flor y hoja'),
    hardinessZones: z.string().describe('Zonas USDA'),
    minTempC: z.number().describe('Temperatura mínima que soporta, en °C'),
    nativeArea: z.string(),
    toxicityHumans: z.object({
      level: z.enum(['none', 'mild', 'toxic', 'severe', 'unknown']),
      details: z.string().describe('Partes tóxicas y síntomas, o por qué no lo es'),
    }),
    toxicityPets: z
      .array(
        z.object({
          animal: z.string().describe('Perros, gatos, caballos, aves, conejos, roedores…'),
          level: z.enum(['none', 'mild', 'toxic', 'severe', 'unknown']),
          symptoms: z.string(),
        }),
      )
      .describe('Una entrada por animal doméstico relevante, al menos perros y gatos'),
  }),
  sections: z.object({
    description: section,
    howToGrow: section,
    containerGardening: section,
    fromSeed: section,
    light: section,
    soil: section,
    water: section,
    temperatureHumidity: section,
    fertilizer: section,
    propagation: section,
    varieties: section,
    pestsDiseases: section,
    harvest: section,
    pruning: section,
    herbalism: section,
  }),
  herbalism: z.object({
    edible: z.boolean().describe('true solo si es comestible con seguridad y sin confusión posible'),
    usableForTea: z.boolean(),
    warning: z.string().describe('Advertencia de seguridad que se muestra siempre'),
  }),
  /** Parámetros numéricos para el motor de cuidado (fase 4). */
  care: z.object({
    tempMinC: z.number(),
    tempIdealMinC: z.number(),
    tempIdealMaxC: z.number(),
    tempMaxC: z.number(),
    frostTolerant: z.boolean(),
    luxMin: z.number(),
    luxIdeal: z.number(),
    luxMax: z.number(),
    waterStyle: z.enum(['keep_moist', 'dry_top_2cm', 'dry_top_half', 'dry_fully']),
    baseWaterDays: z.number().describe('Días entre riegos en interior, verano, maceta de plástico de 15 cm, luz media'),
    humidityMinPct: z.number(),
    fertilizeEveryDays: z.number().describe('Días entre abonados en época de crecimiento; 0 si no necesita'),
    growingMonths: z.array(z.number()).describe('Meses de crecimiento activo en el hemisferio norte (1–12)'),
    repotEveryMonths: z.number(),
    rootGrowth: z.enum(['slow', 'medium', 'fast']),
    matureHeightCm: z.number(),
  }),
});
export type SpeciesProfile = z.infer<typeof speciesProfileSchema>;
export type SpeciesCare = SpeciesProfile['care'];

/** Títulos de las secciones desplegables, en el orden en que se muestran. */
export const PROFILE_SECTIONS: readonly { key: keyof SpeciesProfile['sections']; title: string }[] = [
  { key: 'description', title: 'Descripción general' },
  { key: 'howToGrow', title: 'Cómo cultivar' },
  { key: 'containerGardening', title: 'Jardinería en macetas' },
  { key: 'fromSeed', title: 'Cultivar desde semilla' },
  { key: 'light', title: 'Luz: interior y exterior' },
  { key: 'soil', title: 'Suelo' },
  { key: 'water', title: 'Agua' },
  { key: 'temperatureHumidity', title: 'Temperatura y humedad' },
  { key: 'fertilizer', title: 'Fertilizante' },
  { key: 'propagation', title: 'Propagación' },
  { key: 'varieties', title: 'Variedades' },
  { key: 'pestsDiseases', title: 'Plagas y enfermedades' },
  { key: 'harvest', title: 'Cosecha' },
  { key: 'pruning', title: 'Poda' },
  { key: 'herbalism', title: 'Herborismo y usos' },
];

export const PROFILE_STATUSES = ['ready', 'generating', 'failed', 'unavailable'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const speciesDetailSchema = z.object({
  species: speciesSummarySchema.extend({ id: z.uuid(), commonNames: z.array(z.string()) }),
  profileStatus: z.enum(PROFILE_STATUSES),
  /** Ficha sin los parámetros del motor (`care`), que viajan aparte cuando hacen falta */
  profile: speciesProfileSchema.omit({ care: true }).nullable(),
  /** Mensaje para el usuario si la ficha no se pudo generar */
  message: z.string().nullable(),
});
export type SpeciesDetail = z.infer<typeof speciesDetailSchema>;
