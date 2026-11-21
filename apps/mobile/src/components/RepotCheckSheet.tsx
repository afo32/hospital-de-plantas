import { REPOT_SIGNS } from '@hdp/shared';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { OptionList } from './OptionList';

type Props = {
  visible: boolean;
  initial: string[];
  onSave: (signs: string[]) => void;
  onClose: () => void;
};

/** "¿Necesita trasplante?": marca lo que ves en la planta. */
export function RepotCheckSheet({ visible, initial, onSave, onClose }: Props) {
  const [signs, setSigns] = useState<string[]>(initial);
  useEffect(() => {
    if (visible) setSigns(initial);
  }, [visible, initial]);

  const toggle = (v: string) => setSigns((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />
        <AppText variant="heading" color={colors.mossDeep}>
          ¿Necesita trasplante?
        </AppText>
        <AppText color={colors.barkSoft}>
          Marca lo que ves ahora en la planta. Con 2 o más señales, toca cambiarla de maceta.
        </AppText>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <OptionList
            options={REPOT_SIGNS.map((s) => ({ value: s.value, label: s.label, hint: s.hint }))}
            value={signs}
            onChange={toggle}
          />
        </ScrollView>
        <Button label={signs.length ? `Guardar (${signs.length})` : 'No veo ninguna'} onPress={() => onSave(signs)} />
        <Button label="Cancelar" variant="ghost" onPress={onClose} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(59,46,34,0.35)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.parchment,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 2,
    borderColor: colors.gold,
    padding: space.lg,
    gap: space.sm,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  list: { flexGrow: 0 },
  listContent: { paddingVertical: space.sm },
});
