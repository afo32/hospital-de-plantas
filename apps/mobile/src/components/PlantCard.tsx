import type { PlantSummary } from '@hdp/shared';
import { Image } from 'expo-image';
import { imageSource } from '@/lib/media';
import { Pressable, StyleSheet, View } from 'react-native';
import { waterLabel } from '@/lib/dates';
import { cardShadow, colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { DropIcon, SproutIcon } from './icons';

/** Tarjeta de "Mis plantas": foto grande, nombre y próximo riego. */
export function PlantCard({ plant, onPress }: { plant: PlantSummary; onPress: () => void }) {
  const late = plant.waterInDays < 0;
  const due = plant.waterInDays <= 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${plant.name}. ${waterLabel(plant.waterInDays)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {plant.imageUrl ? (
        <Image source={imageSource(plant.imageUrl)} style={styles.image} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <SproutIcon color={colors.fern} size={44} />
        </View>
      )}
      <View style={styles.body}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {plant.name}
        </AppText>
        <AppText variant="small" color={colors.barkSoft} numberOfLines={1}>
          {plant.room ?? plant.species.commonName ?? plant.species.scientificName}
        </AppText>
        <View style={[styles.chip, due && { backgroundColor: late ? colors.berry : colors.water }]}>
          <DropIcon color={due ? colors.vellum : colors.water} size={13} />
          <AppText variant="label" color={due ? colors.vellum : colors.water}>
            {waterLabel(plant.waterInDays)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.vellum,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...cardShadow,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.parchmentDeep },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.sm, gap: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.parchmentDeep,
    marginTop: 2,
  },
});
