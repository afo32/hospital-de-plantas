import { BadRequestException, StandardSchemaValidationPipe } from '@nestjs/common';

/**
 * Valida los cuerpos y parámetros con los esquemas Zod de @hdp/shared
 * y devuelve errores en español con la forma { statusCode, message, errors[] }.
 */
export function createValidationPipe() {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) => {
      const errors = issues.map((issue) => ({
        path: (issue.path ?? [])
          .map((p) => (typeof p === 'object' && p !== null && 'key' in p ? String(p.key) : String(p)))
          .join('.'),
        message: issue.message,
      }));
      return new BadRequestException({
        statusCode: 400,
        message: errors[0]?.message ?? 'Datos no válidos',
        errors,
      });
    },
  });
}
