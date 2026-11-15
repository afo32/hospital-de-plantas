import { TASK_LABELS, type Task } from '@hdp/shared';
import { Image } from 'expo-image';
import { imageSource } from '@/lib/media';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { relativeDay, shortDate } from '@/lib/dates';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Card } from './Card';
import { CheckIcon, HourglassIcon, SproutIcon } from './icons';
import { TASK_COLORS, TaskIcon } from './TaskIcon';

type Props = {
  task: Task;
  today: string;
  busy: boolean;
  onToggle: () => void;
  onSnooze?: () => void;
  onOpen: () => void;
};

/** Una tarea de "Hoy": foto, planta, qué hacer y el círculo para marcarla. */
export function TaskRow({ task, today, busy, onToggle, onSnooze, onOpen }: Props) {
  const color = TASK_COLORS[task.type];
  const what = `${TASK_LABELS[task.type]}${task.amountMl ? ` · ${task.amountMl} ml` : ''}`;
  const when = task.done
    ? `Hecho${task.doneBy ? ` por ${task.doneBy}` : ''}`
    : task.daysLate > 0
      ? `Tocaba ${relativeDay(task.dueDay, today)}`
      : task.daysLate === 0
        ? 'Hoy'
        : `${shortDate(task.dueDay)} · ${relativeDay(task.dueDay, today)}`;

  return (
    <Card style={[styles.card, task.done && styles.done]} onPress={onOpen} accessibilityLabel={`${task.plantName}: ${what}`}>
      <View style={styles.row}>
        {task.imageUrl ? (
          <Image source={imageSource(task.imageUrl)} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <SproutIcon color={colors.fern} size={26} />
          </View>
        )}
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1} style={task.done && styles.struck}>
            {task.plantName}
          </AppText>
          <View style={styles.what}>
            <TaskIcon type={task.type} size={16} />
            <AppText variant="small" color={color}>
              {what}
            </AppText>
          </View>
          <AppText variant="small" color={task.daysLate > 0 && !task.done ? colors.berry : colors.barkSoft}>
            {when}
          </AppText>
        </View>

        {onSnooze && !task.done ? (
          <Pressable onPress={onSnooze} hitSlop={8} style={styles.iconButton} accessibilityLabel="Posponer riego">
            <HourglassIcon color={colors.gold} size={20} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={onToggle}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done, busy }}
          accessibilityLabel={task.done ? 'Deshacer' : 'Marcar como hecho'}
          style={[styles.check, { borderColor: color }, task.done && { backgroundColor: color }]}
        >
          {busy ? (
            <ActivityIndicator color={task.done ? colors.vellum : color} size="small" />
          ) : task.done ? (
            <CheckIcon color={colors.vellum} />
          ) : null}
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.sm },
  done: { opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  image: { width: 58, height: 58, borderRadius: radius.sm, backgroundColor: colors.parchmentDeep },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  struck: { textDecorationLine: 'line-through' },
  what: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { padding: 4 },
  check: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
