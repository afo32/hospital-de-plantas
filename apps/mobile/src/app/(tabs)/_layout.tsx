import { Tabs } from 'expo-router/js-tabs';
import { RoundDoorIcon, SearchLeafIcon, SproutIcon } from '@/components/icons';
import { colors, fonts } from '@/theme/tokens';

export default function TabsLayout() {
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
          height: 76,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Mi jardín', tabBarIcon: ({ color }) => <SproutIcon color={color} /> }}
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
