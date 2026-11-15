import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Props = {
  /** URIs locales (al crear) o URLs del API */
  photos: string[];
  size?: number;
  onPress?: (index: number) => void;
  onRemove?: (index: number) => void;
};

/** Fila de miniaturas, con botón de quitar opcional. */
export function PhotoStrip({ photos, size = 84, onPress, onRemove }: Props) {
  return (
    <View style={styles.row}>
      {photos.map((p, i) => (
        <View key={`${p}-${i}`}>
          <Pressable onPress={onPress ? () => onPress(i) : undefined} accessibilityLabel={`Foto ${i + 1}`}>
            <Image
              source={p.startsWith('/files/') || p.startsWith('http') ? imageSource(p) : { uri: p }}
              style={[styles.thumb, { width: size, height: size }]}
              contentFit="cover"
              transition={150}
            />
          </Pressable>
          {onRemove ? (
            <Pressable
              onPress={() => onRemove(i)}
              style={styles.remove}
              hitSlop={8}
              accessibilityLabel={`Quitar foto ${i + 1}`}
            >
              <AppText variant="label" color={colors.vellum}>
                ✕
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumb: { borderRadius: radius.sm, backgroundColor: colors.parchmentDeep, borderWidth: 1, borderColor: colors.border },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.berry,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
