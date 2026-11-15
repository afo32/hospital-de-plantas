import type { PlantDetail, SpeciesDetail, TaskType, UpdatePlantInput } from '@hdp/shared';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CareTab } from '@/components/CareTab';
import { ActionSheet } from '@/components/ActionSheet';
import { HealthTab } from '@/components/HealthTab';
import { NotesTab } from '@/components/NotesTab';
import { PencilIcon, SproutIcon } from '@/components/icons';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { SnoozeSheet } from '@/components/SnoozeSheet';
import { SpeciesProfileView } from '@/components/SpeciesProfileView';
import { TextField } from '@/components/TextField';
import { VineDivider } from '@/components/VineDivider';
import { completeTask, getPlant, removePlant, snoozeWatering, undoTask, updatePlant } from '@/lib/garden';
import { QueuedOffline } from '@/lib/offline';
import { getSpeciesDetail } from '@/lib/species';
import { removePlantPhoto, setPlantPhoto } from '@/lib/health';
import { imageSource, pickPhotos, type PhotoSource } from '@/lib/media';
import { Banner } from '@/components/Banner';
import { colors, radius, space } from '@/theme/tokens';

const TABS = [
  { value: 'care', label: 'Cuidado' },
  { value: 'health', label: 'Salud' },
  { value: 'notes', label: 'Notas' },
  { value: 'info', label: 'Info' },
] as const;
type Tab = (typeof TABS)[number]['value'];

