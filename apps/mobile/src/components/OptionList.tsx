import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { CheckIcon } from './icons';

type Option<T extends string> = { value: T; label: string; hint?: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  /** Un valor (selección única) o varios (selección múltiple) */
  value: T | T[] | null;
  onChange: (value: T) => void;
};

/** Lista de opciones grandes y fáciles de tocar, para el cuestionario. */
export function OptionList<T extends string>({ options, value, onChange }: Props<T>) {
  const multi = Array.isArray(value);
  return (
    <View style={styles.wrap} accessibilityRole={multi ? undefined : 'radiogroup'}>
      {options.map((o) => {
        const selected = multi ? value.includes(o.value) : value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={multi ? { checked: selected } : { selected }}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
          >
            <View style={styles.text}>
              <AppText variant="bodyStrong" color={selected ? colors.mossDeep : colors.bark}>
                {o.label}
              </AppText>
              {o.hint ? (
                <AppText variant="small" color={colors.barkSoft}>
                  {o.hint}
                </AppText>
              ) : null}
            </View>
            <View style={[multi ? styles.box : styles.radio, selected && styles.markOn]}>
              {selected ? <CheckIcon color={colors.vellum} size={14} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.vellum,
  },
  selected: { borderColor: colors.moss, backgroundColor: '#EEF2E4' },
  pressed: { backgroundColor: colors.parchmentDeep },
  text: { flex: 1, gap: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { backgroundColor: colors.moss, borderColor: colors.moss },
});
