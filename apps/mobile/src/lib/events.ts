/** Aviso interno "el jardín ha cambiado" (p. ej. llega un push de que Ana regó). Las pantallas recargan. */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onGardenChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitGardenChanged(): void {
  for (const fn of listeners) fn();
}
