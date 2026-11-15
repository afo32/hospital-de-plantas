import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Injectable, Logger } from '@nestjs/common';
import { PLANT_CATEGORIES, speciesProfileSchema, type SpeciesProfile } from '@hdp/shared';
import { env } from '../../config/env.js';

const SYSTEM_PROMPT = `Eres un horticultor y botánico experto que escribe fichas de cuidado de plantas para una app en español de España.

Reglas:
- Escribe en español claro, cercano y concreto. Nada de generalidades: da cifras (cm, °C, días, litros, lux, pH, proporciones de sustrato).
- Si una sección no aplica (p. ej. cosecha en una planta ornamental), dilo en una frase y explica por qué.
- Formato de cada sección: párrafos cortos. Usa "- " al inicio de línea para viñetas y "1. ", "2. "... para pasos.
- "Luz: interior y exterior": explica dónde ponerla en casa (orientación de ventana, distancia al cristal), si puede vivir fuera, en qué meses y a partir de qué temperaturas, y si conviene sacarla de día y meterla de noche.
- "Cultivar desde semilla": MUY detallado y en pasos numerados: dónde conseguir semillas, tratamiento previo (remojo, escarificación, estratificación en frío con días y °C), sustrato de semillero, profundidad de siembra en mm, temperatura y humedad de germinación, días hasta germinar, luz, cuándo repicar (nº de hojas verdaderas), aclimatación y época de siembra. Si casi no se propaga por semilla, dilo y explica la alternativa.
- "Herborismo y usos": usos culinarios, en infusión y tradicionales, partes usadas y cómo prepararlas. Si es tóxica o existen especies tóxicas parecidas, dilo PRIMERO y no recomiendes consumirla. Nunca hagas afirmaciones médicas; habla de "uso tradicional".
- Toxicidad: sé prudente. Si hay dudas, usa "unknown" y dilo. Incluye siempre perros y gatos; añade otros animales si son relevantes.
- Los datos de cuidado ("care") deben ser coherentes con el texto. Meses en el hemisferio norte.
- La "category" debe ser una de: ${PLANT_CATEGORIES.map((c) => `${c.value} (${c.label})`).join(', ')}.`;

export type GeneratorInput = {
  scientificName: string;
  family: string | null;
  knownCommonNames: string[];
};

/** Genera la ficha completa de una especie con Claude (salida JSON validada con el esquema compartido). */
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
    const message = await this.client.messages.parse(
      {
        model: env.ANTHROPIC_MODEL,
        max_tokens: 16_000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              `Escribe la ficha completa de esta especie:`,
              `- Nombre científico: ${input.scientificName}`,
              input.family ? `- Familia: ${input.family}` : null,
              input.knownCommonNames.length ? `- Nombres comunes conocidos: ${input.knownCommonNames.join(', ')}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
        output_config: { format: zodOutputFormat(speciesProfileSchema) },
      },
      { timeout: 180_000 },
    );

    const profile = message.parsed_output;
    if (!profile) {
      throw new Error(`Respuesta sin ficha (stop_reason=${message.stop_reason})`);
    }
    this.logger.log(
      `Ficha de ${input.scientificName} generada en ${Math.round((Date.now() - started) / 1000)} s ` +
        `(${message.usage.input_tokens} + ${message.usage.output_tokens} tokens)`,
    );
    return profile;
  }
}
