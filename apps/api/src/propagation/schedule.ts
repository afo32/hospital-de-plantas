import { type PropagationGuide, propagationGuideSchema } from '@hdp/shared';
import { addDays, diffDays } from '../common/days.js';

export type TasksDone = Record<string, string>;

export function parsePlan(plan: unknown): PropagationGuide | null {
  const parsed = propagationGuideSchema.safeParse(plan);
  return parsed.success ? parsed.data : null;
}

export const taskKey = (stage: number, task: number) => `${stage}:${task}`;

export function parseDone(value: unknown): TasksDone {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e[1]),
    ),
  );
}

/** Próximo día en que toca una tarea (null = ya hecha y no se repite). */
export function nextDue(everyDays: number, lastDone: string | null, stageStartDay: string): string | null {
  if (everyDays <= 0) return lastDone ? null : stageStartDay;
  return lastDone ? addDays(lastDone, everyDays) : stageStartDay;
}

/** Tareas de la etapa actual con si tocan hoy. */
export function currentTasks(
  plan: PropagationGuide,
  stageIndex: number,
  stageStartDay: string,
  done: TasksDone,
  today: string,
) {
  const stage = plan.stages[stageIndex];
  if (!stage) return [];
  return stage.tasks.map((t, taskIndex) => {
    const lastDone = done[taskKey(stageIndex, taskIndex)] ?? null;
    const due = nextDue(t.everyDays, lastDone, stageStartDay);
    return { stageIndex, taskIndex, text: t.text, everyDays: t.everyDays, lastDone, due: !!due && due <= today };
  });
}

/** Lo que hay que hacer cada día entre `today` y `to`, para los avisos del móvil. */
export function reminderDays(
  input: { name: string; plan: PropagationGuide; stageIndex: number; stageStartDay: string; done: TasksDone },
  today: string,
  to: string,
): Map<string, string> {
  const stage = input.plan.stages[input.stageIndex];
  const out = new Map<string, string[]>();
  const add = (day: string, text: string) => out.set(day, [...(out.get(day) ?? []), text]);
  if (!stage) return new Map();

  stage.tasks.forEach((t, i) => {
    const last = input.done[taskKey(input.stageIndex, i)] ?? null;
    let day = nextDue(t.everyDays, last, input.stageStartDay);
    if (!day) return;
    if (day < today) day = today;
    const short = t.text.replace(/\.$/, '').toLowerCase();
    if (t.everyDays <= 0) {
      if (day <= to) add(day, short);
      return;
    }
    for (let n = 0; day <= to && n < 60; n++, day = addDays(day, t.everyDays)) add(day, short);
  });

  // Aviso para revisar si ya toca pasar de etapa.
  const review = addDays(input.stageStartDay, stage.maxDays);
  if (review >= today && review <= to && input.stageIndex < input.plan.stages.length - 1) {
    add(review, `revisa si ya está lista para la siguiente etapa`);
  }

  return new Map([...out.entries()].map(([day, tasks]) => [day, `${input.name}: ${[...new Set(tasks)].join(', ')}`]));
}

export const daysBetween = (from: string, to: string) => Math.max(0, diffDays(from, to));
