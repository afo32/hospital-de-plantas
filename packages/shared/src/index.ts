import { z } from 'zod';

// Mensajes de validación de Zod en español para la app y el API.
z.config(z.locales.es());

export * from './catalog.js';
export * from './schemas.js';
export * from './species.js';
export * from './garden.js';
export * from './weather.js';
export * from './health.js';
export * from './sharing.js';
export * from './light.js';
export * from './propagation.js';
