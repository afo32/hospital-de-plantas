import {
  CARE_AREA_LABELS,
  type Diagnosis,
  type DiagnosisAnswer,
  type DiagnosisQuestion,
  type DiagnosisResult,
  TREATMENT_WHEN_LABELS,
} from '@hdp/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, SeverityChip } from '@/components/Chip';
import { Collapsible } from '@/components/Collapsible';
import { OptionList } from '@/components/OptionList';
import { PhotoStrip } from '@/components/PhotoStrip';
import { PhotoViewer } from '@/components/PhotoViewer';
import { TextField } from '@/components/TextField';
import { VineDivider } from '@/components/VineDivider';
import { WaitingCard } from '@/components/WaitingCard';
import { dateTimeLabel, shortDate } from '@/lib/dates';
import { answerDiagnosis, deleteDiagnosis, getDiagnosis, setDiagnosisStatus } from '@/lib/health';
import { colors, radius, space } from '@/theme/tokens';

const THINKING = [
  'Uniendo tus respuestas con lo que se ve en las fotos…',
  'Descartando lo que no encaja…',
  'Preparando el tratamiento paso a paso…',
  'Midiendo dosis con la balanza del boticario…',
];

const LIKELIHOOD_TONE = { alta: 'berry', media: 'gold', baja: 'muted' } as const;

type Answers = Record<string, string | string[]>;

