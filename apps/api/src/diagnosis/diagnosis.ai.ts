import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import {
  type CarePlan,
  type DiagnosisAnswer,
  type DiagnosisQuestion,
  type DiagnosisResult,
  diagnosisResultSchema,
  type DiagnosisTriage,
  diagnosisTriageSchema,
  labelOf,
  LIGHT_LEVELS,
  OVERWATERING_GUARDS,
  PLANT_LOCATIONS,
  POT_MATERIALS,
  SOIL_TYPES,
  speciesProfileSchema,
  type Weather,
  weatherLabel,
} from '@hdp/shared';
import { askStructured, imageBlock } from '../ai/ask.js';
import { diffDays, localDay } from '../common/days.js';
import { env } from '../config/env.js';
import type { PlantWithRelations } from '../garden/garden.service.js';

const SYSTEM_PROMPT = `Eres fitopatólogo y jardinero con mucha experiencia. Ayudas a cuidar plantas de casa y jardín desde una app en español de España, tuteando y con un lenguaje claro y cercano.

Tu trabajo es averiguar qué le pasa a UNA planta concreta y dar soluciones reales.

Reglas:
- Basa todo en lo que se ve en las fotos y en los datos que te damos de la planta. No inventes síntomas que no se vean.
- Prohibido lo genérico ("riega menos", "dale más luz"). Di cuánto, cada cuánto, cómo comprobarlo y con qué: proporciones de sustrato (p. ej. 50 % sustrato universal, 30 % perlita, 20 % corteza), principio activo y dosis de los productos (jabón potásico al 1-2 %, aceite de neem 5 ml/L con unas gotas de jabón…), diámetro de maceta en cm, distancia a la ventana, etc.
- Prioriza remedios caseros y de bajo riesgo. Si hace falta un fitosanitario, di el principio activo, la dosis y las precauciones (interior, niños, mascotas).
- Ten en cuenta las necesidades de la especie, su ubicación, luz, maceta, drenaje, sustrato, riegos recientes, la estación y el tiempo de su zona.
- Si las fotos no bastan, dilo y pide la foto que falta.
- Si la planta está sana, dilo claramente y da 2-3 consejos para mantenerla así.`;

const WATER_STYLE: Record<string, string> = {
  keep_moist: 'mantener el sustrato siempre algo húmedo',
  dry_top_2cm: 'regar cuando se sequen los 2 primeros cm',
  dry_top_half: 'regar cuando se seque la mitad superior del sustrato',
  dry_fully: 'regar solo cuando el sustrato esté seco del todo',
};
const EVENT_NAMES: Record<string, string> = {
  water: 'riego',
  fertilize: 'abonado',
  repot: 'trasplante',
  snooze: 'riego pospuesto',
  prune: 'poda',
  move_inside: 'la metió dentro',
  move_outside: 'la sacó fuera',
};

/** Lo que el modelo necesita saber de la planta, en texto. */
export type PlantFacts = {
  plant: PlantWithRelations;
  plan: CarePlan | null;
  name: string;
  today: string;
  tz: string;
  weather: Weather | null;
  southern: boolean;
  previous: { day: string; title: string; summary: string } | null;
};

