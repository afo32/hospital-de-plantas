import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

export type SheetAction = { label: string; onPress: () => void; destructive?: boolean };

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
};

/** Hoja inferior con varias acciones (hacer foto, elegir de la galería…). */
export function ActionSheet({ visible, title, message, actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />
        <AppText variant="heading" color={colors.mossDeep}>
          {title}
        </AppText>
        {message ? <AppText color={colors.barkSoft}>{message}</AppText> : null}
        <View style={styles.list}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <AppText variant="bodyStrong" color={a.destructive ? colors.berry : colors.mossDeep}>
                {a.label}
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
  list: { gap: space.sm },
  action: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.vellum,
  },
  pressed: { backgroundColor: colors.parchmentDeep },
});
