import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  /** Un valor (selección única) o varios (selección múltiple) */
  value: T | T[] | null;
  onChange: (value: T) => void;
};

/** Opciones cortas en forma de etiquetas, en varias filas. */
export function ChipGroup<T extends string>({ options, value, onChange }: Props<T>) {
  const multi = Array.isArray(value);
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const selected = multi ? value.includes(o.value) : value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={multi ? { checked: selected } : { selected }}
            style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
          >
            <AppText variant="label" color={selected ? colors.vellum : colors.bark}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.vellum,
  },
  selected: { backgroundColor: colors.moss, borderColor: colors.moss },
  pressed: { opacity: 0.8 },
});
