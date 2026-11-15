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
import { useEffect } from 'react';
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
        <Stack.Screen name="add" options={{ title: 'Añadir planta', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
