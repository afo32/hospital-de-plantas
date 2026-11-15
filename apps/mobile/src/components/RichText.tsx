import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';

/**
 * Pinta el texto de las fichas: párrafos separados por líneas en blanco,
 * viñetas ("- texto") y pasos numerados ("1. texto").
 */
export function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View style={styles.wrap}>
      {lines.map((raw, i) => {
        const line = raw.trim();
        if (!line) return <View key={i} style={styles.gap} />;

        const bullet = /^[-•]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <View key={i} style={styles.item}>
              <Svg width={12} height={12} viewBox="0 0 12 12" style={styles.leaf}>
                <Path d="M1 11C1 5 5 1 11 1c0 6-4 10-10 10z" fill={colors.fern} />
              </Svg>
              <AppText style={styles.flex}>{bullet[1]}</AppText>
            </View>
          );
        }
        const step = /^(\d+)[.)]\s+(.*)$/.exec(line);
        if (step) {
          return (
            <View key={i} style={styles.item}>
              <View style={styles.badge}>
                <AppText variant="label" color={colors.vellum}>
                  {step[1]}
                </AppText>
              </View>
              <AppText style={styles.flex}>{step[2]}</AppText>
            </View>
          );
        }
        return <AppText key={i}>{line}</AppText>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  gap: { height: 4 },
  item: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  leaf: { marginTop: 6 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
