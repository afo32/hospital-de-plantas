import type { HealthResponse } from '@hdp/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { API_URL, getHealth } from '@/lib/api';
import { colors, space } from '@/theme/tokens';

type Status =
  | { kind: 'loading' }
  | { kind: 'ok'; health: HealthResponse }
  | { kind: 'error'; message: string };

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [signingOut, setSigningOut] = useState(false);

  const check = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      setStatus({ kind: 'ok', health: await getHealth() });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Error desconocido' });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const doSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      void doSignOut();
      return;
    }
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir del jardín?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void doSignOut() },
    ]);
  };

  return (
    <Screen title="Perfil" subtitle="Tu rincón del jardín">
      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          {user?.name ?? 'Jardinero'}
        </AppText>
        <AppText color={colors.barkSoft}>{user?.email}</AppText>
        <AppText variant="small" color={colors.barkSoft}>
          Aviso diario de riego a las {String(user?.reminderHour ?? 9).padStart(2, '0')}:00
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          Conexión con el servidor
        </AppText>
        <AppText variant="small" color={colors.barkSoft}>
          {API_URL}
        </AppText>

        {status.kind === 'loading' ? <ActivityIndicator color={colors.moss} /> : null}

        {status.kind === 'ok' ? (
          <View style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: status.health.database === 'up' ? colors.moss : colors.ember }]}
            />
            <AppText>
              API {status.health.status === 'ok' ? 'conectado' : 'con problemas'} · base de datos{' '}
              {status.health.database === 'up' ? 'activa' : 'caída'}
            </AppText>
          </View>
        ) : null}

        {status.kind === 'error' ? (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.berry }]} />
            <AppText style={styles.flex}>{status.message}</AppText>
          </View>
        ) : null}

        <Button label="Volver a comprobar" variant="ghost" onPress={check} />
      </Card>

      <Button label="Cerrar sesión" variant="danger" onPress={confirmSignOut} loading={signingOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flex: { flex: 1 },
});