/** Revisión de salud: preguntas (paso 2) y diagnóstico con tratamiento. */
export default function DiagnosisScreen() {
  const { id, left } = useLocalSearchParams<{ id: string; left?: string }>();
  const [d, setD] = useState<Diagnosis | null>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setD(await getDiagnosis(id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la revisión');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setAnswer = (q: DiagnosisQuestion, value: string) =>
    setAnswers((prev) => {
      if (q.kind !== 'multi') return { ...prev, [q.id]: value };
      const current = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
      return { ...prev, [q.id]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] };
    });

  const submit = async () => {
    setThinking(true);
    setError('');
    const list: DiagnosisAnswer[] = Object.entries(answers)
      .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v.trim().length > 0))
      .map(([questionId, value]) => ({ questionId, value }));
    try {
      setD(await answerDiagnosis(id, list));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar el diagnóstico.');
    } finally {
      setThinking(false);
    }
  };

  const toggleResolved = async () => {
    if (!d) return;
    setBusy(true);
    try {
      setD(await setDiagnosisStatus(d.id, d.status === 'resolved' ? 'done' : 'resolved'));
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const go = async () => {
      await deleteDiagnosis(id).catch(() => undefined);
      router.back();
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert('Borrar revisión', 'Se borrarán sus fotos y el diagnóstico.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => void go() },
    ]);
  };

  const again = () => router.replace({ pathname: '/diagnose/[plantId]', params: { plantId: d!.plantId } });

  if (!d) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Salud' }} />
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

  if (thinking) {
    return (
      <View style={[styles.screen, styles.content]}>
        <Stack.Screen options={{ title: 'Diagnosticando…' }} />
        <WaitingCard title="Preparando el diagnóstico" messages={THINKING} />
      </View>
    );
  }

  const t = d.triage;
  const leftToday = left ? Number(left) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: d.result ? 'Diagnóstico' : 'Unas preguntas' }} />
      <AppText variant="label" color={colors.gold}>
        {dateTimeLabel(d.createdAt)}
      </AppText>
      <PhotoStrip photos={d.photos} size={96} onPress={setViewer} />
      {d.symptoms ? (
        <AppText variant="quote" color={colors.barkSoft}>
          «{d.symptoms}»
        </AppText>
      ) : null}

      {t && !t.isPlant ? (
        <>
          <Banner tone="warning" title="No veo ninguna planta en las fotos">
            <AppText variant="small" color={colors.berry}>
              {t.observations}
            </AppText>
            <AppText variant="small" color={colors.berry}>
              No se ha gastado ninguna de tus revisiones de hoy.
            </AppText>
          </Banner>
          <Button label="Probar con otras fotos" onPress={again} />
          <Button label="Borrar" variant="danger" onPress={remove} />
        </>
      ) : d.status === 'questions' && t ? (
        <>
          {t.photoQuality === 'poor' && t.photoTip ? (
            <Banner tone="info" title="Las fotos no se ven del todo bien">
              <AppText variant="small">{t.photoTip}</AppText>
            </Banner>
          ) : null}

          <Card style={styles.block}>
            <AppText variant="heading" color={colors.mossDeep}>
              Lo que veo
            </AppText>
            <AppText>{t.observations}</AppText>
          </Card>

          {t.hypotheses.length ? (
            <Card style={styles.block}>
              <AppText variant="heading" color={colors.mossDeep}>
                Lo que podría ser
              </AppText>
              {t.hypotheses.map((h) => (
                <View key={h.name} style={styles.hypo}>
                  <View style={styles.hypoTitle}>
                    <AppText variant="bodyStrong" style={styles.flex}>
                      {h.name}
                    </AppText>
                    <Chip label={`Probabilidad ${h.likelihood}`} tone={LIKELIHOOD_TONE[h.likelihood]} />
                  </View>
                  <AppText variant="small" color={colors.barkSoft}>
                    {h.why}
                  </AppText>
                </View>
              ))}
            </Card>
          ) : null}

          <VineDivider />
          <AppText variant="title" color={colors.mossDeep}>
            Para afinar, cuéntame:
          </AppText>
          {t.questions.map((q, i) => (
            <Card key={q.id} style={styles.block}>
              <AppText variant="bodyStrong" color={colors.mossDeep}>
                {i + 1}. {q.text}
              </AppText>
              {q.help ? (
                <AppText variant="small" color={colors.barkSoft}>
                  {q.help}
                </AppText>
              ) : null}
              {q.kind === 'text' ? (
                <TextField
                  label="Tu respuesta"
                  value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                  onChangeText={(v) => setAnswer(q, v)}
                  multiline
                  maxLength={400}
                />
              ) : (
                <OptionList
                  options={q.options.map((o) => ({ value: o, label: o }))}
                  value={q.kind === 'multi' ? ((answers[q.id] as string[] | undefined) ?? []) : ((answers[q.id] as string) ?? null)}
                  onChange={(v) => setAnswer(q, v)}
                />
              )}
            </Card>
          ))}

          {error ? (
            <Banner tone="warning" title="No se pudo preparar el diagnóstico">
              <AppText variant="small" color={colors.berry}>
                {error}
              </AppText>
            </Banner>
          ) : null}
          <Button label="Ver el diagnóstico" onPress={submit} />
          <AppText variant="small" color={colors.barkSoft} center>
            Puedes dejar alguna sin responder, pero cuantas más contestes, más preciso será.
            {leftToday !== null && !Number.isNaN(leftToday) ? ` Te quedan ${leftToday} revisiones hoy.` : ''}
          </AppText>
        </>
      ) : d.result ? (
        <ResultView d={d} result={d.result} />
      ) : null}

      {d.result ? (
        <View style={styles.actions}>
          <Button
            label={d.status === 'resolved' ? 'Volver a "en tratamiento"' : '¡Ya está curada!'}
            variant={d.status === 'resolved' ? 'outline' : 'primary'}
            onPress={toggleResolved}
            loading={busy}
          />
          <Button label="Hacer una revisión nueva" variant="outline" onPress={again} />
          <Button label="Borrar esta revisión" variant="danger" onPress={remove} />
        </View>
      ) : null}

      <PhotoViewer photos={d.photos} index={viewer} onClose={() => setViewer(null)} />
    </ScrollView>
  );
}

