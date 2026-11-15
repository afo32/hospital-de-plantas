import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TaskType } from '@hdp/shared';
import { api, ApiError } from './api';

/**
 * Modo sin conexión:
 * - Las pantallas principales guardan su última respuesta y la muestran si no hay red.
 * - Marcar, deshacer y posponer se guardan en una cola y se envían al volver la conexión.
 */

const CACHE_PREFIX = 'hdp.cache.';
const QUEUE_KEY = 'hdp.queue';

/* ---------- Caché de lecturas ---------- */

export type Cached<T> = { data: T; offline: boolean; savedAt: string | null };

/** Pide datos al servidor y los guarda; si no hay red, devuelve la última copia guardada. */
export async function withCache<T>(key: string, fetcher: () => Promise<T>): Promise<Cached<T>> {
  try {
    const data = await fetcher();
    void AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, savedAt: new Date().toISOString() }));
    return { data, offline: false, savedAt: null };
  } catch (err) {
    if (!(err instanceof ApiError && err.isNetwork)) throw err;
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key).catch(() => null);
    if (!raw) throw err;
    const stored = JSON.parse(raw) as { data: T; savedAt: string };
    return { data: stored.data, offline: true, savedAt: stored.savedAt };
  }
}

export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(CACHE_PREFIX) || k === QUEUE_KEY));
}

/* ---------- Cola de acciones ---------- */

export type QueuedAction =
  | { kind: 'complete'; plantId: string; type: TaskType; day: string }
  | { kind: 'undo'; plantId: string; type: TaskType; day: string }
  | { kind: 'snooze'; plantId: string; days: number; day: string };

/** Se lanza cuando una acción se ha guardado para enviarla más tarde. */
export class QueuedOffline extends Error {
  constructor() {
    super('Sin conexión: lo guardamos y se enviará al volver la red.');
  }
}

async function readQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY).catch(() => null);
  return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
}

async function writeQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length;
}

function send(a: QueuedAction): Promise<unknown> {
  if (a.kind === 'complete') return api(`/plants/${a.plantId}/complete`, { method: 'POST', body: { type: a.type, day: a.day } });
  if (a.kind === 'undo') return api(`/plants/${a.plantId}/complete/${a.type}`, { method: 'DELETE' });
  return api(`/plants/${a.plantId}/snooze`, { method: 'POST', body: { days: a.days } });
}

/**
 * Ejecuta una acción; si no hay red, la guarda en la cola y lanza QueuedOffline
 * para que la pantalla la muestre como hecha.
 */
export async function runOrQueue<T>(action: QueuedAction, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!(err instanceof ApiError && err.isNetwork)) throw err;
    const queue = await readQueue();
    // Marcar y luego deshacer lo mismo sin red se anulan entre sí.
    const opposite = queue.findIndex(
      (q) =>
        q.plantId === action.plantId &&
        'type' in q &&
        'type' in action &&
        q.type === action.type &&
        q.kind !== action.kind,
    );
    if (opposite >= 0) queue.splice(opposite, 1);
    else queue.push(action);
    await writeQueue(queue);
    throw new QueuedOffline();
  }
}

let flushing: Promise<number> | null = null;

/** Envía las acciones pendientes en orden. Devuelve cuántas se enviaron. */
export function flushQueue(): Promise<number> {
  flushing ??= (async () => {
    const queue = await readQueue();
    let sent = 0;
    while (queue.length) {
      try {
        await send(queue[0]!);
      } catch (err) {
        if (err instanceof ApiError && err.isNetwork) break; // sigue sin red: lo intentamos luego
        // Error del servidor (p. ej. la planta ya no existe): se descarta para no bloquear la cola.
      }
      queue.shift();
      sent++;
      await writeQueue(queue);
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
