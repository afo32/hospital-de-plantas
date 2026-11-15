import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { API_URL } from './api';

/**
 * Las fotos propias llegan como "/files/…?e=…&s=…" (relativas al API); las de especies, como URL completa.
 * Devuelve la URL lista para <Image>.
 */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

/**
 * Fuente para expo-image con una clave de caché sin la firma, para que la foto
 * no se descargue otra vez cuando el enlace se renueva.
 */
export function imageSource(url: string | null | undefined) {
  const uri = mediaUrl(url);
  if (!uri) return null;
  return url!.startsWith('/files/') ? { uri, cacheKey: url!.split('?')[0] } : { uri };
}

/** Reduce la foto a 1280 px de ancho, JPEG 70 %, y la devuelve en base64 (~200–400 KB por foto). */
export async function toBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo leer la foto'));
      reader.readAsDataURL(blob);
    });
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
  }
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1280 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!result.base64) throw new Error('No se pudo preparar la foto');
  return result.base64;
}

export type PhotoSource = 'camera' | 'library';

/** Abre la cámara o la galería (pidiendo permiso) y devuelve las URIs elegidas. */
export async function pickPhotos(source: PhotoSource, max = 1): Promise<string[]> {
  if (max <= 0) return [];
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permiso necesario', 'Activa el permiso en los ajustes del móvil para añadir fotos.');
    return [];
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsMultipleSelection: source === 'library' && max > 1,
    selectionLimit: max,
  };
  const res =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri).slice(0, max);
}
