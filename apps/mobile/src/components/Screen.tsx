import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { VineDivider } from './VineDivider';

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Contenido fijo encima del scroll (p. ej. pestañas). */
  header?: ReactNode;
  /** Elemento flotante (p. ej. botón +). */
  floating?: ReactNode;
  scroll?: boolean;
};

/** Pantalla base: fondo pergamino, título serif y enredadera bajo el título. */
export function Screen({ title, subtitle, children, header, floating, scroll = true }: Props) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {title ? (
        <View style={styles.titleBlock}>
          <AppText variant="title" color={colors.mossDeep}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="quote" color={colors.barkSoft}>
              {subtitle}
            </AppText>
          ) : null}
          <VineDivider />
        </View>
      ) : null}
      {header}
      <Body
        style={styles.body}
        contentContainerStyle={scroll ? styles.content : undefined}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Body>
      {floating}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  titleBlock: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.xs },
  body: { flex: 1 },
  content: { padding: space.lg, paddingBottom: 120, gap: space.md },
});
