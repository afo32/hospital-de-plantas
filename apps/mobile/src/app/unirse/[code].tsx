import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { JoinInvite } from '@/components/JoinInvite';
import { colors } from '@/theme/tokens';

/** Se abre con el enlace de invitación: hospitaldeplantas://unirse/HOJA-7K3Q */
export default function JoinFromLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <ScrollView style={styles.screen}>
      <JoinInvite initialCode={code} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.parchment } });
