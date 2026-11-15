import { weatherLabel, type Weather } from '@hdp/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { SunIcon } from './icons';

/** Tiempo de tu zona en una línea, bajo el título de "Mi jardín". */
export function WeatherStrip({ weather, onPress }: { weather: Weather; onPress?: () => void }) {
  const today = weather.days[0];
  const tonight = weather.days[1]?.minC ?? today?.minC;
  return (
    <Pressable onPress={onPress} style={styles.wrap} accessibilityRole="summary">
      <SunIcon color={colors.gold} size={20} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">
          {weather.place ? `${weather.place} · ` : ''}
          {Math.round(weather.current.tempC)} °C · {weatherLabel(weather.current.weatherCode)}
        </AppText>
        {today ? (
          <AppText variant="small" color={colors.barkSoft}>
            Hoy máx. {Math.round(today.maxC)} °C · esta noche mín. {Math.round(tonight ?? today.minC)} °C
            {today.rainMm >= 1 ? ` · lluvia ${Math.round(today.rainMm)} mm` : ''}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.vellum,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  flex: { flex: 1 },
});
