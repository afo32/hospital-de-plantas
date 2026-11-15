import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Tone = 'info' | 'warning' | 'success';

const TONES: Record<Tone, { bg: string; border: string; text: string }> = {
  info: { bg: colors.vellum, border: colors.gold, text: colors.bark },
  warning: { bg: '#F6E3DC', border: colors.berry, text: colors.berry },
  success: { bg: '#EEF2E4', border: colors.fern, text: colors.mossDeep },
};

/** Aviso destacado (sin conexión, alerta de helada, configurar ubicación…). */
export function Banner({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const t = TONES[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderColor: t.border }]}>
      {title ? (
        <AppText variant="bodyStrong" color={t.text}>
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, borderWidth: 1, borderLeftWidth: 4, padding: space.md, gap: space.sm },
});
