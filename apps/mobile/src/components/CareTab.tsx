import {
  labelOf,
  LIGHT_LEVELS,
  POT_MATERIALS,
  type PlantDetail,
  type TaskType,
  type UpdatePlantInput,
} from '@hdp/shared';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { relativeDay, shortDate } from '@/lib/dates';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { ArrivalCard } from './ArrivalCard';
import { Card } from './Card';
import { PotIcon, SunIcon } from './icons';
import { MeasureGuide } from './MeasureGuide';
import { RepotCheckSheet } from './RepotCheckSheet';
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
  onMeasureLight: () => void;
  /** Ejecuta una acción que devuelve la planta actualizada (con su indicador de carga) */
  onRun: (key: string, action: () => Promise<PlantDetail>) => void;
};

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Pestaña "Cuidado": clima, riego, fertilización, trasplante, maceta y calendario. */
export function CareTab({
  detail,
  busy,
  calendarVersion,
  onComplete,
  onUndo,
  onSnooze,
  onUpdate,
  onMeasureLight,
  onRun,
}: Props) {
  const { care, plant, today } = detail;
  const doneToday = (type: TaskType, last: string | null) => last === today && !!type;
  const [checkingRepot, setCheckingRepot] = useState(false);

  return (
    <View style={styles.wrap}>
      <ArrivalCard detail={detail} busy={busy} onRun={onRun} />
      <ClimateCard detail={detail} />

      <Card>
        <Title icon={<SunIcon color={colors.gold} />} text="Luz" />
        <AppText>
          {labelOf(LIGHT_LEVELS, plant.lightLevel)}
          {plant.lightLux != null ? ` · medida: ${plant.lightLux.toLocaleString('es-ES')} lux` : ''}
        </AppText>
        <Button label="Medir la luz de su sitio" variant="outline" onPress={onMeasureLight} />
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
        {care.repot.urgent ? (
          <View style={styles.urgent}>
            <AppText variant="bodyStrong" color={colors.berry}>
              Toca trasplantar
            </AppText>
          </View>
        ) : null}
        <AppText>{care.repot.note}</AppText>
        <Button
          label={care.repot.signs.length ? `Revisar señales (${care.repot.signs.length} marcadas)` : '¿Necesita trasplante? Comprobar señales'}
          variant="ghost"
          onPress={() => setCheckingRepot(true)}
        />
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

      <RepotCheckSheet
        visible={checkingRepot}
        initial={care.repot.signs}
        onClose={() => setCheckingRepot(false)}
        onSave={(signs) => {
          setCheckingRepot(false);
          void onUpdate({ repotSigns: signs as UpdatePlantInput['repotSigns'] });
        }}
      />

      {/* Maceta */}
      <PotCard detail={detail} onUpdate={onUpdate} />

      <AppText variant="title" color={colors.mossDeep}>
        Calendario
      </AppText>
      <MonthCalendar plantId={plant.id} today={today} version={calendarVersion} />
    </View>
  );
}

const CLIMATE_TONE: Record<string, string> = {
  ok_outside: colors.moss,
  indoor_ok: colors.moss,
  day_out_night_in: colors.gold,
  shade_midday: colors.ember,
  keep_inside: colors.berry,
};

function ClimateCard({ detail }: { detail: PlantDetail }) {
  const c = detail.care.climate;
  if (!c) {
    return (
      <Card>
        <Title icon={<SunIcon color={colors.gold} />} text="Clima de tu zona" />
        <AppText color={colors.barkSoft}>
          Indica dónde vives y te diré cada día si esta planta puede estar fuera, si conviene meterla de noche y te
          avisaré de heladas.
        </AppText>
        <Button label="Indicar ubicación" variant="outline" onPress={() => router.push('/profile')} />
      </Card>
    );
  }
  const tone = CLIMATE_TONE[c.verdict] ?? colors.mossDeep;
  return (
    <Card>
      <Title icon={<SunIcon color={tone} />} text={c.title} color={tone} />
      <View style={styles.stats}>
        {c.nowC != null ? <Stat label="Ahora" value={`${Math.round(c.nowC)} °C`} /> : null}
        {c.todayMaxC != null ? <Stat label="Máx. hoy" value={`${Math.round(c.todayMaxC)} °C`} /> : null}
        {c.tonightMinC != null ? (
          <Stat
            label="Esta noche"
            value={`${Math.round(c.tonightMinC)} °C`}
            highlight={c.verdict !== 'ok_outside' && c.verdict !== 'indoor_ok'}
          />
        ) : null}
      </View>
      <AppText>{c.message}</AppText>
      {c.alerts.length ? (
        <View style={styles.alerts}>
          {c.alerts.slice(0, 4).map((a) => (
            <AppText key={a.day} variant="small" color={colors.berry}>
              {shortDate(a.day)}: {a.message}
            </AppText>
          ))}
        </View>
      ) : null}
      <AppText variant="small" color={colors.barkSoft}>
        {c.place ? `${c.place} · ` : ''}Datos del tiempo: Open-Meteo.com
      </AppText>
    </Card>
  );
}

function PotCard({ detail, onUpdate }: { detail: PlantDetail; onUpdate: Props['onUpdate'] }) {
  const { care, plant } = detail;
  const [editing, setEditing] = useState(care.pot.verdict === 'need_size');
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    potDiameterCm: String(plant.potDiameterCm),
    potHeightCm: String(plant.potHeightCm),
    potLengthCm: plant.potLengthCm ? String(plant.potLengthCm) : '',
    plantHeightCm: plant.plantHeightCm ? String(plant.plantHeightCm) : '',
    plantWidthCm: plant.plantWidthCm ? String(plant.plantWidthCm) : '',
  });
  const rect = plant.potShape === 'rectangular';
  const verdictColor =
    care.pot.verdict === 'ok' ? colors.moss : care.pot.verdict === 'need_size' ? colors.gold : colors.berry;

  const save = async () => {
    setSaving(true);
    try {
      await onUpdate({
        potDiameterCm: num(f.potDiameterCm),
        potHeightCm: num(f.potHeightCm),
        ...(rect ? { potLengthCm: num(f.potLengthCm) ?? null } : {}),
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
          <AppText variant="label" color={colors.gold}>
            MACETA
          </AppText>
          <MeasureGuide kind="pot" shape={rect ? 'rectangular' : 'round'} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label={rect ? 'A · Ancho (cm)' : 'A · Diámetro (cm)'}
                keyboardType="decimal-pad"
                value={f.potDiameterCm}
                onChangeText={(t) => setF({ ...f, potDiameterCm: t })}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="B · Alto (cm)"
                keyboardType="decimal-pad"
                value={f.potHeightCm}
                onChangeText={(t) => setF({ ...f, potHeightCm: t })}
              />
            </View>
            {rect ? (
              <View style={styles.flex}>
                <TextField
                  label="C · Largo (cm)"
                  keyboardType="decimal-pad"
                  value={f.potLengthCm}
                  onChangeText={(t) => setF({ ...f, potLengthCm: t })}
                />
              </View>
            ) : null}
          </View>
          <AppText variant="label" color={colors.gold}>
            PLANTA
          </AppText>
          <MeasureGuide kind="plant" />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="A · Alto (cm)"
                keyboardType="decimal-pad"
                value={f.plantHeightCm}
                onChangeText={(t) => setF({ ...f, plantHeightCm: t })}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="B · Ancho (cm)"
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
  urgent: {
    alignSelf: 'flex-start',
    backgroundColor: '#F6E3DC',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
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
  alerts: { gap: 4 },
});
