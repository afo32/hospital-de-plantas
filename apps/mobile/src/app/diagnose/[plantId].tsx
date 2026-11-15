import { DIAGNOSIS_PHOTO_TIPS } from '@hdp/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PhotoStrip } from '@/components/PhotoStrip';
import { TextField } from '@/components/TextField';
import { WaitingCard } from '@/components/WaitingCard';
import { startDiagnosis } from '@/lib/health';
import { pickPhotos, type PhotoSource } from '@/lib/media';
import { colors, space } from '@/theme/tokens';

const LOOKING = [
  'Mirando las hojas con lupa de enano…',
  'Comparando con su ficha de cuidados…',
  'Teniendo en cuenta el tiempo de tu zona…',
  'Consultando los viejos herbarios de Rivendel…',
  'Pensando qué preguntarte…',
];

/** Paso 1 de la revisión de salud: fotos y qué le notas. */
export default function DiagnoseScreen() {
  const { plantId, name } = useLocalSearchParams<{ plantId: string; name?: string }>();
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [symptoms, setSymptoms] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (slot: number, source: PhotoSource) => {
    const [uri] = await pickPhotos(source, 1);
    if (uri) setPhotos((prev) => prev.map((p, i) => (i === slot ? uri : p)));
  };

  const ready = photos.filter((p): p is string => !!p);

  const analyze = async () => {
    setBusy(true);
    setError('');
    try {
      const d = await startDiagnosis(plantId, ready, symptoms);
      router.replace({ pathname: '/diagnosis/[id]', params: { id: d.id, left: String(d.remainingToday ?? '') } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron analizar las fotos.');
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <View style={[styles.screen, styles.content]}>
        <Stack.Screen options={{ title: 'Revisando…' }} />
        <WaitingCard title={`Examinando ${name ?? 'tu planta'}`} messages={LOOKING} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Revisar su salud' }} />
      <AppText color={colors.barkSoft}>
        Cuantas mejores sean las fotos, mejor el diagnóstico: con luz de día, enfocadas y de cerca. La primera es
        obligatoria.
      </AppText>

      {DIAGNOSIS_PHOTO_TIPS.map((tip, slot) => (
        <Card key={tip.title} style={styles.slot}>
          <AppText variant="bodyStrong" color={colors.mossDeep}>
            {slot + 1}. {tip.title}
            {slot > 0 ? <AppText variant="small" color={colors.barkSoft}> (opcional)</AppText> : null}
          </AppText>
          <AppText variant="small" color={colors.barkSoft}>
            {tip.hint}
          </AppText>
          {photos[slot] ? (
            <PhotoStrip
              photos={[photos[slot]!]}
              size={120}
              onRemove={() => setPhotos((prev) => prev.map((p, i) => (i === slot ? null : p)))}
            />
          ) : (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button label="📷 Cámara" variant="outline" onPress={() => void pick(slot, 'camera')} />
              </View>
              <View style={styles.flex}>
                <Button label="🖼 Galería" variant="outline" onPress={() => void pick(slot, 'library')} />
              </View>
            </View>
          )}
        </Card>
      ))}

      <TextField
        label="¿Qué le notas? (opcional)"
        value={symptoms}
        onChangeText={setSymptoms}
        placeholder="Hojas amarillas desde hace una semana, se le caen las de abajo…"
        multiline
        maxLength={600}
        style={styles.textarea}
      />

      {error ? (
        <Banner tone="warning" title="No se pudo revisar">
          <AppText variant="small" color={colors.berry}>
            {error}
          </AppText>
        </Banner>
      ) : null}

      <Button label="Analizar" onPress={analyze} disabled={!photos[0]} />
      <AppText variant="small" color={colors.barkSoft} center>
        Puedes hacer hasta 3 revisiones al día.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  slot: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
});
