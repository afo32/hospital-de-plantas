import {
  type DiagnosisAnswer,
  diagnosisListSchema,
  diagnosisSchema,
  type Diagnosis,
  noteListSchema,
  noteSchema,
  type Note,
  plantDetailSchema,
  type PlantDetail,
} from '@hdp/shared';
import { api } from './api';
import { toBase64 } from './media';
import { type Cached, withCache } from './offline';

/* ---------- Foto propia de la planta ---------- */

export async function setPlantPhoto(plantId: string, uri: string): Promise<PlantDetail> {
  const base64 = await toBase64(uri);
  return plantDetailSchema.parse(await api(`/plants/${plantId}/photo`, { method: 'PUT', body: { base64 }, timeoutMs: 60_000 }));
}

export async function removePlantPhoto(plantId: string): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${plantId}/photo`, { method: 'DELETE' }));
}

/* ---------- Notas ---------- */

export function getNotes(plantId: string): Promise<Cached<Note[]>> {
  return withCache(`notes.${plantId}`, async () => noteListSchema.parse(await api(`/plants/${plantId}/notes`)).notes);
}

export async function createNote(plantId: string, text: string, photoUris: string[]): Promise<Note> {
  const photos: string[] = [];
  for (const uri of photoUris) photos.push(await toBase64(uri));
  const body = { text: text.trim() || undefined, photos };
  return noteSchema.parse(await api(`/plants/${plantId}/notes`, { method: 'POST', body, timeoutMs: 90_000 }));
}

export async function updateNote(noteId: string, text: string): Promise<Note> {
  return noteSchema.parse(await api(`/notes/${noteId}`, { method: 'PATCH', body: { text: text.trim() } }));
}

export async function deleteNote(noteId: string): Promise<void> {
  await api(`/notes/${noteId}`, { method: 'DELETE' });
}

/* ---------- Diagnósticos ---------- */

export function getDiagnoses(plantId: string): Promise<Cached<Diagnosis[]>> {
  return withCache(`diagnoses.${plantId}`, async () =>
    diagnosisListSchema.parse(await api(`/plants/${plantId}/diagnoses`)).diagnoses,
  );
}

export async function getDiagnosis(id: string): Promise<Diagnosis> {
  return diagnosisSchema.parse(await api(`/diagnoses/${id}`));
}

/** Paso 1: sube las fotos; la IA las mira y devuelve preguntas (tarda 15-40 s). */
export async function startDiagnosis(plantId: string, photoUris: string[], symptoms: string): Promise<Diagnosis> {
  const photos: string[] = [];
  for (const uri of photoUris) photos.push(await toBase64(uri));
  const body = { photos, symptoms: symptoms.trim() || undefined };
  return diagnosisSchema.parse(await api(`/plants/${plantId}/diagnoses`, { method: 'POST', body, timeoutMs: 150_000 }));
}

/** Paso 2: con las respuestas, la IA da el diagnóstico y el tratamiento. */
export async function answerDiagnosis(id: string, answers: DiagnosisAnswer[]): Promise<Diagnosis> {
  return diagnosisSchema.parse(
    await api(`/diagnoses/${id}/answers`, { method: 'POST', body: { answers }, timeoutMs: 180_000 }),
  );
}

export async function setDiagnosisStatus(id: string, status: 'done' | 'resolved'): Promise<Diagnosis> {
  return diagnosisSchema.parse(await api(`/diagnoses/${id}`, { method: 'PATCH', body: { status } }));
}

export async function deleteDiagnosis(id: string): Promise<void> {
  await api(`/diagnoses/${id}`, { method: 'DELETE' });
}
