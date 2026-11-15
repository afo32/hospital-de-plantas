import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

/** Campo de formulario con etiqueta y mensaje de error. */
export const TextField = forwardRef<TextInputInstance, Props>(function TextField({ label, error, style, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.barkSoft}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={colors.barkSoft}
        accessibilityLabel={label}
        style={[styles.input, focused && styles.focused, !!error && styles.invalid, style]}
      />
      {error ? (
        <AppText variant="small" color={colors.berry}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    backgroundColor: colors.vellum,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 13,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.bark,
  },
  focused: { borderColor: colors.gold, borderWidth: 1.5 },
  invalid: { borderColor: colors.berry },
});
