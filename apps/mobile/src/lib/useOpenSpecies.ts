import type { SpeciesSummary } from '@hdp/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { resolveSpecies } from './species';

/** Abre la ficha de una especie de una lista (guardándola antes si es un resultado externo). */
export function useOpenSpecies() {
  const [opening, setOpening] = useState<string | null>(null);

  const open = async (s: SpeciesSummary) => {
    if (opening) return;
    setOpening(s.scientificName);
    try {
      const id = await resolveSpecies(s);
      router.push({ pathname: '/species/[id]', params: { id } });
    } catch (err) {
      Alert.alert('No se pudo abrir la ficha', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setOpening(null);
    }
  };

  return { open, opening };
}
