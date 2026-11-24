import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type AddPlantInput,
  calendarSchema,
  type CalendarResponse,
  plantDetailSchema,
  type PlantDetail,
  plantListSchema,
  type PlantSummary,
  remindersSchema,
  type Reminders,
  type TaskType,
  todaySchema,
  type TodayResponse,
  type UpdatePlantInput,
} from '@hdp/shared';
import { api } from './api';
import { type Cached, runOrQueue, withCache } from './offline';

/** Día local de hoy en el móvil (para acciones sin conexión). */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getToday(gardenId: string): Promise<Cached<TodayResponse>> {
  return withCache(`today.${gardenId}`, async () => todaySchema.parse(await api(`/gardens/${gardenId}/today`)));
}

export function getPlants(gardenId: string): Promise<Cached<PlantSummary[]>> {
  return withCache(`plants.${gardenId}`, async () =>
    plantListSchema.parse(await api(`/gardens/${gardenId}/plants`)).plants,
  );
}

export async function getReminders(gardenId: string): Promise<Reminders> {
  return remindersSchema.parse(await api(`/gardens/${gardenId}/reminders`));
}

export async function addPlant(gardenId: string, input: AddPlantInput): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/gardens/${gardenId}/plants`, { method: 'POST', body: input }));
}

export async function completeAll(gardenId: string): Promise<number> {
  const r = await api<{ completed: number }>(`/gardens/${gardenId}/today/complete-all`, { method: 'POST' });
  return r.completed;
}

export function getPlant(id: string): Promise<Cached<PlantDetail>> {
  return withCache(`plant.${id}`, async () => plantDetailSchema.parse(await api(`/plants/${id}`)));
}

export async function updatePlant(id: string, input: UpdatePlantInput): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}`, { method: 'PATCH', body: input }));
}

export async function removePlant(id: string): Promise<void> {
  await api(`/plants/${id}`, { method: 'DELETE' });
}

/* Estas tres funcionan también sin conexión: se guardan y se envían luego (lanzan QueuedOffline). */

export function completeTask(id: string, type: TaskType): Promise<PlantDetail> {
  return runOrQueue({ kind: 'complete', plantId: id, type, day: localToday() }, async () =>
    plantDetailSchema.parse(await api(`/plants/${id}/complete`, { method: 'POST', body: { type } })),
  );
}

export function undoTask(id: string, type: TaskType): Promise<PlantDetail> {
  return runOrQueue({ kind: 'undo', plantId: id, type, day: localToday() }, async () =>
    plantDetailSchema.parse(await api(`/plants/${id}/complete/${type}`, { method: 'DELETE' })),
  );
}

export function snoozeWatering(id: string, days: number): Promise<PlantDetail> {
  return runOrQueue({ kind: 'snooze', plantId: id, days, day: localToday() }, async () =>
    plantDetailSchema.parse(await api(`/plants/${id}/snooze`, { method: 'POST', body: { days } })),
  );
}

/* ---------- Recién llegada ---------- */

const OFFER_KEY = 'arrivalOfferHidden.';

/** "No, ya la tenía": no volver a ofrecer el plan para esta planta en este móvil. */
export async function hideArrivalOffer(id: string): Promise<void> {
  await AsyncStorage.setItem(OFFER_KEY + id, '1').catch(() => undefined);
}

export async function isArrivalOfferHidden(id: string): Promise<boolean> {
  return (await AsyncStorage.getItem(OFFER_KEY + id).catch(() => null)) === '1';
}

export async function startArrival(id: string): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}/arrival`, { method: 'POST' }));
}

export async function toggleArrivalTask(id: string, taskId: string, done: boolean): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}/arrival/tasks`, { method: 'POST', body: { taskId, done } }));
}

export async function endArrival(id: string): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}/arrival`, { method: 'DELETE' }));
}

export async function getCalendar(id: string, from: string, to: string): Promise<CalendarResponse> {
  return calendarSchema.parse(await api(`/plants/${id}/calendar?from=${from}&to=${to}`));
}
