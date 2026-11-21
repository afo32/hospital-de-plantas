import { labelOf, PROFILE_SECTIONS, TOXICITY_LEVELS, type SpeciesDetail } from '@hdp/shared';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Card } from './Card';
import { Collapsible } from './Collapsible';
import { RichText } from './RichText';
import { ReportLink } from './ReportSheet';

type Profile = NonNullable<SpeciesDetail['profile']>;

const toxColor = (level: string) =>
  level === 'none'
    ? colors.moss
    : level === 'mild'
      ? colors.gold
      : level === 'unknown'
        ? colors.barkSoft
        : colors.berry;

/** Contenido de la ficha Info: datos rápidos, toxicidad y guía de cultivo. */
export function SpeciesProfileView({ profile, speciesId }: { profile: Profile; speciesId?: string | null }) {
  return (
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
        <Fact
          label="Rusticidad"
          value={`${profile.quickFacts.hardinessZones}\nmín. ${profile.quickFacts.minTempC} °C`}
        />
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
      {speciesId ? <ReportLink target={{ targetType: 'profile', targetId: speciesId }} label="Informar de un error en esta ficha" /> : null}
    </>
  );
}

function fmt(n: number) {
  return n.toLocaleString('es-ES');
}

export function Tag({ text, strong }: { text: string; strong?: boolean }) {
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
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.fern,
    backgroundColor: colors.vellum,
  },
  tagStrong: { backgroundColor: colors.moss, borderColor: colors.moss },
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
