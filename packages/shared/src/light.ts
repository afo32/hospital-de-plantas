/**
 * Recomendaciones de luz SIN IA: a partir de lo que mide el móvil (o de lo que cuenta la persona)
 * y de lo que necesita la especie. Mismo resultado en la app y en el servidor.
 */

export const LIGHT_WINDOWS = [
  { value: 'south', label: 'Sur' },
  { value: 'west', label: 'Oeste' },
  { value: 'east', label: 'Este' },
  { value: 'north', label: 'Norte' },
  { value: 'none', label: 'No hay ventana' },
  { value: 'unknown', label: 'No lo sé' },
] as const;

export const LIGHT_DISTANCES = [
  { value: 'touching', label: 'Pegada (< 50 cm)' },
  { value: 'near', label: '50 cm – 1 m' },
  { value: 'mid', label: '1 – 2 m' },
  { value: 'far', label: 'Más de 2 m' },
] as const;

export const LIGHT_FILTERS = [
  { value: 'sheer_curtain', label: 'Visillo o cortina fina' },
  { value: 'blinds', label: 'Persiana medio bajada' },
  { value: 'obstacle', label: 'Árbol o edificio delante' },
  { value: 'frosted', label: 'Cristal opaco o tintado' },
] as const;

export const LIGHT_ARTIFICIAL = [
  { value: 'none', label: 'Ninguna' },
  { value: 'regular', label: 'Lámpara normal de casa' },
  { value: 'grow', label: 'Lámpara de cultivo (LED)' },
] as const;

export type LightWindow = (typeof LIGHT_WINDOWS)[number]['value'];
export type LightDistance = (typeof LIGHT_DISTANCES)[number]['value'];
export type LightFilter = (typeof LIGHT_FILTERS)[number]['value'];
export type LightArtificial = (typeof LIGHT_ARTIFICIAL)[number]['value'];

export type LightSetup = {
  window: LightWindow;
  distance: LightDistance;
  filters: LightFilter[];
  artificial: LightArtificial;
};

export type LightAdviceInput = {
  /** Lux medidos; null si el móvil no tiene sensor (se estima con las respuestas) */
  lux: number | null;
  range: { min: number; ideal: number; max: number };
  setup: LightSetup;
  outdoor: boolean;
  southern: boolean;
  /** 1–12 */
  month: number;
  plantName: string;
};

export type LightAdvice = {
  status: 'low' | 'high' | 'ok';
  /** Lux usados para decidir (medidos o estimados) */
  lux: number;
  estimated: boolean;
  summary: string;
  actions: { title: string; detail: string }[];
  idealPlace: string;
  signs: string;
};

/** Luz aproximada pegada a cada ventana a mediodía (hemisferio norte; en el sur se cambian norte y sur). */
const WINDOW_LUX: Record<LightWindow, number> = {
  south: 25_000,
  west: 12_000,
  east: 9_000,
  north: 2_500,
  none: 150,
  unknown: 6_000,
};
const DISTANCE_FACTOR: Record<LightDistance, number> = { touching: 1, near: 0.5, mid: 0.2, far: 0.08 };
const FILTER_FACTOR: Record<LightFilter, number> = { sheer_curtain: 0.5, blinds: 0.5, obstacle: 0.5, frosted: 0.6 };

const fmt = (n: number) => Math.round(n).toLocaleString('es-ES');

/** Lux aproximados según dónde está la planta. */
export function estimateLux(setup: LightSetup, southern = false): number {
  const win = southern && setup.window === 'south' ? 'north' : southern && setup.window === 'north' ? 'south' : setup.window;
  let lux = WINDOW_LUX[win] * (setup.window === 'none' ? 1 : DISTANCE_FACTOR[setup.distance]);
  for (const f of setup.filters) lux *= FILTER_FACTOR[f];
  if (setup.artificial === 'grow') lux += 8_000;
  else if (setup.artificial === 'regular') lux += 150;
  return Math.round(lux);
}

/** Dónde le iría bien según la luz ideal de la especie. */
export function idealPlaceFor(range: LightAdviceInput['range'], southern: boolean): string {
  const sunny = southern ? 'norte' : 'sur';
  const shady = southern ? 'sur' : 'norte';
  if (range.ideal >= 20_000) {
    return `Sol directo: pegada a una ventana ${sunny} u oeste, o fuera en la época cálida.`;
  }
  if (range.ideal >= 10_000) {
    return `Mucha luz con algo de sol: a menos de 1 m de una ventana este u oeste, o ${sunny} con visillo.`;
  }
  if (range.ideal >= 2_500) {
    return `Luz indirecta brillante: a 1–2 m de una ventana ${sunny} u oeste, o junto a una ventana este o ${shady}, sin sol directo en las horas centrales.`;
  }
  return `Semisombra: a 2–3 m de la ventana, o junto a una ventana ${shady}.`;
}

