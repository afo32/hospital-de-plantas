import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '@/lib/api';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

/** Se muestra al abrir la app con sesión guardada pero sin poder hablar con el servidor. */
export function OfflineScreen({ onRetry, onSignOut }: { onRetry: () => void; onSignOut: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <EmptyState
          title="No llegamos al servidor"
          message="Revisa tu conexión a internet o que el API esté encendido."
        />
        <AppText variant="small" color={colors.barkSoft} center>
          {API_URL}
        </AppText>
        <Button label="Reintentar" onPress={onRetry} />
        <Button label="Cerrar sesión" variant="ghost" onPress={onSignOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  content: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.md },
});
