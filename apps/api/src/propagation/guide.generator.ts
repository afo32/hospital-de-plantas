import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { type PropagationGuide, propagationGuideSchema, PROPAGATION_METHODS, type PropagationMethod } from '@hdp/shared';
import { askStructured } from '../ai/ask.js';
import { env } from '../config/env.js';

const SYSTEM_PROMPT = `Eres un viverista con muchos años de experiencia multiplicando plantas en casa y en vivero. Escribes guías paso a paso para una app en español de España, tuteando, para gente sin experiencia.

Reglas:
- Concreto y con cifras: profundidad de siembra en mm, temperatura en °C, humedad, horas de remojo, días de estratificación y a qué temperatura, longitud del esqueje en cm, nº de nudos, hormonas de enraizamiento (opcional y cuál), proporciones de sustrato, tamaño de recipiente, cuántas hojas verdaderas para repicar, días de aclimatación.
- Las etapas van en orden, desde la preparación hasta que la planta está lista para su maceta definitiva o para el jardín. Entre 3 y 8 etapas.
- minDays y maxDays son la duración habitual de cada etapa en días; si se hace en el mismo día, 0 y 1.
- Las tareas de cada etapa son lo que hay que hacer de forma repetida (p. ej. "Pulveriza la superficie" cada 1-2 días, "Ventila la tapa" cada día) o una vez (everyDays = 0). Máximo 4 por etapa, cortas.
- "doneWhen" es una señal visible y clara para pasar a la siguiente etapa ("cuando asomen las dos primeras hojas", "cuando las raíces midan 2-3 cm").
- Si el método casi nunca funciona con esta especie, pon suitable = false, explica en suitabilityNote qué método usar, y aun así describe cómo se haría si alguien quiere intentarlo.
- Meses en el hemisferio norte.`;

const METHOD_TEXT: Record<PropagationMethod, string> = {
  seed: 'desde semilla',
  cutting: 'por esqueje (de tallo, hoja o raíz, el que mejor funcione en esta especie)',
  division: 'por división de mata',
  layering: 'por acodo (simple o aéreo, el que mejor funcione)',
};

export type GuideInput = {
  scientificName: string;
  commonName: string | null;
  method: PropagationMethod;
  /** Texto de la ficha (semilla y propagación), para ser coherentes */
  reference: string | null;
};

/** Escribe con Claude la guía de una especie para un método. */
@Injectable()
export class GuideGenerator {
  private readonly logger = new Logger(GuideGenerator.name);
  private readonly client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

  get enabled(): boolean {
    return this.client !== null;
  }

  async generate(input: GuideInput): Promise<PropagationGuide> {
    const started = Date.now();
    const label = PROPAGATION_METHODS.find((m) => m.value === input.method)!.label.toLowerCase();
    const out = await askStructured(this.client!, this.logger, {
      schema: propagationGuideSchema,
      system: SYSTEM_PROMPT,
      maxTokens: 7000,
      timeoutMs: 180_000,
      content: [
        `Especie: ${input.scientificName}${input.commonName ? ` (${input.commonName})` : ''}.`,
        `Escribe la guía para multiplicarla ${METHOD_TEXT[input.method]}.`,
        input.reference ? `\nLo que dice su ficha (sé coherente con esto):\n${input.reference.slice(0, 4000)}` : '',
      ].join('\n'),
    });
    this.logger.log(`Guía de ${label} de ${input.scientificName} en ${Math.round((Date.now() - started) / 1000)} s`);
    return cleanGuide(out);
  }
}

/** Deja la guía en un formato que la app sabe pintar. */
export function cleanGuide(g: PropagationGuide): PropagationGuide {
  return {
    ...g,
    bestMonths: [...new Set(g.bestMonths.filter((m) => m >= 1 && m <= 12))].sort((a, b) => a - b),
    stages: g.stages.slice(0, 8).map((s) => {
      const minDays = Math.max(0, Math.round(s.minDays));
      return {
        ...s,
        minDays,
        maxDays: Math.max(minDays, Math.round(s.maxDays), 1),
        tasks: s.tasks.slice(0, 4).map((t) => ({ ...t, everyDays: Math.max(0, Math.min(30, Math.round(t.everyDays))) })),
        tips: s.tips.slice(0, 3),
      };
    }),
    problems: g.problems.slice(0, 6),
  };
}
