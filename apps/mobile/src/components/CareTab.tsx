import { labelOf, POT_MATERIALS, type PlantDetail, type TaskType, type UpdatePlantInput } from '@hdp/shared';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { relativeDay, shortDate } from '@/lib/dates';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { PotIcon, SunIcon } from './icons';
import { MonthCalendar } from './MonthCalendar';
import { TASK_COLORS, TaskIcon } from './TaskIcon';
import { TextField } from './TextField';

type Props = {
  detail: PlantDetail;
  busy: string | null;
  calendarVersion: number;
  onComplete: (type: TaskType) => void;
  onUndo: (type: TaskType) => void;
  onSnooze: () => void;
  onUpdate: (input: UpdatePlantInput) => Promise<void>;
};

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Pestaña "Cuidado": clima, riego, fertilización, trasplante, maceta y calendario. */
export function CareTab({ detail, busy, calendarVersion, onComplete, onUndo, onSnooze, onUpdate }: Props) {
  const { care, plant, today } = detail;
  const doneToday = (type: TaskType, last: string | null) => last === today && !!type;

  return (
    <View style={styles.wrap}>
      <Card>
        <Title icon={<SunIcon color={colors.gold} />} text="Clima de tu zona" />
        <AppText color={colors.barkSoft}>
          Pronto te diré aquí si la temperatura de hoy le va bien dentro o fuera, y si conviene sacarla de día y meterla
          de noche (fase 5).
        </AppText>
      </Card>

      {care.suggestions.map((s) => (
        <Card key={s} style={styles.suggestion}>
          <AppText color={colors.mossDeep}>{s}</AppText>
        </Card>
      ))}

      {/* Riego */}
      <Card>
        <Title icon={<TaskIcon type="water" />} text="Riego" color={TASK_COLORS.water} />
        <View style={styles.stats}>
          <Stat label="Cada" value={`${care.water.everyDays} días`} />
          <Stat label="Cantidad" value={`${care.water.amountMl} ml`} />
          <Stat
            label="Próximo"
            value={relativeDay(care.water.nextDay, today)}
            highlight={care.water.nextDay <= today}
          />
        </View>
        <AppText variant="small" color={colors.barkSoft}>
          {care.water.lastDay ? `Último riego: ${shortDate(care.water.lastDay)}` : 'Aún no hay riegos registrados'}
          {care.water.snoozedUntil ? ` · Pospuesto hasta el ${shortDate(care.water.snoozedUntil)}` : ''}
        </AppText>
        <AppText>{care.water.howTo}</AppText>
        {care.water.factors.length ? (
          <AppText variant="small" color={colors.barkSoft}>
            Ajustado por: {care.water.factors.join(' · ')}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.flex}>
            {doneToday('water', care.water.lastDay) ? (
              <Button
                label="Deshacer riego de hoy"
                variant="ghost"
                onPress={() => onUndo('water')}
                loading={busy === 'water'}
              />
            ) : (
              <Button label="Regada hoy" onPress={() => onComplete('water')} loading={busy === 'water'} />
            )}
          </View>
          {!doneToday('water', care.water.lastDay) ? (
            <Button label="Posponer" variant="outline" onPress={onSnooze} />
          ) : null}
        </View>
      </Card>

      {/* Fertilización */}
      <Card>
        <Title icon={<TaskIcon type="fertilize" />} text="Fertilización" color={TASK_COLORS.fertilize} />
        {care.fertilize.everyDays ? (
          <View style={styles.stats}>
            <Stat label="Cada" value={`${care.fertilize.everyDays} días`} />
            <Stat
              label="Próxima"
              value={care.fertilize.nextDay ? relativeDay(care.fertilize.nextDay, today) : '—'}
              highlight={!!care.fertilize.nextDay && care.fertilize.nextDay <= today}
            />
          </View>
        ) : null}
        {care.fertilize.pausedReason ? <AppText color={colors.barkSoft}>{care.fertilize.pausedReason}</AppText> : null}
        <AppText>{care.fertilize.product}</AppText>
        {care.fertilize.everyDays ? (
          doneToday('fertilize', care.fertilize.lastDay) ? (
            <Button
              label="Deshacer abono de hoy"
              variant="ghost"
              onPress={() => onUndo('fertilize')}
              loading={busy === 'fertilize'}
            />
          ) : (
            <Button
              label="Abonada hoy"
              variant="outline"
              onPress={() => onComplete('fertilize')}
              loading={busy === 'fertilize'}
            />
          )
        ) : null}
      </Card>

      {/* Trasplante */}
      <Card>
        <Title icon={<TaskIcon type="repot" />} text="Trasplante" color={TASK_COLORS.repot} />
        <View style={styles.stats}>
          <Stat label="Cada" value={`${care.repot.everyMonths} meses`} />
          <Stat label="Próximo" value={care.repot.nextDay ? shortDate(care.repot.nextDay) : 'Revisar'} />
        </View>
        <AppText>{care.repot.note}</AppText>
        {doneToday('repot', care.repot.lastDay) ? (
          <Button
            label="Deshacer trasplante de hoy"
            variant="ghost"
            onPress={() => onUndo('repot')}
            loading={busy === 'repot'}
          />
        ) : (
          <Button
            label="Trasplantada hoy"
            variant="outline"
            onPress={() => onComplete('repot')}
            loading={busy === 'repot'}
          />
        )}
      </Card>

      {/* Maceta */}
      <PotCard detail={detail} onUpdate={onUpdate} />

      <AppText variant="title" color={colors.mossDeep}>
        Calendario
      </AppText>
      <MonthCalendar plantId={plant.id} today={today} version={calendarVersion} />
    </View>
  );
}

function PotCard({ detail, onUpdate }: { detail: PlantDetail; onUpdate: Props['onUpdate'] }) {
  const { care, plant } = detail;
  const [editing, setEditing] = useState(care.pot.verdict === 'need_size');
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    potDiameterCm: String(plant.potDiameterCm),
    potHeightCm: String(plant.potHeightCm),
    plantHeightCm: plant.plantHeightCm ? String(plant.plantHeightCm) : '',
    plantWidthCm: plant.plantWidthCm ? String(plant.plantWidthCm) : '',
  });
  const verdictColor =
    care.pot.verdict === 'ok' ? colors.moss : care.pot.verdict === 'need_size' ? colors.gold : colors.berry;

  const save = async () => {
    setSaving(true);
    try {
      await onUpdate({
        potDiameterCm: num(f.potDiameterCm),
        potHeightCm: num(f.potHeightCm),
        plantHeightCm: num(f.plantHeightCm) ?? null,
        plantWidthCm: num(f.plantWidthCm) ?? null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Title icon={<PotIcon color={colors.ember} />} text="Maceta" color={colors.ember} />
      <AppText variant="small" color={colors.barkSoft}>
        {plant.potShape === 'rectangular'
          ? `${plant.potLengthCm} × ${plant.potDiameterCm}`
          : `Ø ${plant.potDiameterCm}`}{' '}
        × {plant.potHeightCm} cm · {care.pot.volumeL.toLocaleString('es-ES')} L ·{' '}
        {plant.potMaterial ? labelOf(POT_MATERIALS, plant.potMaterial) : 'material desconocido'} ·{' '}
        {plant.hasDrainage ? 'con drenaje' : 'sin drenaje'}
      </AppText>
      <View style={[styles.verdict, { borderColor: verdictColor }]}>
        <AppText color={verdictColor}>{care.pot.message}</AppText>
      </View>
      {editing ? (
        <View style={styles.editor}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="Maceta Ø (cm)"
                keyboardType="decimal-pad"
                value={f.potDiameterCm}
                onChangeText={(t) => setF({ ...f, potDiameterCm: t })}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Maceta alto (cm)"
                keyboardType="decimal-pad"
                value={f.potHeightCm}
                onChangeText={(t) => setF({ ...f, potHeightCm: t })}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="Planta alto (cm)"
                keyboardType="decimal-pad"
                value={f.plantHeightCm}
                onChangeText={(t) => setF({ ...f, plantHeightCm: t })}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Planta ancho (cm)"
                keyboardType="decimal-pad"
                value={f.plantWidthCm}
                onChangeText={(t) => setF({ ...f, plantWidthCm: t })}
              />
            </View>
          </View>
          <Button label="Guardar medidas" onPress={save} loading={saving} />
        </View>
      ) : (
        <Button label="Cambiar medidas" variant="ghost" onPress={() => setEditing(true)} />
      )}
    </Card>
  );
}

function Title({ icon, text, color = colors.mossDeep }: { icon: ReactNode; text: string; color?: string }) {
  return (
    <View style={styles.title}>
      {icon}
      <AppText variant="heading" color={color}>
        {text}
      </AppText>
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <AppText variant="label" color={colors.gold}>
        {label.toUpperCase()}
      </AppText>
      <AppText variant="bodyStrong" color={highlight ? colors.berry : colors.bark}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  title: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.parchment,
    borderRadius: radius.sm,
    padding: space.sm,
    gap: 2,
  },
  actions: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
  suggestion: { backgroundColor: '#EEF2E4', borderColor: colors.fern },
  verdict: { borderLeftWidth: 3, paddingLeft: space.sm, paddingVertical: 2 },
  editor: { gap: space.sm },
});
