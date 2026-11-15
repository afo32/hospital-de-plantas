import {
  DIFFICULTY_LEVELS,
  labelOf,
  PLANT_CATEGORIES,
  PROFILE_SECTIONS,
  TOXICITY_LEVELS,
  type SpeciesDetail,
} from '@hdp/shared';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Collapsible } from '@/components/Collapsible';
import { EmptyState } from '@/components/EmptyState';
import { SproutIcon } from '@/components/icons';
import { RichText } from '@/components/RichText';
import { VineDivider } from '@/components/VineDivider';
import { getSpeciesDetail } from '@/lib/species';
import { colors, radius, space } from '@/theme/tokens';

const POLL_MS = 3000;
const MAX_WAIT_MS = 4 * 60 * 1000;

const toxColor = (level: string) =>
  level === 'none' ? colors.moss : level === 'mild' ? colors.gold : level === 'unknown' ? colors.barkSoft : colors.berry;

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
          {profile ? <Tag text={`Cuidado ${labelOf(DIFFICULTY_LEVELS, profile.difficulty).toLowerCase()}`} strong /> : null}
        </View>
        <VineDivider />
      </View>

      <Button
        label="Añadir a mi jardín"
        onPress={() => Alert.alert('Muy pronto', 'Añadir plantas a tu jardín llega en la fase 4.')}
      />

      {detail.profileStatus === 'generating' ? (
        <Card style={styles.generating}>
          <ActivityIndicator color={colors.moss} />
          <AppText variant="heading" color={colors.mossDeep} center>
            El herbolario está escribiendo la ficha…
          </AppText>
          <AppText color={colors.barkSoft} center>
            La primera vez que alguien abre una especie se prepara su ficha completa. Tarda alrededor de un minuto y queda
            guardada para siempre.
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

      {profile ? (
        <>
          <AppText color={colors.barkSoft}>{profile.difficultyReason}</AppText>

          <AppText variant="title" color={colors.mossDeep}>
            De un vistazo
          </AppText>
          <View style={styles.grid}>
            <Fact label="Riego" value={profile.quickFacts.watering} wide />
            <Fact label="Tipo de sol" value={profile.quickFacts.sunType} />
            <Fact
              label="Luz (lux)"
              value={`${fmt(profile.quickFacts.lightLux.min)}–${fmt(profile.quickFacts.lightLux.max)}\nideal ${fmt(profile.quickFacts.lightLux.ideal)}`}
            />
            <Fact label="Tipo de planta" value={profile.quickFacts.plantType} />
            <Fact label="Exposición" value={profile.quickFacts.sunExposure} />
            <Fact label="Tamaño adulto" value={profile.quickFacts.matureSize} wide />
            <Fact label="Suelo" value={profile.quickFacts.soilType} />
            <Fact label="pH del suelo" value={profile.quickFacts.soilPh} />
            <Fact label="Floración" value={profile.quickFacts.bloomTime} />
            <Fact label="Colores" value={profile.quickFacts.colors} />
            <Fact label="Rusticidad" value={`${profile.quickFacts.hardinessZones}\nmín. ${profile.quickFacts.minTempC} °C`} />
            <Fact label="Origen" value={profile.quickFacts.nativeArea} />
          </View>

          <AppText variant="title" color={colors.mossDeep}>
            Toxicidad
          </AppText>
          <Card>
            <ToxRow
              who="Personas"
              level={profile.quickFacts.toxicityHumans.level}
              text={profile.quickFacts.toxicityHumans.details}
            />
            {profile.quickFacts.toxicityPets.map((p) => (
              <ToxRow key={p.animal} who={p.animal} level={p.level} text={p.symptoms} />
            ))}
          </Card>

          <AppText variant="title" color={colors.mossDeep}>
            Guía de cultivo
          </AppText>
          {PROFILE_SECTIONS.map(({ key, title: sectionTitle }) => (
            <Collapsible key={key} title={sectionTitle} initiallyOpen={key === 'description'}>
              {key === 'herbalism' ? (
                <View style={styles.warning}>
                  <AppText variant="bodyStrong" color={colors.berry}>
                    ⚠ {profile.herbalism.warning}
                  </AppText>
                  <AppText variant="small" color={colors.barkSoft}>
                    Comestible: {profile.herbalism.edible ? 'sí' : 'no'} · En infusión:{' '}
                    {profile.herbalism.usableForTea ? 'sí' : 'no'}. Consulta a un profesional antes de cualquier uso
                    medicinal, en embarazo o con mascotas.
                  </AppText>
                </View>
              ) : null}
              <RichText text={profile.sections[key].body} />
            </Collapsible>
          ))}

          <AppText variant="small" color={colors.barkSoft} center>
            Ficha elaborada con IA a partir de fuentes botánicas. Revísala con sentido común.
          </AppText>
        </>
      ) : null}
    </ScrollView>
  );
}

function fmt(n: number) {
  return n.toLocaleString('es-ES');
}

function Tag({ text, strong }: { text: string; strong?: boolean }) {
  return (
    <View style={[styles.tag, strong && styles.tagStrong]}>
      <AppText variant="label" color={strong ? colors.vellum : colors.mossDeep}>
        {text}
      </AppText>
    </View>
  );
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.fact, wide && styles.factWide]}>
      <AppText variant="label" color={colors.gold}>
        {label.toUpperCase()}
      </AppText>
      <AppText variant="small">{value}</AppText>
    </View>
  );
}

function ToxRow({ who, level, text }: { who: string; level: string; text: string }) {
  return (
    <View style={styles.toxRow}>
      <View style={styles.toxHead}>
        <AppText variant="bodyStrong">{who}</AppText>
        <View style={[styles.toxBadge, { borderColor: toxColor(level) }]}>
          <AppText variant="label" color={toxColor(level)}>
            {labelOf(TOXICITY_LEVELS, level)}
          </AppText>
        </View>
      </View>
      <AppText variant="small" color={colors.barkSoft}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg, backgroundColor: colors.parchment },
  hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.parchmentDeep },
  heroEmpty: { alignItems: 'center', justifyContent: 'center' },
  credit: { textAlign: 'right', marginTop: 4, fontSize: 11 },
  titleBlock: { gap: 2 },
  tags: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.sm },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.fern,
    backgroundColor: colors.vellum,
  },
  tagStrong: { backgroundColor: colors.moss, borderColor: colors.moss },
  generating: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  fact: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.vellum,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm + 2,
    gap: 4,
  },
  factWide: { flexBasis: '100%' },
  toxRow: { gap: 4, paddingVertical: 6 },
  toxHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  toxBadge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  warning: {
    backgroundColor: '#F6E3DC',
    borderRadius: radius.sm,
    padding: space.sm + 2,
    gap: 4,
    marginBottom: space.sm,
  },
});
