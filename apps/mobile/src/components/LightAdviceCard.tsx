import {
  LIGHT_ARTIFICIAL,
  LIGHT_DISTANCES,
  LIGHT_FILTERS,
  LIGHT_WINDOWS,
  lightAdvice,
  type LightAdvice,
  type LightAdviceInput,
  type LightArtificial,
  type LightDistance,
  type LightFilter,
  type LightSetup,
  type LightWindow,
} from '@hdp/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { ChipGroup } from './ChipGroup';

type Props = Omit<LightAdviceInput, 'setup'> & { onAdvice?: (a: LightAdvice) => void };

/** "¿Dónde está la planta?" y consejos concretos para ponerle la luz que necesita. */
export function LightAdviceCard(props: Props) {
  const [win, setWin] = useState<LightWindow | null>(null);
  const [distance, setDistance] = useState<LightDistance | null>(null);
  const [filters, setFilters] = useState<LightFilter[]>([]);
  const [artificial, setArtificial] = useState<LightArtificial>('none');
  const [advice, setAdvice] = useState<LightAdvice | null>(null);

  const ready = win !== null && (win === 'none' || distance !== null);
  const show = () => {
    const setup: LightSetup = { window: win!, distance: distance ?? 'far', filters, artificial };
    const a = lightAdvice({ ...props, setup });
    setAdvice(a);
    props.onAdvice?.(a);
  };

  const color = advice?.status === 'low' ? colors.berry : advice?.status === 'high' ? colors.ember : colors.moss;

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <AppText variant="heading" color={colors.mossDeep}>
          Cuéntame dónde está
        </AppText>
        <AppText variant="label" color={colors.gold}>
          ¿HACIA DÓNDE MIRA LA VENTANA MÁS CERCANA?
        </AppText>
        <AppText variant="small" color={colors.barkSoft}>
          Es hacia donde miras al asomarte. La brújula del móvil te lo dice.
        </AppText>
        <ChipGroup options={LIGHT_WINDOWS} value={win} onChange={setWin} />
        {win !== 'none' ? (
          <>
            <AppText variant="label" color={colors.gold}>
              ¿A QUÉ DISTANCIA DE LA VENTANA?
            </AppText>
            <ChipGroup options={LIGHT_DISTANCES} value={distance} onChange={setDistance} />
            <AppText variant="label" color={colors.gold}>
              ¿HAY ALGO QUE TAPE LA LUZ? (PUEDES MARCAR VARIAS)
            </AppText>
            <ChipGroup
              options={LIGHT_FILTERS}
              value={filters}
              onChange={(f) => setFilters((all) => (all.includes(f) ? all.filter((x) => x !== f) : [...all, f]))}
            />
          </>
        ) : null}
        <AppText variant="label" color={colors.gold}>
          ¿TIENE LUZ ARTIFICIAL CERCA?
        </AppText>
        <ChipGroup options={LIGHT_ARTIFICIAL} value={artificial} onChange={setArtificial} />
        <Button label="Ver recomendaciones" onPress={show} disabled={!ready} />
      </Card>

      {advice ? (
        <Card style={styles.card}>
          <AppText variant="bodyStrong" color={color}>
            {advice.summary}
          </AppText>
          {advice.actions.map((a, i) => (
            <View key={a.title} style={styles.action}>
              <View style={styles.num}>
                <AppText variant="label" color={colors.vellum}>
                  {i + 1}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{a.title}</AppText>
                <AppText variant="small" color={colors.barkSoft}>
                  {a.detail}
                </AppText>
              </View>
            </View>
          ))}
          <AppText variant="label" color={colors.gold}>
            SU SITIO IDEAL
          </AppText>
          <AppText>{advice.idealPlace}</AppText>
          <AppText variant="small" color={colors.barkSoft}>
            {advice.signs}
          </AppText>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  card: { gap: space.sm },
  action: { flexDirection: 'row', gap: space.md, paddingTop: space.xs },
  num: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  flex: { flex: 1, gap: 2 },
});
