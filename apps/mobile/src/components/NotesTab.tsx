import { MAX_NOTE_PHOTOS, type Note } from '@hdp/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { dateTimeLabel } from '@/lib/dates';
import { createNote, deleteNote, getNotes, updateNote } from '@/lib/health';
import { pickPhotos, type PhotoSource } from '@/lib/media';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Banner } from './Banner';
import { Button } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { PhotoStrip } from './PhotoStrip';
import { PhotoViewer } from './PhotoViewer';
import { TextField } from './TextField';

/** Pestaña "Notas": diario de la planta con texto y fotos. */
export function NotesTab({ plantId }: { plantId: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getNotes(plantId);
      setNotes(res.data);
      setOffline(res.offline);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las notas');
    }
  }, [plantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addPhotos = async (source: PhotoSource) => {
    const uris = await pickPhotos(source, MAX_NOTE_PHOTOS - photos.length);
    if (uris.length) setPhotos((prev) => [...prev, ...uris].slice(0, MAX_NOTE_PHOTOS));
  };

  const save = async () => {
    if (!text.trim() && !photos.length) return;
    setSaving(true);
    try {
      const note = await createNote(plantId, text, photos);
      setNotes((prev) => [note, ...(prev ?? [])]);
      setText('');
      setPhotos([]);
    } catch (err) {
      Alert.alert('No se pudo guardar la nota', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const note = await updateNote(editing.id, editing.text);
      setNotes((prev) => prev?.map((n) => (n.id === note.id ? note : n)) ?? null);
      setEditing(null);
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    }
  };

  const remove = (note: Note) => {
    const go = async () => {
      try {
        await deleteNote(note.id);
        setNotes((prev) => prev?.filter((n) => n.id !== note.id) ?? null);
      } catch (err) {
        Alert.alert('No se pudo borrar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
      }
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert('Borrar nota', '¿Seguro? Se borrarán también sus fotos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => void go() },
    ]);
  };

  return (
    <View style={styles.wrap}>
      {offline ? (
        <Banner tone="warning" title="Sin conexión">
          <AppText variant="small" color={colors.berry}>
            Ves las notas guardadas. Para escribir una nueva necesitas conexión.
          </AppText>
        </Banner>
      ) : (
        <Card style={styles.composer}>
          <AppText variant="heading" color={colors.mossDeep}>
            Nueva nota
          </AppText>
          <TextField
            label="¿Qué has visto o hecho?"
            value={text}
            onChangeText={setText}
            placeholder="Hoja nueva, la cambié de sitio, le salieron flores…"
            multiline
            maxLength={2000}
            style={styles.textarea}
          />
          {photos.length ? <PhotoStrip photos={photos} onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))} /> : null}
          {photos.length < MAX_NOTE_PHOTOS ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button label="📷 Cámara" variant="outline" onPress={() => void addPhotos('camera')} />
              </View>
              <View style={styles.flex}>
                <Button label="🖼 Galería" variant="outline" onPress={() => void addPhotos('library')} />
              </View>
            </View>
          ) : null}
          <Button
            label="Guardar nota"
            onPress={save}
            loading={saving}
            disabled={!text.trim() && !photos.length}
          />
        </Card>
      )}

      {error ? (
        <View style={styles.center}>
          <AppText color={colors.berry} center>
            {error}
          </AppText>
          <Button label="Reintentar" variant="outline" onPress={load} />
        </View>
      ) : !notes ? (
        <ActivityIndicator color={colors.moss} />
      ) : notes.length === 0 ? (
        <EmptyState title="Su diario está en blanco" message="Apunta cómo va: hojas nuevas, cambios de sitio, flores… y añade fotos para ver su evolución." />
      ) : (
        notes.map((n) => (
          <Card key={n.id} style={styles.note}>
            <AppText variant="label" color={colors.gold}>
              {dateTimeLabel(n.createdAt)}
              {!n.mine && n.authorName ? ` · ${n.authorName}` : ''}
            </AppText>
            {editing?.id === n.id ? (
              <>
                <TextField
                  label="Texto"
                  value={editing.text}
                  onChangeText={(t) => setEditing({ id: n.id, text: t })}
                  multiline
                  maxLength={2000}
                  style={styles.textarea}
                />
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Button label="Cancelar" variant="ghost" onPress={() => setEditing(null)} />
                  </View>
                  <View style={styles.flex}>
                    <Button label="Guardar" onPress={saveEdit} />
                  </View>
                </View>
              </>
            ) : n.text ? (
              <AppText>{n.text}</AppText>
            ) : null}
            {n.photos.length ? (
              <PhotoStrip photos={n.photos} size={96} onPress={(i) => setViewer({ photos: n.photos, index: i })} />
            ) : null}
            {n.mine && !offline && editing?.id !== n.id ? (
              <View style={styles.actions}>
                <Pressable onPress={() => setEditing({ id: n.id, text: n.text ?? '' })} hitSlop={8} accessibilityRole="button">
                  <AppText variant="label" color={colors.moss}>
                    Editar
                  </AppText>
                </Pressable>
                <Pressable onPress={() => remove(n)} hitSlop={8} accessibilityRole="button">
                  <AppText variant="label" color={colors.berry}>
                    Borrar
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))
      )}

      <PhotoViewer photos={viewer?.photos ?? []} index={viewer?.index ?? null} onClose={() => setViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  composer: { gap: space.md },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  center: { alignItems: 'center', gap: space.md },
  note: { gap: space.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.lg },
});
