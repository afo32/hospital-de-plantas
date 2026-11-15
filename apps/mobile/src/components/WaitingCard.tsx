import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Card } from './Card';

/** Tarjeta de espera con mensajes que van cambiando (la IA tarda 15-40 s). */
export function WaitingCard({ title, messages }: { title: string; messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <Card style={styles.card}>
      <ActivityIndicator color={colors.moss} size="large" />
      <AppText variant="heading" color={colors.mossDeep} center>
        {title}
      </AppText>
      <AppText variant="quote" color={colors.barkSoft} center>
        {messages[i]}
      </AppText>
      <AppText variant="small" color={colors.barkSoft} center>
        Suele tardar entre 15 y 40 segundos. No cierres esta pantalla.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, alignItems: 'center', paddingVertical: space.xl },
});
