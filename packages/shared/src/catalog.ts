/**
 * Catálogos compartidos entre la app y el API.
 * Los `value` se guardan en la base de datos; los `label` se muestran en la app.
 */

export const PLANT_CATEGORIES = [
  { value: 'ferns', label: 'Helechos' },
  { value: 'cacti', label: 'Cactáceas' },
  { value: 'succulents', label: 'Suculentas' },
  { value: 'aroids', label: 'Aroides' },
  { value: 'palms', label: 'Palmeras' },
  { value: 'orchids', label: 'Orquídeas' },
  { value: 'herbs', label: 'Aromáticas' },
  { value: 'vegetables', label: 'Hortalizas' },
  { value: 'fruit', label: 'Frutales' },
  { value: 'seasonal_flowers', label: 'Flores de temporada' },
  { value: 'bonsai', label: 'Bonsái' },
  { value: 'carnivorous', label: 'Carnívoras' },
  { value: 'bulbs', label: 'Bulbos' },
  { value: 'climbers', label: 'Trepadoras' },
  { value: 'trees_shrubs', label: 'Árboles y arbustos' },
  { value: 'bromeliads', label: 'Bromelias' },
] as const;

export const PLANT_LOCATIONS = [
  { value: 'indoor', label: 'Interior' },
  { value: 'outdoor', label: 'Exterior' },
  { value: 'indoor_night_outdoor_day', label: 'Fuera de día, dentro de noche' },
] as const;

export const LIGHT_LEVELS = [
  { value: 'full_sun', label: 'Sol directo todo el día', hint: 'Más de 6 h de sol' },
  { value: 'partial_sun', label: 'Sol parcial', hint: '2–4 h de sol directo' },
  { value: 'bright_indirect', label: 'Luz brillante indirecta', hint: 'Cerca de ventana, sin sol directo' },
  { value: 'low', label: 'Poca luz', hint: 'Lejos de ventanas' },
] as const;

export const POT_MATERIALS = [
  { value: 'terracotta', label: 'Terracota' },
  { value: 'plastic', label: 'Plástico' },
  { value: 'glazed_ceramic', label: 'Cerámica esmaltada' },
  { value: 'fabric', label: 'Tela' },
  { value: 'other', label: 'Otro' },
] as const;

export const POT_SHAPES = [
  { value: 'round', label: 'Redonda' },
  { value: 'rectangular', label: 'Rectangular' },
] as const;

export const SOIL_TYPES = [
  { value: 'universal', label: 'Universal' },
  { value: 'cactus', label: 'Cactus y suculentas' },
  { value: 'aroid', label: 'Aroides (aireado)' },
  { value: 'peat', label: 'Turba' },
  { value: 'orchid_bark', label: 'Corteza de orquídea' },
  { value: 'custom', label: 'Mezcla propia' },
  { value: 'unknown', label: 'No lo sé' },
] as const;

export const OVERWATERING_GUARDS = [
  { value: 'drainage_holes', label: 'Agujeros de drenaje' },
  { value: 'drainage_layer', label: 'Capa de drenaje' },
  { value: 'airy_substrate', label: 'Sustrato aireado' },
  { value: 'terracotta_pot', label: 'Maceta de terracota' },
  { value: 'finger_test', label: 'Compruebo con el dedo' },
  { value: 'self_watering', label: 'Macetero con autorriego' },
  { value: 'none', label: 'Nada' },
] as const;

/** Señales de que una planta necesita trasplante, con cómo comprobarlas. */
export const REPOT_SIGNS = [
  { value: 'roots_out', label: 'Salen raíces por los agujeros', hint: 'Mira la base de la maceta: raíces asomando o enredadas por fuera.' },
  { value: 'roots_top', label: 'Se ven raíces en la superficie', hint: 'Raíces gruesas por encima de la tierra o levantándola.' },
  { value: 'water_through', label: 'El agua sale por abajo al momento', hint: 'Al regar, el agua atraviesa en segundos sin empapar la tierra.' },
  { value: 'dries_fast', label: 'La tierra se seca en 1–2 días', hint: 'Aunque riegues bien, a los 1–2 días ya está seca a 3 cm.' },
  { value: 'root_bound', label: 'El cepellón es un bloque de raíces', hint: 'Si la sacas con cuidado, casi no se ve tierra: solo raíces dando vueltas.' },
  { value: 'pot_tipping', label: 'La maceta se vuelca, deforma o agrieta', hint: 'La planta pesa más que la maceta o las raíces la están empujando.' },
  { value: 'stalled', label: 'Ha dejado de crecer en su época', hint: 'En primavera o verano no saca hojas nuevas aunque tenga luz y abono.' },
  { value: 'old_soil', label: 'La tierra está dura o con costra blanca', hint: 'Compactada, se separa de las paredes o tiene sales blancas arriba.' },
] as const;
export type RepotSign = (typeof REPOT_SIGNS)[number]['value'];

export const LAST_REPOT_OPTIONS = [
  { value: 'this_month', label: 'Este mes', daysAgo: 15 },
  { value: '1_6_months', label: 'Hace 1–6 meses', daysAgo: 105 },
  { value: '6_12_months', label: 'Hace 6–12 meses', daysAgo: 270 },
  { value: 'over_year', label: 'Hace más de un año', daysAgo: 450 },
  { value: 'unknown', label: 'Nunca / no lo sé', daysAgo: null },
] as const;

export const LAST_WATER_OPTIONS = [
  { value: 'today', label: 'Hoy', daysAgo: 0 },
  { value: 'yesterday', label: 'Ayer', daysAgo: 1 },
  { value: '2_3_days', label: 'Hace 2–3 días', daysAgo: 2 },
  { value: 'week', label: 'Hace una semana', daysAgo: 7 },
  { value: 'more', label: 'Hace más', daysAgo: 14 },
  { value: 'unknown', label: 'No lo sé', daysAgo: null },
] as const;

export const CARE_EVENT_TYPES = [
  'water',
  'fertilize',
  'repot',
  'prune',
  'snooze',
  'move_inside',
  'move_outside',
] as const;

export const SNOOZE_DAYS = [1, 2, 3, 5, 7] as const;

export const GARDEN_ROLES = ['owner', 'editor', 'viewer'] as const;

type Values<T extends readonly { value: string }[]> = T[number]['value'];

export type PlantCategory = Values<typeof PLANT_CATEGORIES>;
export type PlantLocation = Values<typeof PLANT_LOCATIONS>;
export type LightLevel = Values<typeof LIGHT_LEVELS>;
export type PotMaterial = Values<typeof POT_MATERIALS>;
export type PotShape = Values<typeof POT_SHAPES>;
export type SoilType = Values<typeof SOIL_TYPES>;
export type OverwateringGuard = Values<typeof OVERWATERING_GUARDS>;
export type LastRepotOption = Values<typeof LAST_REPOT_OPTIONS>;
export type LastWaterOption = Values<typeof LAST_WATER_OPTIONS>;
export type CareEventType = (typeof CARE_EVENT_TYPES)[number];
export type GardenRole = (typeof GARDEN_ROLES)[number];

/** Devuelve solo los `value` de un catálogo, como tupla para z.enum. */
export function valuesOf<T extends readonly { value: string }[]>(
  catalog: T,
): [Values<T>, ...Values<T>[]] {
  return catalog.map((item) => item.value) as [Values<T>, ...Values<T>[]];
}

/** Busca la etiqueta en español de un valor de catálogo. */
export function labelOf<T extends readonly { value: string; label: string }[]>(
  catalog: T,
  value: string,
): string {
  return catalog.find((item) => item.value === value)?.label ?? value;
}
