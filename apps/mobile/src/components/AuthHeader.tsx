import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { VineDivider } from './VineDivider';

/** Cabecera de las pantallas de acceso: una puerta redonda en una colina con hiedra. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.wrap}>
      <Svg width={180} height={130} viewBox="0 0 180 130" accessibilityElementsHidden>
        {/* Colina */}
        <Path d="M0 124 C30 60, 150 60, 180 124 Z" fill={colors.fern} opacity={0.55} />
        <Path d="M10 126 C40 74, 140 74, 170 126 Z" fill={colors.moss} opacity={0.35} />
        {/* Marco de la puerta */}
        <Circle cx={90} cy={92} r={34} fill={colors.ember} />
        <Circle cx={90} cy={92} r={29} fill="#2F6B4F" />
        {/* Tablones */}
        <Path d="M80 64v56M90 63v58M100 64v56" stroke="#24543E" strokeWidth={2} />
        {/* Pomo */}
        <Circle cx={90} cy={92} r={3.5} fill={colors.goldSoft} />
        {/* Suelo */}
        <Rect x={0} y={122} width={180} height={8} fill={colors.parchmentDeep} />
        {/* Hiedra */}
        <Path d="M54 74c6-4 10-2 12 2M126 74c-6-4-10-2-12 2" stroke={colors.mossDeep} strokeWidth={2} fill="none" />
        <Path d="M50 70c3-5 9-5 10-1-3 3-7 4-10 1zM130 70c-3-5-9-5-10-1 3 3 7 4 10 1z" fill={colors.mossDeep} />
        {/* Florecillas */}
        <Circle cx={36} cy={112} r={3} fill={colors.goldSoft} />
        <Circle cx={148} cy={110} r={3} fill={colors.goldSoft} />
        <Circle cx={160} cy={116} r={2.5} fill="#E8B4A0" />
      </Svg>
      <AppText variant="hero" color={colors.mossDeep} center>
        {title}
      </AppText>
      <AppText variant="quote" color={colors.barkSoft} center>
        {subtitle}
      </AppText>
      <VineDivider />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.xs, marginBottom: space.md },
});
