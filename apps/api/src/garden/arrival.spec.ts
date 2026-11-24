import { arrivalDrafts, type ArrivalFacts } from '@hdp/shared';

const base: ArrivalFacts = {
  category: 'aroids',
  location: 'indoor',
  lightLevel: 'bright_indirect',
  hasDrainage: true,
  waterStyle: 'dry_top_2cm',
  humidityMinPct: 60,
  luxMin: 2500,
  frostTolerant: false,
  tempMinC: 12,
  toxicFor: ['Gatos', 'Perros'],
  otherPlants: 3,
  month: 11,
  southern: false,
};

const ids = (f: ArrivalFacts) => arrivalDrafts(f).map((d) => d.id);

describe('plan Recién llegada', () => {
  it('trae las tareas comunes, cuarentena, humedad y mascotas', () => {
    const list = ids(base);
    for (const id of ['unwrap', 'inspect', 'quarantine', 'water_first', 'place', 'humidity', 'pets', 'inspect_2', 'inspect_3', 'repot_check', 'fertilize_start']) {
      expect(list).toContain(id);
    }
    const pets = arrivalDrafts(base).find((d) => d.id === 'pets')!;
    expect(pets.title).toBe('Ponla fuera del alcance de gatos y perros');
    // Ordenadas por día
    const offsets = arrivalDrafts(base).map((d) => d.offset);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it('sin otras plantas no hay cuarentena', () => {
    expect(ids({ ...base, otherPlants: 0 })).not.toContain('quarantine');
  });

  it('cactus al sol: piedras pegadas, aclimatación y no regar la primera semana', () => {
    const list = arrivalDrafts({ ...base, category: 'cacti', waterStyle: 'dry_fully', lightLevel: 'full_sun', humidityMinPct: 20, toxicFor: [] });
    const got = list.map((d) => d.id);
    expect(got).toEqual(expect.arrayContaining(['glued_stones', 'sun_1', 'sun_2', 'sun_3']));
    expect(got).not.toContain('humidity');
    expect(got).not.toContain('pets');
    expect(list.find((d) => d.id === 'water_first')!.detail).toContain('primera semana');
  });

  it('exterior en invierno y sin aguantar heladas: aviso de noches frías', () => {
    expect(ids({ ...base, location: 'outdoor', month: 1 })).toContain('winter_out');
    expect(ids({ ...base, location: 'outdoor', month: 6 })).not.toContain('winter_out');
    expect(ids({ ...base, location: 'outdoor', month: 7, southern: true })).toContain('winter_out');
  });

  it('casos especiales: aromáticas, carnívoras y orquídeas', () => {
    expect(ids({ ...base, category: 'herbs' })).toContain('herbs_split');
    const carn = ids({ ...base, category: 'carnivorous' });
    expect(carn).toContain('carnivorous_water');
    expect(carn).not.toContain('fertilize_start');
    expect(ids({ ...base, category: 'orchids' })).toContain('orchid_roots');
  });
});
