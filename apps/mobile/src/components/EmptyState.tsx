import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Props = { title: string; message: string };

/** Estado vacío con una maceta de barro y un brote. */
export function EmptyState({ title, message }: Props) {
  return (
    <View style={styles.wrap}>
      <Svg width={140} height={130} viewBox="0 0 140 130">
        <Ellipse cx={70} cy={120} rx={52} ry={6} fill={colors.parchmentDeep} />
        {/* Brote */}
        <Path d="M70 70V40" stroke={colors.moss} strokeWidth={3} strokeLinecap="round" />
        <Path d="M70 48c0-14-10-22-26-22 0 14 10 22 26 22z" fill={colors.fern} />
        <Path d="M70 56c0-12 8-20 24-20 0 12-8 20-24 20z" fill={colors.moss} />
        {/* Maceta de terracota */}
        <Path d="M38 70h64l-8 48H46z" fill={colors.ember} />
        <Path d="M34 64h72v10H34z" fill="#B5652A" />
        <Path d="M50 92c10 4 30 4 40 0" stroke={colors.goldSoft} strokeWidth={2} fill="none" />
      </Svg>
      <AppText variant="heading" color={colors.mossDeep} center>
        {title}
      </AppText>
      <AppText color={colors.barkSoft} center>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.md },
});
