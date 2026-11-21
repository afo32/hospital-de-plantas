import {
  DIFFICULTY_LABELS,
  type GuideStatus,
  PROPAGATION_METHODS,
  type PropagationMethod,
} from '@hdp/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/ChipGroup';
import { Chip } from '@/components/Chip';
import { OptionList } from '@/components/OptionList';
import { PlantFinder } from '@/components/PlantFinder';
import { TextField } from '@/components/TextField';
import { WaitingCard } from '@/components/WaitingCard';
import { addDays, monthsText } from '@/lib/dates';
import { localToday } from '@/lib/garden';
import { createPropagation, getGuide } from '@/lib/propagation';
import { colors, space } from '@/theme/tokens';

const COUNT_LABEL: Record<PropagationMethod, string> = {
  seed: '¿Cuántas semillas siembras?',
  cutting: '¿Cuántos esquejes pones?',
  division: '¿En cuántas partes la divides?',
  layering: '¿Cuántos acodos haces?',
};

const STARTS = [
  { value: '0', label: 'Hoy' },
  { value: '1', label: 'Ayer' },
  { value: '3', label: 'Hace 3 días' },
  { value: '7', label: 'Hace una semana' },
] as const;

const WRITING = [
  'El viverista está afilando el lápiz…',
  'Buscando la temperatura justa para germinar…',
  'Contando días de cada etapa…',
  'Apuntando los errores típicos para que no te pasen…',
];

type Pick = { id: string; name: string };

