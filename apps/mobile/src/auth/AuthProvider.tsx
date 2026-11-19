import {
  authResponseSchema,
  publicUserSchema,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type UpdateMeInput,
} from '@hdp/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { unregisterPushToken } from '@/lib/push';
import { getGoogleIdToken, googleSignOut } from './google';
import { cancelAllReminders } from '@/lib/notifications';
import { clearCache } from '@/lib/offline';

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
  /** Guarda cambios del perfil (ubicación, avisos…) y actualiza el usuario en memoria. */
  updateMe: (input: UpdateMeInput) => Promise<PublicUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Copia del usuario para poder entrar sin conexión con los datos guardados. */
const USER_KEY = 'hdp.user';
const rememberUser = (u: PublicUser | null) =>
  (u ? AsyncStorage.setItem(USER_KEY, JSON.stringify(u)) : AsyncStorage.removeItem(USER_KEY)).catch(() => undefined);
async function rememberedUser(): Promise<PublicUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY).catch(() => null);
  const parsed = raw ? publicUserSchema.safeParse(JSON.parse(raw)) : null;
  return parsed?.success ? parsed.data : null;
}

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
        void rememberUser(session.user);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork) {
        // Sin red: entramos con el último usuario guardado y los datos en caché.
        const cached = await rememberedUser();
        if (cached) {
          setUser(cached);
          setStatus('signedIn');
        } else {
          setStatus('offline');
        }
      } else {
        setStatus('signedOut');
      }
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
    void rememberUser(session.user);
    setStatus('signedIn');
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const session = authResponseSchema.parse(
      await api('/auth/register', { method: 'POST', body: input, auth: false }),
    );
    await saveSession(session);
    setUser(session.user);
    void rememberUser(session.user);
    setStatus('signedIn');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    const session = authResponseSchema.parse(
      await api('/auth/google', { method: 'POST', body: { idToken }, auth: false }),
    );
    await saveSession(session);
    setUser(session.user);
    void rememberUser(session.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    // Primero, que este móvil deje de recibir los avisos push de esta cuenta.
    await unregisterPushToken();
    const refreshToken = await getStoredRefreshToken();
    if (refreshToken) {
      // Si falla (sin red), cerramos igualmente en el móvil.
      await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => undefined);
    }
    await clearSession();
    await googleSignOut();
    await clearCache().catch(() => undefined);
    await rememberUser(null);
    await cancelAllReminders();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const reloadUser = useCallback(async () => {
    setUser(publicUserSchema.parse(await api('/me')));
  }, []);

  const updateMe = useCallback(async (input: UpdateMeInput) => {
    const updated = publicUserSchema.parse(await api('/me', { method: 'PATCH', body: input }));
    setUser(updated);
    void rememberUser(updated);
    return updated;
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signInWithGoogle, signOut, retry: restore, reloadUser, updateMe }),
    [status, user, signIn, signUp, signInWithGoogle, signOut, restore, reloadUser, updateMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