export function describePlant(f: PlantFacts): string {
  const { plant: p, plan } = f;
  const s = p.species;
  const care = speciesProfileSchema.shape.care.safeParse(s.care);
  const lines: (string | null)[] = [
    `## La planta`,
    `- Nombre: ${f.name}. Especie: ${s.scientificName}${s.commonNames[0] ? ` (${s.commonNames[0]})` : ''}${s.family ? `, familia ${s.family}` : ''}.`,
    `- Ubicación: ${labelOf(PLANT_LOCATIONS, p.location)}${p.room ? `, en ${p.room}` : ''}. Luz: ${labelOf(LIGHT_LEVELS, p.lightLevel)}${p.lightLux != null ? ` (medidos ${p.lightLux} lux)` : ''}.`,
    `- Maceta: ${p.potShape === 'rectangular' ? `rectangular de ${p.potLengthCm ?? '?'} × ${p.potDiameterCm} cm` : `redonda de ${p.potDiameterCm} cm de diámetro`}, ${p.potHeightCm} cm de alto, ${p.potMaterial ? labelOf(POT_MATERIALS, p.potMaterial).toLowerCase() : 'material desconocido'}, ${p.hasDrainage ? 'con agujeros de drenaje' : 'SIN agujeros de drenaje'}.`,
    `- Sustrato: ${p.soilType ? labelOf(SOIL_TYPES, p.soilType) : 'no lo sabemos'}.`,
    p.overwateringGuard.length
      ? `- Para no encharcar dice que: ${p.overwateringGuard.map((g) => labelOf(OVERWATERING_GUARDS, g)).join('; ')}.`
      : null,
    p.plantHeightCm ? `- Tamaño de la planta: ${p.plantHeightCm} cm de alto${p.plantWidthCm ? ` y ${p.plantWidthCm} cm de ancho` : ''}.` : null,
    `- En la app desde hace ${Math.max(0, diffDays(localDay(p.createdAt, f.tz), f.today))} días.`,
  ];

  if (plan) {
    lines.push(
      `## Riego y cuidados`,
      `- Plan actual: regar cada ${plan.water.everyDays} días con unos ${plan.water.amountMl} ml. Último riego: ${plan.water.lastDay ?? 'desconocido'}. Próximo: ${plan.water.nextDay}.`,
      `- Último abonado: ${plan.fertilize.lastDay ?? 'nunca o desconocido'}. Último trasplante: ${plan.repot.lastDay ?? 'desconocido'}.`,
      `- Estado de la maceta según la app: ${plan.pot.message}`,
    );
  }
  const recent = p.events.slice(0, 15).map((e) => `${e.taskDay ?? localDay(e.doneAt, f.tz)} ${EVENT_NAMES[e.type] ?? e.type}${e.snoozeDays ? ` ${e.snoozeDays} días` : ''}`);
  if (recent.length) lines.push(`- Últimos cuidados registrados (más reciente primero): ${recent.join(', ')}.`);

  if (care.success) {
    const c = care.data;
    lines.push(
      `## Lo que necesita la especie`,
      `- Temperatura ideal ${c.tempIdealMinC}-${c.tempIdealMaxC} °C, mínima ${c.tempMinC} °C, máxima ${c.tempMaxC} °C, ${c.frostTolerant ? 'aguanta heladas' : 'no aguanta heladas'}.`,
      `- Luz ideal ${c.luxIdeal} lux (${c.luxMin}-${c.luxMax}). Humedad mínima ${c.humidityMinPct} %. Riego: ${WATER_STYLE[c.waterStyle] ?? c.waterStyle}.`,
    );
  }

  const month = Number(f.today.slice(5, 7));
  lines.push(`## Fecha y clima`, `- Hoy es ${f.today} (hemisferio ${f.southern ? 'sur' : 'norte'}, mes ${month}).`);
  if (f.weather) {
    const w = f.weather;
    const next = w.days.slice(0, 3).map((d) => `${d.day}: ${d.minC}/${d.maxC} °C, ${weatherLabel(d.weatherCode).toLowerCase()}${d.rainMm ? `, ${d.rainMm} mm` : ''}`);
    lines.push(
      `- Tiempo en ${w.place ?? 'su zona'} ahora: ${w.current.tempC} °C, humedad ${w.current.humidityPct} %, ${weatherLabel(w.current.weatherCode).toLowerCase()}.`,
      `- Próximos días: ${next.join('; ')}.`,
    );
  }
  if (f.previous) {
    lines.push(`## Diagnóstico anterior (${f.previous.day})`, `- ${f.previous.title}: ${f.previous.summary}`);
  }
  return lines.filter(Boolean).join('\n');
}

/** Deja las preguntas en un formato que la app sabe pintar. */
export function cleanQuestions(questions: DiagnosisQuestion[]): DiagnosisQuestion[] {
  const seen = new Set<string>();
  return questions.slice(0, 6).map((q, i) => {
    let id = (q.id || `q${i + 1}`).slice(0, 20);
    if (seen.has(id)) id = `q${i + 1}`;
    seen.add(id);
    const options = [...new Set(q.options.map((o) => o.trim()).filter(Boolean))].slice(0, 8);
    const kind = q.kind !== 'text' && options.length < 2 ? 'text' : q.kind;
    return { ...q, id, kind, options: kind === 'text' ? [] : options };
  });
}

export function formatAnswers(questions: DiagnosisQuestion[], answers: DiagnosisAnswer[]): string {
  return questions
    .map((q) => {
      const a = answers.find((x) => x.questionId === q.id)?.value;
      const text = Array.isArray(a) ? a.join(', ') : a;
      return `- ${q.text}\n  Respuesta: ${text && text.length ? text : 'sin responder'}`;
    })
    .join('\n');
}

