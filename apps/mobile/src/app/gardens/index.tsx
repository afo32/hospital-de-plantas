import { gardenLabel, type GardenSummary, ROLE_LABELS } from '@hdp/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { createGarden, getGardens } from '@/lib/sharing';
import { colors, space } from '@/theme/tokens';

/** Tus jardines: el tuyo, los compartidos contigo y crear uno nuevo. */
export default function GardensScreen() {
  const { user, updateMe, reloadUser } = useAuth();
  const [gardens, setGardens] = useState<GardenSummary[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setGardens(await getGardens());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus jardines');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const create = async () => {
    setSaving(true);
    try {
      const g = await createGarden(name.trim());
      await reloadUser();
      setCreating(false);
      setName('');
      router.replace({ pathname: '/gardens/[id]', params: { id: g.id } });
    } catch (err) {
      Alert.alert('No se pudo crear', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const use = async (g: GardenSummary) => {
    await updateMe({ activeGardenId: g.id }).catch(() => undefined);
    router.navigate('/');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppText color={colors.barkSoft}>
        Comparte un jardín con tu familia o con quien te riegue las plantas en vacaciones: todos veréis las mismas
        plantas y quién ha regado.
      </AppText>

      {error ? (
        <AppText color={colors.berry}>{error}</AppText>
      ) : !gardens ? (
        <ActivityIndicator color={colors.moss} />
      ) : (
        gardens.map((g) => {
          const active = g.id === user?.defaultGardenId;
          return (
            <Card
              key={g.id}
              style={[styles.card, active && styles.active]}
              onPress={() => router.push({ pathname: '/gardens/[id]', params: { id: g.id } })}
              accessibilityLabel={g.name}
            >
              <View style={styles.titleRow}>
                <AppText variant="heading" color={colors.mossDeep} style={styles.flex}>
                  {gardenLabel(g)}
                </AppText>
                <Chip label={ROLE_LABELS[g.role]} tone={g.role === 'owner' ? 'moss' : g.role === 'editor' ? 'gold' : 'muted'} />
              </View>
              <AppText variant="small" color={colors.barkSoft}>
                {g.plantCount} {g.plantCount === 1 ? 'planta' : 'plantas'} · {g.memberCount}{' '}
                {g.memberCount === 1 ? 'persona' : 'personas'}
              </AppText>
              {active ? (
                <AppText variant="label" color={colors.moss}>
                  ✓ Es el que ves en Mi jardín
                </AppText>
              ) : (
                <Button label="Ver en Mi jardín" variant="outline" onPress={() => void use(g)} />
              )}
            </Card>
          );
        })
      )}

      <Button label="Crear otro jardín" onPress={() => setCreating(true)} />
      <Button label="Unirme con un código" variant="outline" onPress={() => router.push('/unirse')} />

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={styles.backdrop}>
          <Card style={styles.modal}>
            <AppText variant="heading" color={colors.mossDeep}>
              Nuevo jardín
            </AppText>
            <TextField
              label="Nombre"
              value={name}
              onChangeText={setName}
              placeholder="Casa del pueblo, Balcón, Oficina…"
              maxLength={40}
              autoFocus
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button label="Cancelar" variant="ghost" onPress={() => setCreating(false)} />
              </View>
              <View style={styles.flex}>
                <Button label="Crear" onPress={create} loading={saving} disabled={!name.trim()} />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  card: { gap: space.sm },
  active: { borderColor: colors.fern, borderWidth: 1.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(59,46,34,0.35)', justifyContent: 'center', padding: space.lg },
  modal: { gap: space.md },
});
