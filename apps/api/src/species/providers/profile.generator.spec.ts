import Anthropic from '@anthropic-ai/sdk';
import { MONSTERA_PROFILE as M } from '../fixtures/monstera.profile.js';
import { ProfileGenerator } from './profile.generator.js';

/** Respuestas simuladas de Claude para cada una de las 5 partes, según los campos que pide el esquema. */
function answerFor(schemaKeys: string[]): unknown {
  if (schemaKeys.includes('commonNames')) {
    const { toxicityHumans: _h, toxicityPets: _p, ...quickFacts } = M.quickFacts;
    return { commonNames: M.commonNames, category: M.category, difficulty: M.difficulty, difficultyReason: M.difficultyReason, quickFacts };
  }
  if (schemaKeys.includes('toxicityPets')) {
    return { toxicityHumans: M.quickFacts.toxicityHumans, toxicityPets: M.quickFacts.toxicityPets };
  }
  if (schemaKeys.includes('care')) return { herbalism: M.herbalism, care: M.care };
  return Object.fromEntries(schemaKeys.map((k) => [k, M.sections[k as keyof typeof M.sections].body]));
}

function keysOf(format: { schema: { properties?: Record<string, unknown> } }) {
  return Object.keys(format.schema.properties ?? {});
}

describe('ProfileGenerator', () => {
  it('junta las 5 partes en una ficha válida', async () => {
    const gen = new ProfileGenerator();
    const parse = vi.fn(async (params: { output_config: { format: { schema: { properties?: Record<string, unknown> } } } }) => ({
      parsed_output: answerFor(keysOf(params.output_config.format)),
      stop_reason: 'end_turn',
    }));
    (gen as unknown as { client: unknown }).client = { messages: { parse } };

    const profile = await gen.generate({ scientificName: 'Monstera deliciosa', family: 'Araceae', knownCommonNames: [] });
    expect(parse).toHaveBeenCalledTimes(5);
    expect(profile.quickFacts.toxicityPets).toHaveLength(3);
    expect(profile.sections.fromSeed.body).toContain('Remójalas');
    expect(profile.care.baseWaterDays).toBe(8);
  });

  it('si la API rechaza el esquema, repite pidiendo JSON normal', async () => {
    const gen = new ProfileGenerator();
    const rejected = Object.assign(Object.create(Anthropic.APIError.prototype) as Error, {
      status: 400,
      message: 'The compiled grammar is too large',
    });
    const parse = vi.fn(async () => {
      throw rejected;
    });
    const create = vi.fn(async (params: { messages: { content: string }[] }) => {
      const schema = JSON.parse(params.messages[0]!.content.split('JSON Schema:\n')[1]!) as { properties: Record<string, unknown> };
      return { content: [{ type: 'text', text: '```json\n' + JSON.stringify(answerFor(Object.keys(schema.properties))) + '\n```' }] };
    });
    (gen as unknown as { client: unknown }).client = { messages: { parse, create } };

    const profile = await gen.generate({ scientificName: 'Monstera deliciosa', family: null, knownCommonNames: [] });
    expect(create).toHaveBeenCalledTimes(5);
    expect(profile.category).toBe('aroids');
  });
});
