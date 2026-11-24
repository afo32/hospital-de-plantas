import { z } from 'zod';

/**
 * Plan "Recién llegada": qué hacer las primeras semanas después de comprar una planta.
 * Son reglas fijas (sin IA) ajustadas al tipo de planta, su sitio y su ficha.
 */

/** Días que dura el plan. */
export const ARRIVAL_DAYS = 30;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const arrivalTaskSchema = z.object({
  id: z.string(),
  /** Día del plan (0 = el día que llegó) */
  offset: z.number().int(),
  dueDay: day,
  title: z.string(),
  detail: z.string(),
  done: z.boolean(),
});
export type ArrivalTask = z.infer<typeof arrivalTaskSchema>;

export const arrivalPlanSchema = z.object({
  startDay: day,
  endDay: day,
  /** Día del plan en el que estamos (0 = el día que llegó) */
  dayNumber: z.number().int(),
  tasks: z.array(arrivalTaskSchema),
  /** Frase de ánimo/explicación para la cabecera */
  intro: z.string(),
});
export type ArrivalPlan = z.infer<typeof arrivalPlanSchema>;

export const arrivalTaskInputSchema = z.object({
  taskId: z.string().min(1).max(40),
  done: z.boolean(),
});
export type ArrivalTaskInput = z.infer<typeof arrivalTaskInputSchema>;

export type ArrivalFacts = {
  category: string;
  location: string; // indoor | outdoor | indoor_night_outdoor_day
  lightLevel: string; // full_sun | partial_sun | bright_indirect | low
  hasDrainage: boolean;
  waterStyle: string; // keep_moist | dry_top_2cm | dry_top_half | dry_fully
  humidityMinPct: number;
  luxMin: number;
  frostTolerant: boolean;
  tempMinC: number;
  /** Animales para los que es tóxica (perros, gatos…) */
  toxicFor: string[];
  /** Cuántas plantas más hay en el jardín */
  otherPlants: number;
  /** Mes (1–12) en que llegó */
  month: number;
  southern: boolean;
};

type Draft = { id: string; offset: number; title: string; detail: string };

const DRY_CHECK: Record<string, string> = {
  keep_moist: 'Mete el dedo 1 cm en la tierra: riega solo si esa capa está seca.',
  dry_top_2cm: 'Mete el dedo 2–3 cm en la tierra: riega solo si a esa profundidad está seca.',
  dry_top_half: 'Clava un palillo de madera hasta la mitad de la maceta: si sale limpio y seco, riega; si sale con tierra pegada, espera.',
  dry_fully: 'No la riegues la primera semana aunque la tierra parezca seca. Después, riega solo cuando la maceta pese poco y la tierra esté seca del todo.',
};