/** Detalle de una planta de tu jardín. */
export default function PlantScreen() {
  const { id, welcome } = useLocalSearchParams<{ id: string; welcome?: string }>();
  const [detail, setDetail] = useState<PlantDetail | null>(null);
  const [species, setSpecies] = useState<SpeciesDetail | null>(null);
  const [tab, setTab] = useState<Tab>('care');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [snoozing, setSnoozing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [offline, setOffline] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: d, offline } = await getPlant(id);
      setDetail(d);
      setOffline(offline);
      setError('');
      if (d.plant.species.id)
        getSpeciesDetail(d.plant.species.id)
          .then(setSpecies)
          .catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la planta');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<PlantDetail>) => {
    setBusy(key);
    try {
      setDetail(await action());
      setCalendarVersion((v) => v + 1);
    } catch (err) {
      if (err instanceof QueuedOffline) {
        setOffline(true);
        Alert.alert('Guardado sin conexión', err.message);
      } else {
        Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
      }
    } finally {
      setBusy(null);
    }
  };

  const changePhoto = async (source: PhotoSource) => {
    const [uri] = await pickPhotos(source, 1);
    if (uri) await run('photo', () => setPlantPhoto(id, uri));
  };

  const onUpdate = async (input: UpdatePlantInput) => run('update', () => updatePlant(id, input));

  const confirmRemove = () => {
    const go = async () => {
      await removePlant(id);
      router.back();
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert('Quitar del jardín', '¿Seguro? Se borrará su historial de cuidados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => void go() },
    ]);
  };

  if (!detail) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <AppText color={colors.berry} center>
              {error}
            </AppText>
            <Button label="Reintentar" onPress={load} />
          </>
        ) : (
          <ActivityIndicator color={colors.moss} size="large" />
        )}
      </View>
    );
  }

  const { plant } = detail;
  const ownPhoto = plant.imageUrl?.startsWith('/files/') ?? false;
  const scientific = plant.species.scientificName;
  const common = plant.species.commonName;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '' }} />

      <View>
        {plant.imageUrl ? (
          <Image source={imageSource(plant.imageUrl)} style={styles.hero} contentFit="cover" transition={250} />
        ) : (
          <View style={[styles.hero, styles.heroEmpty]}>
            <SproutIcon color={colors.fern} size={64} />
          </View>
        )}
        {!offline ? (
          <Pressable
            onPress={() => setPhotoSheet(true)}
            style={styles.photoButton}
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto"
          >
            {busy === 'photo' ? (
              <ActivityIndicator color={colors.vellum} />
            ) : (
              <AppText variant="label" color={colors.vellum}>
                📷 {ownPhoto ? 'Cambiar foto' : 'Poner mi foto'}
              </AppText>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <AppText variant="hero" color={colors.mossDeep}>
            {plant.name}
          </AppText>
          <AppText variant="quote" color={colors.barkSoft}>
            {plant.nickname && common ? `${common} · ` : ''}
            {scientific}
          </AppText>
          {plant.room ? (
            <AppText variant="small" color={colors.barkSoft}>
              {plant.room}
            </AppText>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            setNewName(plant.nickname ?? '');
            setRenaming(true);
          }}
          style={styles.editButton}
          accessibilityLabel="Cambiar nombre"
          hitSlop={8}
        >
          <PencilIcon color={colors.gold} />
        </Pressable>
      </View>
      <VineDivider />

      {welcome ? (
        <Card style={styles.welcome}>
          <AppText variant="heading" color={colors.mossDeep}>
            ¡{plant.name} ya está en tu jardín!
          </AppText>
          <AppText>
            Riégala cada {detail.care.water.everyDays} días con unos {detail.care.water.amountMl} ml. Abajo tienes su
            plan completo y el calendario.
          </AppText>
        </Card>
      ) : null}

      {offline ? (
        <Banner tone="warning" title="Sin conexión">
          <AppText variant="small" color={colors.berry}>
            Datos guardados. Los cambios se enviarán al volver la red.
          </AppText>
        </Banner>
      ) : null}

      <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

      {tab === 'care' ? (
        <CareTab
          detail={detail}
          busy={busy}
          calendarVersion={calendarVersion}
          onComplete={(t: TaskType) => run(t, () => completeTask(id, t))}
          onUndo={(t: TaskType) => run(t, () => undoTask(id, t))}
          onSnooze={() => setSnoozing(true)}
          onUpdate={onUpdate}
          onMeasureLight={() => router.push({ pathname: '/light-meter', params: { plantId: id } })}
        />
      ) : null}

      {tab === 'health' ? <HealthTab plantId={id} plantName={plant.name} today={detail.today} /> : null}

      {tab === 'notes' ? <NotesTab plantId={id} /> : null}

      {tab === 'info' ? (
        species?.profile ? (
          <SpeciesProfileView profile={species.profile} />
        ) : (
          <ActivityIndicator color={colors.moss} />
        )
      ) : null}

      <Button label="Quitar del jardín" variant="danger" onPress={confirmRemove} />

      <SnoozeSheet
        plantName={snoozing ? plant.name : null}
        onClose={() => setSnoozing(false)}
        onPick={(days) => {
          setSnoozing(false);
          void run('water', () => snoozeWatering(id, days));
        }}
      />

      <ActionSheet
        visible={photoSheet}
        title={`Foto de ${plant.name}`}
        message="Haz una foto de tu planta para reconocerla de un vistazo en tu jardín."
        onClose={() => setPhotoSheet(false)}
        actions={[
          { label: '📷 Hacer una foto', onPress: () => void changePhoto('camera') },
          { label: '🖼 Elegir de la galería', onPress: () => void changePhoto('library') },
          ...(ownPhoto
            ? [{ label: 'Volver a la foto de la especie', destructive: true, onPress: () => void run('photo', () => removePlantPhoto(id)) }]
            : []),
        ]}
      />

      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modal}>
            <AppText variant="heading" color={colors.mossDeep}>
              Nombre de tu planta
            </AppText>
            <TextField
              label="Nombre propio"
              value={newName}
              onChangeText={setNewName}
              maxLength={40}
              placeholder={common ?? scientific}
            />
            <AppText variant="small" color={colors.barkSoft}>
              Déjalo vacío para usar el nombre de la especie.
            </AppText>
            <View style={styles.modalActions}>
              <View style={styles.flex}>
                <Button label="Cancelar" variant="ghost" onPress={() => setRenaming(false)} />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Guardar"
                  onPress={() => {
                    setRenaming(false);
                    void onUpdate({ nickname: newName.trim() || null });
                  }}
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
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
  photoButton: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    backgroundColor: 'rgba(52,71,42,0.85)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  flex: { flex: 1 },
  editButton: { padding: space.sm, marginTop: space.sm },
  welcome: { backgroundColor: '#EEF2E4', borderColor: colors.fern },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(59,46,34,0.35)', justifyContent: 'center', padding: space.lg },
  modal: { gap: space.md },
  modalActions: { flexDirection: 'row', gap: space.sm },
});
