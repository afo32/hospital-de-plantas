import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled }: Props) {
  const isDisabled = disabled || loading;
  const textColor = variant === 'primary' ? colors.vellum : variant === 'danger' ? colors.berry : colors.moss;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles[`${variant}Pressed`],
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText variant="bodyStrong" color={textColor}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  primary: { backgroundColor: colors.moss, borderWidth: 2, borderColor: colors.goldSoft },
  primaryPressed: { backgroundColor: colors.mossDeep },
  outline: { backgroundColor: colors.vellum, borderWidth: 1.5, borderColor: colors.gold },
  outlinePressed: { backgroundColor: colors.parchmentDeep },
  ghost: { backgroundColor: 'transparent' },
  ghostPressed: { backgroundColor: colors.parchmentDeep },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.berry },
  dangerPressed: { backgroundColor: colors.parchmentDeep },
  disabled: { opacity: 0.6 },
});
