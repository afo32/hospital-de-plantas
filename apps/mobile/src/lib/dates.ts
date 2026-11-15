/** Fechas "de calendario" (YYYY-MM-DD) para mostrar en la app. */

const DAY_MS = 86_400_000;
const toUtc = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
};

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const WEEKDAYS_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function addDays(day: string, n: number): string {
  return new Date(toUtc(day) + n * DAY_MS).toISOString().slice(0, 10);
}

/** "sáb 21 nov" */
export function shortDate(day: string): string {
  const d = new Date(toUtc(day));
  const wd = WEEKDAYS_SHORT[(d.getUTCDay() + 6) % 7];
  return `${wd} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!.slice(0, 3)}`;
}

/** "hoy", "mañana", "en 3 días", "ayer", "hace 2 días" */
export function relativeDay(day: string, today: string): string {
  const n = diffDays(today, day);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  return n > 0 ? `en ${n} días` : `hace ${-n} días`;
}

/** Texto corto para el próximo riego de una planta. */
export function waterLabel(waterInDays: number): string {
  if (waterInDays < 0) return waterInDays === -1 ? 'Atrasada 1 día' : `Atrasada ${-waterInDays} días`;
  if (waterInDays === 0) return 'Regar hoy';
  if (waterInDays === 1) return 'Regar mañana';
  return `Regar en ${waterInDays} días`;
}

export function monthGrid(year: number, month: number): (string | null)[] {
  // Lunes primero. month: 1–12
  const first = Date.UTC(year, month - 1, 1);
  const offset = (new Date(first).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month - 1, d)).toISOString().slice(0, 10));
  while (cells.length % 7) cells.push(null);
  return cells;
}
