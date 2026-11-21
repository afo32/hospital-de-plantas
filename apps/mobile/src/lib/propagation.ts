import {
  type CreatePropagationInput,
  type CreateReportInput,
  guideStatusSchema,
  type GuideStatus,
  propagationDetailSchema,
  type PropagationDetail,
  propagationListSchema,
  type PropagationMethod,
  type PropagationSummary,
  type UpdatePropagationInput,
} from '@hdp/shared';
import { api } from './api';
import { toBase64 } from './media';
import { type Cached, withCache } from './offline';

/** Guía de una especie para un método. La primera vez tarda ~1 min: vuelve a llamar mientras sea "generating". */
export async function getGuide(speciesId: string, method: PropagationMethod, retry = false): Promise<GuideStatus> {
  return guideStatusSchema.parse(await api(`/species/${speciesId}/propagation/${method}${retry ? '?retry=1' : ''}`));
}

export function getPropagations(gardenId: string): Promise<Cached<PropagationSummary[]>> {
  return withCache(`propagations.${gardenId}`, async () =>
    propagationListSchema.parse(await api(`/gardens/${gardenId}/propagations`)).propagations,
  );
}

export function getPropagation(id: string): Promise<Cached<PropagationDetail>> {
  return withCache(`propagation.${id}`, async () => propagationDetailSchema.parse(await api(`/propagations/${id}`)));
}

const detail = async (path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown, timeoutMs?: number) =>
  propagationDetailSchema.parse(await api(path, { method, body, timeoutMs }));

export const createPropagation = (gardenId: string, input: CreatePropagationInput) =>
  detail(`/gardens/${gardenId}/propagations`, 'POST', input);

export const updatePropagation = (id: string, input: UpdatePropagationInput) =>
  detail(`/propagations/${id}`, 'PATCH', input);

export const advancePropagation = (id: string, input: { successCount?: number; back?: boolean }) =>
  detail(`/propagations/${id}/advance`, 'POST', input);

export const togglePropagationTask = (id: string, stageIndex: number, taskIndex: number) =>
  detail(`/propagations/${id}/tasks`, 'POST', { stageIndex, taskIndex });

export async function addPropagationLog(id: string, text: string, photoUris: string[]) {
  const photos: string[] = [];
  for (const uri of photoUris) photos.push(await toBase64(uri));
  return detail(`/propagations/${id}/logs`, 'POST', { text: text.trim() || undefined, photos }, 90_000);
}

export const deletePropagationLog = (id: string, logId: string) => detail(`/propagations/${id}/logs/${logId}`, 'DELETE');

export const finishPropagation = (id: string, input: { result: 'done' | 'failed'; plantId?: string; reason?: string }) =>
  detail(`/propagations/${id}/finish`, 'POST', input);

export const reopenPropagation = (id: string) => detail(`/propagations/${id}/reopen`, 'POST');

export async function deletePropagation(id: string): Promise<void> {
  await api(`/propagations/${id}`, { method: 'DELETE' });
}

/** Avisar de contenido de IA incorrecto, peligroso u ofensivo. */
export async function reportContent(input: CreateReportInput): Promise<void> {
  await api('/reports', { method: 'POST', body: input });
}
