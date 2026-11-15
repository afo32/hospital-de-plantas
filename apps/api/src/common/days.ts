/**
 * Utilidades de fechas "de calendario" (YYYY-MM-DD) en la zona horaria del usuario.
 * Las tareas son por día, no por hora: regar "hoy" significa hoy en Madrid, no en UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Día local de una fecha en una zona horaria IANA (p. ej. "Europe/Madrid"). */
export function localDay(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  return fromUtc(toUtc(day) + Math.round(n) * DAY_MS);
}

/** Días de `from` a `to` (positivo si `to` es posterior). */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function monthOf(day: string): number {
  return Number(day.slice(5, 7));
}

export function maxDay(...days: (string | null | undefined)[]): string | null {
  const valid = days.filter((d): d is string => !!d);
  return valid.length ? valid.reduce((a, b) => (a > b ? a : b)) : null;
}

export function minDay(...days: (string | null | undefined)[]): string | null {
  const valid = days.filter((d): d is string => !!d);
  return valid.length ? valid.reduce((a, b) => (a < b ? a : b)) : null;
}

/** Primer día del mes `month` (1–12) igual o posterior a `day`. */
export function nextMonthStart(day: string, month: number, dayOfMonth = 1): string {
  const year = Number(day.slice(0, 4));
  const candidate = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
  return candidate >= day ? candidate : `${year + 1}${candidate.slice(4)}`;
}

/** Fecha y hora en que empieza un día local (aprox.: mediodía local, suficiente para guardar eventos). */
export function dayToDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
export function monthName(month: number): string {
  return MONTHS[(month - 1 + 12) % 12]!;
}
