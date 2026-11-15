import { addDays, diffDays, localDay, nextMonthStart } from '../common/days.js';
import { MONSTERA_PROFILE } from '../species/fixtures/monstera.profile.js';
import { computeCarePlan, type EngineInput, potVolumeL } from './care-engine.js';

const base = (over: Partial<EngineInput> = {}): EngineInput => ({
  care: MONSTERA_PROFILE.care, // baseWaterDays 8, dry_top_half, abono cada 21 días de marzo a septiembre
  category: 'aroids',
  plant: {
    location: 'indoor',
    lightLevel: 'bright_indirect',
    potShape: 'round',
    potDiameterCm: 15,
    potHeightCm: 14,
    potLengthCm: null,
    potMaterial: 'plastic',
    hasDrainage: true,
    plantHeightCm: 60,
    plantWidthCm: 50,
  },
  today: '2026-06-10',
  lastWaterDay: '2026-06-05',
  lastFertilizeDay: null,
  lastRepotDay: '2025-04-01',
  snoozedUntil: null,
  southern: false,
  recentWaterEvents: ['water'],
  ...over,
});

describe('fechas', () => {
  it('suma y resta días cruzando meses y años', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(diffDays('2026-02-27', '2026-03-02')).toBe(3);
    expect(nextMonthStart('2026-11-15', 3, 15)).toBe('2027-03-15');
  });

  it('usa el día local de la zona horaria', () => {
    // 23:30 UTC del 14 ya es día 15 en Madrid
    expect(localDay(new Date('2026-11-14T23:30:00Z'), 'Europe/Madrid')).toBe('2026-11-15');
  });
});

describe('motor de cuidado', () => {
  it('calcula el volumen de la maceta', () => {
    expect(potVolumeL(base().plant)).toBeCloseTo(2.5, 1);
  });

  it('en verano, interior, luz indirecta y maceta de 15 cm riega cada 8 días con ~450 ml', () => {
    const plan = computeCarePlan(base());
    expect(plan.water.everyDays).toBe(8);
    expect(plan.water.amountMl).toBe(450);
    expect(plan.water.nextDay).toBe('2026-06-13');
  });

  it('en invierno espacia el riego', () => {
    const plan = computeCarePlan(base({ today: '2026-12-10', lastWaterDay: '2026-12-01' }));
    expect(plan.water.everyDays).toBe(13);
    expect(plan.water.factors.join(' ')).toContain('reposo');
  });

  it('terracota al sol en exterior riega mucho más a menudo', () => {
    const plan = computeCarePlan(
      base({ plant: { ...base().plant, lightLevel: 'full_sun', location: 'outdoor', potMaterial: 'terracotta' } }),
    );
    expect(plan.water.everyDays).toBe(4);
  });

  it('posponer mueve el próximo riego', () => {
    const plan = computeCarePlan(base({ snoozedUntil: '2026-06-20' }));
    expect(plan.water.nextDay).toBe('2026-06-20');
  });

  it('sin riego registrado, toca hoy', () => {
    expect(computeCarePlan(base({ lastWaterDay: null })).water.nextDay).toBe('2026-06-10');
  });

  it('maceta pequeña para el tamaño → recomienda una más grande', () => {
    const plan = computeCarePlan(base({ plant: { ...base().plant, potDiameterCm: 12, plantHeightCm: 120 } }));
    expect(plan.pot.verdict).toBe('bigger');
    expect(plan.pot.recommendedDiameterCm).toBe(17);
  });

  it('sin agujeros avisa y reduce el agua', () => {
    const plan = computeCarePlan(base({ plant: { ...base().plant, hasDrainage: false } }));
    expect(plan.pot.verdict).toBe('no_drainage');
    expect(plan.water.amountMl).toBeLessThan(450);
  });

  it('sin tamaño de planta, lo pide', () => {
    const plan = computeCarePlan(base({ plant: { ...base().plant, plantHeightCm: null, plantWidthCm: null } }));
    expect(plan.pot.verdict).toBe('need_size');
  });

  it('no abona en invierno y dice cuándo retomar', () => {
    const plan = computeCarePlan(base({ today: '2026-11-15', lastWaterDay: '2026-11-10' }));
    expect(plan.fertilize.nextDay).toBe('2027-03-01');
    expect(plan.fertilize.pausedReason).toContain('marzo');
  });

  it('no abona en las 6 semanas siguientes a un trasplante', () => {
    const plan = computeCarePlan(base({ lastRepotDay: '2026-06-01' }));
    expect(plan.fertilize.nextDay).toBe('2026-07-13');
    expect(plan.fertilize.pausedReason).toContain('Trasplantada');
  });

  it('el trasplante cae siempre en primavera', () => {
    const plan = computeCarePlan(base({ lastRepotDay: '2025-09-01' }));
    // 18 meses después sería marzo de 2027, que ya es primavera
    expect(plan.repot.nextDay?.slice(0, 7)).toBe('2027-03');
    const autumn = computeCarePlan(base({ lastRepotDay: '2025-03-01' }));
    // 18 meses → septiembre 2026, se mueve al 15 de marzo de 2027
    expect(autumn.repot.nextDay).toBe('2027-03-15');
  });

  it('sugiere revisar tras posponer dos veces', () => {
    const plan = computeCarePlan(base({ recentWaterEvents: ['snooze', 'snooze', 'water'] }));
    expect(plan.suggestions[0]).toContain('pospuesto');
  });

  it('en el hemisferio sur invierte las estaciones', () => {
    const plan = computeCarePlan(base({ southern: true, today: '2026-06-10' }));
    expect(plan.water.factors.join(' ')).toContain('reposo');
  });
});

