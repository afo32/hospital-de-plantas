import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { GoogleCancelled, googleSupported, isExpoGo } from '@/auth/google';
import { api } from '@/lib/api';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

type Props = { onError: (message: string) => void };

/**
 * Separador "o" + botón "Continuar con Google".
 * Solo aparece si la app es la build de desarrollo y el servidor tiene Google configurado.
 */
export function GoogleSection({ onError }: Props) {
  const { signInWithGoogle } = useAuth();
  const [serverEnabled, setServerEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!googleSupported) return;
    api<{ google: boolean }>('/auth/providers', { auth: false })
      .then((p) => setServerEnabled(p.google))
      .catch(() => setServerEnabled(false));
  }, []);

  if (!googleSupported || !serverEnabled) {
    return __DEV__ && isExpoGo ? (
      <AppText variant="small" color={colors.barkSoft} center>
        El acceso con Google aparece en la app de desarrollo, no en Expo Go.
      </AppText>
    ) : null;
  }

  const press = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (!(err instanceof GoogleCancelled)) {
        onError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <AppText variant="quote" color={colors.barkSoft}>
          o
        </AppText>
        <View style={styles.line} />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.moss} />
      ) : (
        <Button label="Continuar con Google" variant="outline" onPress={press} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
});
