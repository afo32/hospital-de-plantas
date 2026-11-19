import {
  type ActivityItem,
  type GardenDetail,
  type Invite,
  type Member,
  gardenLabel,
  ROLE_HINTS,
  ROLE_LABELS,
} from '@hdp/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { VineDivider } from '@/components/VineDivider';
import { dateTimeLabel } from '@/lib/dates';
import {
  createInvite,
  deleteGarden,
  deleteInvite,
  getActivity,
  getGarden,
  removeMember,
  renameGarden,
  setMemberRole,
} from '@/lib/sharing';
import { colors, radius, space } from '@/theme/tokens';

const ACTIVITY_ICONS: Record<ActivityItem['kind'], string> = {
  water: '💧',
  fertilize: '🌱',
  repot: '🪴',
  snooze: '⏳',
  plant_added: '✨',
  note: '📝',
  diagnosis: '🩺',
  joined: '👋',
};

const roleTone = (r: Member['role']): 'moss' | 'gold' | 'muted' => (r === 'owner' ? 'moss' : r === 'editor' ? 'gold' : 'muted');

function confirmAction(title: string, message: string, label: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: label, style: 'destructive', onPress: onYes },
  ]);
}

/** Un jardín: personas, permisos, invitaciones y actividad. */
export default function GardenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reloadUser, updateMe, user } = useAuth();
  const [detail, setDetail] = useState<GardenDetail | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<{ title: string; message?: string; actions: SheetAction[] } | null>(null);
  const [newInvite, setNewInvite] = useState<Invite | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([getGarden(id), getActivity(id)]);
      setDetail(d);
      setActivity(a);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el jardín');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const fail = (title: string) => (err: unknown) =>
    Alert.alert(title, err instanceof Error ? err.message : 'Inténtalo de nuevo.');

  const shareInvite = async (invite: Invite) => {
    const message = `Te invito a mi jardín «${detail?.garden.name}» en Hospital de Plantas 🌿\n\nAbre este enlace con la app instalada:\n${invite.link}\n\nO en la app ve a Perfil → Unirme con un código y escribe: ${invite.code}\n\n(Caduca en 7 días)`;
    if (Platform.OS === 'web') {
      await globalThis.navigator?.clipboard?.writeText(message).catch(() => undefined);
      Alert.alert('Copiado', 'El mensaje de invitación está en el portapapeles.');
      return;
    }
    await Share.share({ message }).catch(() => undefined);
  };

  const invite = () =>
    setSheet({
      title: 'Invitar a alguien',
      message: 'Elige qué podrá hacer. La invitación sirve para una persona y caduca en 7 días.',
      actions: (['editor', 'viewer'] as const).map((role) => ({
        label: role === 'editor' ? 'Puede cuidar: regar, añadir plantas, notas…' : 'Solo mirar: ve las plantas, sin cambiar nada',
        onPress: () => {
          setBusy(true);
          createInvite(id, role)
            .then((inv) => {
              setNewInvite(inv);
              void load();
            })
            .catch(fail('No se pudo crear la invitación'))
            .finally(() => setBusy(false));
        },
      })),
    });

  const memberActions = (m: Member) =>
    setSheet({
      title: m.name,
      message: `Ahora: ${ROLE_LABELS[m.role]}. ${ROLE_HINTS[m.role]}`,
      actions: [
        ...(m.role !== 'editor'
          ? [{ label: 'Dar permiso para cuidar', onPress: () => void setMemberRole(id, m.userId, 'editor').then(setDetail).catch(fail('No se pudo cambiar')) }]
          : []),
        ...(m.role !== 'viewer'
          ? [{ label: 'Dejar solo para mirar', onPress: () => void setMemberRole(id, m.userId, 'viewer').then(setDetail).catch(fail('No se pudo cambiar')) }]
          : []),
        {
          label: 'Quitar del jardín',
          destructive: true,
          onPress: () =>
            confirmAction('Quitar del jardín', `${m.name} dejará de ver este jardín.`, 'Quitar', () =>
              void removeMember(id, m.userId).then(load).catch(fail('No se pudo quitar')),
            ),
        },
      ],
    });

  const leave = () =>
    confirmAction('Salir del jardín', 'Dejarás de ver sus plantas. Para volver necesitarás otra invitación.', 'Salir', async () => {
      try {
        await removeMember(id, user!.id);
        await reloadUser();
        router.navigate('/');
      } catch (err) {
        fail('No se pudo salir')(err);
      }
    });

  const remove = () =>
    confirmAction(
      'Borrar el jardín',
      `Se borrarán sus ${detail?.garden.plantCount ?? 0} plantas con sus cuidados, notas y fotos, para todas las personas. No se puede deshacer.`,
      'Borrar',
      async () => {
        try {
          await deleteGarden(id);
          await reloadUser();
          router.navigate('/');
        } catch (err) {
          fail('No se pudo borrar')(err);
        }
      },
    );

  if (!detail) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <AppText color={colors.berry} center>
              {error}
            </AppText>
            <Button label="Reintentar" onPress={load} />
          </>
        ) : (
          <ActivityIndicator color={colors.moss} size="large" />
        )}
      </View>
    );
  }

  const { garden, members, invites } = detail;
  const owner = garden.role === 'owner';
  const active = user?.defaultGardenId === garden.id;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: gardenLabel(garden) }} />

      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <AppText variant="title" color={colors.mossDeep}>
            {gardenLabel(garden)}
          </AppText>
          <AppText variant="small" color={colors.barkSoft}>
            {garden.plantCount} {garden.plantCount === 1 ? 'planta' : 'plantas'} · tú: {ROLE_LABELS[garden.role].toLowerCase()}
          </AppText>
        </View>
        {owner ? (
          <Pressable
            onPress={() => {
              setName(garden.name);
              setRenaming(true);
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <AppText variant="label" color={colors.moss}>
              Cambiar nombre
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {!active ? (
        <Button
          label="Ver este jardín en Mi jardín"
          variant="outline"
          onPress={() => void updateMe({ activeGardenId: garden.id }).then(() => router.navigate('/'))}
        />
      ) : null}
      <VineDivider />

      {/* Personas */}
      <AppText variant="heading" color={colors.mossDeep}>
        Personas
      </AppText>
      <Card style={styles.list}>
        {members.map((m, i) => (
          <Pressable
            key={m.userId}
            disabled={!owner || m.isMe}
            onPress={() => memberActions(m)}
            style={[styles.member, i > 0 && styles.divider]}
            accessibilityRole={owner && !m.isMe ? 'button' : undefined}
          >
            <View style={styles.avatar}>
              <AppText variant="bodyStrong" color={colors.vellum}>
                {m.name.slice(0, 1).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">
                {m.name}
                {m.isMe ? ' (tú)' : ''}
              </AppText>
              <AppText variant="small" color={colors.barkSoft}>
                Desde {dateTimeLabel(m.joinedAt).split(' · ')[0]}
              </AppText>
            </View>
            <Chip label={ROLE_LABELS[m.role]} tone={roleTone(m.role)} />
            {owner && !m.isMe ? (
              <AppText variant="heading" color={colors.gold}>
                ›
              </AppText>
            ) : null}
          </Pressable>
        ))}
      </Card>

      {owner ? (
        <>
          <Button label="👥 Invitar a alguien" onPress={invite} loading={busy} />
          {invites.length ? (
            <Card style={styles.list}>
              <AppText variant="label" color={colors.gold}>
                INVITACIONES SIN USAR
              </AppText>
              {invites.map((inv) => (
                <View key={inv.id} style={styles.invite}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" style={styles.code}>
                      {inv.code}
                    </AppText>
                    <AppText variant="small" color={colors.barkSoft}>
                      {ROLE_LABELS[inv.role]} · caduca el {dateTimeLabel(inv.expiresAt).split(' · ')[0]}
                    </AppText>
                  </View>
                  <Pressable onPress={() => void shareInvite(inv)} hitSlop={8} accessibilityRole="button">
                    <AppText variant="label" color={colors.moss}>
                      Enviar
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => void deleteInvite(inv.id).then(load).catch(fail('No se pudo borrar'))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Anular ${inv.code}`}
                  >
                    <AppText variant="label" color={colors.berry}>
                      Anular
                    </AppText>
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {/* Actividad */}
      <AppText variant="heading" color={colors.mossDeep}>
        Actividad
      </AppText>
      {!activity ? (
        <ActivityIndicator color={colors.moss} />
      ) : activity.length === 0 ? (
        <AppText color={colors.barkSoft}>Aún no ha pasado nada en los últimos 30 días.</AppText>
      ) : (
        <Card style={styles.list}>
          {activity.map((a, i) => (
            <Pressable
              key={a.id}
              disabled={!a.plantId}
              onPress={() => a.plantId && router.push({ pathname: '/plant/[id]', params: { id: a.plantId } })}
              style={[styles.activity, i > 0 && styles.divider]}
            >
              <AppText style={styles.icon}>{ACTIVITY_ICONS[a.kind]}</AppText>
              <View style={styles.flex}>
                <AppText>
                  <AppText variant="bodyStrong">{a.actorName}</AppText> {a.text}
                </AppText>
                <AppText variant="small" color={colors.barkSoft}>
                  {dateTimeLabel(a.at)}
                </AppText>
              </View>
            </Pressable>
          ))}
        </Card>
      )}

      <View style={styles.danger}>
        {owner ? (
          <Button label="Borrar este jardín" variant="danger" onPress={remove} />
        ) : (
          <Button label="Salir del jardín" variant="danger" onPress={leave} />
        )}
      </View>

      <ActionSheet
        visible={!!sheet}
        title={sheet?.title ?? ''}
        message={sheet?.message}
        actions={sheet?.actions ?? []}
        onClose={() => setSheet(null)}
      />

      {/* Invitación recién creada */}
      <Modal visible={!!newInvite} transparent animationType="fade" onRequestClose={() => setNewInvite(null)}>
        <View style={styles.backdrop}>
          <Card style={styles.modal}>
            <AppText variant="heading" color={colors.mossDeep} center>
              Invitación lista
            </AppText>
            <AppText color={colors.barkSoft} center>
              Envíasela por WhatsApp o por donde quieras. Con la app instalada, el enlace abre la invitación; si no, puede
              escribir el código en Perfil → Unirme con un código.
            </AppText>
            <View style={styles.bigCode}>
              <AppText variant="title" color={colors.mossDeep} center style={styles.code}>
                {newInvite?.code}
              </AppText>
            </View>
            <AppText variant="small" color={colors.barkSoft} center>
              {newInvite ? `${ROLE_LABELS[newInvite.role]} · sirve para una persona · caduca en 7 días` : ''}
            </AppText>
            <Button label="Enviar invitación" onPress={() => newInvite && void shareInvite(newInvite)} />
            <Button label="Hecho" variant="ghost" onPress={() => setNewInvite(null)} />
          </Card>
        </View>
      </Modal>

      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)}>
        <View style={styles.backdrop}>
          <Card style={styles.modal}>
            <AppText variant="heading" color={colors.mossDeep}>
              Nombre del jardín
            </AppText>
            <TextField label="Nombre" value={name} onChangeText={setName} maxLength={40} autoFocus />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button label="Cancelar" variant="ghost" onPress={() => setRenaming(false)} />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Guardar"
                  disabled={!name.trim()}
                  onPress={() => {
                    setRenaming(false);
                    void renameGarden(id, name.trim())
                      .then((d) => {
                        setDetail(d);
                        void reloadUser();
                      })
                      .catch(fail('No se pudo cambiar el nombre'));
                  }}
                />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.parchment,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
  list: { gap: 0, paddingVertical: space.xs },
  member: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invite: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  code: { letterSpacing: 2 },
  activity: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm },
  icon: { fontSize: 20, lineHeight: 26 },
  danger: { marginTop: space.lg },
  backdrop: { flex: 1, backgroundColor: 'rgba(59,46,34,0.35)', justifyContent: 'center', padding: space.lg },
  modal: { gap: space.md },
  bigCode: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: space.md,
    backgroundColor: colors.parchment,
  },
});
