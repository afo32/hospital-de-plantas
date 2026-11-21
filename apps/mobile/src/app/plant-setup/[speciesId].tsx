import {
  addPlantSchema,
  LAST_REPOT_OPTIONS,
  LAST_WATER_OPTIONS,
  LIGHT_LEVELS,
  OVERWATERING_GUARDS,
  type OverwateringGuard,
  PLANT_LOCATIONS,
  POT_MATERIALS,
  POT_SHAPES,
  SOIL_TYPES,
} from '@hdp/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { OptionList } from '@/components/OptionList';
import { MeasureGuide } from '@/components/MeasureGuide';
import { TextField } from '@/components/TextField';
import { addPlant } from '@/lib/garden';
import { finishPropagation } from '@/lib/propagation';
import { apiErrorToForm } from '@/lib/forms';
import { colors, radius, space } from '@/theme/tokens';

type Answers = {
  nickname: string;
  location: string | null;
  room: string;
  lightLevel: string | null;
  potShape: string;
  potDiameterCm: string;
  potLengthCm: string;
  potHeightCm: string;
  potMaterial: string | null;
  hasDrainage: 'yes' | 'no' | null;
  soilType: string | null;
  overwateringGuard: OverwateringGuard[];
  lastRepotted: string | null;
  lastWatered: string | null;
  plantHeightCm: string;
  plantWidthCm: string;
};

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

const YES_NO = [
  { value: 'yes', label: 'Sí, tiene agujeros' },
  { value: 'no', label: 'No tiene agujeros' },
] as const;

