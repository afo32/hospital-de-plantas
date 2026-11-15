import { SNOOZE_DAYS } from '@hdp/shared';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { HourglassIcon } from './icons';

type Props = {
  plantName: string | null;
  onPick: (days: number) => void;
  onClose: () => void;
};

/** Hoja inferior: "Posponer riego 1, 2, 3, 5 o 7 días". */
export function SnoozeSheet({ plantName, onPick, onClose }: Props) {
  return (
    <Modal visible={!!plantName} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <HourglassIcon color={colors.gold} />
          <AppText variant="heading" color={colors.mossDeep}>
            Posponer el riego
          </AppText>
        </View>
        <AppText color={colors.barkSoft}>
          {plantName}: si la tierra aún está húmeda, mejor esperar. ¿Cuántos días?
        </AppText>
        <View style={styles.options}>
          {SNOOZE_DAYS.map((d) => (
            <Pressable
              key={d}
              onPress={() => onPick(d)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${d} ${d === 1 ? 'día' : 'días'}`}
            >
              <AppText variant="title" color={colors.mossDeep}>
                {d}
              </AppText>
              <AppText variant="label" color={colors.barkSoft}>
                {d === 1 ? 'día' : 'días'}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Button label="Cancelar" variant="ghost" onPress={onClose} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(59,46,34,0.35)' },
  sheet: {
    backgroundColor: colors.parchment,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 2,
    borderColor: colors.gold,
    padding: space.lg,
    gap: space.md,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  options: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.vellum,
  },
  optionPressed: { backgroundColor: colors.parchmentDeep },
});
