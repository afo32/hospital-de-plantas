import type { SpeciesSummary } from '@hdp/shared';
import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Card } from './Card';
import { SproutIcon } from './icons';

type Props = {
  species: SpeciesSummary;
  /** Probabilidad 0–1 (resultados de identificación) */
  score?: number;
  loading?: boolean;
  onPress: () => void;
};

/** Fila de resultado: foto, nombre común, nombre científico y familia. */
export function SpeciesCard({ species, score, loading, onPress }: Props) {
  const title = species.commonName ?? species.scientificName;
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`${title}, ${species.scientificName}`}>
      <View style={styles.row}>
        {species.imageUrl ? (
          <Image source={{ uri: species.imageUrl }} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <SproutIcon color={colors.fern} size={30} />
          </View>
        )}
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {title}
          </AppText>
          {species.commonName ? (
            <AppText variant="quote" color={colors.barkSoft} numberOfLines={1}>
              {species.scientificName}
            </AppText>
          ) : null}
          {species.family ? (
            <AppText variant="small" color={colors.barkSoft} numberOfLines={1}>
              {species.family}
            </AppText>
          ) : null}
          {score !== undefined ? <ScoreBar score={score} /> : null}
        </View>
        {loading ? <ActivityIndicator color={colors.moss} /> : null}
      </View>
    </Card>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 50 ? colors.moss : pct >= 20 ? colors.gold : colors.barkSoft;
  return (
    <View style={styles.scoreRow}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(pct, 3)}%`, backgroundColor: color }]} />
      </View>
      <AppText variant="label" color={color}>
        {pct} %
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  image: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.parchmentDeep },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.parchmentDeep, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