/** Habla con Claude: primero mira y pregunta, después diagnostica y receta. */
@Injectable()
export class DiagnosisAi {
  private readonly logger = new Logger(DiagnosisAi.name);
  private readonly client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

  get enabled(): boolean {
    return this.client !== null;
  }

  async triage(facts: PlantFacts, photos: string[], symptoms: string | null): Promise<DiagnosisTriage> {
    const started = Date.now();
    const out = await askStructured(this.client!, this.logger, {
      schema: diagnosisTriageSchema,
      system: SYSTEM_PROMPT,
      maxTokens: 3000,
      timeoutMs: 120_000,
      content: [
        ...photos.map(imageBlock),
        {
          type: 'text',
          text: `${describePlant(facts)}

## Lo que cuenta la persona
${symptoms?.trim() || 'No ha escrito nada; solo ha mandado las fotos.'}

## Qué tienes que hacer ahora
1. Describe con detalle lo que ves en las fotos.
2. Da de 1 a 4 hipótesis, de más a menos probable.
3. Haz de 3 a 6 preguntas que te ayuden a distinguir entre ellas. Pregunta solo lo que NO sabemos ya (no preguntes la medida de la maceta ni si tiene drenaje: ya lo sabes). Buenas preguntas: tipo de sustrato si no lo sabemos, si la tierra está húmeda a 3 cm, si queda agua en el plato o cubremacetas, olor de la tierra, cómo están las raíces si se pueden ver por abajo, desde cuándo pasa y si va a más, si afecta a hojas viejas o nuevas, cambios recientes (trasplante, cambio de sitio, calefacción, corrientes, sol directo), qué agua usa, si hay bichos o telillas en el envés.
   Usa respuestas cerradas siempre que puedas, con opciones cortas, y añade "No lo sé" cuando tenga sentido. En "help" explica cómo comprobarlo en 1 frase.
Si no hay una planta en las fotos, pon isPlant = false, deja hipótesis y preguntas vacías y explícalo en observations.`,
        },
      ],
    });
    this.logger.log(`Triaje en ${Math.round((Date.now() - started) / 1000)} s`);
    return {
      ...out,
      hypotheses: out.hypotheses.slice(0, 4),
      questions: out.isPlant ? cleanQuestions(out.questions) : [],
    };
  }

  async result(
    facts: PlantFacts,
    photos: string[],
    symptoms: string | null,
    triage: DiagnosisTriage,
    answers: DiagnosisAnswer[],
  ): Promise<DiagnosisResult> {
    const started = Date.now();
    const out = await askStructured(this.client!, this.logger, {
      schema: diagnosisResultSchema,
      system: SYSTEM_PROMPT,
      maxTokens: 5000,
      timeoutMs: 150_000,
      content: [
        ...photos.map(imageBlock),
        {
          type: 'text',
          text: `${describePlant(facts)}

## Lo que cuenta la persona
${symptoms?.trim() || 'No ha escrito nada.'}

## Lo que viste en las fotos
${triage.observations}

## Tus hipótesis
${triage.hypotheses.map((h) => `- ${h.name} (${h.likelihood}): ${h.why}`).join('\n') || '- Ninguna'}

## Sus respuestas
${formatAnswers(triage.questions, answers) || '- No hubo preguntas'}

## Qué tienes que hacer ahora
Da el diagnóstico final y un plan de tratamiento concreto, ordenado y realista para hacer en casa, con cantidades y medidas. Si las respuestas descartan una hipótesis, dilo en el resumen. Los "careChanges" deben ser cambios concretos en sus cuidados habituales (p. ej. "Riega cuando los 3 primeros cm estén secos, unos 250 ml, y vacía el plato a los 15 minutos"). Si es contagioso, di cómo aislarla. followUpDays entre 3 y 30.`,
        },
      ],
    });
    this.logger.log(`Diagnóstico en ${Math.round((Date.now() - started) / 1000)} s`);
    return {
      ...out,
      steps: out.steps.slice(0, 10),
      followUpDays: Math.min(30, Math.max(3, Math.round(out.followUpDays || 7))),
      recoveryDays: out.recoveryDays == null ? null : Math.max(1, Math.round(out.recoveryDays)),
    };
  }
}
