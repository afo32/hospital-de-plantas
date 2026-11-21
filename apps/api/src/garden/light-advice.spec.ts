import { estimateLux, lightAdvice, type LightAdviceInput } from '@hdp/shared';

const base = (over: Partial<LightAdviceInput> = {}): LightAdviceInput => ({
  lux: 800,
  range: { min: 2500, ideal: 10000, max: 20000 },
  setup: { window: 'north', distance: 'far', filters: ['sheer_curtain'], artificial: 'regular' },
  outdoor: false,
  southern: false,
  month: 11,
  plantName: 'Monsti',
  ...over,
});

describe('consejos de luz', () => {
  it('poca luz: acercar, quitar visillo, cambiar de ventana, lámpara y aviso de invierno', () => {
    const a = lightAdvice(base());
    expect(a.status).toBe('low');
    const titles = a.actions.map((x) => x.title);
    expect(titles).toContain('Acércala a la ventana');
    expect(titles).toContain('Recoge el visillo durante el día');
    expect(titles).toContain('Cámbiala de ventana');
    expect(titles).toContain('Si no puedes moverla, añade una lámpara de cultivo');
    expect(titles).toContain('Las lámparas de casa no cuentan');
    expect(titles).toContain('Ten en cuenta el invierno');
    expect(a.summary).toContain('800');
  });

  it('demasiada luz junto a ventana oeste: separar y preferir el este', () => {
    const a = lightAdvice(base({ lux: 30000, setup: { window: 'west', distance: 'touching', filters: [], artificial: 'none' } }));
    expect(a.status).toBe('high');
    expect(a.actions.map((x) => x.title)).toEqual(expect.arrayContaining(['Sepárala de la ventana', 'Mejor una ventana este']));
  });

  it('sin sensor estima con las respuestas', () => {
    const a = lightAdvice(base({ lux: null, setup: { window: 'east', distance: 'touching', filters: [], artificial: 'none' } }));
    expect(a.estimated).toBe(true);
    expect(a.lux).toBe(estimateLux({ window: 'east', distance: 'touching', filters: [], artificial: 'none' }));
    expect(a.status).toBe('ok');
  });

  it('en el hemisferio sur la ventana soleada es la norte', () => {
    expect(estimateLux({ window: 'north', distance: 'touching', filters: [], artificial: 'none' }, true)).toBe(25000);
    expect(lightAdvice(base({ southern: true, month: 6 })).idealPlace).toContain('norte');
  });

  it('sin ventana pide luz artificial', () => {
    const a = lightAdvice(base({ setup: { window: 'none', distance: 'far', filters: [], artificial: 'none' } }));
    expect(a.actions[0]!.title).toBe('Sin ventana necesita luz artificial');
  });
});
