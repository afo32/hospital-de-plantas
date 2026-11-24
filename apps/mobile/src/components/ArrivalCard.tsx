import type { ArrivalTask, PlantDetail } from '@hdp/shared';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ARRIVAL_DAYS } from '@hdp/shared';
import { diffDays, relativeDay, shortDate } from '@/lib/dates';
import { endArrival, hideArrivalOffer, isArrivalOfferHidden, startArrival, toggleArrivalTask } from '@/lib/garden';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { CheckIcon, SeedIcon } from './icons';

type Run = (key: string, action: () => Promise<PlantDetail>) => void;

type Props = { detail: PlantDetail; busy: string | null; onRun: Run };

/** Plan "Recién llegada": qué hacer el primer mes después de comprarla. */
export function ArrivalCard({ detail, busy, onRun }: Props) {
  const { arrival, plant, today } = detail;
  const [showDone, setShowDone] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const recent = diffDays(plant.createdAt.slice(0, 10), today) <= 14;
  const [offerHidden, setOfferHidden] = useState(true);
  useEffect(() => {
    if (!arrival && recent) void isArrivalOfferHidden(plant.id).then(setOfferHidden);
  }, [arrival, recent, plant.id]);

  // Sin plan: si la añadiste hace poco (y no has dicho que ya la tenías), ofrecerlo.
  if (!arrival) {
    if (!recent || offerHidden) return null;
    return (
      <Card style={styles.offer}>
        <AppText color={colors.mossDeep}>¿La acabas de comprar? Te decimos qué hacer en su primer mes.</AppText>
        <Button
          label="Sí, ver qué hacer"
          variant="outline"
          loading={busy === 'arrival'}
          onPress={() => onRun('arrival', () => startArrival(plant.id))}
        />
        <Button
          label="No, ya la tenía"
          variant="ghost"
          onPress={() => {
            setOfferHidden(true);
            void hideArrivalOffer(plant.id);
          }}
        />
      </Card>
    );
  }

  const pending = arrival.tasks.filter((t) => !t.done && t.dueDay <= today);
  const upcoming = arrival.tasks.filter((t) => !t.done && t.dueDay > today);
  const done = arrival.tasks.filter((t) => t.done);
  const progress = arrival.tasks.length ? done.length / arrival.tasks.length : 0;
  const finished = pending.length === 0 && upcoming.length === 0;

  const toggle = (t: ArrivalTask) => onRun(`arrival:${t.id}`, () => toggleArrivalTask(plant.id, t.id, !t.done));
  const close = () =>
    Alert.alert('¿Ya está adaptada?', 'Se cierra el plan del primer mes y vuelve el calendario normal de abono y trasplante.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, cerrar', onPress: () => onRun('arrival', () => endArrival(plant.id)) },
    ]);

  const row = (t: ArrivalTask, showWhen: boolean) => {
    const expanded = open === t.id || (!showWhen && !t.done);
    return (
      <View key={t.id} style={styles.task}>
        <Pressable
          onPress={() => toggle(t)}
          disabled={busy !== null}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: t.done }}
          accessibilityLabel={t.title}
        >
          <View style={[styles.box, t.done && styles.boxOn]}>
            {t.done ? <CheckIcon color={colors.vellum} size={14} /> : null}
          </View>
        </Pressable>
        <Pressable style={styles.flex} onPress={() => setOpen(open === t.id ? null : t.id)}>
          <AppText style={[styles.bold, t.done && styles.struck]}>{t.title}</AppText>
          {showWhen ? (
            <AppText variant="small" color={colors.water}>
              {relativeDay(t.dueDay, today)} · {shortDate(t.dueDay)}
            </AppText>
          ) : null}
          {expanded ? (
            <AppText variant="small" color={colors.bark}>
              {t.detail}
            </AppText>
          ) : showWhen ? (
            <AppText variant="small" color={colors.barkSoft}>
              Toca para ver qué hacer
            </AppText>
          ) : null}
        </Pressable>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <SeedIcon color={colors.moss} size={24} />
        <View style={styles.flex}>
          <AppText variant="title">Recién llegada</AppText>
          <AppText variant="small" color={colors.barkSoft}>
            Día {Math.min(arrival.dayNumber + 1, ARRIVAL_DAYS)} de {ARRIVAL_DAYS} · llegó el {shortDate(arrival.startDay)}
          </AppText>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <AppText color={colors.mossDeep}>{arrival.intro}</AppText>

      {pending.length ? (
        <View style={styles.block}>
          <AppText variant="label" color={colors.gold}>
            AHORA
          </AppText>
          {pending.map((t) => row(t, false))}
        </View>
      ) : null}

      {upcoming.length ? (
        <View style={styles.block}>
          <AppText variant="label" color={colors.gold}>
            PRÓXIMAMENTE
          </AppText>
          {upcoming.map((t) => row(t, true))}
        </View>
      ) : null}

      {finished ? (
        <AppText color={colors.mossDeep}>¡Has hecho todo! Ya debería estar adaptada a su nueva casa.</AppText>
      ) : null}

      {done.length ? (
        <View style={styles.block}>
          <Pressable onPress={() => setShowDone(!showDone)}>
            <AppText variant="small" color={colors.moss} style={styles.bold}>
              {showDone ? 'Ocultar' : 'Ver'} hechas ({done.length})
            </AppText>
          </Pressable>
          {showDone ? done.map((t) => row(t, false)) : null}
        </View>
      ) : null}

      <Button
        label="Ya está adaptada"
        variant={finished ? 'primary' : 'ghost'}
        loading={busy === 'arrival'}
        onPress={close}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: colors.moss, borderWidth: 1.5 },
  offer: { gap: space.sm },
  head: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.moss },
  block: { gap: space.sm },
  task: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: 2 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.moss, borderColor: colors.moss },
  struck: { textDecorationLine: 'line-through', color: colors.barkSoft },
  bold: { fontWeight: '700' },
});
