import { gardenLabel, type InvitePreview, normalizeInviteCode, ROLE_HINTS, ROLE_LABELS } from '@hdp/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { acceptInvite, previewInvite } from '@/lib/sharing';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Banner } from './Banner';
import { Button } from './Button';
import { Card } from './Card';
import { TextField } from './TextField';

/** Unirse a un jardín con un código (escrito a mano o desde el enlace de la invitación). */
export function JoinInvite({ initialCode }: { initialCode?: string }) {
  const { reloadUser, updateMe } = useAuth();
  const [code, setCode] = useState(initialCode ?? '');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const check = async (raw: string) => {
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      setPreview(await previewInvite(normalizeInviteCode(raw)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comprobar el código');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) void check(initialCode);
  }, [initialCode]);

  const join = async () => {
    if (!preview) return;
    setJoining(true);
    try {
      await acceptInvite(preview.code);
      await reloadUser();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo unir al jardín');
      setJoining(false);
    }
  };

  const goThere = async () => {
    if (!preview) return;
    await updateMe({ activeGardenId: preview.gardenId }).catch(() => undefined);
    router.replace('/');
  };

  const valid = normalizeInviteCode(code).length === 9;

  return (
    <View style={styles.wrap}>
      {!initialCode ? (
        <>
          <AppText color={colors.barkSoft}>
            Escribe el código que te han enviado. Tiene 8 letras y números, por ejemplo HOJA-7K3Q.
          </AppText>
          <TextField
            label="Código de invitación"
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              setPreview(null);
              setError('');
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="XXXX-XXXX"
            maxLength={12}
            onSubmitEditing={() => valid && void check(code)}
          />
          {!preview ? (
            <Button label="Comprobar" onPress={() => void check(code)} disabled={!valid} loading={loading} />
          ) : null}
        </>
      ) : loading ? (
        <ActivityIndicator color={colors.moss} size="large" />
      ) : null}

      {error ? (
        <Banner tone="warning" title="No se puede usar esta invitación">
          <AppText variant="small" color={colors.berry}>
            {error}
          </AppText>
        </Banner>
      ) : null}

      {preview ? (
        <Card style={styles.card}>
          <AppText variant="label" color={colors.gold}>
            {preview.invitedBy ? `${preview.invitedBy.toUpperCase()} TE INVITA A` : 'TE INVITAN A'}
          </AppText>
          <AppText variant="title" color={colors.mossDeep}>
            {gardenLabel({ name: preview.gardenName, role: preview.role, ownerName: preview.invitedBy })}
          </AppText>
          <AppText color={colors.barkSoft}>
            {preview.plantCount} {preview.plantCount === 1 ? 'planta' : 'plantas'} · {preview.memberCount}{' '}
            {preview.memberCount === 1 ? 'persona' : 'personas'}
          </AppText>
          <AppText>
            <AppText variant="bodyStrong">{ROLE_LABELS[preview.role]}: </AppText>
            {ROLE_HINTS[preview.role]}
          </AppText>
          {preview.alreadyMember ? (
            <>
              <AppText color={colors.moss}>Ya estás en este jardín.</AppText>
              <Button label="Ir al jardín" onPress={goThere} />
            </>
          ) : (
            <Button label="Unirme al jardín" onPress={join} loading={joining} />
          )}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md },
  card: { gap: space.sm },
});
