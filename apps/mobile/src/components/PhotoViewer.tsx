import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { imageSource } from '@/lib/media';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Props = {
  photos: string[];
  /** Índice de la foto abierta; null = cerrado */
  index: number | null;
  onClose: () => void;
};

/** Ver fotos a pantalla completa, con flechas si hay varias. */
export function PhotoViewer({ photos, index, onClose }: Props) {
  const [current, setCurrent] = useState(index ?? 0);
  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);
  const url = photos[current];
  const many = photos.length > 1;

  return (
    <Modal visible={index !== null} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.top}>
          <AppText variant="label" color={colors.vellum}>
            {many ? `${current + 1} de ${photos.length}` : ''}
          </AppText>
          <Pressable onPress={onClose} accessibilityLabel="Cerrar foto" hitSlop={12}>
            <AppText variant="heading" color={colors.vellum}>
              ✕
            </AppText>
          </Pressable>
        </View>
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Cerrar foto">
          {url ? <Image source={imageSource(url)} style={styles.flex} contentFit="contain" /> : null}
        </Pressable>
        {many ? (
          <View style={styles.nav}>
            <Pressable
              onPress={() => setCurrent((c) => (c - 1 + photos.length) % photos.length)}
              style={styles.arrow}
              accessibilityLabel="Foto anterior"
            >
              <AppText variant="title" color={colors.vellum}>
                ‹
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setCurrent((c) => (c + 1) % photos.length)}
              style={styles.arrow}
              accessibilityLabel="Foto siguiente"
            >
              <AppText variant="title" color={colors.vellum}>
                ›
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.94)' },
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space.md },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.lg },
  arrow: { paddingHorizontal: space.lg, paddingVertical: space.sm },
});
