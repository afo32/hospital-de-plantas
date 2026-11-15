import type { PlantCategory, SpeciesSummary } from '@hdp/shared';
import { labelOf, PLANT_CATEGORIES } from '@hdp/shared';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { searchSpecies } from '@/lib/species';
import { useOpenSpecies } from '@/lib/useOpenSpecies';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { CategoryGrid } from './CategoryGrid';
import { SearchField } from './SearchField';
import { SpeciesCard } from './SpeciesCard';

/**
 * Buscador compartido por "Añadir planta" y "Buscar":
 * categorías, búsqueda por nombre y acceso a identificar con fotos.
 */
export function PlantFinder() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PlantCategory | null>(null);
  const [results, setResults] = useState<SpeciesSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { open, opening } = useOpenSpecies();
  const requestId = useRef(0);

  // Busca 400 ms después de dejar de escribir; ignora respuestas de búsquedas antiguas.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2 && !category) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(
      async () => {
        try {
          const list = await searchSpecies({ q: text.length >= 2 ? text : undefined, category: category ?? undefined });
          if (id === requestId.current) {
            setResults(list);
            setError('');
          }
        } catch (err) {
          if (id === requestId.current) setError(err instanceof Error ? err.message : 'Error al buscar');
        } finally {
          if (id === requestId.current) setLoading(false);
        }
      },
      text.length >= 2 ? 400 : 0,
    );
    return () => clearTimeout(timer);
  }, [query, category]);

  const textSearch = query.trim().length >= 2;
  const searching = textSearch || !!category;

  // Al escribir se busca en todas las familias; al elegir familia se borra el texto.
  const onChangeText = (text: string) => {
    setQuery(text);
    if (category) setCategory(null);
  };
  const onSelectCategory = (c: PlantCategory) => {
    setQuery('');
    setCategory(c === category ? null : c);
  };

  return (
    <View style={styles.wrap}>
      <SearchField value={query} onChangeText={onChangeText} />

      <Pressable
        onPress={() => router.push('/identify')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.identify, pressed && styles.identifyPressed]}
      >
        <AppText variant="bodyStrong" color={colors.vellum}>
          Identificar con fotos
        </AppText>
        <AppText variant="small" color={colors.parchmentDeep}>
          Haz 3 fotos: planta entera, hoja de cerca y flor o tallo
        </AppText>
      </Pressable>

      {!textSearch ? (
        <>
          <AppText variant="heading" color={colors.mossDeep}>
            Por familia
          </AppText>
          <CategoryGrid selected={category} onSelect={onSelectCategory} />
        </>
      ) : null}

      {searching ? (
        <View style={styles.results}>
          <View style={styles.resultsHeader}>
            <AppText variant="heading" color={colors.mossDeep}>
              {category && !textSearch ? labelOf(PLANT_CATEGORIES, category) : 'Resultados'}
            </AppText>
            {loading ? <ActivityIndicator color={colors.moss} /> : null}
          </View>

          {error ? <AppText color={colors.berry}>{error}</AppText> : null}

          {!loading && !error && results.length === 0 ? (
            <AppText color={colors.barkSoft}>
              No encontramos esa planta. Prueba con el nombre científico o identifícala con fotos.
            </AppText>
          ) : null}

          {results.map((s) => (
            <SpeciesCard
              key={s.scientificName}
              species={s}
              loading={opening === s.scientificName}
              onPress={() => open(s)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  identify: {
    backgroundColor: colors.moss,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
    borderWidth: 2,
    borderColor: colors.goldSoft,
  },
  identifyPressed: { backgroundColor: colors.mossDeep },
  results: { gap: space.sm },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
