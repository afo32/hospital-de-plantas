/**
 * Tema "élfico/hobbit": pergamino, musgo, corteza y oro viejo.
 * Todos los colores, tipografías y espacios de la app salen de aquí.
 */

export const colors = {
  // Fondos
  parchment: '#F4ECD8', // fondo general
  parchmentDeep: '#E9DCBD', // zonas hundidas, pestañas inactivas
  vellum: '#FBF6EA', // tarjetas
  // Texto
  bark: '#4A3A2C', // texto principal
  barkSoft: '#7A6552', // texto secundario
  // Marca
  moss: '#4F6B3A', // color principal
  mossDeep: '#34472A', // pulsado / títulos fuertes
  fern: '#8BA66A', // detalles suaves
  gold: '#B8893B', // bordes y adornos
  goldSoft: '#D9BE86',
  // Estados
  water: '#4A7C8C', // riego
  berry: '#9C3D2E', // alertas, salud
  ember: '#C9772E', // poda / cosecha
  // Líneas
  border: '#CDBB94',
  shadow: '#3B2E22',
} as const;

export const fonts = {
  // Titulares serif con aire antiguo
  display: 'CormorantGaramond_700Bold',
  displaySemi: 'CormorantGaramond_600SemiBold',
  displayItalic: 'CormorantGaramond_600SemiBold_Italic',
  // Texto corrido redondeado y legible
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 18,
  lg: 28,
  pill: 999,
} as const;

export const typeScale = {
  hero: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 22, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  quote: { fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24 },
} as const;

export type TextVariant = keyof typeof typeScale;

/** Sombra cálida y suave para tarjetas. */
export const cardShadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;
