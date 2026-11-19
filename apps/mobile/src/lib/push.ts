import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

const TOKEN_KEY = 'hdp.pushToken';

function projectId(): string | undefined {
  return Constants.easConfig?.projectId ?? (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
}

/**
 * Registra este móvil para recibir avisos push del jardín compartido ("Ana regó 3 plantas").
 * Solo funciona en una build (no en Expo Go ni en web) y con google-services.json (docs/push-firebase.md).
 * Si algo falla, no pasa nada: los avisos locales de riego siguen funcionando.
 */
export async function registerPushToken(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    const id = projectId();
    if (!id) {
      if (__DEV__) console.warn('[push] Falta el projectId de EAS (ejecuta "eas init" en apps/mobile).');
      return false;
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await api('/me/push-tokens', { method: 'POST', body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } });
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[push] No se pudo registrar el token:', err);
    return false;
  }
}

/** Al cerrar sesión: este móvil deja de recibir los avisos de esta cuenta. */
export async function unregisterPushToken(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (!token) return;
  await api('/me/push-tokens/remove', { method: 'POST', body: { token } }).catch(() => undefined);
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
}
