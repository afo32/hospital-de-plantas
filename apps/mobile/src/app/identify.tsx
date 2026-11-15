import { PHOTO_ORGANS, type IdentifyResponse, type PhotoOrgan } from '@hdp/shared';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SpeciesCard } from '@/components/SpeciesCard';
import { identifyPlant, type Photo } from '@/lib/species';
import { useOpenSpecies } from '@/lib/useOpenSpecies';
import { colors, radius, space } from '@/theme/tokens';

const MAX_PHOTOS = 5;
const TIPS = [
  'Una foto de la planta entera, con fondo despejado.',
  'Una hoja de cerca, bien enfocada (haz o envés).',
  'La flor, el fruto o el tallo si los tiene.',
];
/** Órgano sugerido para cada foto según su orden. */
const SUGGESTED: PhotoOrgan[] = ['auto', 'leaf', 'flower', 'fruit', 'bark'];

export default function IdentifyScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState('');
  const { open, opening } = useOpenSpecies();

  const addFrom = async (source: 'camera' | 'library') => {
    if (photos.length >= MAX_PHOTOS) return;
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Activa el permiso en los ajustes del móvil para añadir fotos.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: source === 'library',
      selectionLimit: MAX_PHOTOS - photos.length,
    };
    const res =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled) return;
    setResult(null);
    setPhotos((prev) =>
      [...prev, ...res.assets.map((a, i) => ({ uri: a.uri, organ: SUGGESTED[prev.length + i] ?? 'auto' }))].slice(
        0,
        MAX_PHOTOS,
      ),
    );
  };

  const setOrgan = (index: number, organ: PhotoOrgan) =>
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, organ } : p)));

  const remove = (index: number) => {
    setResult(null);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const identify = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await identifyPlant(photos));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo identificar la planta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          Para acertar a la primera
        </AppText>
        {TIPS.map((tip, i) => (
          <View key={tip} style={styles.tip}>
            <View style={styles.badge}>
              <AppText variant="label" color={colors.vellum}>
                {i + 1}
              </AppText>
            </View>
            <AppText style={styles.flex}>{tip}</AppText>
          </View>
        ))}
        <AppText variant="small" color={colors.barkSoft}>
          Hasta {MAX_PHOTOS} fotos de la misma planta. Indica qué se ve en cada una.
        </AppText>
      </Card>

      {photos.map((p, i) => (
        <Card key={p.uri} style={styles.photoCard}>
          <View style={styles.photoRow}>
            <Image source={{ uri: p.uri }} style={styles.photo} contentFit="cover" />
            <View style={styles.flex}>
              <AppText variant="label" color={colors.barkSoft}>
                FOTO {i + 1}: ¿QUÉ SE VE?
              </AppText>
              <View style={styles.organs}>
                {PHOTO_ORGANS.map((o) => {
                  const active = o.value === p.organ;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setOrgan(i, o.value)}
                      style={[styles.organ, active && styles.organActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <AppText variant="label" color={active ? colors.vellum : colors.bark}>
                        {o.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable onPress={() => remove(i)} accessibilityLabel={`Quitar foto ${i + 1}`} hitSlop={10}>
              <Svg width={22} height={22} viewBox="0 0 22 22">
                <Path d="M6 6l10 10M16 6L6 16" stroke={colors.berry} strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        </Card>
      ))}

      {photos.length < MAX_PHOTOS ? (
        <View style={styles.addRow}>
          <View style={styles.flex}>
            <Button label="Hacer foto" variant="outline" onPress={() => addFrom('camera')} />
          </View>
          <View style={styles.flex}>
            <Button label="Galería" variant="outline" onPress={() => addFrom('library')} />
          </View>
        </View>
      ) : null}

      <Button
        label={photos.length ? `Identificar (${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'})` : 'Añade al menos una foto'}
        onPress={identify}
        loading={loading}
        disabled={photos.length === 0}
      />

      {error ? (
        <AppText color={colors.berry} center>
          {error}
        </AppText>
      ) : null}

      {result ? (
        <View style={styles.results}>
          <AppText variant="title" color={colors.mossDeep}>
            {result.candidates.length ? '¿Es alguna de estas?' : 'No la reconocemos'}
          </AppText>
          {result.candidates.length === 0 ? (
            <AppText color={colors.barkSoft}>
              Prueba con fotos más nítidas: una hoja sola sobre fondo liso suele funcionar muy bien.
            </AppText>
          ) : null}
          {result.candidates.map((c) => (
            <SpeciesCard
              key={c.scientificName}
              species={c}
              score={c.score}
              loading={opening === c.scientificName}
              onPress={() => open(c)}
            />
          ))}
          <AppText variant="small" color={colors.barkSoft} center>
            Identificación: Pl@ntNet · Te quedan {result.remainingToday} identificaciones hoy
          </AppText>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  flex: { flex: 1 },
  tip: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  photoCard: { padding: space.sm },
  photoRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  photo: { width: 84, height: 84, borderRadius: radius.sm },
  organs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  organ: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.vellum,
  },
  organActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  addRow: { flexDirection: 'row', gap: space.sm },
  results: { gap: space.sm },
});
