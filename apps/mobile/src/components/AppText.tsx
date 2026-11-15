import { Text, type TextProps } from 'react-native';
import { colors, typeScale, type TextVariant } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
};

/** Texto de la app con las tipografías del tema. */
export function AppText({ variant = 'body', color = colors.bark, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[typeScale[variant], { color }, center && { textAlign: 'center' }, style]}
    />
  );
}
