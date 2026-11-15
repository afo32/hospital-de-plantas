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

/** Reduce la foto a 1280 px de ancho y JPEG 70 %: sube mucho más rápido y Pl@ntNet no necesita más. */
async function shrink(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1280 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return result.uri;
}

export async function identifyPlant(photos: Photo[]): Promise<IdentifyResponse> {
  const form = new FormData();
  for (const [i, p] of photos.entries()) {
    const uri = await shrink(p.uri);
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      form.append('images', blob, `foto-${i + 1}.jpg`);
    } else {
      // En React Native, FormData acepta { uri, name, type } y sube el archivo directamente.
      form.append('images', { uri, name: `foto-${i + 1}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    }
  }
  form.append('organs', photos.map((p) => p.organ).join(','));
  const data = await api('/species/identify', { method: 'POST', body: form, timeoutMs: 45_000 });
  return identifyResponseSchema.parse(data);
}
