import type { LightLevel, PlantDetail, SpeciesDetail } from '@hdp/shared';
import { LightSensor } from 'expo-sensors';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SunIcon } from '@/components/icons';
import { getPlant, updatePlant } from '@/lib/garden';
import { getSpeciesDetail } from '@/lib/species';
import { colors, radius, space } from '@/theme/tokens';

/** Zonas de luz (lux) y su equivalencia con las opciones del cuestionario. */
const ZONES: { max: number; level: LightLevel; label: string; color: string }[] = [
  { max: 1_000, level: 'low', label: 'Poca luz', color: '#8C7A63' },
  { max: 10_000, level: 'bright_indirect', label: 'Luz indirecta', color: '#8BA66A' },
  { max: 20_000, level: 'partial_sun', label: 'Luz brillante / sol parcial', color: '#B8893B' },
  { max: Infinity, level: 'full_sun', label: 'Sol directo', color: '#C9772E' },
];
const SCALE_MAX = 30_000;
const zoneOf = (lux: number) => ZONES.find((z) => lux < z.max) ?? ZONES[ZONES.length - 1]!;

/** Luxómetro con el sensor de luz del móvil (Android). Compara con lo que necesita la planta. */
export default function LightMeterScreen() {
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [lux, setLux] = useState<number | null>(null);
  const [plant, setPlant] = useState<PlantDetail | null>(null);
  const [range, setRange] = useState<{ min: number; ideal: number; max: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const samples = useRef<number[]>([]);

  useEffect(() => {
    if (!plantId) return;
    getPlant(plantId)
      .then(async ({ data }) => {
        setPlant(data);
        if (data.plant.species.id) {
          const s: SpeciesDetail = await getSpeciesDetail(data.plant.species.id);
          if (s.profile) setRange(s.profile.quickFacts.lightLux);
        }
      })
      .catch(() => undefined);
  }, [plantId]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    (async () => {
      const ok = Platform.OS === 'android' && (await LightSensor.isAvailableAsync().catch(() => false));
      setAvailable(ok);
      if (!ok) return;
      LightSensor.setUpdateInterval(400);
      sub = LightSensor.addListener(({ illuminance }) => {
        // Media de las últimas 5 lecturas para que el número no baile.
        samples.current = [...samples.current.slice(-4), illuminance];
        setLux(Math.round(samples.current.reduce((a, b) => a + b, 0) / samples.current.length));
      });
    })();
    return () => sub?.remove();
  }, []);

  const zone = lux != null ? zoneOf(lux) : null;
  const verdict =
    lux == null || !range
      ? null
      : lux < range.min
        ? {
            text: `Le falta luz: necesita al menos ${range.min.toLocaleString('es-ES')} lux. Acércala a la ventana.`,
            color: colors.berry,
          }
        : lux > range.max
          ? {
              text: `Demasiada luz: por encima de ${range.max.toLocaleString('es-ES')} lux puede quemarse. Busca luz filtrada.`,
              color: colors.ember,
            }
          : {
              text: `Buen sitio: está dentro de su rango (${range.min.toLocaleString('es-ES')}–${range.max.toLocaleString('es-ES')} lux).`,
              color: colors.moss,
            };

  const save = async () => {
    if (!plantId || lux == null || !zone) return;
    setSaving(true);
    try {
      await updatePlant(plantId, { lightLux: lux, lightLevel: zone.level });
      router.back();
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          Cómo medir
        </AppText>
        <AppText>
          Pon el móvil donde está la planta, con la pantalla hacia la ventana (la cámara frontal mira a la luz). Espera
          unos segundos a que el número se estabilice. Mide a la hora de más luz del día.
        </AppText>
      </Card>

      {available === null ? <ActivityIndicator color={colors.moss} /> : null}

      {available === false ? (
        <Card>
          <AppText variant="heading" color={colors.mossDeep}>
            Este móvil no tiene sensor de luz accesible
          </AppText>
          <AppText>
            {Platform.OS === 'ios'
              ? 'El iPhone no permite a las apps leer su sensor de luz.'
              : 'No encontramos el sensor de luz.'}{' '}
            Guíate por esto:
          </AppText>
          <AppText>
            {
              '· Poca luz: lejos de ventanas, puedes leer pero cuesta.\n· Indirecta: cerca de una ventana sin sol directo; ves el cielo.\n· Brillante: junto a la ventana, sol suave unas horas.\n· Sol directo: el sol da en la planta más de 4 horas.'
            }
          </AppText>
        </Card>
      ) : null}

      {available && lux != null && zone ? (
        <Card style={styles.meter}>
          <SunIcon color={zone.color} size={40} />
          <AppText variant="hero" color={colors.mossDeep}>
            {lux.toLocaleString('es-ES')} lux
          </AppText>
          <AppText variant="heading" color={zone.color}>
            {zone.label}
          </AppText>

          <View style={styles.scale}>
            {ZONES.map((z, i) => {
              const from = i === 0 ? 0 : ZONES[i - 1]!.max;
              const to = Math.min(z.max, SCALE_MAX);
              return <View key={z.level} style={{ flex: to - from, backgroundColor: z.color, opacity: 0.35 }} />;
            })}
            {range ? (
              <View
                style={[
                  styles.range,
                  {
                    left: `${(Math.min(range.min, SCALE_MAX) / SCALE_MAX) * 100}%`,
                    width: `${((Math.min(range.max, SCALE_MAX) - Math.min(range.min, SCALE_MAX)) / SCALE_MAX) * 100}%`,
                  },
                ]}
              />
            ) : null}
            <View style={[styles.needle, { left: `${(Math.min(lux, SCALE_MAX) / SCALE_MAX) * 100}%` }]} />
          </View>
          <View style={styles.scaleLabels}>
            <AppText variant="small" color={colors.barkSoft}>
              0
            </AppText>
            <AppText variant="small" color={colors.barkSoft}>
              10.000
            </AppText>
            <AppText variant="small" color={colors.barkSoft}>
              20.000
            </AppText>
            <AppText variant="small" color={colors.barkSoft}>
              30.000+
            </AppText>
          </View>

          {range ? (
            <AppText variant="small" color={colors.barkSoft} center>
              Franja verde: lo que necesita {plant?.plant.name ?? 'la planta'}
            </AppText>
          ) : null}
          {verdict ? (
            <AppText variant="bodyStrong" color={verdict.color} center>
              {verdict.text}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      {available && lux == null ? <ActivityIndicator color={colors.moss} /> : null}

      {plantId && available && lux != null ? (
        <Button label={`Guardar para ${plant?.plant.name ?? 'la planta'}`} onPress={save} loading={saving} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  meter: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  scale: {
    flexDirection: 'row',
    width: '100%',
    height: 18,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: space.md,
  },
  range: { position: 'absolute', top: 5, height: 8, borderRadius: 4, backgroundColor: colors.moss },
  needle: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 18,
    marginLeft: -2,
    backgroundColor: colors.bark,
    borderRadius: 2,
  },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
});
