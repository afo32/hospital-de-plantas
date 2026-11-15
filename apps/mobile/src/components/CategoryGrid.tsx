import { PLANT_CATEGORIES, type PlantCategory } from '@hdp/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Props = {
  selected?: PlantCategory | null;
  onSelect: (category: PlantCategory) => void;
};

/** Botones de categoría: helechos, cactáceas, suculentas… */
export function CategoryGrid({ selected, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {PLANT_CATEGORIES.map((cat) => {
        const active = selected === cat.value;
        return (
          <Pressable
            key={cat.value}
            onPress={() => onSelect(cat.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.chip, active && styles.active, pressed && styles.pressed]}
          >
            <AppText variant="label" color={active ? colors.vellum : colors.bark}>
              {cat.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.vellum,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: { backgroundColor: colors.moss, borderColor: colors.moss },
  pressed: { backgroundColor: colors.parchmentDeep },
});
