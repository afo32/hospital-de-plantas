import type { ActivityKind } from '@hdp/shared';

/** Acciones que se avisan a las demás personas del jardín. */
export type PushKind = Exclude<ActivityKind, 'snooze'>;

export type PendingBatch = {
  gardenId: string;
  gardenName: string;
  actorId: string;
  actorName: string;
  /** Plantas por tipo de acción, en orden */
  items: { kind: PushKind; plantId: string | null; plantName: string | null; extra?: string }[];
};

const VERBS: Record<Exclude<PushKind, 'joined'>, string> = {
  water: 'Regó',
  fertilize: 'Abonó',
  repot: 'Trasplantó',
  plant_added: 'Añadió',
  note: 'Escribió una nota sobre',
  diagnosis: 'Revisó la salud de',
};

/** "Monstera", "Monstera y Pothos", "Monstera, Pothos y 2 más" */
export function listNames(names: string[]): string {
  const unique = [...new Set(names)];
  if (unique.length <= 1) return unique[0] ?? '';
  if (unique.length === 2) return `${unique[0]} y ${unique[1]}`;
  if (unique.length === 3) return `${unique[0]}, ${unique[1]} y ${unique[2]}`;
  return `${unique[0]}, ${unique[1]} y ${unique.length - 2} más`;
}

/** Junta varias acciones de una persona en un solo aviso. */
export function buildGardenMessage(batch: PendingBatch): { title: string; body: string; plantId: string | null } {
  const lines: string[] = [];
  const order: PushKind[] = ['joined', 'water', 'fertilize', 'repot', 'plant_added', 'diagnosis', 'note'];
  for (const kind of order) {
    const items = batch.items.filter((i) => i.kind === kind);
    if (!items.length) continue;
    if (kind === 'joined') {
      lines.push('Se ha unido al jardín 🌱');
      continue;
    }
    if (kind === 'diagnosis') {
      for (const i of items) lines.push(`${VERBS.diagnosis} ${i.plantName}${i.extra ? `: ${i.extra}` : ''}`);
      continue;
    }
    lines.push(`${VERBS[kind]} ${listNames(items.map((i) => i.plantName ?? 'una planta'))}`);
  }
  const plants = new Set(batch.items.map((i) => i.plantId).filter(Boolean));
  return {
    title: `${batch.actorName} · ${batch.gardenName}`,
    body: lines.join('\n'),
    plantId: plants.size === 1 ? [...plants][0]! : null,
  };
}
