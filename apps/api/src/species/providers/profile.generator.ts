import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Injectable, Logger } from '@nestjs/common';
import { PLANT_CATEGORIES, speciesProfileSchema, type SpeciesProfile } from '@hdp/shared';
import { z } from 'zod';
import { env } from '../../config/env.js';

const SYSTEM_PROMPT = `Eres un horticultor y botánico experto que escribe fichas de cuidado de plantas para una app en español de España.

Reglas:
- Escribe en español claro, cercano y concreto. Nada de generalidades: da cifras (cm, °C, días, litros, lux, pH, proporciones de sustrato).
- Si una sección no aplica (p. ej. cosecha en una planta ornamental), dilo en una frase y explica por qué.
- Formato de cada sección de texto: párrafos cortos. Usa "- " al inicio de línea para viñetas y "1. ", "2. "... para pasos.
- "light" (Luz: interior y exterior): dónde ponerla en casa (orientación de ventana, distancia al cristal), si puede vivir fuera, en qué meses y a partir de qué temperaturas, y si conviene sacarla de día y meterla de noche.
- "fromSeed" (Cultivar desde semilla): MUY detallado y en pasos numerados: dónde conseguir semillas, tratamiento previo (remojo, escarificación, estratificación en frío con días y °C), sustrato de semillero, profundidad de siembra en mm, temperatura y humedad de germinación, días hasta germinar, luz, cuándo repicar (nº de hojas verdaderas), aclimatación y época de siembra. Si casi no se propaga por semilla, dilo y explica la alternativa.
- "herbalism" (Herborismo y usos): usos culinarios, en infusión y tradicionales, partes usadas y cómo prepararlas. Si es tóxica o existen especies tóxicas parecidas, dilo PRIMERO y no recomiendes consumirla. Nunca hagas afirmaciones médicas; habla de "uso tradicional".
- Toxicidad: sé prudente. Si hay dudas, usa "unknown" y dilo. Incluye siempre perros y gatos; añade otros animales si son relevantes.
- Los datos numéricos de cuidado deben ser coherentes con el texto. Meses en el hemisferio norte.
- La "category" debe ser una de: ${PLANT_CATEGORIES.map((c) => `${c.value} (${c.label})`).join(', ')}.`;

/* La ficha se pide en 5 partes en paralelo: la API limita el tamaño de un esquema de salida estructurada. */
const shape = speciesProfileSchema.shape;

const quick = shape.quickFacts.shape;

const factsPart = z.object({
  commonNames: shape.commonNames,
  category: shape.category,
  difficulty: shape.difficulty,
  difficultyReason: shape.difficultyReason,
  quickFacts: shape.quickFacts.omit({ toxicityHumans: true, toxicityPets: true }),
});

const toxicityPart = z.object({
  toxicityHumans: quick.toxicityHumans,
  toxicityPets: quick.toxicityPets,
});

const carePart = z.object({
  herbalism: shape.herbalism,
  care: shape.care,
});

const text = (d: string) => z.string().describe(d);

const sectionsA = z.object({
  description: text('Descripción general'),
  howToGrow: text('Cómo cultivar'),
  containerGardening: text('Jardinería en macetas: tamaño y material de maceta, drenaje, mezcla de sustrato con proporciones'),
  fromSeed: text('Cultivar desde semilla, en pasos numerados y muy detallado'),
  light: text('Luz: interior y exterior'),
  soil: text('Suelo'),
  water: text('Agua: frecuencia, cantidad, tipo de agua y señales de exceso o falta'),
  temperatureHumidity: text('Temperatura y humedad'),
});

const sectionsB = z.object({
  fertilizer: text('Fertilizante: NPK, frecuencia y dosis'),
  propagation: text('Propagación: métodos y pasos'),
  varieties: text('Variedades o cultivares más comunes'),
  pestsDiseases: text('Plagas y enfermedades: síntoma, causa y tratamiento'),
  harvest: text('Cosecha'),
  pruning: text('Poda'),
  herbalism: text('Herborismo y usos'),
});

export type GeneratorInput = {
  scientificName: string;
  family: string | null;
  knownCommonNames: string[];
};

/** Genera la ficha completa de una especie con Claude, validada con el esquema compartido. */
@Injectable()
export class ProfileGenerator {
  private readonly logger = new Logger(ProfileGenerator.name);
  private readonly client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

  get enabled(): boolean {
    return this.client !== null;
  }

  async generate(input: GeneratorInput): Promise<SpeciesProfile> {
    if (!this.client) throw new Error('Falta ANTHROPIC_API_KEY');
    const started = Date.now();

    const plant = [
      `Especie: ${input.scientificName}`,
      input.family ? `Familia: ${input.family}` : null,
      input.knownCommonNames.length ? `Nombres comunes conocidos: ${input.knownCommonNames.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const [facts, toxicity, care, a, b] = await Promise.all([
      this.ask(factsPart, `${plant}\n\nRellena los datos rápidos de su ficha: nombres, categoría, dificultad y quickFacts.`, 4000),
      this.ask(toxicityPart, `${plant}\n\nIndica su toxicidad para personas y para animales domésticos.`, 2000),
      this.ask(carePart, `${plant}\n\nRellena los parámetros numéricos de cuidado ("care") y las indicaciones de herborismo ("herbalism").`, 3000),
      this.ask(sectionsA, `${plant}\n\nEscribe estas secciones de su guía de cultivo.`, 8000),
      this.ask(sectionsB, `${plant}\n\nEscribe estas secciones de su guía de cultivo.`, 8000),
    ]);

    const sections = Object.fromEntries(
      Object.entries({ ...a, ...b }).map(([key, body]) => [key, { body }]),
    ) as SpeciesProfile['sections'];

    const profile = speciesProfileSchema.parse({
      ...facts,
      quickFacts: { ...facts.quickFacts, ...toxicity },
      ...care,
      sections,
    });
    this.logger.log(`Ficha de ${input.scientificName} generada en ${Math.round((Date.now() - started) / 1000)} s`);
    return profile;
  }

  /**
   * Pide una parte con salida estructurada. Si la API rechaza el esquema (p. ej. "grammar is too large"),
   * repite pidiendo JSON normal y lo valida con el mismo esquema.
   */
  private async ask<S extends z.ZodType>(schema: S, prompt: string, maxTokens: number): Promise<z.infer<S>> {
    const client = this.client!;
    try {
      const message = await client.messages.parse(
        {
          model: env.ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
          output_config: { format: zodOutputFormat(schema) },
        },
        { timeout: 180_000 },
      );
      if (message.parsed_output == null) {
        throw new Error(`Respuesta sin datos (stop_reason=${message.stop_reason})`);
      }
      return message.parsed_output as z.infer<S>;
    } catch (err) {
      if (!(err instanceof Anthropic.APIError) || err.status !== 400) throw err;
      this.logger.warn(`Salida estructurada rechazada (${err.message.slice(0, 120)}). Reintento con JSON normal.`);
      return this.askPlainJson(schema, prompt, maxTokens);
    }
  }

  private async askPlainJson<S extends z.ZodType>(schema: S, prompt: string, maxTokens: number): Promise<z.infer<S>> {
    const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
    const message = await this.client!.messages.create(
      {
        model: env.ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nResponde SOLO con un objeto JSON válido (sin texto alrededor ni bloques de código) que cumpla este JSON Schema:\n${jsonSchema}`,
          },
        ],
      },
      { timeout: 180_000 },
    );
    const raw = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('La respuesta no contiene JSON');
    return schema.parse(JSON.parse(raw.slice(start, end + 1)));
  }
}
