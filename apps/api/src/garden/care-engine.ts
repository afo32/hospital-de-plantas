import type { CarePlan, Climate, SpeciesCare, Weather } from '@hdp/shared';
import { addDays, diffDays, maxDay, minDay, monthName, monthOf, nextMonthStart } from '../common/days.js';

/**
 * Motor de cuidado: reglas deterministas (sin IA) que convierten los datos de la especie
 * y las respuestas del cuestionario en frecuencias, cantidades y fechas.
 * Todas las fórmulas están explicadas en la especificación (sección "Motor de recomendaciones").
 */

export type PlantFacts = {
  location: string; // indoor | outdoor | indoor_night_outdoor_day
  lightLevel: string; // full_sun | partial_sun | bright_indirect | low
  potShape: string; // round | rectangular
  potDiameterCm: number; // diámetro, o ancho si es rectangular
  potHeightCm: number;
  potLengthCm: number | null;
  potMaterial: string | null;
  hasDrainage: boolean;
  plantHeightCm: number | null;
  plantWidthCm: number | null;
};

export type EngineInput = {
  care: SpeciesCare;
  category: string;
  plant: PlantFacts;
  today: string;
  lastWaterDay: string | null;
  lastFertilizeDay: string | null;
  lastRepotDay: string | null;
  snoozedUntil: string | null;
  /** Hemisferio sur: invierte las estaciones */
  southern: boolean;
  /** Últimos eventos de riego/pospuesto, del más reciente al más antiguo */
  recentWaterEvents: ('water' | 'snooze')[];
  /** Tiempo de la zona del usuario (null si no ha indicado ubicación o no hay datos) */
  weather?: Weather | null;
  plantName?: string;
};

const LIGHT_FACTOR: Record<string, [number, string]> = {
  full_sun: [0.75, 'Mucho sol: se seca antes'],
  partial_sun: [0.9, 'Sol parcial'],
  bright_indirect: [1, ''],
  low: [1.3, 'Poca luz: tarda más en secarse'],
};
const LOCATION_FACTOR: Record<string, [number, string]> = {
  outdoor: [0.8, 'Exterior: viento y sol secan más'],
  indoor_night_outdoor_day: [0.9, 'Fuera de día: se seca algo antes'],
  indoor: [1, ''],
};
const MATERIAL_FACTOR: Record<string, [number, string]> = {
  terracotta: [0.8, 'Terracota: transpira y seca antes'],
  fabric: [0.75, 'Maceta de tela: seca muy rápido'],
  plastic: [1, ''],
  glazed_ceramic: [1, ''],
  other: [1, ''],
};
const WATER_FRACTION: Record<SpeciesCare['waterStyle'], number> = {
  keep_moist: 0.25,
  dry_top_2cm: 0.2,
  dry_top_half: 0.18,
  dry_fully: 0.12,
};
const WATER_HOWTO: Record<SpeciesCare['waterStyle'], string> = {
  keep_moist: 'Que el sustrato no llegue a secarse: riega cuando la superficie empiece a perder humedad.',
  dry_top_2cm: 'Riega cuando los 2 primeros cm estén secos (mete el dedo).',
  dry_top_half: 'Riega cuando la mitad superior del sustrato esté seca.',
  dry_fully: 'Riega solo cuando el sustrato esté seco del todo; en invierno, aún menos.',
};

const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const round10 = (n: number) => Math.max(30, Math.round(n / 10) * 10);

/** Meses de crecimiento ajustados al hemisferio. */
function growingMonths(care: SpeciesCare, southern: boolean): number[] {
  const months = care.growingMonths.length ? care.growingMonths : [3, 4, 5, 6, 7, 8, 9];
  return southern ? months.map((m) => ((m + 5) % 12) + 1) : months;
}

/** Volumen de la maceta en litros. */
export function potVolumeL(p: PlantFacts): number {
  const cm3 =
    p.potShape === 'rectangular' && p.potLengthCm
      ? p.potLengthCm * p.potDiameterCm * p.potHeightCm
      : Math.PI * (p.potDiameterCm / 2) ** 2 * p.potHeightCm;
  return Math.round((cm3 / 1000) * 10) / 10;
}

