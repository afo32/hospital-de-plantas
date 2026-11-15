// Configuración de Prisma 7: aquí vive la URL de la base de datos (ya no en schema.prisma).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` no necesita base de datos, así que no fallamos si aún no hay .env.
    // `prisma migrate` sí la usa: crea apps/api/.env a partir de .env.example antes de migrar.
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
