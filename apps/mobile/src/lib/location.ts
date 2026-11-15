import { placeSearchSchema, type Place } from '@hdp/shared';
import * as Location from 'expo-location';
import { api } from './api';

export type DetectedLocation = { lat: number; lon: number; city: string | null; timezone: string };

const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';

/** Pide permiso y obtiene la ubicación aproximada del móvil y el nombre de la ciudad. */
export async function detectLocation(): Promise<DetectedLocation> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error('Sin permiso de ubicación. Puedes escribir tu ciudad a mano.');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  const { latitude: lat, longitude: lon } = pos.coords;
  let city: string | null = null;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    city = place?.city ?? place?.subregion ?? place?.region ?? null;
  } catch {
    // sin nombre de ciudad no pasa nada
  }
  return { lat, lon, city, timezone: deviceTimezone() };
}

export async function searchPlaces(q: string): Promise<Place[]> {
  return placeSearchSchema.parse(await api(`/places?q=${encodeURIComponent(q)}`)).results;
}

export function placeLabel(p: Place): string {
  return [p.name, p.region, p.country].filter(Boolean).join(', ');
}