export function computeWater(input: EngineInput) {
  const { care, plant, today, southern } = input;
  const factors: string[] = [];
  let days = care.baseWaterDays > 0 ? care.baseWaterDays : 7;

  const growing = growingMonths(care, southern).includes(monthOf(today));
  if (!growing) {
    days *= 1.6;
    factors.push('Época de reposo: riego más espaciado');
  }
  for (const [factor, label] of [
    LIGHT_FACTOR[plant.lightLevel] ?? [1, ''],
    LOCATION_FACTOR[plant.location] ?? [1, ''],
    MATERIAL_FACTOR[plant.potMaterial ?? 'plastic'] ?? [1, ''],
  ] as [number, string][]) {
    days *= factor;
    if (label) factors.push(label);
  }
  // Calor fuerte los próximos 3 días en plantas que están fuera: se seca mucho antes.
  if (input.weather && plant.location !== 'indoor') {
    const next = input.weather.days.filter((d) => d.day >= today).slice(0, 3);
    const avgMax = next.reduce((sum, d) => sum + d.maxC, 0) / Math.max(1, next.length);
    if (next.length && avgMax > 30) {
      days *= 0.7;
      factors.push(`Calor fuerte (${Math.round(avgMax)} °C): riego más frecuente`);
    }
  }
  const sizeFactor = Math.sqrt(Math.max(plant.potDiameterCm, 5) / 15);
  days *= sizeFactor;
  if (sizeFactor > 1.15) factors.push(`Maceta grande (${fmt(plant.potDiameterCm)} cm): guarda más humedad`);
  if (sizeFactor < 0.85) factors.push(`Maceta pequeña (${fmt(plant.potDiameterCm)} cm): se seca antes`);
  if (!plant.hasDrainage) {
    days *= 1.3;
    factors.push('Sin agujeros de drenaje: riego más espaciado y escaso');
  }
  const everyDays = Math.min(45, Math.max(1, Math.round(days)));

  const volumeL = potVolumeL(plant);
  const amountMl = round10(volumeL * 1000 * WATER_FRACTION[care.waterStyle] * (plant.hasDrainage ? 1 : 0.6));

  const due = input.lastWaterDay ? addDays(input.lastWaterDay, everyDays) : today;
  const snoozed = input.snoozedUntil && input.snoozedUntil > today ? input.snoozedUntil : null;
  const nextDay = snoozed ? maxDay(due, snoozed)! : due;

  const howTo = plant.hasDrainage
    ? `${WATER_HOWTO[care.waterStyle]} Unos ${amountMl} ml, despacio y por toda la superficie; vacía el plato a los 15 minutos.`
    : `${WATER_HOWTO[care.waterStyle]} Como no drena, echa solo ${amountMl} ml repartidos y nunca más.`;

  return { everyDays, amountMl, lastDay: input.lastWaterDay, nextDay, snoozedUntil: snoozed, howTo, factors, volumeL };
}

export function computeFertilize(input: EngineInput): CarePlan['fertilize'] {
  const { care, today, southern, category } = input;
  const product =
    category === 'orchids'
      ? 'Abono específico de orquídeas, a la mitad de la dosis del envase.'
      : category === 'cacti' || category === 'succulents'
        ? 'Abono para cactus (bajo en nitrógeno), a la mitad de la dosis.'
        : category === 'carnivorous'
          ? 'No la abones: las carnívoras se queman con el abono.'
          : category === 'vegetables' || category === 'fruit'
            ? 'Abono equilibrado; al florecer, uno rico en potasio.'
            : 'Abono líquido equilibrado (p. ej. NPK 3-1-2), a la mitad de la dosis del envase.';

  const every = category === 'carnivorous' ? 0 : Math.round(care.fertilizeEveryDays);
  if (every <= 0) {
    return { everyDays: null, lastDay: input.lastFertilizeDay, nextDay: null, pausedReason: 'No necesita abono habitual.', product };
  }

  const months = growingMonths(care, southern);
  const firstGrowing = [...months].sort((a, b) => a - b);
  const nextGrowingStart = (from: string) => {
    for (let i = 0; i < 12; i++) {
      const d = addDays(from, i * 30);
      if (months.includes(monthOf(d))) return monthOf(d) === monthOf(from) ? from : nextMonthStart(from, monthOf(d));
    }
    return nextMonthStart(from, firstGrowing[0] ?? 3);
  };

  let next = input.lastFertilizeDay ? addDays(input.lastFertilizeDay, every) : today;
  let pausedReason: string | null = null;

  // Tras un trasplante, el sustrato nuevo ya trae nutrientes: 6 semanas sin abonar.
  if (input.lastRepotDay) {
    const resume = addDays(input.lastRepotDay, 42);
    if (resume > today) {
      pausedReason = `Trasplantada hace poco: el sustrato nuevo ya la alimenta hasta el ${resume.slice(8)}/${resume.slice(5, 7)}.`;
      next = maxDay(next, resume)!;
    }
  }
  if (!months.includes(monthOf(maxDay(next, today)!))) {
    const resume = nextGrowingStart(maxDay(next, today)!);
    pausedReason ??= `En reposo: se retoma en ${monthName(monthOf(resume))}.`;
    next = resume;
  }
  return { everyDays: every, lastDay: input.lastFertilizeDay, nextDay: next, pausedReason, product };
}

