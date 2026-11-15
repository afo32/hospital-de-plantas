import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta como pública: no exige iniciar sesión. Por defecto todas las rutas la exigen. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
