import type { DiagnosisResult, DiagnosisTriage } from '@hdp/shared';
import { MONSTERA_PROFILE } from '../species/fixtures/monstera.profile.js';
import type { PlantWithRelations } from '../garden/garden.service.js';
import { cleanQuestions, describePlant, DiagnosisAi, formatAnswers, type PlantFacts } from './diagnosis.ai.js';

const plant = {
  id: 'p1',
  nickname: 'Monsti',
  location: 'indoor',
  room: 'Salón',
  lightLevel: 'bright_indirect',
  lightLux: 1800,
  potShape: 'round',
  potDiameterCm: 17,
  potHeightCm: 15,
  potLengthCm: null,
  potMaterial: 'plastic',
  hasDrainage: false,
  soilType: null,
  overwateringGuard: [],
  plantHeightCm: 70,
  plantWidthCm: null,
  createdAt: new Date('2026-10-01T10:00:00Z'),
  species: {
    scientificName: 'Monstera deliciosa',
    commonNames: ['Costilla de Adán'],
    family: 'Araceae',
    care: MONSTERA_PROFILE.care,
  },
  events: [{ type: 'water', taskDay: '2026-11-10', doneAt: new Date('2026-11-10T09:00:00Z'), snoozeDays: null }],
} as unknown as PlantWithRelations;

const facts: PlantFacts = {
  plant,
  plan: null,
  name: 'Monsti',
  today: '2026-11-15',
  tz: 'Europe/Madrid',
  weather: null,
  southern: false,
  previous: { day: '2026-10-20', title: 'Trips', summary: 'Plaga de trips en el envés.' },
};

const triage: DiagnosisTriage = {
  isPlant: true,
  photoQuality: 'ok',
  photoTip: null,
  observations: 'Hojas inferiores amarillas con bordes marrones.',
  looksHealthy: false,
  hypotheses: [{ name: 'Exceso de riego', likelihood: 'alta', why: 'Maceta sin drenaje' }],
  questions: [
    { id: 'q1', text: '¿Cómo está la tierra a 3 cm?', help: 'Mete un dedo.', kind: 'single', options: ['Mojada', 'Húmeda', 'Seca', 'No lo sé'] },
    { id: 'q1', text: '¿Qué agua usas?', help: null, kind: 'single', options: [] },
    { id: 'q3', text: '¿Ves bichos?', help: null, kind: 'multi', options: ['Ninguno', 'Ninguno', 'Telillas', 'Puntos negros'] },
  ],
};

describe('diagnóstico: contexto y preguntas', () => {
  it('describe la planta con lo que importa para diagnosticar', () => {
    const text = describePlant(facts);
    expect(text).toContain('Monstera deliciosa (Costilla de Adán)');
    expect(text).toContain('SIN agujeros de drenaje');
    expect(text).toContain('Sustrato: no lo sabemos');
    expect(text).toContain('1800 lux');
    expect(text).toContain('2026-11-10 riego');
    expect(text).toContain('regar cuando se seque la mitad superior');
    expect(text).toContain('Diagnóstico anterior (2026-10-20)');
    expect(text).toContain('hemisferio norte, mes 11');
  });

  it('limpia las preguntas: ids únicos, sin opciones repetidas y texto libre si faltan opciones', () => {
    const q = cleanQuestions(triage.questions);
    expect(q.map((x) => x.id)).toEqual(['q1', 'q2', 'q3']);
    expect(q[1]).toMatchObject({ kind: 'text', options: [] });
    expect(q[2]!.options).toEqual(['Ninguno', 'Telillas', 'Puntos negros']);
  });

  it('formatea las respuestas, también las de varias opciones y las vacías', () => {
    const out = formatAnswers(cleanQuestions(triage.questions), [
      { questionId: 'q1', value: 'Mojada' },
      { questionId: 'q3', value: ['Telillas', 'Puntos negros'] },
    ]);
    expect(out).toContain('Respuesta: Mojada');
    expect(out).toContain('Respuesta: sin responder');
    expect(out).toContain('Respuesta: Telillas, Puntos negros');
  });

  it('manda las fotos a Claude y acota la revisión entre 3 y 30 días', async () => {
    const ai = new DiagnosisAi();
    const result: DiagnosisResult = {
      title: 'Pudrición de raíz',
      severity: 'moderate',
      confidence: 'alta',
      summary: 'Encharcamiento.',
      causes: [],
      steps: [{ title: 'Trasplanta', detail: 'A maceta de 19 cm con drenaje.', when: 'hoy' }],
      careChanges: [],
      avoid: [],
      whenToWorry: 'Si el tallo se ablanda.',
      contagious: false,
      recoveryDays: 21.4,
      followUpDays: 90,
    };
    const calls: { content: { type: string }[] }[] = [];
    const parse = vi.fn(async (params: { messages: { content: { type: string }[] }[] }) => {
      calls.push(params.messages[0]!);
      return { parsed_output: calls.length === 1 ? triage : result, stop_reason: 'end_turn' };
    });
    (ai as unknown as { client: unknown }).client = { messages: { parse } };

    const t = await ai.triage(facts, ['/9j/AAAA', 'iVBORw0KGgo'], 'Se le caen las hojas');
    expect(calls[0]!.content.filter((b) => b.type === 'image')).toHaveLength(2);
    expect(t.questions.map((x) => x.id)).toEqual(['q1', 'q2', 'q3']);

    const r = await ai.result(facts, ['/9j/AAAA'], null, t, [{ questionId: 'q1', value: 'Mojada' }]);
    expect(r.followUpDays).toBe(30);
    expect(r.recoveryDays).toBe(21);
    const lastText = calls[1]!.content.at(-1) as unknown as { text: string };
    expect(lastText.text).toContain('Respuesta: Mojada');
  });
});
