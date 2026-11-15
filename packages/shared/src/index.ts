import { z } from 'zod';

// Mensajes de validación de Zod en español para la app y el API.
z.config(z.locales.es());

export * from './catalog.js';
export * from './schemas.js';
