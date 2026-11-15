import {
  authResponseSchema,
  publicUserSchema,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from '@hdp/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  api,
  ApiError,
  clearSession,
  getStoredRefreshToken,
  refreshSession,
  saveSession,
  setSessionExpiredHandler,
} from '@/lib/api';
import { getGoogleIdToken, googleSignOut } from './google';

type AuthStatus =
  | 'loading' // leyendo la sesión guardada al abrir la app
  | 'signedOut'
  | 'signedIn'
  | 'offline'; // hay sesión guardada pero no se pudo contactar con el servidor

type AuthContextValue = {
  status: AuthStatus;
  user: PublicUser | null;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  /** Abre el selector de Google y entra (crea la cuenta si no existe). */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Reintenta recuperar la sesión (pantalla "sin conexión"). */
  retry: () => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);

  const restore = useCallback(async () => {
    setStatus('loading');
    try {
      if (!(await getStoredRefreshToken())) {
        setStatus('signedOut');
        return;
      }
      const session = await refreshSession();
      if (session) {
        setUser(session.user);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    } catch (err) {
      // Sin red: no borramos la sesión, dejamos reintentar.
      setStatus(err instanceof ApiError && err.isNetwork ? 'offline' : 'signedOut');
    }
  }, []);

  useEffect(() => {
    void restore();
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('signedOut');
    });
    return () => setSessionExpiredHandler(null);
  }, [restore]);

  const signIn = useCallback(async (input: LoginInput) => {
    const session = authResponseSchema.parse(
      await api('/auth/login', { method: 'POST', body: input, auth: false }),
    );
    await saveSession(session);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const session = authResponseSchema.parse(
      await api('/auth/register', { method: 'POST', body: input, auth: false }),
    );
    await saveSession(session);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    const session = authResponseSchema.parse(
      await api('/auth/google', { method: 'POST', body: { idToken }, auth: false }),
    );
    await saveSession(session);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await getStoredRefreshToken();
    if (refreshToken) {
      // Si falla (sin red), cerramos igualmente en el móvil.
      await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => undefined);
    }
    await clearSession();
    await googleSignOut();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const reloadUser = useCallback(async () => {
    setUser(publicUserSchema.parse(await api('/me')));
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signInWithGoogle, signOut, retry: restore, reloadUser }),
    [status, user, signIn, signUp, signInWithGoogle, signOut, restore, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