/** Cuestionario al añadir una planta. Con las respuestas, el servidor calcula su plan de cuidado. */
export default function PlantSetupScreen() {
  const { speciesId, name, fromPropagation } = useLocalSearchParams<{ speciesId: string; name?: string; fromPropagation?: string }>();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [a, setA] = useState<Answers>({
    nickname: '',
    location: null,
    room: '',
    lightLevel: null,
    potShape: 'round',
    potDiameterCm: '',
    potLengthCm: '',
    potHeightCm: '',
    potMaterial: null,
    hasDrainage: null,
    soilType: null,
    overwateringGuard: [],
    lastRepotted: null,
    lastWatered: null,
    plantHeightCm: '',
    plantWidthCm: '',
  });
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((prev) => ({ ...prev, [k]: v }));

  const toggleGuard = (g: OverwateringGuard) =>
    setA((prev) => {
      if (g === 'none') return { ...prev, overwateringGuard: ['none'] };
      const list = prev.overwateringGuard.filter((x) => x !== 'none');
      return { ...prev, overwateringGuard: list.includes(g) ? list.filter((x) => x !== g) : [...list, g] };
    });

  const rect = a.potShape === 'rectangular';
  const steps: { title: string; question: string; valid: boolean; body: ReactNode }[] = [
    {
      title: 'Nombre',
      question: '¿Quieres ponerle un nombre?',
      valid: true,
      body: (
        <TextField
          label="Nombre propio (opcional)"
          placeholder={name ? `Por ejemplo: "${name} del salón"` : 'Por ejemplo: "Gertrudis"'}
          value={a.nickname}
          onChangeText={(t) => set('nickname', t)}
          maxLength={40}
        />
      ),
    },
    {
      title: 'Ubicación',
      question: '¿Dónde va a estar?',
      valid: !!a.location,
      body: (
        <>
          <OptionList options={PLANT_LOCATIONS} value={a.location} onChange={(v) => set('location', v)} />
          <TextField
            label="Estancia (opcional)"
            placeholder="Salón, terraza, cocina…"
            value={a.room}
            onChangeText={(t) => set('room', t)}
            maxLength={40}
          />
        </>
      ),
    },
    {
      title: 'Luz',
      question: '¿Qué luz recibirá a diario?',
      valid: !!a.lightLevel,
      body: <OptionList options={LIGHT_LEVELS} value={a.lightLevel} onChange={(v) => set('lightLevel', v)} />,
    },
    {
      title: 'Maceta',
      question: '¿Cómo es la maceta?',
      valid: !!num(a.potDiameterCm) && !!num(a.potHeightCm) && (!rect || !!num(a.potLengthCm)) && !!a.potMaterial && !!a.hasDrainage,
      body: (
        <>
          <OptionList options={POT_SHAPES} value={a.potShape} onChange={(v) => set('potShape', v)} />
          <MeasureGuide kind="pot" shape={rect ? 'rectangular' : 'round'} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label={rect ? 'A · Ancho (cm)' : 'A · Diámetro (cm)'}
                keyboardType="decimal-pad"
                value={a.potDiameterCm}
                onChangeText={(t) => set('potDiameterCm', t)}
                placeholder="15"
              />
            </View>
            {rect ? (
              <View style={styles.flex}>
                <TextField
                  label="C · Largo (cm)"
                  keyboardType="decimal-pad"
                  value={a.potLengthCm}
                  onChangeText={(t) => set('potLengthCm', t)}
                  placeholder="40"
                />
              </View>
            ) : null}
            <View style={styles.flex}>
              <TextField
                label="B · Alto (cm)"
                keyboardType="decimal-pad"
                value={a.potHeightCm}
                onChangeText={(t) => set('potHeightCm', t)}
                placeholder="14"
              />
            </View>
          </View>
          <AppText variant="heading" color={colors.mossDeep}>
            Material
          </AppText>
          <OptionList options={POT_MATERIALS} value={a.potMaterial} onChange={(v) => set('potMaterial', v)} />
          <AppText variant="heading" color={colors.mossDeep}>
            Drenaje
          </AppText>
          <OptionList options={YES_NO} value={a.hasDrainage} onChange={(v) => set('hasDrainage', v)} />
        </>
      ),
    },
    {
      title: 'Sustrato',
      question: '¿Qué tierra tiene?',
      valid: !!a.soilType,
      body: <OptionList options={SOIL_TYPES} value={a.soilType} onChange={(v) => set('soilType', v)} />,
    },
    {
      title: 'Exceso de riego',
      question: '¿Cómo evitas el exceso de riego?',
      valid: a.overwateringGuard.length > 0,
      body: (
        <>
          <AppText color={colors.barkSoft}>Marca todo lo que hagas.</AppText>
          <OptionList options={OVERWATERING_GUARDS} value={a.overwateringGuard} onChange={toggleGuard} />
        </>
      ),
    },
    {
      title: 'Trasplante',
      question: '¿Cuándo se trasplantó por última vez?',
      valid: !!a.lastRepotted,
      body: <OptionList options={LAST_REPOT_OPTIONS} value={a.lastRepotted} onChange={(v) => set('lastRepotted', v)} />,
    },
    {
      title: 'Último riego',
      question: '¿Cuándo se regó por última vez?',
      valid: !!a.lastWatered,
      body: <OptionList options={LAST_WATER_OPTIONS} value={a.lastWatered} onChange={(v) => set('lastWatered', v)} />,
    },
    {
      title: 'Tamaño',
      question: '¿Cuánto mide la planta?',
      valid: true,
      body: (
        <>
          <AppText color={colors.barkSoft}>
            Con esto sabremos si la maceta le queda bien. Si no lo sabes, puedes saltarlo y decírnoslo luego.
          </AppText>
          <MeasureGuide kind="plant" />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="A · Alto (cm)"
                keyboardType="decimal-pad"
                value={a.plantHeightCm}
                onChangeText={(t) => set('plantHeightCm', t)}
                placeholder="60"
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="B · Ancho (cm)"
                keyboardType="decimal-pad"
                value={a.plantWidthCm}
                onChangeText={(t) => set('plantWidthCm', t)}
                placeholder="40"
              />
            </View>
          </View>
        </>
      ),
    },
  ];

  const current = steps[step]!;
  const last = step === steps.length - 1;

  const submit = async () => {
    const gardenId = user?.defaultGardenId;
    if (!gardenId) return;
    const parsed = addPlantSchema.safeParse({
      speciesId,
      nickname: a.nickname.trim() || undefined,
      location: a.location,
      room: a.room.trim() || undefined,
      lightLevel: a.lightLevel,
      potShape: a.potShape,
      potDiameterCm: num(a.potDiameterCm),
      potLengthCm: rect ? num(a.potLengthCm) : undefined,
      potHeightCm: num(a.potHeightCm),
      potMaterial: a.potMaterial,
      hasDrainage: a.hasDrainage === 'yes',
      soilType: a.soilType,
      overwateringGuard: a.overwateringGuard,
      lastRepotted: a.lastRepotted,
      lastWatered: a.lastWatered,
      plantHeightCm: num(a.plantHeightCm),
      plantWidthCm: num(a.plantWidthCm),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa las respuestas');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await addPlant(gardenId, parsed.data);
      // Si viene de una crianza, la crianza queda terminada y enlazada a la planta nueva.
      if (fromPropagation) {
        await finishPropagation(fromPropagation, { result: 'done', plantId: created.plant.id }).catch(() => undefined);
      }
      router.replace({ pathname: '/plant/[id]', params: { id: created.plant.id, welcome: '1' } });
    } catch (err) {
      setError(apiErrorToForm(err).general);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: name ? `Añadir ${name}` : 'Añadir planta' }} />
      <View style={styles.progress}>
        {steps.map((s, i) => (
          <View key={s.title} style={[styles.dot, i <= step && styles.dotOn]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="label" color={colors.gold}>
          PASO {step + 1} DE {steps.length} · {current.title.toUpperCase()}
        </AppText>
        <AppText variant="title" color={colors.mossDeep}>
          {current.question}
        </AppText>
        {current.body}
        {error ? <AppText color={colors.berry}>{error}</AppText> : null}
      </ScrollView>
      <View style={styles.footer}>
        {step > 0 ? (
          <View style={styles.flex}>
            <Button label="Atrás" variant="outline" onPress={() => setStep((s) => s - 1)} />
          </View>
        ) : null}
        <View style={styles.flexWide}>
          {last ? (
            <Button label="Añadir a mi jardín" onPress={submit} loading={saving} />
          ) : (
            <Button
              label={current.valid ? 'Siguiente' : 'Elige una opción'}
              onPress={() => setStep((s) => s + 1)}
              disabled={!current.valid}
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: space.lg, paddingTop: space.md },
  dot: { flex: 1, height: 5, borderRadius: radius.pill, backgroundColor: colors.parchmentDeep },
  dotOn: { backgroundColor: colors.moss },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  flexWide: { flex: 2 },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.lg,
    paddingBottom: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.parchment,
  },
});
