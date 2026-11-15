import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Logger } from '@nestjs/common';
import { z } from 'zod';
import { env } from '../config/env.js';

type Content = string | Anthropic.ContentBlockParam[];

export type AskOptions<S extends z.ZodType> = {
  schema: S;
  system: string;
  content: Content;
  maxTokens: number;
  timeoutMs?: number;
};

/** Bloque de imagen para Claude a partir de una foto en base64. */
export function imageBlock(base64: string): Anthropic.ImageBlockParam {
  const data = base64.slice(base64.indexOf(',') + 1);
  const mediaType = data.startsWith('iVBOR') ? 'image/png' : data.startsWith('UklGR') ? 'image/webp' : 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
}

/**
 * Pide a Claude una respuesta con salida estructurada validada con Zod. Si la API rechaza el esquema
 * (p. ej. "grammar is too large"), repite pidiendo JSON normal y lo valida con el mismo esquema.
 */
export async function askStructured<S extends z.ZodType>(
  client: Anthropic,
  logger: Logger,
  opts: AskOptions<S>,
): Promise<z.infer<S>> {
  const timeout = opts.timeoutMs ?? 180_000;
  try {
    const message = await client.messages.parse(
      {
        model: env.ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{ role: 'user', content: opts.content }],
        output_config: { format: zodOutputFormat(opts.schema) },
      },
      { timeout },
    );
    if (message.parsed_output == null) {
      throw new Error(`Respuesta sin datos (stop_reason=${message.stop_reason})`);
    }
    return message.parsed_output as z.infer<S>;
  } catch (err) {
    if (!(err instanceof Anthropic.APIError) || err.status !== 400) throw err;
    logger.warn(`Salida estructurada rechazada (${err.message.slice(0, 120)}). Reintento con JSON normal.`);
    return askPlainJson(client, opts, timeout);
  }
}

async function askPlainJson<S extends z.ZodType>(
  client: Anthropic,
  opts: AskOptions<S>,
  timeout: number,
): Promise<z.infer<S>> {
  const instruction = `Responde SOLO con un objeto JSON válido (sin texto alrededor ni bloques de código) que cumpla este JSON Schema:\n${JSON.stringify(z.toJSONSchema(opts.schema))}`;
  const content: Content =
    typeof opts.content === 'string'
      ? `${opts.content}\n\n${instruction}`
      : [...opts.content, { type: 'text', text: instruction }];
  const message = await client.messages.create(
    {
      model: env.ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content }],
    },
    { timeout },
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
  return opts.schema.parse(JSON.parse(raw.slice(start, end + 1)));
}
