import { type CreateReportInput, REPORT_REASONS } from '@hdp/shared';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reportContent } from '@/lib/propagation';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { OptionList } from './OptionList';
import { TextField } from './TextField';

type Target = Pick<CreateReportInput, 'targetType' | 'targetId'>;

/** Enlace discreto "Informar de un problema" + hoja para contar qué pasa con el contenido de IA. */
export function ReportLink({ target, label = 'Informar de un problema con este contenido' }: { target: Target; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" hitSlop={8} style={styles.link}>
        <AppText variant="small" color={colors.barkSoft} style={styles.underline}>
          ⚑ {label}
        </AppText>
      </Pressable>
      <ReportSheet target={open ? target : null} onClose={() => setOpen(false)} />
    </>
  );
}

function ReportSheet({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const [reason, setReason] = useState<CreateReportInput['reason'] | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (target) {
      setReason(null);
      setDetails('');
    }
  }, [target]);

  const send = async () => {
    if (!target || !reason) return;
    setSending(true);
    try {
      await reportContent({ ...target, reason, details: details.trim() || undefined });
      onClose();
      Alert.alert('Gracias', 'Lo revisaremos para corregirlo.');
    } catch (err) {
      Alert.alert('No se pudo enviar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />
        <AppText variant="heading" color={colors.mossDeep}>
          ¿Qué problema tiene?
        </AppText>
        <AppText variant="small" color={colors.barkSoft}>
          Este texto lo ha escrito una inteligencia artificial y puede equivocarse. Cuéntanos qué está mal.
        </AppText>
        <OptionList options={REPORT_REASONS} value={reason} onChange={setReason} />
        <TextField
          label="Detalles (opcional)"
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={1000}
          placeholder="Por ejemplo: dice que no es tóxica para gatos y sí lo es"
        />
        <Button label="Enviar" onPress={send} disabled={!reason} loading={sending} />
        <Button label="Cancelar" variant="ghost" onPress={onClose} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: space.sm },
  underline: { textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(59,46,34,0.35)' },
  sheet: {
    backgroundColor: colors.parchment,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 2,
    borderColor: colors.gold,
    padding: space.lg,
    gap: space.sm,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
});
