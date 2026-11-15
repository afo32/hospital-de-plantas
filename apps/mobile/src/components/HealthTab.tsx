import type { Diagnosis } from '@hdp/shared';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { dateTimeLabel, relativeDay } from '@/lib/dates';
import { getDiagnoses } from '@/lib/health';
import { imageSource } from '@/lib/media';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Banner } from './Banner';
import { Button } from './Button';
import { Card } from './Card';
import { DiagnosisStatusChip, SeverityChip } from './Chip';

type Props = { plantId: string; plantName: string; today: string };

/** Pestaña "Salud": revisiones con IA y su historial. */
export function HealthTab({ plantId, plantName, today }: Props) {
  const [items, setItems] = useState<Diagnosis[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getDiagnoses(plantId);
      setItems(res.data);
      setOffline(res.offline);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar su historial de salud');
    }
  }, [plantId]);

  // Se recarga al volver de una revisión.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const start = () => router.push({ pathname: '/diagnose/[plantId]', params: { plantId, name: plantName } });
  const due = items?.find((d) => d.status === 'done' && d.followUpDay && d.followUpDay <= today);
  const pending = items?.find((d) => d.status === 'questions' && d.triage?.isPlant);

  return (
    <View style={styles.wrap}>
      <Card style={styles.intro}>
        <AppText variant="heading" color={colors.mossDeep}>
          ¿Le pasa algo a {plantName}?
        </AppText>
        <AppText color={colors.barkSoft}>
          Hazle hasta 3 fotos. La IA las mira, te pregunta por la tierra, el riego y lo que haya cambiado, y te da un
          tratamiento paso a paso.
        </AppText>
        <Button label="Revisar su salud" onPress={start} disabled={offline} />
        {offline ? (
          <AppText variant="small" color={colors.berry}>
            Necesitas conexión para hacer una revisión.
          </AppText>
        ) : null}
      </Card>

      {due ? (
        <Banner tone="info" title={`Toca ver cómo sigue (${relativeDay(due.followUpDay!, today).toLowerCase()})`}>
          <AppText variant="small">
            Revisa si ha mejorado de "{due.result?.title}". Si ya está bien, márcala como curada; si no, haz una revisión
            nueva para comparar.
          </AppText>
          <Button
            label="Ver el tratamiento"
            variant="outline"
            onPress={() => router.push({ pathname: '/diagnosis/[id]', params: { id: due.id } })}
          />
        </Banner>
      ) : null}

      {pending ? (
        <Banner tone="info" title="Tienes una revisión a medias">
          <AppText variant="small">Responde a las preguntas para ver el diagnóstico.</AppText>
          <Button
            label="Continuar"
            variant="outline"
            onPress={() => router.push({ pathname: '/diagnosis/[id]', params: { id: pending.id } })}
          />
        </Banner>
      ) : null}

      {error ? (
        <View style={styles.center}>
          <AppText color={colors.berry} center>
            {error}
          </AppText>
          <Button label="Reintentar" variant="outline" onPress={load} />
        </View>
      ) : !items ? (
        <ActivityIndicator color={colors.moss} />
      ) : items.length ? (
        <>
          <AppText variant="heading" color={colors.mossDeep}>
            Historial
          </AppText>
          {items.map((d) => (
            <Card
              key={d.id}
              style={styles.item}
              onPress={() => router.push({ pathname: '/diagnosis/[id]', params: { id: d.id } })}
              accessibilityLabel={d.result?.title ?? 'Revisión sin terminar'}
            >
              {d.photos[0] ? <Image source={imageSource(d.photos[0])} style={styles.thumb} contentFit="cover" /> : null}
              <View style={styles.itemText}>
                <AppText variant="bodyStrong" color={colors.mossDeep}>
                  {d.result?.title ?? (d.triage?.isPlant === false ? 'No se veía la planta' : 'Revisión sin terminar')}
                </AppText>
                <AppText variant="small" color={colors.barkSoft}>
                  {dateTimeLabel(d.createdAt)}
                </AppText>
                <View style={styles.chips}>
                  <DiagnosisStatusChip d={d} />
                  {d.result && d.result.severity !== 'none' ? <SeverityChip severity={d.result.severity} /> : null}
                </View>
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  intro: { gap: space.md },
  center: { alignItems: 'center', gap: space.md },
  item: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.parchmentDeep },
  itemText: { flex: 1, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
