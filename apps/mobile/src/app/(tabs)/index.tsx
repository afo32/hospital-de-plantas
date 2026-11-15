import type { PlantSummary, Task, TodayResponse } from '@hdp/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { PlantCard } from '@/components/PlantCard';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { SnoozeSheet } from '@/components/SnoozeSheet';
import { TaskRow } from '@/components/TaskRow';
import { VineDivider } from '@/components/VineDivider';
import { completeAll, completeTask, getPlants, getToday, snoozeWatering, undoTask } from '@/lib/garden';
import { colors, space } from '@/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

const GARDEN_TABS = [
  { value: 'today', label: 'Hoy' },
  { value: 'plants', label: 'Mis plantas' },
] as const;
type GardenTab = (typeof GARDEN_TABS)[number]['value'];

const taskKey = (t: Task) => `${t.plantId}:${t.type}`;

export default function GardenScreen() {
  const { user } = useAuth();
  const gardenId = user?.defaultGardenId ?? null;
  const firstName = user?.name?.split(' ')[0];

  const [tab, setTab] = useState<GardenTab>('today');
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [plants, setPlants] = useState<PlantSummary[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [completingAll, setCompletingAll] = useState(false);
  const [snoozeFor, setSnoozeFor] = useState<Task | null>(null);

  const load = useCallback(async () => {
    if (!gardenId) return;
    try {
      const [t, p] = await Promise.all([getToday(gardenId), getPlants(gardenId)]);
      setToday(t);
      setPlants(p);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu jardín');
    }
  }, [gardenId]);

  // Recarga cada vez que vuelves a esta pantalla (p. ej. después de añadir una planta).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const withBusy = async (key: string, action: () => Promise<unknown>) => {
    setBusy((b) => new Set(b).add(key));
    try {
      await action();
      await load();
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(key);
        return n;
      });
    }
  };

  const toggle = (t: Task) =>
    withBusy(taskKey(t), () => (t.done ? undoTask(t.plantId, t.type) : completeTask(t.plantId, t.type)));

  const snooze = (days: number) => {
    const t = snoozeFor;
    setSnoozeFor(null);
    if (t) void withBusy(taskKey(t), () => snoozeWatering(t.plantId, days));
  };

  const doCompleteAll = async () => {
    if (!gardenId) return;
    setCompletingAll(true);
    try {
      await completeAll(gardenId);
      await load();
    } catch (err) {
      Alert.alert('No se pudo completar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setCompletingAll(false);
    }
  };

  const tasks = today?.tasks ?? [];
  const late = tasks.filter((t) => !t.done && t.daysLate > 0);
  const now = tasks.filter((t) => t.daysLate === 0 || t.done);
  const upcoming = tasks.filter((t) => !t.done && t.daysLate < 0);
  const pendingNow = late.length + now.filter((t) => !t.done).length;

  const renderGroup = (title: string, list: Task[], tint?: string) =>
    list.length ? (
      <View style={styles.group}>
        <AppText variant="heading" color={tint ?? colors.mossDeep}>
          {title}
        </AppText>
        {list.map((t) => (
          <TaskRow
            key={taskKey(t)}
            task={t}
            today={today!.today}
            busy={busy.has(taskKey(t))}
            onToggle={() => toggle(t)}
            onSnooze={t.type === 'water' ? () => setSnoozeFor(t) : undefined}
            onOpen={() => router.push({ pathname: '/plant/[id]', params: { id: t.plantId } })}
          />
        ))}
      </View>
    ) : null;

  const loading = !today && !error;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="title" color={colors.mossDeep}>
          Mi jardín
        </AppText>
        <AppText variant="quote" color={colors.barkSoft}>
          {firstName ? `Hola, ${firstName}. Cada hoja a su tiempo` : 'Cada hoja a su tiempo'}
        </AppText>
        <VineDivider />
      </View>
      <SegmentedTabs options={GARDEN_TABS} value={tab} onChange={setTab} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.moss} />}
      >
        {loading ? <ActivityIndicator color={colors.moss} style={styles.loader} /> : null}
        {error ? (
          <View style={styles.group}>
            <AppText color={colors.berry} center>
              {error}
            </AppText>
            <Button label="Reintentar" variant="outline" onPress={load} />
          </View>
        ) : null}

        {tab === 'today' && today ? (
          tasks.length === 0 ? (
            <EmptyState
              title={plants?.length ? 'Todo en orden' : 'Nada que regar hoy'}
              message={
                plants?.length
                  ? 'No hay nada que hacer en los próximos 7 días. Disfruta del jardín.'
                  : 'Cuando añadas plantas, aquí verás lo que toca regar hoy y en los próximos días.'
              }
            />
          ) : (
            <>
              {renderGroup('Atrasadas', late, colors.berry)}
              {renderGroup('Hoy', now)}
              {renderGroup('Próximamente', upcoming)}
              {pendingNow > 1 ? (
                <Button label={`Completar todo (${pendingNow})`} onPress={doCompleteAll} loading={completingAll} />
              ) : null}
            </>
          )
        ) : null}

        {tab === 'plants' && plants ? (
          plants.length === 0 ? (
            <EmptyState title="Tu jardín está esperando" message="Pulsa el botón + para añadir tu primera planta." />
          ) : (
            <View style={styles.grid}>
              {plants.map((p) => (
                <View key={p.id} style={styles.cell}>
                  <PlantCard plant={p} onPress={() => router.push({ pathname: '/plant/[id]', params: { id: p.id } })} />
                </View>
              ))}
            </View>
          )
        ) : null}
      </ScrollView>

      <Fab onPress={() => router.push('/add')} />
      <SnoozeSheet plantName={snoozeFor?.plantName ?? null} onPick={snooze} onClose={() => setSnoozeFor(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  header: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.xs },
  content: { padding: space.lg, paddingBottom: 120, gap: space.lg },
  loader: { marginTop: space.xl },
  group: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  cell: { width: '50%', padding: space.xs },
});