export function computePot(input: EngineInput): CarePlan['pot'] {
  const { plant, care } = input;
  const volumeL = potVolumeL(plant);
  if (!plant.hasDrainage) {
    return {
      verdict: 'no_drainage',
      message:
        'La maceta no tiene agujeros: el agua se acumula y pudre las raíces. Pon la planta en una maceta de plástico con agujeros dentro de esta (como cubremaceta).',
      volumeL,
      recommendedDiameterCm: null,
    };
  }
  if (!plant.plantHeightCm && !plant.plantWidthCm) {
    return {
      verdict: 'need_size',
      message: 'Para saber si la maceta es adecuada, dinos cuánto mide la planta (alto y ancho).',
      volumeL,
      recommendedDiameterCm: null,
    };
  }
  const trailing = ['succulents', 'climbers'].includes(input.category) && (plant.plantWidthCm ?? 0) > (plant.plantHeightCm ?? 0);
  const ideal = trailing || !plant.plantHeightCm ? (plant.plantWidthCm ?? 0) / 2 : plant.plantHeightCm / 3;
  const idealCm = Math.max(8, Math.round(ideal));
  const d = plant.potDiameterCm;

  if (d < idealCm * 0.85) {
    const rec = Math.min(Math.round(d + (care.rootGrowth === 'fast' ? 5 : 3)), idealCm + 3);
    return {
      verdict: 'bigger',
      message: `Se le está quedando pequeña. Pásala a una de unos ${rec} cm (no más de 2–5 cm por encima de la actual), mejor en primavera.`,
      volumeL,
      recommendedDiameterCm: rec,
    };
  }
  if (d > idealCm * 2) {
    return {
      verdict: 'smaller',
      message: `Es demasiado grande para su tamaño: tanta tierra tarda en secarse y puede pudrir las raíces. Lo ideal serían unos ${idealCm} cm; si la mantienes, riega aún más espaciado y usa sustrato aireado.`,
      volumeL,
      recommendedDiameterCm: idealCm,
    };
  }
  return { verdict: 'ok', message: 'La maceta tiene un tamaño adecuado para la planta.', volumeL, recommendedDiameterCm: null };
}

export function computeRepot(input: EngineInput, pot: CarePlan['pot']): CarePlan['repot'] {
  const { care, today, southern } = input;
  const everyMonths = Math.max(6, Math.round(care.repotEveryMonths || 18));
  const springMonth = southern ? 9 : 3;
  const inSpring = southern ? [9, 10, 11].includes(monthOf(today)) : [3, 4, 5].includes(monthOf(today));
  const nextSpring = inSpring ? today : nextMonthStart(today, springMonth, 15);

  let next: string | null = input.lastRepotDay ? addDays(input.lastRepotDay, Math.round(everyMonths * 30.4)) : null;
  let note: string;
  if (pot.verdict === 'bigger') {
    next = minDay(next, nextSpring) ?? nextSpring;
    note = 'Necesita una maceta más grande: hazlo al empezar la primavera.';
  } else if (!next) {
    note = `No sabemos cuándo se trasplantó. Revisa si salen raíces por los agujeros o el agua no empapa: si es así, toca. Lo normal es cada ${everyMonths} meses.`;
  } else {
    note = `Cada ${everyMonths} meses, preferiblemente en primavera.`;
  }
  // Si cae fuera de primavera, se mueve a la siguiente primavera.
  if (next) {
    const m = monthOf(next);
    const ok = southern ? [9, 10, 11].includes(m) : [3, 4, 5].includes(m);
    if (!ok) next = next < nextSpring ? nextSpring : nextMonthStart(next, springMonth, 15);
    if (next < today) next = inSpring ? today : nextSpring;
  }
  return { everyMonths, lastDay: input.lastRepotDay, nextDay: next, note };
}

const r = (n: number) => Math.round(n);

