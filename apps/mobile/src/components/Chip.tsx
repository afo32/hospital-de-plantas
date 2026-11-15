import { StyleSheet, View } from 'react-native';
import { type Diagnosis, SEVERITY_LABELS, type Severity } from '@hdp/shared';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Tone = 'moss' | 'gold' | 'berry' | 'water' | 'muted';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  moss: { bg: '#E3EBD5', fg: colors.mossDeep },
  gold: { bg: '#F3E6C7', fg: '#7A5A1F' },
  berry: { bg: '#F6E3DC', fg: colors.berry },
  water: { bg: '#DDE9EC', fg: colors.water },
  muted: { bg: colors.parchmentDeep, fg: colors.barkSoft },
};

/** Etiqueta pequeña de color. */
export function Chip({ label, tone = 'muted' }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <AppText variant="label" color={t.fg}>
        {label}
      </AppText>
    </View>
  );
}

const SEVERITY_TONE: Record<Severity, Tone> = { none: 'moss', mild: 'gold', moderate: 'gold', severe: 'berry' };

export function SeverityChip({ severity }: { severity: Severity }) {
  return <Chip label={SEVERITY_LABELS[severity]} tone={SEVERITY_TONE[severity]} />;
}

export function DiagnosisStatusChip({ d }: { d: Diagnosis }) {
  if (d.status === 'questions') return <Chip label="Faltan tus respuestas" tone="water" />;
  if (d.status === 'resolved') return <Chip label="Curada" tone="moss" />;
  if (d.result?.severity === 'none') return <Chip label="Sana" tone="moss" />;
  return <Chip label="En tratamiento" tone="gold" />;
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill },
});
