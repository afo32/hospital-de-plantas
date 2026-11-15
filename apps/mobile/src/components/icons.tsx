import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { color: ColorValue; size?: number };

/** Brote de dos hojas: pestaña "Mi jardín". */
export function SproutIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path d="M13 23V12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M13 13C13 8 9.5 5 4.5 5c0 5 3.5 8 8.5 8z" fill={color} />
      <Path d="M13 15c0-4.5 3-7.5 8.5-7.5 0 4.5-3 7.5-8.5 7.5z" fill={color} opacity={0.75} />
      <Path d="M7 23h12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Lupa con una hoja dentro: pestaña "Buscar". */
export function SearchLeafIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Path d="M16.5 16.5L22 22" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M8 13c0-3 2-5 5.5-5 0 3-2 5-5.5 5z" fill={color} />
    </Svg>
  );
}

/** Puerta redonda de madriguera con tablones y pomo: pestaña "Perfil". */
export function RoundDoorIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Circle cx={13} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Path d="M9.5 2.9v18.2M16.5 2.9v18.2" stroke={color} strokeWidth={1.2} opacity={0.55} />
      <Circle cx={13} cy={12} r={2} fill={color} />
      <Path d="M5 24h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Gota de agua para tareas de riego. */
export function DropIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Path d="M11 2C11 2 4 10 4 14a7 7 0 0 0 14 0c0-4-7-12-7-12z" fill={color} />
    </Svg>
  );
}
