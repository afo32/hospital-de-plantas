import { authResponseSchema, healthSchema, type AuthResponse, type HealthResponse } from '@hdp/shared';
import { secureStorage } from './secure-storage';

/** URL base del API, desde apps/mobile/.env (EXPO_PUBLIC_API_URL). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

const REFRESH_KEY = 'hdp.refreshToken';

export class ApiError extends Error {
  constructor(
    message: string,
    /** Código HTTP; undefined si no hubo respuesta (sin conexión, servidor apagado…) */
    readonly status?: number,
    /** Errores por campo: { email: 'Email no válido' } */
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }

  get isNetwork() {
    return this.status === undefined;
  }
}

/* ---------- Estado de la sesión en memoria ---------- */

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

/** El AuthProvider se registra aquí para enterarse si la sesión caduca del todo. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export async function saveSession(session: AuthResponse) {
  accessToken = session.accessToken;
  await secureStorage.set(REFRESH_KEY, session.refreshToken);
}

export async function clearSession() {
  accessToken = null;
  await secureStorage.remove(REFRESH_KEY);
}

export function getStoredRefreshToken() {
  return secureStorage.get(REFRESH_KEY);
}

/* ---------- fetch base ---------- */

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** false para rutas públicas (login, registro…) */
  auth?: boolean;
  timeoutMs?: number;
};

async function rawFetch(path: string, opts: FetchOptions, token: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  try {
    return await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.');
  } finally {
    clearTimeout(timer);
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as {
    message?: unknown;
    errors?: { path: string; message: string }[];
  } | null;
  const message = typeof body?.message === 'string' ? body.message : `Error ${res.status}`;
  const fieldErrors: Record<string, string> = {};
  for (const e of body?.errors ?? []) {
    if (e.path && !fieldErrors[e.path]) fieldErrors[e.path] = e.message;
  }
  return new ApiError(message, res.status, fieldErrors);
}

/* ---------- Renovación automática del token ---------- */

let refreshing: Promise<AuthResponse | null> | null = null;

/** Pide un token nuevo con el refresh guardado. Si varias peticiones lo piden a la vez, se hace una sola vez. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) return null;
      const res = await rawFetch('/auth/refresh', { method: 'POST', body: { refreshToken } }, null);
      if (res.status === 401) {
        await clearSession();
        return null;
      }
      if (!res.ok) throw await toApiError(res);
      const session = authResponseSchema.parse(await res.json());
      await saveSession(session);
      return session;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Llama al API. Con auth (por defecto), si el token caducó lo renueva y repite la petición una vez. */
export async function api<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  let res = await rawFetch(path, opts, useAuth ? accessToken : null);

  if (res.status === 401 && useAuth) {
    const session = await refreshSession();
    if (!session) {
      onSessionExpired?.();
      throw new ApiError('Tu sesión ha caducado. Vuelve a entrar.', 401);
    }
    res = await rawFetch(path, opts, accessToken);
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return healthSchema.parse(await api('/health', { auth: false, timeoutMs: 8000 }));
}
