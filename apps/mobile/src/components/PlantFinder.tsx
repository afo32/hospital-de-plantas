import type { PlantCategory } from '@hdp/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Card } from './Card';
import { CategoryGrid } from './CategoryGrid';
import { SearchField } from './SearchField';

/**
 * Buscador compartido por "Añadir planta" y "Buscar":
 * categorías arriba, buscador por nombre y botón para identificar con fotos.
 * Los resultados reales llegan en la fase 3.
 */
export function PlantFinder() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PlantCategory | null>(null);

  return (
    <View style={styles.wrap}>
      <AppText variant="heading" color={colors.mossDeep}>
        Por familia
      </AppText>
      <CategoryGrid selected={category} onSelect={(c) => setCategory(c === category ? null : c)} />

      <AppText variant="heading" color={colors.mossDeep}>
        Por nombre
      </AppText>
      <SearchField value={query} onChangeText={setQuery} />

      <Pressable
        accessibilityRole="button"
        disabled
        style={styles.identify}
        accessibilityHint="Disponible en la fase 3"
      >
        <AppText variant="bodyStrong" color={colors.vellum}>
          Identificar con fotos
        </AppText>
        <AppText variant="small" color={colors.parchmentDeep}>
          Haz 3 fotos: planta entera, hoja de cerca y flor o tallo
        </AppText>
      </Pressable>

      {query.length > 0 || category ? (
        <Card>
          <AppText color={colors.barkSoft}>
            La búsqueda se conecta en la fase 3. De momento puedes probar las categorías y el campo de texto.
          </AppText>
        </Card>
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
    opacity: 0.6,
    borderWidth: 2,
    borderColor: colors.goldSoft,
  },
});
