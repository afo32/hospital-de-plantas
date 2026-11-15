import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { cardShadow, colors } from '@/theme/tokens';

/** Botón flotante "+" con forma de botón de puerta redonda. */
export function Fab({ onPress, label = 'Añadir planta' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Svg width={28} height={28} viewBox="0 0 28 28">
        <Path d="M14 5v18M5 14h18" stroke={colors.vellum} strokeWidth={3} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.moss,
    borderWidth: 3,
    borderColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  pressed: { backgroundColor: colors.mossDeep, transform: [{ scale: 0.95 }] },
});
