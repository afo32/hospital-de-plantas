import { z } from 'zod';
import { daySchema } from './garden.js';

/** Foto en base64 (JPEG/PNG/WebP). El móvil la reduce a 1280 px antes de enviarla. */
export const photoBase64Schema = z
  .string()
  .min(100, 'Foto vacía')
  .max(8_500_000, 'La foto es demasiado grande');

export const setPlantPhotoSchema = z.object({ base64: photoBase64Schema });
export type SetPlantPhotoInput = z.infer<typeof setPlantPhotoSchema>;

/* =====================================================================
 * Notas
 * ===================================================================== */

export const MAX_NOTE_PHOTOS = 4;

export const createNoteSchema = z
  .object({
    text: z.string().trim().max(2000, 'Máximo 2000 caracteres').optional(),
    photos: z.array(photoBase64Schema).max(MAX_NOTE_PHOTOS, `Máximo ${MAX_NOTE_PHOTOS} fotos por nota`).default([]),
  })
  .refine((n) => (n.text?.length ?? 0) > 0 || n.photos.length > 0, {
    message: 'Escribe algo o añade una foto',
    path: ['text'],
  });
export type CreateNoteInput = z.input<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  text: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
});
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const noteSchema = z.object({
  id: z.uuid(),
  plantId: z.uuid(),
  text: z.string().nullable(),
  photos: z.array(z.string()),
  authorName: z.string().nullable(),
  /** Solo quien la escribió puede editarla o borrarla */
  mine: z.boolean(),
  createdAt: z.string(),
});
export type Note = z.infer<typeof noteSchema>;

export const noteListSchema = z.object({ notes: z.array(noteSchema) });
export type NoteList = z.infer<typeof noteListSchema>;

/* =====================================================================
 * Diagnóstico de salud (Claude mira las fotos, pregunta y receta)
 * ===================================================================== */

export const MAX_DIAGNOSIS_PHOTOS = 3;

/** Qué foto pedir en cada hueco, para que el diagnóstico sea fiable. */
export const DIAGNOSIS_PHOTO_TIPS = [
  { title: 'La zona dañada de cerca', hint: 'Hojas o tallo con manchas, bichos o la parte que te preocupa. Con buena luz y enfocado.' },
  { title: 'La planta entera', hint: 'Que se vea la maceta y cómo está de forma general.' },
  { title: 'La tierra y la base', hint: 'El sustrato, el cuello del tallo y, si puedes, el envés de una hoja.' },
] as const;

export const startDiagnosisSchema = z.object({
  photos: z
    .array(photoBase64Schema)
    .min(1, 'Añade al menos una foto')
    .max(MAX_DIAGNOSIS_PHOTOS, `Máximo ${MAX_DIAGNOSIS_PHOTOS} fotos`),
  symptoms: z.string().trim().max(600, 'Máximo 600 caracteres').optional(),
});
export type StartDiagnosisInput = z.infer<typeof startDiagnosisSchema>;

export const LIKELIHOODS = ['alta', 'media', 'baja'] as const;
export const SEVERITIES = ['none', 'mild', 'moderate', 'severe'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  none: 'Sana',
  mild: 'Leve',
  moderate: 'Moderado',
  severe: 'Grave',
};

/** Pregunta que Claude hace tras ver las fotos. */
export const diagnosisQuestionSchema = z.object({
  id: z.string().describe('Identificador corto, p. ej. "q1"'),
  text: z.string().describe('La pregunta, corta y en lenguaje sencillo'),
  help: z.string().nullable().describe('Cómo comprobarlo, p. ej. "mete un dedo 3 cm en la tierra". null si no hace falta'),
  kind: z.enum(['single', 'multi', 'text']).describe('single = una opción, multi = varias, text = respuesta libre'),
  options: z.array(z.string()).describe('Opciones de respuesta (vacío si kind = text). Incluye "No lo sé" cuando tenga sentido'),
});
export type DiagnosisQuestion = z.infer<typeof diagnosisQuestionSchema>;

/** Primer paso: lo que se ve en las fotos y lo que hay que preguntar. */
export const diagnosisTriageSchema = z.object({
  isPlant: z.boolean().describe('false si en las fotos no hay una planta'),
  photoQuality: z.enum(['ok', 'poor']).describe('poor si están borrosas, oscuras o no se ve el problema'),
  photoTip: z.string().nullable().describe('Qué foto hacer mejor, si photoQuality = poor'),
  observations: z.string().describe('Lo que ves en las fotos, concreto: qué hojas, color, forma y reparto de las manchas, plagas visibles, estado del sustrato'),
  looksHealthy: z.boolean(),
  hypotheses: z
    .array(
      z.object({
        name: z.string().describe('Problema posible, p. ej. "Pudrición de raíz por exceso de riego"'),
        likelihood: z.enum(LIKELIHOODS),
        why: z.string().describe('Qué lo indica en las fotos o en los datos'),
      }),
    )
    .describe('De 1 a 4 hipótesis, de más a menos probable'),
  questions: z.array(diagnosisQuestionSchema).describe('De 3 a 6 preguntas que ayuden a distinguir entre las hipótesis'),
});
export type DiagnosisTriage = z.infer<typeof diagnosisTriageSchema>;

