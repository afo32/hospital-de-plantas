import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

/** Separador decorativo: una rama fina con hojas, como un margen de manuscrito. */
export function VineDivider({ width = 220 }: { width?: number }) {
  return (
    <Svg width={width} height={22} viewBox="0 0 220 22" accessibilityElementsHidden>
      <Path
        d="M4 12 C40 4, 70 20, 110 11 S180 4, 216 12"
        stroke={colors.gold}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
      {/* Hojas a lo largo de la rama */}
      <Path d="M38 8 c4 -6 12 -6 14 -2 c-4 4 -10 5 -14 2z" fill={colors.fern} />
      <Path d="M72 16 c4 6 12 6 14 2 c-4 -4 -10 -5 -14 -2z" fill={colors.moss} />
      <Path d="M138 6 c4 -6 12 -6 14 -2 c-4 4 -10 5 -14 2z" fill={colors.moss} />
      <Path d="M170 14 c4 6 12 6 14 2 c-4 -4 -10 -5 -14 -2z" fill={colors.fern} />
      <Circle cx={110} cy={11} r={3} fill={colors.gold} />
    </Svg>
  );
}
