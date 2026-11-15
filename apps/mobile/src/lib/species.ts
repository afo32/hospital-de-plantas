import {
  identifyResponseSchema,
  type IdentifyResponse,
  type PhotoOrgan,
  speciesDetailSchema,
  type SpeciesDetail,
  type PlantCategory,
  speciesSearchResponseSchema,
  speciesSummarySchema,
  type SpeciesSummary,
} from '@hdp/shared';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { api } from './api';

export async function searchSpecies(params: { q?: string; category?: PlantCategory }): Promise<SpeciesSummary[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  const data = await api(`/species/search?${qs.toString()}`, { timeoutMs: 15_000 });
  return speciesSearchResponseSchema.parse(data).results;
}

/** Guarda la especie elegida (si hace falta) y devuelve su id para abrir la ficha. */
export async function resolveSpecies(s: SpeciesSummary): Promise<string> {
  if (s.id) return s.id;
  const saved = speciesSummarySchema.parse(
    await api('/species/resolve', {
      method: 'POST',
      body: {
        scientificName: s.scientificName,
        commonName: s.commonName,
        family: s.family,
        imageUrl: s.imageUrl,
        gbifKey: s.gbifKey,
      },
    }),
  );
  if (!saved.id) throw new Error('No se pudo guardar la especie');
  return saved.id;
}

export async function getSpeciesDetail(id: string, retry = false): Promise<SpeciesDetail> {
  return speciesDetailSchema.parse(await api(`/species/${id}${retry ? '?retry=1' : ''}`));
}

export type Photo = { uri: string; organ: PhotoOrgan };

/** Reduce la foto a 1280 px de ancho, JPEG 70 %, y la devuelve en base64 (~200–400 KB por foto). */
async function toBase64(uri: string): Promise<string> {
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

/**
 * Envía las fotos dentro de un JSON normal (en base64). Es más fiable que subir archivos con
 * FormData, que se comporta distinto según la versión de fetch del móvil.
 */
export async function identifyPlant(photos: Photo[]): Promise<IdentifyResponse> {
  const prepared = [];
  for (const p of photos) {
    prepared.push({ base64: await toBase64(p.uri), organ: p.organ });
  }
  const data = await api('/species/identify', { method: 'POST', body: { photos: prepared }, timeoutMs: 60_000 });
  return identifyResponseSchema.parse(data);
}