export function lightAdvice(input: LightAdviceInput): LightAdvice {
  const { range, setup, outdoor, southern, plantName } = input;
  const estimated = input.lux == null;
  const lux = input.lux ?? estimateLux(setup, southern);
  const status: LightAdvice['status'] = lux < range.min ? 'low' : lux > range.max ? 'high' : 'ok';
  const winterMonths = southern ? [5, 6, 7, 8] : [11, 12, 1, 2];
  const winter = winterMonths.includes(input.month);
  const sunny = southern ? 'north' : 'south';
  const shady = southern ? 'south' : 'north';
  const actions: LightAdvice['actions'] = [];
  const add = (title: string, detail: string) => actions.push({ title, detail });

  if (status === 'low') {
    const missing = range.min / Math.max(lux, 1);
    if (setup.window === 'none') {
      add(
        'Sin ventana necesita luz artificial',
        `Pon una lámpara LED de cultivo de espectro completo (15–30 W) a 30–40 cm por encima, 12–14 horas al día con un temporizador.`,
      );
    } else {
      if (setup.distance === 'mid' || setup.distance === 'far') {
        add(
          'Acércala a la ventana',
          `La luz cae muy rápido con la distancia: de ${setup.distance === 'far' ? 'más de 2 m' : '1–2 m'} a menos de 1 m recibe entre ${setup.distance === 'far' ? '6 y 12' : '2 y 5'} veces más.`,
        );
      } else if (setup.distance === 'near' && missing > 1.3) {
        add('Pégala al cristal', 'Entre 50 cm y 1 m ya pierde la mitad de la luz que entra por la ventana.');
      }
      if (setup.filters.includes('sheer_curtain')) {
        add('Recoge el visillo durante el día', 'Una cortina fina quita hasta la mitad de la luz.');
      }
      if (setup.filters.includes('blinds')) add('Sube la persiana del todo de día', 'Media persiana es media luz.');
      if (setup.filters.includes('obstacle')) {
        add('Prueba otra ventana', 'Un árbol o un edificio delante le quita mucha luz aunque la ventana sea buena.');
      }
      if (setup.filters.includes('frosted')) {
        add('Busca una ventana de cristal transparente', 'El cristal opaco o tintado filtra buena parte de la luz.');
      }
      if (setup.window === shady && range.ideal > 4_000) {
        add(
          'Cámbiala de ventana',
          `Una ventana ${shady === 'north' ? 'norte' : 'sur'} nunca recibe sol: muévela a una este u oeste${range.ideal >= 10_000 ? ` o ${sunny === 'south' ? 'sur' : 'norte'}` : ''}.`,
        );
      } else if (setup.window === 'east' && range.ideal >= 20_000) {
        add('Necesita más horas de sol', `El este solo da sol por la mañana: le irá mejor una ventana ${sunny === 'south' ? 'sur' : 'norte'} u oeste.`);
      }
      if (missing >= 2.5 && setup.artificial !== 'grow') {
        add(
          'Si no puedes moverla, añade una lámpara de cultivo',
          'LED de espectro completo de 15–30 W a 30–40 cm, 12–14 horas al día con temporizador.',
        );
      }
    }
    if (setup.artificial === 'regular') {
      add('Las lámparas de casa no cuentan', 'Una bombilla normal apenas le da 100–300 lux: no sustituye a la ventana.');
    }
    if (setup.artificial === 'grow') {
      add('Acerca la lámpara de cultivo', 'A 20–30 cm de las hojas y 12–14 horas al día. Cada vez que la alejas al doble, recibe la cuarta parte.');
    }
    if (winter) {
      add('Ten en cuenta el invierno', 'Ahora entra la mitad de luz que en verano: si en invierno llega justa, en primavera mejorará.');
    }
    add('Gírala cada semana', 'Un cuarto de vuelta cada semana para que no crezca torcida hacia la ventana.');
  } else if (status === 'high') {
    if (outdoor) {
      add('Dale sombra en las horas centrales', 'Entre las 12 y las 17 h, ponla en semisombra o tápala con una malla de sombreo del 30–50 %.');
    } else {
      if ((setup.window === sunny || setup.window === 'west') && (setup.distance === 'touching' || setup.distance === 'near')) {
        add('Sepárala de la ventana', 'Aléjala 1–2 m o pon un visillo fino: tendrá mucha luz pero sin quemarse.');
      } else {
        add('Filtra la luz', 'Un visillo fino entre la ventana y la planta reduce la luz a la mitad.');
      }
      if (setup.window === 'west') {
        add('Mejor una ventana este', 'El sol de la tarde es el que más calienta y quema; el de la mañana es suave.');
      }
    }
    if (setup.artificial === 'grow') add('Aleja la lámpara o reduce las horas', 'A 40–50 cm y 10–12 horas al día.');
    add('Cambios poco a poco', 'Si la mueves a más o menos luz, hazlo en 1–2 semanas para que se acostumbre.');
  } else {
    add('Está en buen sitio', 'Déjala donde está. Gírala un cuarto de vuelta cada semana para que crezca recta.');
    if (winter) add('Vuelve a medir en verano', 'En verano entra el doble de luz: comprueba que no se pasa.');
  }

  const summary =
    status === 'low'
      ? `${plantName} recibe unos ${fmt(lux)} lux${estimated ? ' (estimado)' : ''} y necesita al menos ${fmt(range.min)}. Le falta luz.`
      : status === 'high'
        ? `${plantName} recibe unos ${fmt(lux)} lux${estimated ? ' (estimado)' : ''} y por encima de ${fmt(range.max)} puede quemarse.`
        : `${plantName} recibe unos ${fmt(lux)} lux${estimated ? ' (estimado)' : ''}: dentro de lo que necesita (${fmt(range.min)}–${fmt(range.max)}).`;

  const signs =
    status === 'high'
      ? 'Señales de exceso de luz: manchas blancas o marrones secas, hojas amarillentas o descoloridas del lado de la ventana, bordes quemados.'
      : 'Señales de falta de luz: tallos largos y finos, hojas nuevas más pequeñas, se inclina hacia la ventana y pierde el color o el variegado.';

  return { status, lux, estimated, summary, actions, idealPlace: idealPlaceFor(range, southern), signs };
}
