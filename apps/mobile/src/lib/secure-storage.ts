import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Guarda datos sensibles (el token de sesión) en el llavero del móvil:
 * Keychain en iOS, Keystore en Android. En web (solo para probar) usa localStorage.
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // almacenamiento no disponible: la sesión durará lo que la pestaña
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // nada que borrar
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
