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