export const diagnosisAnswerSchema = z.object({
  questionId: z.string().max(20),
  value: z.union([z.string().trim().max(400), z.array(z.string().max(200)).max(12)]),
});
export type DiagnosisAnswer = z.infer<typeof diagnosisAnswerSchema>;

export const answerDiagnosisSchema = z.object({
  answers: z.array(diagnosisAnswerSchema).max(10),
});
export type AnswerDiagnosisInput = z.infer<typeof answerDiagnosisSchema>;

export const CARE_AREAS = ['water', 'light', 'soil', 'pot', 'fertilizer', 'humidity', 'temperature', 'pests', 'other'] as const;

export const CARE_AREA_LABELS: Record<(typeof CARE_AREAS)[number], string> = {
  water: 'Riego',
  light: 'Luz',
  soil: 'Sustrato',
  pot: 'Maceta',
  fertilizer: 'Abono',
  humidity: 'Humedad',
  temperature: 'Temperatura',
  pests: 'Plagas',
  other: 'Otros',
};

export const TREATMENT_WHEN = ['hoy', 'esta_semana', 'continuo'] as const;
export const TREATMENT_WHEN_LABELS: Record<(typeof TREATMENT_WHEN)[number], string> = {
  hoy: 'Hoy',
  esta_semana: 'Esta semana',
  continuo: 'A partir de ahora',
};

/** Diagnóstico final con plan de tratamiento. */
export const diagnosisResultSchema = z.object({
  title: z.string().describe('Nombre del problema principal, corto. Si está sana, "Tu planta está sana"'),
  severity: z.enum(SEVERITIES),
  confidence: z.enum(LIKELIHOODS).describe('Seguridad del diagnóstico'),
  summary: z.string().describe('2-4 frases: qué le pasa y por qué, uniendo fotos, datos y respuestas'),
  causes: z
    .array(z.object({ name: z.string(), explanation: z.string() }))
    .describe('Causas, de la principal a las secundarias'),
  steps: z
    .array(
      z.object({
        title: z.string().describe('Acción en imperativo, p. ej. "Saca la planta y revisa las raíces"'),
        detail: z.string().describe('Cómo hacerlo con cantidades, materiales y medidas concretas'),
        when: z.enum(TREATMENT_WHEN),
      }),
    )
    .describe('Plan de tratamiento ordenado, de 3 a 8 pasos'),
  careChanges: z
    .array(z.object({ area: z.enum(CARE_AREAS), change: z.string() }))
    .describe('Cambios en sus cuidados habituales a partir de ahora'),
  avoid: z.array(z.string()).describe('Errores que empeorarían el problema'),
  whenToWorry: z.string().describe('Señales de que no mejora y qué hacer entonces'),
  contagious: z.boolean().describe('true si puede pasar a otras plantas (plagas, hongos…)'),
  recoveryDays: z.number().int().nullable().describe('Días aproximados hasta ver mejoría, o null'),
  followUpDays: z.number().int().describe('En cuántos días revisar de nuevo (3-30)'),
});
export type DiagnosisResult = z.infer<typeof diagnosisResultSchema>;

export const DIAGNOSIS_STATUSES = ['questions', 'done', 'resolved'] as const;
export type DiagnosisStatus = (typeof DIAGNOSIS_STATUSES)[number];

export const diagnosisSchema = z.object({
  id: z.uuid(),
  plantId: z.uuid(),
  status: z.enum(DIAGNOSIS_STATUSES),
  photos: z.array(z.string()),
  symptoms: z.string().nullable(),
  triage: diagnosisTriageSchema.nullable(),
  answers: z.array(diagnosisAnswerSchema),
  result: diagnosisResultSchema.nullable(),
  /** Día de la próxima revisión (en tu zona horaria) */
  followUpDay: daySchema.nullable(),
  createdAt: z.string(),
  /** Diagnósticos que te quedan hoy (solo al crear uno) */
  remainingToday: z.number().int().nullable(),
});
export type Diagnosis = z.infer<typeof diagnosisSchema>;

export const diagnosisListSchema = z.object({ diagnoses: z.array(diagnosisSchema) });
export type DiagnosisList = z.infer<typeof diagnosisListSchema>;

export const updateDiagnosisSchema = z.object({ status: z.enum(['done', 'resolved']) });
