import { ScrollView, StyleSheet } from 'react-native';
import { PlantFinder } from '@/components/PlantFinder';
import { colors, space } from '@/theme/tokens';

/** Pantalla "Añadir planta" que abre el botón +. */
export default function AddPlantScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PlantFinder />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: space.lg, paddingBottom: space.xxl },
});