function listEs(items: string[]) {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function isWinter(month: number, southern: boolean) {
  return southern ? [6, 7, 8].includes(month) : [12, 1, 2].includes(month);
}

/** Tareas del plan "Recién llegada" (sin fechas ni estado). */
export function arrivalDrafts(f: ArrivalFacts): Draft[] {
  const out: Draft[] = [];
  const c = f.category;
  const succulent = c === 'cacti' || c === 'succulents';
  const outside = f.location !== 'indoor';
  const winter = isWinter(f.month, f.southern);

  /* ---------- Día 0: al llegar a casa ---------- */
  out.push({
    id: 'unwrap',
    offset: 0,
    title: 'Quítale el envoltorio',
    detail:
      'Retira el plástico o papel de la tienda: no deja que le dé el aire ni la luz. Si tiene una etiqueta pegada a una hoja o un palito con cartel clavado en la tierra, quítalos también.',
  });
  out.push({
    id: 'inspect',
    offset: 0,
    title: 'Revísala por si trae bichos',
    detail:
      'Mira con calma el envés de las hojas, las axilas (donde la hoja se une al tallo) y la superficie de la tierra. Busca puntitos que se mueven, telarañas finas, bolitas blancas como algodón, escamas marrones pegadas o mosquitas al mover la maceta. Si ves algo, haz una revisión en la pestaña Salud.',
  });
  if (f.otherPlants > 0) {
    out.push({
      id: 'quarantine',
      offset: 0,
      title: 'Tenla aparte dos semanas',
      detail:
        'Aunque parezca sana, ponla a 1–2 metros de tus otras plantas (o en otra habitación) durante 14 días. Muchas plagas tardan en verse y así no se contagian.',
    });
  }
  out.push({
    id: 'pot_check',
    offset: 0,
    title: f.hasDrainage ? 'Mira la maceta por dentro' : 'Ojo: su maceta no tiene agujeros',
    detail: f.hasDrainage
      ? 'Muchas plantas vienen en una maceta de plástico de vivero metida dentro de otra decorativa. Si es así, déjala en la de vivero de momento y vacía el agua que se quede en el fondo de la de fuera cada vez que riegues.'
      : 'Si vino en una maceta sin agujeros, casi seguro que dentro hay otra de plástico de vivero: sácala y déjala en esa. Si no la hay, no la cambies todavía, pero riega muy poco y vacía cualquier agua que se acumule.',
  });
  out.push({
    id: 'water_first',
    offset: 0,
    title: 'No la riegues por costumbre',
    detail: `En la tienda la riegan mucho y la tierra suele venir húmeda. ${DRY_CHECK[f.waterStyle] ?? DRY_CHECK.dry_top_2cm}`,
  });

  if (succulent) {
    out.push({
      id: 'glued_stones',
      offset: 0,
      title: 'Quita las piedras pegadas, si las tiene',
      detail:
        'Algunos cactus y suculentas se venden con piedrecitas o arena de colores pegadas con cola encima de la tierra. Esa costra no deja pasar el agua ni el aire: rómpela con cuidado y retírala.',
    });
  }
  if (c === 'herbs') {
    out.push({
      id: 'herbs_split',
      offset: 3,
      title: 'Sepárala en varias macetas',
      detail:
        'Las aromáticas del súper o del vivero suelen ser muchas plantitas apretadas en una sola maceta y se ahogan unas a otras. Sácalas con el cepellón, divídelo con los dedos en 2 o 3 trozos y planta cada uno en su maceta con tierra nueva.',
    });
  }
  if (c === 'carnivorous') {
    out.push({
      id: 'carnivorous_water',
      offset: 0,
      title: 'Solo agua de lluvia o destilada',
      detail:
        'El agua del grifo tiene sales que la matan poco a poco. Riégala por debajo con un plato siempre con 1–2 cm de agua de lluvia o destilada. No la abones y no toques las trampas: cada vez que se cierran sin presa gastan energía.',
    });
  }
  if (c === 'orchids') {
    out.push({
      id: 'orchid_roots',
      offset: 0,
      title: 'Mira sus raíces y no la cambies de maceta',
      detail:
        'Por la maceta transparente se ven las raíces: verdes = acaba de beber; plateadas = ya toca regar (en remojo 10 minutos y escurrir bien). No la trasplantes mientras tenga flor. Es normal que pierda algún capullo con el cambio de sitio.',
    });
  }
  if (c === 'seasonal_flowers' || c === 'bulbs') {
    out.push({
      id: 'deadhead',
      offset: 3,
      title: 'Quita las flores que se marchiten',
      detail: 'Corta las flores secas por la base de su tallito: así gasta la energía en sacar flores nuevas y no en hacer semillas.',
    });
  }

  /* ---------- El sitio ---------- */
  if (!outside) {
    out.push({
      id: 'place',
      offset: 0,
      title: 'Elige su sitio y no la muevas',
      detail:
        'Ponla donde vaya a vivir, lejos de radiadores, aire acondicionado y corrientes de puertas. Cada cambio de sitio le cuesta adaptarse, así que intenta no moverla durante un mes.',
    });
  } else {
    out.push({
      id: 'place',
      offset: 0,
      title: 'Elige su sitio y no la muevas',
      detail:
        'Ponla donde vaya a vivir, protegida del viento fuerte. Cada cambio de sitio le cuesta adaptarse, así que intenta no moverla durante un mes.',
    });
  }
  const strongSun = f.lightLevel === 'full_sun' || (outside && f.lightLevel === 'partial_sun');
  if (strongSun) {
    out.push({
      id: 'sun_1',
      offset: 0,
      title: 'Acostúmbrala al sol poco a poco',
      detail:
        'En el vivero vivía con luz filtrada y el sol directo de golpe le quema las hojas (manchas blancas o marrones). Esta primera semana, que le dé solo 1–2 horas de sol de la mañana y el resto en semisombra.',
    });
    out.push({
      id: 'sun_2',
      offset: 7,
      title: 'Dale media jornada de sol',
      detail: 'Si no ves manchas claras ni hojas quemadas, sube a 3–4 horas de sol, mejor por la mañana o por la tarde.',
    });
    out.push({
      id: 'sun_3',
      offset: 14,
      title: 'Ya puede estar en su sitio al sol',
      detail: 'Ya debería aguantar el sol que le corresponde. Si aun así se marca alguna hoja, vuelve un paso atrás unos días.',
    });
  } else if (f.luxMin >= 10_000 && f.lightLevel === 'low') {
    out.push({
      id: 'more_light',
      offset: 0,
      title: 'Necesita más luz de la que tendrá ahí',
      detail: 'Su ficha pide mucha luz y el sitio que has elegido es oscuro. Acércala a una ventana luminosa o usa el medidor de luz para encontrar un sitio mejor.',
    });
  }
  if (outside && winter && (!f.frostTolerant || f.tempMinC > 0)) {
    out.push({
      id: 'winter_out',
      offset: 0,
      title: 'Cuidado con las noches frías',
      detail: `La compraste en invierno y viene de un invernadero. Aguanta hasta ${f.tempMinC} °C: las primeras semanas, si la noche va a bajar de ${Math.max(f.tempMinC + 3, 5)} °C, métela dentro o tápala con tela térmica. Te avisaremos de las noches frías.`,
    });
  }
  if (f.humidityMinPct >= 60 && !outside) {
    out.push({
      id: 'humidity',
      offset: 0,
      title: 'Súbele la humedad',
      detail:
        'Viene de un invernadero muy húmedo y en casa el aire es seco, sobre todo con calefacción. Pon la maceta sobre un plato con piedras y agua (sin que el fondo toque el agua) o agrúpala con otras plantas cuando acabe la cuarentena.',
    });
  }
  if (f.toxicFor.length) {
    out.push({
      id: 'pets',
      offset: 0,
      title: `Ponla fuera del alcance de ${listEs(f.toxicFor.map((x) => x.toLowerCase()))}`,
      detail: 'Es tóxica para ellos si la muerden. Súbela a una balda alta o a una habitación donde no entren, y recoge las hojas que se le caigan.',
    });
  }

  /* ---------- Seguimiento ---------- */
  out.push({
    id: 'react',
    offset: 3,
    title: 'Mira cómo se está adaptando',
    detail:
      'Es normal que amarillee o se le caiga alguna hoja de abajo, o que pierda algún capullo: es el estrés del cambio. Si se le caen muchas hojas, se arrugan o se ponen blandas, revisa la luz y el riego, o haz una revisión en Salud.',
  });
  out.push({
    id: 'inspect_2',
    offset: 7,
    title: 'Segunda revisión de bichos',
    detail:
      'Vuelve a mirar el envés de las hojas y la tierra. Los huevos que no se veían el primer día ya han podido abrirse. Si ves mosquitas, deja secar más la capa de arriba de la tierra.',
  });
  out.push({
    id: 'inspect_3',
    offset: 14,
    title: f.otherPlants > 0 ? 'Última revisión y fin de la cuarentena' : 'Última revisión de bichos',
    detail:
      f.otherPlants > 0
        ? 'Revísala una última vez. Si no has visto nada raro, ya puede ir con tus otras plantas.'
        : 'Revísala una última vez. Si no has visto nada raro, la planta está limpia.',
  });
  out.push({
    id: 'repot_check',
    offset: 21,
    title: '¿Necesita otra maceta?',
    detail:
      winter
        ? 'Ya se ha adaptado. Comprueba las señales de trasplante en la pestaña Cuidado; si hace falta, mejor espera a principios de primavera, salvo que la maceta esté reventando de raíces.'
        : 'Ya se ha adaptado y puedes cambiarla de maceta si lo necesita. Comprueba las señales de trasplante en la pestaña Cuidado: no la trasplantes solo porque sí.',
  });
  if (c !== 'carnivorous') {
    out.push({
      id: 'fertilize_start',
      offset: 30,
      title: 'Ya puedes empezar a abonar',
      detail:
        'En el vivero la abonan mucho, por eso hemos esperado un mes. A partir de hoy sigue el calendario de abono de la pestaña Cuidado (si está en reposo por la época, se retomará solo).',
    });
  }
  return out.sort((a, b) => a.offset - b.offset);
}

export function arrivalIntro(category: string): string {
  if (category === 'cacti' || category === 'succulents') {
    return 'El primer mes es de adaptación: poca agua, sol poco a poco y paciencia.';
  }
  return 'El primer mes es de adaptación: pocos cambios, mucha observación y nada de abono.';
}
