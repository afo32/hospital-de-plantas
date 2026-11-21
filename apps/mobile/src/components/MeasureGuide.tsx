import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, Line, Marker, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Props = { kind: 'pot' | 'plant'; shape?: 'round' | 'rectangular' };

const INK = colors.berry;

function Arrows() {
  return (
    <Defs>
      <Marker id="a" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
        <Polygon points="0,0 8,4 0,8" fill={INK} />
      </Marker>
    </Defs>
  );
}

function Label({ x, y, text, anchor = 'middle' }: { x: number; y: number; text: string; anchor?: 'middle' | 'start' | 'end' }) {
  return (
    <SvgText x={x} y={y} fill={INK} fontSize="13" fontFamily={fonts.bodyBold} fontWeight="bold" textAnchor={anchor}>
      {text}
    </SvgText>
  );
}

function PotDrawing({ rect }: { rect: boolean }) {
  return (
    <Svg width="100%" height={156} viewBox="0 0 300 156">
      <Arrows />
      {/* maceta de lado */}
      <Path d="M60 40 H180 L168 135 H72 Z" fill={colors.ember} opacity={0.85} />
      <Rect x="54" y="32" width="132" height="14" rx="3" fill="#B5652A" />
      {/* tierra */}
      <Path d="M64 46 H176 L175 54 H65 Z" fill="#6B4A2E" />
      {/* A: boca por dentro */}
      <Line x1="64" y1="22" x2="176" y2="22" stroke={INK} strokeWidth="2" markerStart="url(#a)" markerEnd="url(#a)" />
      <Label x={120} y={16} text={rect ? 'A · Ancho' : 'A · Diámetro'} />
      {/* B: alto */}
      <Line x1="200" y1="32" x2="200" y2="135" stroke={INK} strokeWidth="2" markerStart="url(#a)" markerEnd="url(#a)" />
      {rect ? <Label x={200} y={150} text="B · Alto" /> : <Label x={208} y={88} text="B · Alto" anchor="start" />}
      {rect ? (
        <G>
          {/* vista desde arriba */}
          <Rect x="238" y="44" width="56" height="30" fill="none" stroke={colors.bark} strokeWidth="2" />
          <Line x1="238" y1="86" x2="294" y2="86" stroke={INK} strokeWidth="2" markerStart="url(#a)" markerEnd="url(#a)" />
          <Label x={266} y={104} text="C · Largo" />
          <SvgText x={266} y={36} fill={colors.barkSoft} fontSize="10" textAnchor="middle" fontFamily={fonts.body}>
            desde arriba
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}

function PlantDrawing() {
  return (
    <Svg width="100%" height={170} viewBox="0 0 300 170">
      <Arrows />
      {/* maceta */}
      <Path d="M115 112 H185 L178 160 H122 Z" fill={colors.ember} opacity={0.85} />
      <Rect x="110" y="106" width="80" height="10" rx="3" fill="#B5652A" />
      {/* follaje */}
      <Path d="M150 108 C150 80 150 60 150 30" stroke={colors.moss} strokeWidth="5" fill="none" />
      <Ellipse cx="112" cy="70" rx="40" ry="14" fill={colors.fern} transform="rotate(-18 112 70)" />
      <Ellipse cx="186" cy="62" rx="38" ry="14" fill={colors.moss} transform="rotate(15 186 62)" />
      <Ellipse cx="150" cy="30" rx="14" ry="22" fill="#A9C084" />
      <Ellipse cx="128" cy="96" rx="26" ry="9" fill={colors.moss} transform="rotate(-10 128 96)" />
      {/* A: alto desde la tierra hasta la hoja más alta */}
      <Line x1="240" y1="10" x2="240" y2="108" stroke={INK} strokeWidth="2" markerStart="url(#a)" markerEnd="url(#a)" />
      <Line x1="150" y1="8" x2="246" y2="8" stroke={INK} strokeWidth="1" strokeDasharray="4 3" />
      <Line x1="185" y1="108" x2="246" y2="108" stroke={INK} strokeWidth="1" strokeDasharray="4 3" />
      <Label x={246} y={62} text="A · Alto" anchor="start" />
      {/* B: ancho de punta a punta */}
      <Line x1="74" y1="138" x2="224" y2="138" stroke={INK} strokeWidth="2" markerStart="url(#a)" markerEnd="url(#a)" />
      <Line x1="74" y1="80" x2="74" y2="142" stroke={INK} strokeWidth="1" strokeDasharray="4 3" />
      <Line x1="224" y1="72" x2="224" y2="142" stroke={INK} strokeWidth="1" strokeDasharray="4 3" />
      <Label x={60} y={160} text="B · Ancho" anchor="start" />
    </Svg>
  );
}

/** Dibujo que explica qué medir exactamente (maceta o planta). */
export function MeasureGuide({ kind, shape = 'round' }: Props) {
  const rect = shape === 'rectangular';
  return (
    <View style={styles.wrap}>
      {kind === 'pot' ? <PotDrawing rect={rect} /> : <PlantDrawing />}
      {kind === 'pot' ? (
        <View style={styles.legend}>
          <AppText variant="small">
            <AppText variant="small" color={INK} style={styles.bold}>
              A · {rect ? 'Ancho' : 'Diámetro'}:{' '}
            </AppText>
            {rect
              ? 'el lado corto de la boca, por dentro, de pared a pared.'
              : 'la boca de la maceta (la parte de arriba), por dentro, de pared a pared pasando por el centro.'}
          </AppText>
          <AppText variant="small">
            <AppText variant="small" color={INK} style={styles.bold}>
              B · Alto:{' '}
            </AppText>
            desde la base hasta el borde de arriba, sin contar el plato.
          </AppText>
          {rect ? (
            <AppText variant="small">
              <AppText variant="small" color={INK} style={styles.bold}>
                C · Largo:{' '}
              </AppText>
              el lado largo de la boca, por dentro.
            </AppText>
          ) : null}
          <AppText variant="small" color={colors.barkSoft}>
            Sin metro: un palmo abierto son unos 20 cm; un folio A4 mide 21 × 30 cm.
          </AppText>
        </View>
      ) : (
        <View style={styles.legend}>
          <AppText variant="small">
            <AppText variant="small" color={INK} style={styles.bold}>
              A · Alto:{' '}
            </AppText>
            desde la superficie de la tierra hasta la punta de la hoja (o tallo) más alta. No cuentes la maceta.
          </AppText>
          <AppText variant="small">
            <AppText variant="small" color={INK} style={styles.bold}>
              B · Ancho:{' '}
            </AppText>
            la planta entera, no una hoja ni el tallo: de la punta de la hoja más separada de un lado a la del otro, por la parte más ancha.
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.vellum,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    gap: space.xs,
  },
  legend: { gap: 4, paddingHorizontal: space.xs },
  bold: { fontFamily: fonts.bodyBold },
});
