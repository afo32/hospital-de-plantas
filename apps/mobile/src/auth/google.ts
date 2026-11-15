import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Inicio de sesión con Google.
 * Usa un módulo nativo que NO existe dentro de Expo Go: solo funciona en la build de desarrollo
 * (la app "Hospital de Plantas" instalada con EAS). Por eso el módulo se carga bajo demanda.
 */

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** true si esta versión de la app puede mostrar el botón de Google. */
export const googleSupported = Platform.OS === 'android' && !isExpoGo && GOOGLE_WEB_CLIENT_ID.length > 0;

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
let mod: GoogleModule | null = null;

async function load(): Promise<GoogleModule> {
  if (!mod) {
    mod = await import('@react-native-google-signin/google-signin');
    // webClientId hace que Google devuelva un idToken que nuestro servidor puede verificar.
    mod.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  }
  return mod;
}

export class GoogleCancelled extends Error {}

/** Abre el selector de cuentas de Google y devuelve el idToken. */
export async function getGoogleIdToken(): Promise<string> {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await load();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new GoogleCancelled();
    const { idToken } = response.data;
    if (!idToken) throw new Error('Google no devolvió el token. Revisa el ID de cliente web.');
    return idToken;
  } catch (err) {
    if (err instanceof GoogleCancelled) throw err;
    if (isErrorWithCode(err)) {
      switch (err.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new GoogleCancelled();
        case statusCodes.IN_PROGRESS:
          throw new Error('Ya hay un inicio de sesión con Google en curso.');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Este móvil necesita Google Play Services actualizado.');
        case '10': // DEVELOPER_ERROR: falta el cliente Android o el SHA-1 en Google Cloud
          throw new Error('Google rechazó la configuración (DEVELOPER_ERROR). Revisa el cliente Android y su SHA-1.');
      }
    }
    throw err instanceof Error ? err : new Error('No se pudo iniciar sesión con Google.');
  }
}

/** Olvida la cuenta elegida, para que la próxima vez vuelva a salir el selector. */
export async function googleSignOut(): Promise<void> {
  if (!googleSupported) return;
  try {
    const { GoogleSignin } = await load();
    await GoogleSignin.signOut();
  } catch {
    // no pasa nada si no había sesión de Google
  }
}
