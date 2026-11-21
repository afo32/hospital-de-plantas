import { DIFFICULTY_LEVELS, labelOf, PLANT_CATEGORIES, type SpeciesDetail } from '@hdp/shared';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SproutIcon } from '@/components/icons';
import { SpeciesProfileView, Tag } from '@/components/SpeciesProfileView';
import { VineDivider } from '@/components/VineDivider';
import { getSpeciesDetail } from '@/lib/species';
import { colors, radius, space } from '@/theme/tokens';

const POLL_MS = 3000;
const MAX_WAIT_MS = 4 * 60 * 1000;

/** Ficha Info de una especie. Si aún no existe, espera mientras la IA la escribe. */
export default function SpeciesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<SpeciesDetail | null>(null);
  const [error, setError] = useState('');
  const startedAt = useRef(Date.now());

  const load = useCallback(
    async (retry = false) => {
      try {
        setDetail(await getSpeciesDetail(id, retry));
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la ficha');
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Mientras se genera, pregunta cada 3 s (hasta 4 min).
  useEffect(() => {
    if (detail?.profileStatus !== 'generating') return;
    if (Date.now() - startedAt.current > MAX_WAIT_MS) {
      setError('La ficha está tardando más de lo normal. Vuelve en un rato.');
      return;
    }
    const t = setTimeout(() => void load(), POLL_MS);
    return () => clearTimeout(t);
  }, [detail, load]);

  if (!detail) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <AppText color={colors.berry} center>
              {error}
            </AppText>
            <Button label="Reintentar" onPress={() => load()} />
          </>
        ) : (
          <ActivityIndicator color={colors.moss} size="large" />
        )}
      </View>
    );
  }

  const { species, profile } = detail;
  const title = species.commonName ?? species.scientificName;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '' }} />

      {species.imageUrl ? (
        <View>
          <Image source={{ uri: species.imageUrl }} style={styles.hero} contentFit="cover" transition={250} />
          <AppText variant="small" color={colors.barkSoft} style={styles.credit}>
            Foto: Wikipedia / Pl@ntNet
          </AppText>
        </View>
      ) : (
        <View style={[styles.hero, styles.heroEmpty]}>
          <SproutIcon color={colors.fern} size={64} />
        </View>
      )}

      <View style={styles.titleBlock}>
        <AppText variant="hero" color={colors.mossDeep}>
          {title}
        </AppText>
        <AppText variant="quote" color={colors.barkSoft}>
          {species.scientificName}
          {species.family ? ` · ${species.family}` : ''}
        </AppText>
        {species.commonNames.length > 1 ? (
          <AppText variant="small" color={colors.barkSoft}>
            También: {species.commonNames.slice(1).join(', ')}
          </AppText>
        ) : null}
        <View style={styles.tags}>
          {species.category ? <Tag text={labelOf(PLANT_CATEGORIES, species.category)} /> : null}
          {profile ? (
            <Tag text={`Cuidado ${labelOf(DIFFICULTY_LEVELS, profile.difficulty).toLowerCase()}`} strong />
          ) : null}
        </View>
        <VineDivider />
      </View>

      <Button
        label={detail.profileStatus === 'ready' ? 'Añadir a mi jardín' : 'Añadir a mi jardín (esperando la ficha…)'}
        disabled={detail.profileStatus !== 'ready'}
        onPress={() =>
          router.push({ pathname: '/plant-setup/[speciesId]', params: { speciesId: species.id, name: title } })
        }
      />
      <Button
        label="Criarla desde semilla o esqueje"
        variant="outline"
        onPress={() => router.push({ pathname: '/crianza/nueva', params: { speciesId: species.id, name: title } })}
      />

      {detail.profileStatus === 'generating' ? (
        <Card style={styles.generating}>
          <ActivityIndicator color={colors.moss} />
          <AppText variant="heading" color={colors.mossDeep} center>
            El herbolario está escribiendo la ficha…
          </AppText>
          <AppText color={colors.barkSoft} center>
            La primera vez que alguien abre una especie se prepara su ficha completa. Tarda alrededor de un minuto y
            queda guardada para siempre.
          </AppText>
        </Card>
      ) : null}

      {detail.profileStatus === 'failed' || detail.profileStatus === 'unavailable' ? (
        <Card>
          <EmptyState title="Ficha no disponible" message={detail.message ?? 'No se pudo preparar la ficha.'} />
          {detail.profileStatus === 'failed' ? <Button label="Reintentar" onPress={() => load(true)} /> : null}
        </Card>
      ) : null}

      {error ? <AppText color={colors.berry}>{error}</AppText> : null}

      {profile ? <SpeciesProfileView profile={profile} speciesId={species.id} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.parchment,
  },
  hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.parchmentDeep },
  heroEmpty: { alignItems: 'center', justifyContent: 'center' },
  credit: { textAlign: 'right', marginTop: 4, fontSize: 11 },
  titleBlock: { gap: 2 },
  tags: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.sm },
  generating: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
});
