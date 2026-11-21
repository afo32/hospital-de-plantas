import { PROPAGATION_METHODS, type PropagationSummary } from '@hdp/shared';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { Screen } from '@/components/Screen';
import { imageSource } from '@/lib/media';
import { getPropagations } from '@/lib/propagation';
import { colors, radius, space } from '@/theme/tokens';

const methodLabel = (m: string) => PROPAGATION_METHODS.find((x) => x.value === m)?.label ?? m;

/** Pestaña "Crianza": siembras, esquejes, divisiones y acodos en marcha. */
export default function CrianzaScreen() {
  const { user } = useAuth();
  const gardenId = user?.defaultGardenId ?? null;
  const readOnly = user?.gardens.find((g) => g.id === gardenId)?.role === 'viewer';
  const [items, setItems] = useState<PropagationSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    if (!gardenId) return;
    try {
      const res = await getPropagations(gardenId);
      setItems(res.data);
      setOffline(res.offline);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus crianzas');
    }
  }, [gardenId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const active = items?.filter((p) => p.status === 'active') ?? [];
  const finished = items?.filter((p) => p.status !== 'active') ?? [];

  return (
    <Screen
      title="Crianza"
      subtitle="De la semilla a la planta"
      floating={readOnly || offline ? null : <Fab label="Nueva crianza" onPress={() => router.push('/crianza/nueva')} />}
    >
      <View style={styles.content}>
        {offline ? (
          <Banner tone="warning" title="Sin conexión">
            <AppText variant="small" color={colors.berry}>
              Estás viendo los últimos datos guardados.
            </AppText>
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
        ) : items.length === 0 ? (
          <>
            <EmptyState
              title="Aún no crías ninguna planta"
              message="Siembra semillas, enraíza esquejes, divide una mata o haz un acodo. Te guiamos etapa por etapa, con avisos, hasta que sea una planta para tu jardín."
            />
            {!readOnly ? <Button label="Empezar una crianza" onPress={() => router.push('/crianza/nueva')} /> : null}
          </>
        ) : (
          <>
            {active.map((p) => (
              <PropagationCard key={p.id} p={p} />
            ))}
            {finished.length ? (
              <Button
                label={showDone ? 'Ocultar terminadas' : `Ver terminadas (${finished.length})`}
                variant="ghost"
                onPress={() => setShowDone((v) => !v)}
              />
            ) : null}
            {showDone ? finished.map((p) => <PropagationCard key={p.id} p={p} />) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function PropagationCard({ p }: { p: PropagationSummary }) {
  const progress = p.stageCount ? (p.stageIndex + (p.status === 'active' ? 0.5 : 1)) / p.stageCount : 0;
  const late = p.status === 'active' && p.dayInStage > p.stageMaxDays && p.stageIndex < p.stageCount - 1;
  return (
    <Card
      style={styles.card}
      onPress={() => router.push({ pathname: '/crianza/[id]', params: { id: p.id } })}
      accessibilityLabel={p.name}
    >
      <View style={styles.row}>
        {p.imageUrl ? (
          <Image source={imageSource(p.imageUrl)} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]} />
        )}
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={colors.mossDeep}>
            {p.name}
          </AppText>
          <AppText variant="small" color={colors.barkSoft}>
            {methodLabel(p.method)} · día {p.day}
            {p.successCount != null ? ` · ${p.successCount} de ${p.count} adelante` : ` · ${p.count}`}
          </AppText>
          <View style={styles.chips}>
            {p.status === 'done' ? <Chip label="Terminada" tone="moss" /> : null}
            {p.status === 'failed' ? <Chip label="No salió" tone="muted" /> : null}
            {p.status === 'active' ? (
              <Chip label={`Etapa ${p.stageIndex + 1} de ${p.stageCount}: ${p.stageTitle}`} tone="gold" />
            ) : null}
            {p.dueTasks ? <Chip label={`${p.dueTasks} ${p.dueTasks === 1 ? 'tarea' : 'tareas'} hoy`} tone="water" /> : null}
            {late ? <Chip label="¿Ya toca pasar de etapa?" tone="berry" /> : null}
          </View>
        </View>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: 100 },
  center: { alignItems: 'center', gap: space.md },
  card: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  flex: { flex: 1, gap: 4 },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.parchmentDeep },
  thumbEmpty: { borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.parchmentDeep, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.fern },
});
