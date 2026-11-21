import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoundDoorIcon, SearchLeafIcon, SeedIcon, SproutIcon } from '@/components/icons';
import { colors, fonts } from '@/theme/tokens';

export default function TabsLayout() {
  // Alto de la barra de navegación del móvil (botones o gestos). La barra de pestañas se coloca encima.
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.moss,
        tabBarInactiveTintColor: colors.barkSoft,
        tabBarStyle: {
          backgroundColor: colors.vellum,
          borderTopColor: colors.gold,
          borderTopWidth: 1,
          height: 68 + bottom,
          paddingTop: 8,
          paddingBottom: bottom + 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Mi jardín', tabBarIcon: ({ color }) => <SproutIcon color={color} /> }}
      />
      <Tabs.Screen
        name="crianza"
        options={{ title: 'Crianza', tabBarIcon: ({ color }) => <SeedIcon color={color} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Buscar', tabBarIcon: ({ color }) => <SearchLeafIcon color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <RoundDoorIcon color={color} /> }}
      />
    </Tabs>
  );
}
