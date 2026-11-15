import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Props = { title: string; children: ReactNode; initiallyOpen?: boolean };

/** Sección desplegable de la ficha. */
export function Collapsible({ title, children, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <AppText variant="heading" color={colors.mossDeep} style={styles.title}>
          {title}
        </AppText>
        <Svg width={18} height={18} viewBox="0 0 18 18" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Path d="M4 7l5 5 5-5" stroke={colors.gold} strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.vellum,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 14,
    gap: space.sm,
  },
  pressed: { backgroundColor: colors.parchmentDeep },
  title: { flex: 1, fontSize: 20 },
  body: { paddingHorizontal: space.md, paddingBottom: space.md },
});
