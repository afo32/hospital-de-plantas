import type { TaskType } from '@hdp/shared';
import { colors } from '@/theme/tokens';
import { DropIcon, FertilizeIcon, PotIcon } from './icons';

export const TASK_COLORS: Record<TaskType, string> = {
  water: colors.water,
  fertilize: colors.moss,
  repot: colors.ember,
};

export function TaskIcon({ type, size = 22, color }: { type: TaskType; size?: number; color?: string }) {
  const c = color ?? TASK_COLORS[type];
  if (type === 'water') return <DropIcon color={c} size={size} />;
  if (type === 'fertilize') return <FertilizeIcon color={c} size={size} />;
  return <PotIcon color={c} size={size} />;
}