/** Empezar una crianza: elegir planta, método y detalles. */
export default function NewPropagationScreen() {
  const params = useLocalSearchParams<{ speciesId?: string; name?: string }>();
  const { user } = useAuth();
  const [species, setSpecies] = useState<Pick | null>(params.speciesId ? { id: params.speciesId, name: params.name ?? 'Tu planta' } : null);
  const [method, setMethod] = useState<PropagationMethod | null>(null);
  const [guide, setGuide] = useState<GuideStatus | null>(null);
  const [step, setStep] = useState<'species' | 'method' | 'details'>(params.speciesId ? 'method' : 'species');
  const [name, setName] = useState('');
  const [count, setCount] = useState('');
  const [start, setStart] = useState<(typeof STARTS)[number]['value']>('0');
  const [saving, setSaving] = useState(false);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (poll.current) clearTimeout(poll.current);
  }, []);

  const fetchGuide = async (m: PropagationMethod, retry = false, tries = 0) => {
    if (!species) return;
    try {
      const g = await getGuide(species.id, m, retry);
      setGuide(g);
      if (g.status === 'generating' && tries < 75) {
        poll.current = setTimeout(() => void fetchGuide(m, false, tries + 1), 4000);
      }
    } catch (err) {
      setGuide({
        speciesId: species.id,
        method: m,
        status: 'failed',
        guide: null,
        message: err instanceof Error ? err.message : 'No se pudo cargar la guía.',
      });
    }
  };

  const chooseMethod = (m: PropagationMethod) => {
    if (poll.current) clearTimeout(poll.current);
    setMethod(m);
    setGuide(null);
    void fetchGuide(m);
  };

  const g = guide?.status === 'ready' ? guide.guide : null;
  const month = new Date().getMonth() + 1;
  const southern = (user?.lat ?? 40) < 0;
  const northMonth = southern ? ((month + 5) % 12) + 1 : month;
  const outOfSeason = !!g && g.bestMonths.length > 0 && !g.bestMonths.includes(northMonth);
  const bestMonths = g ? (southern ? g.bestMonths.map((m) => ((m + 5) % 12) + 1).sort((a, b) => a - b) : g.bestMonths) : [];

  const create = async () => {
    const gardenId = user?.defaultGardenId;
    if (!gardenId || !species || !method) return;
    const n = Number(count);
    setSaving(true);
    try {
      const d = await createPropagation(gardenId, {
        speciesId: species.id,
        method,
        name: name.trim() || undefined,
        count: Number.isInteger(n) && n > 0 ? n : 1,
        startDay: addDays(localToday(), -Number(start)),
      });
      router.replace({ pathname: '/crianza/[id]', params: { id: d.propagation.id } });
    } catch (err) {
      Alert.alert('No se pudo empezar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Nueva crianza' }} />

      {step === 'species' ? (
        <>
          <AppText color={colors.barkSoft}>¿Qué planta quieres criar?</AppText>
          <PlantFinder
            showIdentify={false}
            onPick={(s, id) => {
              setSpecies({ id, name: s.commonName ?? s.scientificName });
              setStep('method');
            }}
          />
        </>
      ) : null}

      {step === 'method' && species ? (
        <>
          <AppText variant="title" color={colors.mossDeep}>
            {species.name}
          </AppText>
          <AppText color={colors.barkSoft}>¿Cómo la vas a multiplicar?</AppText>
          <OptionList
            options={PROPAGATION_METHODS}
            value={method}
            onChange={(v) => chooseMethod(v as PropagationMethod)}
          />

          {method && (!guide || guide.status === 'generating') ? (
            <WaitingCard title="Preparando la guía paso a paso" messages={WRITING} />
          ) : null}

          {guide && (guide.status === 'failed' || guide.status === 'unavailable') ? (
            <Banner tone="warning" title="No se pudo preparar la guía">
              <AppText variant="small" color={colors.berry}>
                {guide.message}
              </AppText>
              {guide.status === 'failed' ? (
                <Button label="Reintentar" variant="outline" onPress={() => method && void fetchGuide(method, true)} />
              ) : null}
            </Banner>
          ) : null}

          {g ? (
            <Card style={styles.card}>
              {!g.suitable ? (
                <Banner tone="warning" title="No es el mejor método para esta planta">
                  <AppText variant="small" color={colors.berry}>
                    {g.suitabilityNote}
                  </AppText>
                </Banner>
              ) : (
                <AppText>{g.suitabilityNote}</AppText>
              )}
              <View style={styles.chips}>
                <Chip label={`Dificultad: ${DIFFICULTY_LABELS[g.difficulty].toLowerCase()}`} tone="gold" />
                <Chip label={g.successRate} tone="moss" />
              </View>
              {bestMonths.length ? (
                <AppText variant="small" color={colors.barkSoft}>
                  Mejor época para empezar: {monthsText(bestMonths)}.
                </AppText>
              ) : null}
              {outOfSeason ? (
                <AppText variant="small" color={colors.berry}>
                  Ahora no es su mejor época: puedes empezar igual, pero tardará más o saldrán menos.
                </AppText>
              ) : null}
              <AppText variant="label" color={colors.gold}>
                ETAPAS
              </AppText>
              {g.stages.map((s, i) => (
                <AppText key={s.title} variant="small">
                  {i + 1}. {s.title}
                  <AppText variant="small" color={colors.barkSoft}>
                    {' '}
                    · {s.minDays === s.maxDays ? `${s.maxDays} días` : `${s.minDays}–${s.maxDays} días`}
                  </AppText>
                </AppText>
              ))}
              <AppText variant="label" color={colors.gold}>
                QUÉ NECESITAS
              </AppText>
              {g.materials.map((m) => (
                <AppText key={m} variant="small">
                  · {m}
                </AppText>
              ))}
              <Button label="Empezar con esta guía" onPress={() => setStep('details')} />
            </Card>
          ) : null}

          {!params.speciesId ? (
            <Button label="Elegir otra planta" variant="ghost" onPress={() => setStep('species')} />
          ) : null}
        </>
      ) : null}

      {step === 'details' && species && method ? (
        <>
          <AppText variant="title" color={colors.mossDeep}>
            Últimos detalles
          </AppText>
          <TextField
            label={COUNT_LABEL[method]}
            keyboardType="number-pad"
            value={count}
            onChangeText={setCount}
            placeholder={method === 'seed' ? '12' : '3'}
          />
          <TextField
            label="Nombre (opcional)"
            value={name}
            onChangeText={setName}
            maxLength={50}
            placeholder={`${species.name} (${PROPAGATION_METHODS.find((m) => m.value === method)!.label.toLowerCase()})`}
          />
          <AppText variant="label" color={colors.gold}>
            ¿CUÁNDO EMPEZASTE?
          </AppText>
          <ChipGroup options={STARTS} value={start} onChange={setStart} />
          <Button label="Empezar la crianza" onPress={create} loading={saving} />
          <Button label="Volver" variant="ghost" onPress={() => setStep('method')} />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  card: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
