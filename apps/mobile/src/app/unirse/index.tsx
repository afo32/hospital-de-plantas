import { ScrollView, StyleSheet } from 'react-native';
import { JoinInvite } from '@/components/JoinInvite';
import { colors } from '@/theme/tokens';

/** Unirme a un jardín escribiendo el código. */
export default function JoinScreen() {
  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <JoinInvite />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.parchment } });
