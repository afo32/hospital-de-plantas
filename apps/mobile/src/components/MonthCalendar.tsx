import { TASK_LABELS, type CalendarItem, type TaskType } from '@hdp/shared';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MONTHS, monthGrid, shortDate, WEEKDAYS_SHORT } from '@/lib/dates';
import { getCalendar } from '@/lib/garden';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { TASK_COLORS, TaskIcon } from './TaskIcon';

type Props = { plantId: string; today: string; /** cambia para forzar recarga */ version: number };

const STATUS_LABEL: Record<CalendarItem['status'], string> = {
  done: 'hecho',
  planned: 'previsto',
  snoozed: 'pospuesto',
};

/** Calendario mensual con puntos de colores: azul riego, verde abono, marrón trasplante. */
export function MonthCalendar({ plantId, today, version }: Props) {
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [selected, setSelected] = useState<string>(today);

  const cells = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const from = cells.find(Boolean)!;
  const to = [...cells].reverse().find(Boolean)!;

  useEffect(() => {
    let alive = true;
    setItems(null);
    getCalendar(plantId, from, to)
      .then((r) => alive && setItems(r.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [plantId, from, to, version]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items ?? []) map.set(it.day, [...(map.get(it.day) ?? []), it]);
    return map;
  }, [items]);

  const move = (delta: number) =>
    setYm(({ y, m }) => {
      const n = m + delta;
      return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n };
    });

  const selectedItems = byDay.get(selected) ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => move(-1)} hitSlop={10} accessibilityLabel="Mes anterior">
          <Chevron dir="left" />
        </Pressable>
        <AppText variant="heading" color={colors.mossDeep}>
          {MONTHS[ym.m - 1]!.charAt(0).toUpperCase() + MONTHS[ym.m - 1]!.slice(1)} {ym.y}
        </AppText>
        <Pressable onPress={() => move(1)} hitSlop={10} accessibilityLabel="Mes siguiente">
          <Chevron dir="right" />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS_SHORT.map((d) => (
          <AppText key={d} variant="label" color={colors.barkSoft} style={styles.weekday}>
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={styles.cell} />;
          const dayItems = byDay.get(day) ?? [];
          const isToday = day === today;
          const isSel = day === selected;
          return (
            <Pressable
              key={day}
              onPress={() => setSelected(day)}
              style={[styles.cell, isSel && styles.cellSelected]}
              accessibilityLabel={`${shortDate(day)}: ${dayItems.length} tareas`}
            >
              <AppText
                variant="small"
                color={isToday ? colors.vellum : colors.bark}
                style={[styles.dayNum, isToday && styles.today]}
              >
                {Number(day.slice(8))}
              </AppText>
              <View style={styles.dots}>
                {dayItems.slice(0, 3).map((it) => (
                  <View
                    key={`${it.type}${it.status}`}
                    style={[
                      styles.dot,
                      it.status === 'done' && { backgroundColor: TASK_COLORS[it.type] },
                      it.status === 'planned' && { borderColor: TASK_COLORS[it.type], borderWidth: 1.5 },
                      it.status === 'snoozed' && { backgroundColor: colors.border },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      {items === null ? <ActivityIndicator color={colors.moss} /> : null}

      <View style={styles.legend}>
        {(['water', 'fertilize', 'repot'] as TaskType[]).map((t) => (
          <View key={t} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: TASK_COLORS[t] }]} />
            <AppText variant="small" color={colors.barkSoft}>
              {TASK_LABELS[t]}
            </AppText>
          </View>
        ))}
        <AppText variant="small" color={colors.barkSoft}>
          · relleno: hecho · borde: previsto
        </AppText>
      </View>

      <View style={styles.dayList}>
        <AppText variant="label" color={colors.gold}>
          {shortDate(selected).toUpperCase()}
        </AppText>
        {selectedItems.length === 0 ? (
          <AppText variant="small" color={colors.barkSoft}>
            Nada este día.
          </AppText>
        ) : (
          selectedItems.map((it) => (
            <View key={`${it.type}${it.status}`} style={styles.dayItem}>
              <TaskIcon type={it.type} size={18} color={it.status === 'snoozed' ? colors.barkSoft : undefined} />
              <AppText>
                {TASK_LABELS[it.type]} · {STATUS_LABEL[it.status]}
              </AppText>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Path
        d={dir === 'left' ? 'M14 5l-6 6 6 6' : 'M8 5l6 6-6 6'}
        stroke={colors.gold}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.vellum,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cellSelected: { backgroundColor: colors.parchmentDeep },
  dayNum: { width: 26, height: 26, textAlign: 'center', lineHeight: 26, borderRadius: 13, overflow: 'hidden' },
  today: { backgroundColor: colors.moss, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 2, height: 7, marginTop: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayList: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  dayItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
