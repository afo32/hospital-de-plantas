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

/** Botella de abono para fertilizar. */
export function FertilizeIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path d="M9 2h4v3l2 2v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7l2-2z" fill={color} />
      <Path d="M9.5 11c0-2 1.2-3 3-3 0 2-1.2 3-3 3z" fill="#FBF6EA" />
      <Path d="M11 11v4" stroke="#FBF6EA" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Maceta para trasplantar. */
export function PotIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path d="M3 8h16v3H3z" fill={color} />
      <Path d="M4.5 11h13l-1.8 9H6.3z" fill={color} opacity={0.8} />
      <Path d="M11 8V4M11 5c0-2 1.5-3 3.5-3 0 2-1.5 3-3.5 3z" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Reloj de arena para posponer. */
export function HourglassIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path d="M5 2h12M5 20h12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M6.5 2.5c0 5 9 5 9 8.5s-9 3.5-9 8.5M15.5 2.5c0 5-9 5-9 8.5s9 3.5 9 8.5" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M3.5 9.5l3.5 3.5 7.5-8" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PencilIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M3 15l1-4 8-8 3 3-8 8z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M10.5 4.5l3 3" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function SunIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={11} r={4.5} fill={color} />
      <Path
        d="M11 1.5v3M11 17.5v3M1.5 11h3M17.5 11h3M4.3 4.3l2.1 2.1M15.6 15.6l2.1 2.1M4.3 17.7l2.1-2.1M15.6 6.4l2.1-2.1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