function ResultView({ d, result: r }: { d: Diagnosis; result: DiagnosisResult }) {
  const t = d.triage;
  return (
    <>
      {d.status === 'resolved' ? (
        <Banner tone="success" title="Marcada como curada 🌿">
          <AppText variant="small" color={colors.mossDeep}>
            Sigue con los cambios de cuidados para que no vuelva a pasar.
          </AppText>
        </Banner>
      ) : null}

      <View style={styles.block}>
        <AppText variant="hero" color={colors.mossDeep}>
          {r.title}
        </AppText>
        <View style={styles.chips}>
          <SeverityChip severity={r.severity} />
          <Chip label={`Seguridad ${r.confidence}`} tone="muted" />
          {r.contagious ? <Chip label="Contagioso: sepárala" tone="berry" /> : null}
        </View>
        <AppText>{r.summary}</AppText>
      </View>

      {r.causes.length ? (
        <Card style={styles.block}>
          <AppText variant="heading" color={colors.mossDeep}>
            Por qué le pasa
          </AppText>
          {r.causes.map((c) => (
            <View key={c.name} style={styles.item}>
              <AppText variant="bodyStrong">{c.name}</AppText>
              <AppText variant="small" color={colors.barkSoft}>
                {c.explanation}
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}

      {r.steps.length ? (
        <Card style={styles.block}>
          <AppText variant="heading" color={colors.mossDeep}>
            Tratamiento paso a paso
          </AppText>
          {r.steps.map((s, i) => (
            <View key={`${i}-${s.title}`} style={styles.step}>
              <View style={styles.stepNumber}>
                <AppText variant="bodyStrong" color={colors.vellum}>
                  {i + 1}
                </AppText>
              </View>
              <View style={styles.flex}>
                <Chip label={TREATMENT_WHEN_LABELS[s.when]} tone={s.when === 'hoy' ? 'berry' : s.when === 'esta_semana' ? 'gold' : 'moss'} />
                <AppText variant="bodyStrong">{s.title}</AppText>
                <AppText variant="small" color={colors.barkSoft}>
                  {s.detail}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {r.careChanges.length ? (
        <Card style={styles.block}>
          <AppText variant="heading" color={colors.mossDeep}>
            Cambia esto en sus cuidados
          </AppText>
          {r.careChanges.map((c, i) => (
            <View key={i} style={styles.item}>
              <AppText variant="label" color={colors.gold}>
                {CARE_AREA_LABELS[c.area].toUpperCase()}
              </AppText>
              <AppText>{c.change}</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      {r.avoid.length ? (
        <Card style={styles.block}>
          <AppText variant="heading" color={colors.berry}>
            Evita
          </AppText>
          {r.avoid.map((a) => (
            <AppText key={a}>✗ {a}</AppText>
          ))}
        </Card>
      ) : null}

      <Card style={styles.block}>
        <AppText variant="heading" color={colors.mossDeep}>
          Seguimiento
        </AppText>
        {r.recoveryDays ? <AppText>Deberías ver mejoría en unos {r.recoveryDays} días.</AppText> : null}
        {d.followUpDay && d.status !== 'resolved' ? (
          <AppText>
            Te avisaré para revisarla el <AppText variant="bodyStrong">{shortDate(d.followUpDay)}</AppText>.
          </AppText>
        ) : null}
        <AppText variant="small" color={colors.barkSoft}>
          Si no mejora: {r.whenToWorry}
        </AppText>
      </Card>

      {t ? (
        <Collapsible title="Lo que vi y lo que respondiste">
          <AppText>{t.observations}</AppText>
          {t.questions.map((q) => {
            const a = d.answers.find((x) => x.questionId === q.id)?.value;
            return (
              <View key={q.id} style={styles.item}>
                <AppText variant="small" color={colors.barkSoft}>
                  {q.text}
                </AppText>
                <AppText variant="bodyStrong">{Array.isArray(a) ? a.join(', ') : a || 'Sin responder'}</AppText>
              </View>
            );
          })}
        </Collapsible>
      ) : null}
    </>
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
  block: { gap: space.sm },
  flex: { flex: 1, gap: 4 },
  hypo: { gap: 2, paddingTop: space.xs },
  hypoTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  item: { gap: 2, paddingTop: space.xs },
  step: { flexDirection: 'row', gap: space.md, paddingTop: space.sm },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: space.sm, marginTop: space.md },
});