/** Interior, exterior, o fuera de día y dentro de noche, según el tiempo de hoy y la tolerancia de la especie. */
export function computeClimate(input: EngineInput): Climate | null {
  const { weather, care, plant, today } = input;
  if (!weather) return null;
  const todayW = weather.days.find((d) => d.day === today) ?? weather.days[0];
  const tomorrow = weather.days.find((d) => d.day > (todayW?.day ?? today));
  if (!todayW) return null;

  const nowC = weather.current.tempC;
  const maxC = todayW.maxC;
  // La mínima de "esta noche" es la de la madrugada siguiente.
  const nightC = Math.min(tomorrow?.minC ?? todayW.minC, todayW.minC);
  const frost = nightC <= 0 && !care.frostTolerant;
  const base = { nowC, todayMaxC: maxC, tonightMinC: nightC, place: weather.place };
  const outside = plant.location !== 'indoor';
  const name = input.plantName ?? 'la planta';

  // Avisos de los próximos 6 días para plantas que están fuera.
  const alerts: Climate['alerts'] = [];
  if (outside) {
    const days = weather.days.filter((d) => d.day >= today).slice(0, 7);
    for (let i = 0; i < days.length - 1; i++) {
      const d = days[i]!;
      const night = days[i + 1]!.minC;
      if (night < care.tempMinC || (night <= 0 && !care.frostTolerant)) {
        alerts.push({
          day: d.day,
          message: `Esta noche ${r(night)} °C: mete ${name} dentro (aguanta hasta ${care.tempMinC} °C).`,
        });
      } else if (d.maxC > care.tempMaxC) {
        alerts.push({ day: d.day, message: `${r(d.maxC)} °C: pon ${name} a la sombra en las horas centrales.` });
      }
    }
  }

  let verdict: Climate['verdict'];
  let title: string;
  let message: string;
  const range = `entre ${care.tempMinC} y ${care.tempMaxC} °C (ideal ${care.tempIdealMinC}–${care.tempIdealMaxC} °C)`;

  if (!outside) {
    verdict = 'indoor_ok';
    title = 'Bien dentro de casa';
    message =
      nightC >= care.tempMinC + 2 && maxC <= care.tempIdealMaxC + 3 && !frost
        ? `Fuera hoy ${r(nightC)}–${r(maxC)} °C: podría estar en el exterior si le das la luz que necesita.`
        : nightC < care.tempMinC || frost
          ? `Fuera hoy ${r(nightC)}–${r(maxC)} °C: demasiado frío para sacarla. Dentro, mantenla ${range}, lejos de radiadores y corrientes.`
          : `Fuera hoy ${r(nightC)}–${r(maxC)} °C. Dentro, mantenla ${range}.`;
  } else if (maxC < care.tempMinC || (frost && maxC < care.tempIdealMinC)) {
    verdict = 'keep_inside';
    title = 'Hoy, mejor dentro';
    message = `Fuera no pasará de ${r(maxC)} °C${frost ? ' y helará' : ''}; ${name} vive bien ${range}.`;
  } else if (nightC < care.tempMinC || frost) {
    verdict = 'day_out_night_in';
    title = 'Fuera de día, dentro de noche';
    message = `De día llegará a ${r(maxC)} °C, pero esta noche bajará a ${r(nightC)} °C. Si está fuera, métela al atardecer.`;
  } else if (maxC > care.tempMaxC || (todayW.uvMax >= 8 && care.luxMax <= 20_000)) {
    verdict = 'shade_midday';
    title = 'Sombra en las horas centrales';
    message =
      maxC > care.tempMaxC
        ? `Hoy ${r(maxC)} °C: por encima de lo que aguanta (${care.tempMaxC} °C). Sombra y riego temprano.`
        : `Índice UV ${r(todayW.uvMax)}: el sol de mediodía puede quemar sus hojas.`;
  } else {
    verdict = 'ok_outside';
    title = 'Hoy está bien fuera';
    message = `Entre ${r(nightC)} y ${r(maxC)} °C: dentro de lo que tolera (${care.tempMinC}–${care.tempMaxC} °C).`;
  }
  return { verdict, title, message, ...base, alerts };
}

/** Plan completo de cuidado de una planta. */
export function computeCarePlan(input: EngineInput): CarePlan {
  const water = computeWater(input);
  const pot = computePot(input);
  const repot = computeRepot(input, pot);
  const fertilize = computeFertilize(input);

  const suggestions: string[] = [];
  if (input.recentWaterEvents[0] === 'snooze' && input.recentWaterEvents[1] === 'snooze') {
    suggestions.push(
      `Has pospuesto el riego dos veces seguidas. Si la tierra sigue húmeda, puede que necesite menos agua: revisa la luz y el tamaño de la maceta.`,
    );
  }
  if (input.care.luxMin >= 10_000 && input.plant.lightLevel === 'low') {
    suggestions.push('Esta planta necesita mucha más luz de la que recibe: acércala a una ventana luminosa.');
  }
  if (input.care.luxMax <= 10_000 && input.plant.lightLevel === 'full_sun') {
    suggestions.push('El sol directo todo el día puede quemar sus hojas: mejor luz filtrada o semisombra.');
  }
  const rainToday = input.weather?.days.find((d) => d.day === input.today)?.rainMm ?? 0;
  if (input.plant.location === 'outdoor' && rainToday >= 5 && water.nextDay <= input.today) {
    suggestions.push(`Hoy se esperan ${Math.round(rainToday)} mm de lluvia: si está al descubierto, puedes saltarte el riego.`);
  }
  if (input.lastWaterDay && diffDays(input.lastWaterDay, input.today) > water.everyDays * 2) {
    suggestions.push('Hace mucho que no se riega: comprueba la humedad antes y, si está muy seca, riega en dos tandas.');
  }

  const { volumeL: _v, ...waterPlan } = water;
  return { water: waterPlan, fertilize, repot, pot, climate: computeClimate(input), suggestions };
}
