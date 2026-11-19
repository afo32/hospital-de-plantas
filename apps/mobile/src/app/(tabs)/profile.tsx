import type { HealthResponse, Place, UpdateMeInput } from '@hdp/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { API_URL, getHealth } from '@/lib/api';
import { detectLocation, placeLabel, searchPlaces } from '@/lib/location';
import { ensureNotificationPermission, syncReminders } from '@/lib/notifications';
import { registerPushToken } from '@/lib/push';
import { deleteMyAccount } from '@/lib/sharing';
import { gardenLabel, ROLE_LABELS } from '@hdp/shared';
import { colors, radius, space } from '@/theme/tokens';

const HOURS = [7, 8, 9, 10, 12, 14, 18, 20, 21];

export default function ProfileScreen() {
  const { user, signOut, updateMe } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const searchId = useRef(0);

  const check = useCallback(async () => {
    setHealth(null);
    setHealthError('');
    try {
      setHealth(await getHealth());
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, []);

  useEffect(() => {
    void check();
    if (Platform.OS !== 'web') ensureNotificationPermission(false).then(setNotifGranted);
  }, [check]);

  // Buscar ciudad a mano (400 ms después de dejar de escribir).
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setPlaces([]);
      return;
    }
    const id = ++searchId.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const results = await searchPlaces(q).catch(() => []);
      if (id === searchId.current) {
        setPlaces(results);
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [cityQuery]);

  /** Guarda en el servidor y reprograma los avisos con los nuevos ajustes. */
  const save = async (input: UpdateMeInput) => {
    try {
      await updateMe(input);
      void syncReminders().catch(() => undefined);
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    }
  };

  const useGps = async () => {
    setLocating(true);
    try {
      const loc = await detectLocation();
      await save(loc);
    } catch (err) {
      Alert.alert('Ubicación', err instanceof Error ? err.message : 'No se pudo obtener la ubicación.');
    } finally {
      setLocating(false);
    }
  };

  const pickPlace = async (p: Place) => {
    setCityQuery('');
    setPlaces([]);
    await save({ lat: p.lat, lon: p.lon, city: p.name, ...(p.timezone ? { timezone: p.timezone } : {}) });
  };

  const enableNotifications = async () => {
    const ok = await ensureNotificationPermission(true);
    setNotifGranted(ok);
    if (ok) {
      await syncReminders().catch(() => undefined);
      void registerPushToken();
    }
    if (!ok)
      Alert.alert(
        'Avisos desactivados',
        'Actívalos en los ajustes del móvil → Apps → Hospital de Plantas → Notificaciones.',
      );
  };

  const confirmSignOut = () => {
    const go = async () => {
      setSigningOut(true);
      await signOut();
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir del jardín?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void go() },
    ]);
  };

  const confirmDelete = () => {
    const go = async () => {
      setDeleting(true);
      try {
        await deleteMyAccount();
        await signOut();
      } catch (err) {
        setDeleting(false);
        Alert.alert('No se pudo borrar la cuenta', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
      }
    };
    const message =
      'Se borrarán tu cuenta, tus jardines (los que no compartes), plantas, notas y fotos. Los jardines compartidos de los que eres dueño pasarán a otra persona. No se puede deshacer.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`${message}\n\n¿Borrar tu cuenta?`)) void go();
      return;
    }
    Alert.alert('¿Borrar tu cuenta?', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Última confirmación', 'Todo se borrará ahora mismo.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sí, borrar todo', style: 'destructive', onPress: () => void go() },
          ]),
      },
    ]);
  };

  if (!user) return null;

  return (
    <Screen title="Perfil" subtitle="Tu rincón del jardín">
      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          {user.name ?? 'Jardinero'}
        </AppText>
        <AppText color={colors.barkSoft}>{user.email}</AppText>
      </Card>

      {/* Jardines */}
      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          Tus jardines
        </AppText>
        {user.gardens.map((g) => (
          <AppText key={g.id}>
            {g.id === user.defaultGardenId ? '🌿 ' : '· '}
            {gardenLabel(g)}
            <AppText variant="small" color={colors.barkSoft}>
              {' '}
              ({ROLE_LABELS[g.role].toLowerCase()})
            </AppText>
          </AppText>
        ))}
        <Button label="Gestionar y compartir" variant="outline" onPress={() => router.push('/gardens')} />
        <Button label="Unirme con un código" variant="ghost" onPress={() => router.push('/unirse')} />
      </Card>

      {/* Ubicación */}
      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          Tu zona
        </AppText>
        <AppText color={colors.barkSoft}>
          {user.lat != null
            ? `${user.city ?? 'Ubicación guardada'} · zona horaria ${user.timezone}`
            : 'Sin ubicación: no podemos decirte si tus plantas pueden estar fuera ni avisarte de heladas.'}
        </AppText>
        {Platform.OS !== 'web' ? (
          <Button
            label={user.lat != null ? 'Actualizar con mi ubicación' : 'Usar mi ubicación'}
            onPress={useGps}
            loading={locating}
          />
        ) : null}
        <AppText variant="small" color={colors.barkSoft}>
          O busca tu ciudad (guardamos una ubicación aproximada, a ~1 km):
        </AppText>
        <SearchField value={cityQuery} onChangeText={setCityQuery} placeholder="Escribe tu ciudad o pueblo" />
        {searching ? <ActivityIndicator color={colors.moss} /> : null}
        {places.map((p) => (
          <Pressable
            key={`${p.lat},${p.lon}`}
            onPress={() => pickPlace(p)}
            style={({ pressed }) => [styles.place, pressed && styles.placePressed]}
            accessibilityRole="button"
          >
            <AppText>{placeLabel(p)}</AppText>
          </Pressable>
        ))}
      </Card>

      {/* Avisos */}
      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          Avisos
        </AppText>
        {notifGranted === false ? <Button label="Activar avisos en este móvil" onPress={enableNotifications} /> : null}
        <AppText variant="label" color={colors.gold}>
          HORA DEL AVISO DIARIO
        </AppText>
        <View style={styles.hours}>
          {HOURS.map((h) => {
            const active = user.reminderHour === h;
            return (
              <Pressable
                key={h}
                onPress={() => save({ reminderHour: h })}
                style={[styles.hour, active && styles.hourActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <AppText variant="label" color={active ? colors.vellum : colors.bark}>
                  {String(h).padStart(2, '0')}:00
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <ToggleRow label="Riego" value={user.notifyWater} onChange={(v) => save({ notifyWater: v })} />
        <ToggleRow label="Abono y trasplante" value={user.notifyCare} onChange={(v) => save({ notifyCare: v })} />
        <ToggleRow
          label="Alertas de helada y calor (a las 18:00)"
          value={user.notifyWeather}
          onChange={(v) => save({ notifyWeather: v })}
        />
        <ToggleRow
          label="Lo que hacen otras personas en tus jardines compartidos"
          value={user.notifyGarden}
          onChange={(v) => save({ notifyGarden: v })}
        />
      </Card>

      {/* Servidor */}
      <Card>
        <AppText variant="heading" color={colors.mossDeep}>
          Conexión con el servidor
        </AppText>
        <AppText variant="small" color={colors.barkSoft}>
          {API_URL}
        </AppText>
        {!health && !healthError ? <ActivityIndicator color={colors.moss} /> : null}
        {health ? (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: health.database === 'up' ? colors.moss : colors.ember }]} />
            <AppText>
              API {health.status === 'ok' ? 'conectado' : 'con problemas'} · base de datos{' '}
              {health.database === 'up' ? 'activa' : 'caída'}
            </AppText>
          </View>
        ) : null}
        {healthError ? (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.berry }]} />
            <AppText style={styles.flex}>{healthError}</AppText>
          </View>
        ) : null}
        <Button label="Volver a comprobar" variant="ghost" onPress={check} />
      </Card>

      <Button label="Cerrar sesión" variant="danger" onPress={confirmSignOut} loading={signingOut} />

      <View style={styles.legal}>
        <Pressable onPress={() => void Linking.openURL(`${API_URL}/privacidad`)} accessibilityRole="link">
          <AppText variant="small" color={colors.moss}>
            Política de privacidad
          </AppText>
        </Pressable>
        <Pressable onPress={confirmDelete} accessibilityRole="button" disabled={deleting}>
          <AppText variant="small" color={colors.berry}>
            {deleting ? 'Borrando…' : 'Borrar mi cuenta'}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <AppText style={styles.flex}>{label}</AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.fern, false: colors.parchmentDeep }}
        thumbColor={value ? colors.moss : colors.vellum}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  legal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.md },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flex: { flex: 1 },
  place: {
    paddingVertical: 10,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  placePressed: { backgroundColor: colors.parchmentDeep },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hour: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.vellum,
  },
  hourActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 4 },
});
