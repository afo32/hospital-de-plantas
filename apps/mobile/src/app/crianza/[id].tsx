import { DIFFICULTY_LABELS, PROPAGATION_METHODS, type PropagationDetail } from '@hdp/shared';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Collapsible } from '@/components/Collapsible';
import { CheckIcon } from '@/components/icons';
import { PhotoStrip } from '@/components/PhotoStrip';
import { PhotoViewer } from '@/components/PhotoViewer';
import { ReportLink } from '@/components/ReportSheet';
import { TextField } from '@/components/TextField';
import { dateTimeLabel, monthsText } from '@/lib/dates';
import { imageSource, pickPhotos, type PhotoSource } from '@/lib/media';
import {
  addPropagationLog,
  advancePropagation,
  deletePropagation,
  deletePropagationLog,
  finishPropagation,
  getPropagation,
  reopenPropagation,
  togglePropagationTask,
} from '@/lib/propagation';
import { QueuedOffline } from '@/lib/offline';
import { colors, radius, space } from '@/theme/tokens';

function confirm(title: string, message: string, label: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: label, style: 'destructive', onPress: onYes },
  ]);
}

/** Una crianza: etapa actual, tareas de hoy, todas las etapas y diario. */
export default function PropagationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<PropagationDetail | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [askCount, setAskCount] = useState(false);
  const [successCount, setSuccessCount] = useState('');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getPropagation(id);
      setD(res.data);
      setOffline(res.offline);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la crianza');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const run = async (key: string, action: () => Promise<PropagationDetail>) => {
    setBusy(key);
    try {
      setD(await action());
    } catch (err) {
      if (err instanceof QueuedOffline) return;
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  if (!d) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Crianza' }} />
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

  const { propagation: p, guide: g } = d;
  const stage = g.stages[p.stageIndex]!;
  const next = g.stages[p.stageIndex + 1];
  const last = !next;
  const active = p.status === 'active';
  const editable = d.canEdit && !offline;
  const methodLabel = PROPAGATION_METHODS.find((m) => m.value === p.method)!.label;
  const late = active && p.dayInStage > stage.maxDays;
  // Al salir de la germinación o el enraizado preguntamos cuántas han salido.
  const asksCount = p.successCount == null && p.stageIndex >= 1;

  const goNext = () => (asksCount ? setAskCount(true) : run('advance', () => advancePropagation(id, {})));

  const toGarden = () =>
    router.push({
      pathname: '/plant-setup/[speciesId]',
      params: { speciesId: p.speciesId, name: p.speciesName, fromPropagation: id },
    });

  const addPhotos = async (source: PhotoSource) => {
    const uris = await pickPhotos(source, 4 - photos.length);
    if (uris.length) setPhotos((prev) => [...prev, ...uris].slice(0, 4));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: methodLabel }} />

      <View style={styles.header}>
        {p.imageUrl ? <Image source={imageSource(p.imageUrl)} style={styles.thumb} contentFit="cover" /> : null}
        <View style={styles.flex}>
          <AppText variant="title" color={colors.mossDeep}>
            {p.name}
          </AppText>
          <AppText variant="small" color={colors.barkSoft}>
            {p.speciesName} · {methodLabel.toLowerCase()} · día {p.day}
          </AppText>
          <View style={styles.chips}>
            <Chip label={`Dificultad ${DIFFICULTY_LABELS[g.difficulty].toLowerCase()}`} tone="muted" />
            <Chip label={p.successCount != null ? `${p.successCount} de ${p.count} adelante` : `${p.count} en total`} tone="moss" />
          </View>
        </View>
      </View>

      {/* Progreso por etapas */}
      <View style={styles.steps}>
        {g.stages.map((s, i) => (
          <View
            key={s.title}
            style={[
              styles.step,
              i < p.stageIndex || !active ? styles.stepDone : i === p.stageIndex ? styles.stepNow : null,
            ]}
          />
        ))}
      </View>

      {offline ? (
        <Banner tone="warning" title="Sin conexión">
          <AppText variant="small" color={colors.berry}>
            Ves los datos guardados. Para marcar tareas o pasar de etapa necesitas conexión.
          </AppText>
        </Banner>
      ) : null}

      {p.status === 'done' ? (
        <Banner tone="success" title="¡Crianza terminada! 🌱">
          <AppText variant="small" color={colors.mossDeep}>
            {p.plantId ? 'Ya está en Mi jardín.' : 'Ya es una planta hecha y derecha.'}
          </AppText>
          {p.plantId ? (
            <Button label="Verla en Mi jardín" variant="outline" onPress={() => router.push({ pathname: '/plant/[id]', params: { id: p.plantId! } })} />
          ) : null}
        </Banner>
      ) : null}
      {p.status === 'failed' ? (
        <Banner tone="warning" title="Esta crianza no salió">
          <AppText variant="small" color={colors.berry}>
            Pasa a los mejores viveristas. Mira abajo los problemas frecuentes para la próxima.
          </AppText>
        </Banner>
      ) : null}
      {d.outOfSeason && active && p.stageIndex === 0 ? (
        <Banner title="No es su mejor época">
          <AppText variant="small">
            Lo ideal es empezar en {monthsText(g.bestMonths)}. Puedes seguir, pero tardará más o saldrán menos.
          </AppText>
        </Banner>
      ) : null}

      {active ? (
        <>
          {/* Etapa actual */}
          <Card style={styles.card}>
            <AppText variant="label" color={colors.gold}>
              ETAPA {p.stageIndex + 1} DE {g.stages.length}
            </AppText>
            <AppText variant="heading" color={colors.mossDeep}>
              {stage.title}
            </AppText>
            <AppText color={colors.barkSoft}>{stage.summary}</AppText>
            <AppText variant="small" color={late ? colors.berry : colors.barkSoft}>
              Suele durar {stage.minDays === stage.maxDays ? `${stage.maxDays} días` : `${stage.minDays}–${stage.maxDays} días`} · llevas{' '}
              {p.dayInStage} {p.dayInStage === 1 ? 'día' : 'días'}
              {late ? '. Ya debería estar: revisa si toca pasar de etapa.' : ''}
            </AppText>

            {d.tasks.length ? (
              <View style={styles.block}>
                <AppText variant="label" color={colors.gold}>
                  TAREAS
                </AppText>
                {d.tasks.map((t) => {
                  const doneToday = t.lastDone === d.today;
                  return (
                    <Pressable
                      key={t.taskIndex}
                      disabled={!editable || busy !== null}
                      onPress={() => run(`task${t.taskIndex}`, () => togglePropagationTask(id, t.stageIndex, t.taskIndex))}
                      style={styles.task}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: doneToday }}
                    >
                      <View style={[styles.box, doneToday && styles.boxOn]}>
                        {doneToday ? <CheckIcon color={colors.vellum} size={14} /> : null}
                      </View>
                      <View style={styles.flex}>
                        <AppText style={doneToday ? styles.struck : undefined}>{t.text}</AppText>
                        <AppText variant="small" color={t.due ? colors.water : colors.barkSoft}>
                          {t.everyDays === 0
                            ? t.lastDone
                              ? 'Hecha'
                              : 'Una vez en esta etapa'
                            : `Cada ${t.everyDays === 1 ? 'día' : `${t.everyDays} días`}${t.due ? ' · toca hoy' : doneToday ? ' · hecha hoy' : ''}`}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.block}>
              <AppText variant="label" color={colors.gold}>
                PASO A PASO
              </AppText>
              {stage.steps.map((s, i) => (
                <AppText key={i}>
                  {i + 1}. {s}
                </AppText>
              ))}
            </View>
            {stage.tips.length ? (
              <View style={styles.block}>
                {stage.tips.map((t) => (
                  <AppText key={t} variant="small" color={colors.barkSoft}>
                    💡 {t}
                  </AppText>
                ))}
              </View>
            ) : null}
            <View style={styles.doneWhen}>
              <AppText variant="small" color={colors.mossDeep}>
                <AppText variant="small" color={colors.mossDeep} style={styles.bold}>
                  Pasa a la siguiente cuando:{' '}
                </AppText>
                {stage.doneWhen}
              </AppText>
            </View>

            {editable ? (
              last ? (
                <>
                  <Button label="Pasar a Mi jardín" onPress={toGarden} />
                  <Button
                    label="Terminar sin pasarla al jardín"
                    variant="outline"
                    onPress={() => run('finish', () => finishPropagation(id, { result: 'done' }))}
                    loading={busy === 'finish'}
                  />
                </>
              ) : (
                <Button label={`Pasar a «${next.title}»`} onPress={goNext} loading={busy === 'advance'} />
              )
            ) : null}
            {editable && p.stageIndex > 0 ? (
              <Button
                label="Volver a la etapa anterior"
                variant="ghost"
                onPress={() => run('back', () => advancePropagation(id, { back: true }))}
              />
            ) : null}
          </Card>
        </>
      ) : null}

      {/* Diario */}
      <AppText variant="heading" color={colors.mossDeep}>
        Diario
      </AppText>
      {editable ? (
        <Card style={styles.card}>
          <TextField
            label="¿Cómo va?"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            placeholder="Han asomado 8 de 12, una tiene moho…"
            style={styles.textarea}
          />
          {photos.length ? <PhotoStrip photos={photos} onRemove={(i) => setPhotos((x) => x.filter((_, j) => j !== i))} /> : null}
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label="📷 Cámara" variant="outline" onPress={() => void addPhotos('camera')} />
            </View>
            <View style={styles.flex}>
              <Button label="🖼 Galería" variant="outline" onPress={() => void addPhotos('library')} />
            </View>
          </View>
          <Button
            label="Guardar en el diario"
            disabled={!text.trim() && !photos.length}
            loading={busy === 'log'}
            onPress={() =>
              void run('log', async () => {
                const r = await addPropagationLog(id, text, photos);
                setText('');
                setPhotos([]);
                return r;
              })
            }
          />
        </Card>
      ) : null}
      {d.logs.map((l) => (
        <View key={l.id} style={[styles.log, l.kind !== 'note' && styles.logEvent]}>
          <AppText variant="label" color={colors.gold}>
            {dateTimeLabel(l.createdAt)}
            {!l.mine && l.authorName ? ` · ${l.authorName}` : ''}
          </AppText>
          {l.text ? <AppText color={l.kind === 'note' ? colors.bark : colors.mossDeep}>{l.text}</AppText> : null}
          {l.photos.length ? (
            <PhotoStrip photos={l.photos} size={84} onPress={(i) => setViewer({ photos: l.photos, index: i })} />
          ) : null}
          {l.mine && l.kind === 'note' && editable ? (
            <Pressable
              onPress={() => confirm('Borrar nota', 'Se borrará también su foto.', 'Borrar', () => void run('dl', () => deletePropagationLog(id, l.id)))}
              hitSlop={8}
              style={styles.logDelete}
            >
              <AppText variant="label" color={colors.berry}>
                Borrar
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ))}

      {/* Guía completa */}
      <AppText variant="heading" color={colors.mossDeep}>
        La guía completa
      </AppText>
      {g.stages.map((s, i) => (
        <Collapsible key={s.title} title={`${i + 1}. ${s.title}`}>
          <AppText color={colors.barkSoft}>{s.summary}</AppText>
          {s.steps.map((x, j) => (
            <AppText key={j}>
              {j + 1}. {x}
            </AppText>
          ))}
          <AppText variant="small" color={colors.mossDeep}>
            Siguiente etapa cuando: {s.doneWhen}
          </AppText>
        </Collapsible>
      ))}
      <Collapsible title="Qué necesitas">
        {g.materials.map((m) => (
          <AppText key={m}>· {m}</AppText>
        ))}
      </Collapsible>
      <Collapsible title="Problemas frecuentes">
        {g.problems.map((x) => (
          <View key={x.problem} style={styles.problem}>
            <AppText variant="bodyStrong">{x.problem}</AppText>
            <AppText variant="small" color={colors.barkSoft}>
              {x.solution}
            </AppText>
          </View>
        ))}
      </Collapsible>
      <AppText variant="small" color={colors.barkSoft} center>
        Guía escrita con IA. Revísala con sentido común.
      </AppText>
      <ReportLink target={{ targetType: 'guide', targetId: `${p.speciesId}:${p.method}` }} label="Informar de un error en esta guía" />

      {editable ? (
        <View style={styles.danger}>
          {active ? (
            <Button
              label="No ha salido"
              variant="outline"
              onPress={() =>
                confirm('¿No ha salido?', 'Se guardará como terminada sin éxito. Podrás reabrirla si te equivocas.', 'Sí, no salió', () =>
                  void run('fail', () => finishPropagation(id, { result: 'failed' })),
                )
              }
            />
          ) : (
            <Button label="Reabrir la crianza" variant="outline" onPress={() => run('reopen', () => reopenPropagation(id))} />
          )}
          <Button
            label="Borrar la crianza"
            variant="danger"
            onPress={() =>
              confirm('Borrar la crianza', 'Se borrarán su diario y sus fotos.', 'Borrar', async () => {
                await deletePropagation(id).catch(() => undefined);
                router.back();
              })
            }
          />
        </View>
      ) : null}

      <PhotoViewer photos={viewer?.photos ?? []} index={viewer?.index ?? null} onClose={() => setViewer(null)} />

      <Modal visible={askCount} transparent animationType="fade" onRequestClose={() => setAskCount(false)}>
        <View style={styles.backdrop}>
          <Card style={styles.modal}>
            <AppText variant="heading" color={colors.mossDeep}>
              ¿Cuántas han salido adelante?
            </AppText>
            <AppText color={colors.barkSoft}>
              De {p.count} {p.method === 'seed' ? 'semillas' : p.method === 'cutting' ? 'esquejes' : 'en total'}. Así sabrás qué tal te funciona.
            </AppText>
            <TextField label="Número" keyboardType="number-pad" value={successCount} onChangeText={setSuccessCount} placeholder={String(p.count)} />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  label="Saltar"
                  variant="ghost"
                  onPress={() => {
                    setAskCount(false);
                    void run('advance', () => advancePropagation(id, {}));
                  }}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Guardar"
                  onPress={() => {
                    const n = Number(successCount);
                    setAskCount(false);
                    void run('advance', () =>
                      advancePropagation(id, Number.isInteger(n) && n >= 0 ? { successCount: Math.min(n, 1000) } : {}),
                    );
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg, backgroundColor: colors.parchment },
  header: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.parchmentDeep },
  flex: { flex: 1, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.parchmentDeep },
  stepDone: { backgroundColor: colors.fern },
  stepNow: { backgroundColor: colors.gold },
  card: { gap: space.sm },
  block: { gap: 6, paddingTop: space.xs },
  task: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: 4 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.water,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.water, borderColor: colors.water },
  struck: { textDecorationLine: 'line-through', color: colors.barkSoft },
  doneWhen: { backgroundColor: '#EEF2E4', borderRadius: radius.sm, padding: space.sm },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: space.sm },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  log: { gap: 4, paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: colors.border },
  logEvent: { borderLeftColor: colors.fern },
  logDelete: { alignSelf: 'flex-end' },
  problem: { gap: 2, paddingTop: space.xs },
  danger: { gap: space.sm, marginTop: space.lg },
  backdrop: { flex: 1, backgroundColor: 'rgba(59,46,34,0.35)', justifyContent: 'center', padding: space.lg },
  modal: { gap: space.md },
});
