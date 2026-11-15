import type { z } from 'zod';
import { ApiError } from './api';

export type FieldErrors = Record<string, string>;

/** Valida con un esquema de @hdp/shared y devuelve los datos o los errores por campo. */
export function validate<S extends z.ZodType>(
  schema: S,
  values: unknown,
): { ok: true; data: z.infer<S> } | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Convierte un error del API en errores por campo + un mensaje general. */
export function apiErrorToForm(err: unknown): { fields: FieldErrors; general: string } {
  if (err instanceof ApiError) return { fields: err.fieldErrors, general: err.message };
  return { fields: {}, general: 'Algo salió mal. Inténtalo de nuevo.' };
}