describe('clima', () => {
  const weather = (days: [number, number, number?][], today = '2026-06-10') => ({
    place: 'Madrid',
    fetchedAt: '2026-06-10T08:00:00Z',
    current: { tempC: days[0]![1] - 3, humidityPct: 40, weatherCode: 0, isDay: true },
    days: days.map(([min, max, rain = 0], i) => ({
      day: addDays(today, i),
      minC: min,
      maxC: max,
      rainMm: rain,
      uvMax: 5,
      weatherCode: 0,
    })),
  });
  const outdoor = { ...base().plant, location: 'outdoor' };

  it('sin datos del tiempo no da veredicto', () => {
    expect(computeCarePlan(base()).climate).toBeNull();
  });

  it('noche fría (8 °C) y día templado → fuera de día, dentro de noche', () => {
    const plan = computeCarePlan(base({ plant: outdoor, weather: weather([[10, 22], [8, 21], [12, 24]]) }));
    expect(plan.climate?.verdict).toBe('day_out_night_in');
    expect(plan.climate?.alerts[0]?.message).toContain('8 °C');
  });

  it('día frío (máx. 9 °C) → mejor dentro', () => {
    const plan = computeCarePlan(base({ plant: outdoor, today: '2026-01-10', weather: weather([[2, 9], [1, 8]], '2026-01-10') }));
    expect(plan.climate?.verdict).toBe('keep_inside');
  });

  it('temperaturas en rango → bien fuera', () => {
    const plan = computeCarePlan(base({ plant: outdoor, weather: weather([[16, 26], [17, 27], [16, 25]]) }));
    expect(plan.climate?.verdict).toBe('ok_outside');
    expect(plan.climate?.alerts).toHaveLength(0);
  });

  it('calor extremo → sombra y riego más frecuente', () => {
    const plan = computeCarePlan(base({ plant: outdoor, weather: weather([[22, 36], [23, 37], [22, 35]]) }));
    expect(plan.climate?.verdict).toBe('shade_midday');
    expect(plan.water.factors.join(' ')).toContain('Calor');
  });

  it('lluvia hoy en planta de exterior que toca regar → sugiere saltarse el riego', () => {
    const plan = computeCarePlan(
      base({ plant: outdoor, lastWaterDay: '2026-06-01', weather: weather([[16, 24, 12], [16, 25]]) }),
    );
    expect(plan.suggestions.join(' ')).toContain('lluvia');
  });

  it('planta de interior con buen tiempo fuera → bien dentro (podría salir)', () => {
    const plan = computeCarePlan(base({ weather: weather([[18, 26], [17, 27]]) }));
    expect(plan.climate?.verdict).toBe('indoor_ok');
    expect(plan.climate?.message).toContain('podría estar en el exterior');
  });
});

describe('clima en interior', () => {
  it('planta de interior con noche fría → bien dentro, no sacarla', () => {
    const plan = computeCarePlan(
      base({
        weather: {
          place: null,
          fetchedAt: '',
          current: { tempC: 12, humidityPct: 50, weatherCode: 0, isDay: true },
          days: [
            { day: '2026-06-10', minC: 3, maxC: 15, rainMm: 0, uvMax: 3, weatherCode: 0 },
            { day: '2026-06-11', minC: 2, maxC: 14, rainMm: 0, uvMax: 3, weatherCode: 0 },
          ],
        },
      }),
    );
    expect(plan.climate?.verdict).toBe('indoor_ok');
    expect(plan.climate?.message).toContain('demasiado frío');
    expect(plan.climate?.alerts).toHaveLength(0);
  });
});
