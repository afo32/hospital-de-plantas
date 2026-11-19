import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { flushQueue } from '@/lib/offline';
import { emitGardenChanged } from '@/lib/events';
import { syncReminders } from '@/lib/notifications';
import { registerPushToken } from '@/lib/push';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { OfflineScreen } from '@/components/OfflineScreen';
import { colors, fonts } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.parchment,
    card: colors.parchment,
    text: colors.bark,
    primary: colors.moss,
    border: colors.border,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    CormorantGaramond_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  // Si las fuentes fallan seguimos con las del sistema en lugar de bloquear la app.
  const fontsReady = loaded || !!error;

  return (
    <AuthProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="dark" />
        <RootNavigator fontsReady={fontsReady} />
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { status, retry, signOut } = useAuth();
  const ready = fontsReady && status !== 'loading';

  // La pantalla de bienvenida se queda hasta tener fuentes y saber si hay sesión.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Con sesión: envía lo guardado sin conexión al volver la red o al volver a la app.
  useEffect(() => {
    if (status !== 'signedIn') return;
    void flushQueue();
    const unsubNet = NetInfo.addEventListener((s) => {
      if (s.isConnected) void flushQueue();
    });
    const subApp = AppState.addEventListener('change', (st) => {
      if (st === 'active') void flushQueue();
    });
    // Este móvil recibe los avisos push del jardín compartido (si hay permiso).
    void registerPushToken();
    // Al tocar un aviso: abre la planta si el aviso es de una sola, o Mi jardín.
    const subNotif =
      Platform.OS === 'web'
        ? null
        : Notifications.addNotificationResponseReceivedListener((res) => {
            const data = res.notification.request.content.data as { plantId?: string | null } | undefined;
            if (data?.plantId) router.push({ pathname: '/plant/[id]', params: { id: data.plantId } });
            else router.navigate('/');
          });
    // Si alguien del jardín riega, recargamos y reprogramamos los avisos (para no avisarte de algo ya hecho).
    const subReceived =
      Platform.OS === 'web'
        ? null
        : Notifications.addNotificationReceivedListener((n) => {
            const data = n.request.content.data as { type?: string } | undefined;
            if (data?.type === 'garden') {
              emitGardenChanged();
              void syncReminders().catch(() => undefined);
            }
          });
    return () => {
      unsubNet();
      subApp.remove();
      subNotif?.remove();
      subReceived?.remove();
    };
  }, [status]);

  if (!ready) return null;
  if (status === 'offline') return <OfflineScreen onRetry={retry} onSignOut={signOut} />;

  const signedIn = status === 'signedIn';
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.parchment },
        headerTintColor: colors.mossDeep,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
        contentStyle: { backgroundColor: colors.parchment },
      }}
    >
      {/* Con sesión: el jardín. Sin sesión: login y registro. Expo Router redirige solo. */}
      <Stack.Protected guard={signedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{ title: 'Añadir planta' }} />
        <Stack.Screen name="identify" options={{ title: 'Identificar planta' }} />
        <Stack.Screen name="species/[id]" options={{ title: '', headerBackTitle: 'Volver' }} />
        <Stack.Screen name="plant-setup/[speciesId]" options={{ title: 'Añadir planta' }} />
        <Stack.Screen name="plant/[id]" options={{ title: '', headerBackTitle: 'Volver' }} />
        <Stack.Screen name="light-meter" options={{ title: 'Medidor de luz' }} />
        <Stack.Screen name="diagnose/[plantId]" options={{ title: 'Revisar su salud' }} />
        <Stack.Screen name="diagnosis/[id]" options={{ title: 'Salud', headerBackTitle: 'Volver' }} />
        <Stack.Screen name="gardens/index" options={{ title: 'Tus jardines' }} />
        <Stack.Screen name="gardens/[id]" options={{ title: 'Jardín', headerBackTitle: 'Volver' }} />
        <Stack.Screen name="unirse/index" options={{ title: 'Unirme a un jardín' }} />
        <Stack.Screen name="unirse/[code]" options={{ title: 'Invitación' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
