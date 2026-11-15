import {
  type AddPlantInput,
  calendarSchema,
  type CalendarResponse,
  plantDetailSchema,
  type PlantDetail,
  plantListSchema,
  type PlantSummary,
  type TaskType,
  todaySchema,
  type TodayResponse,
  type UpdatePlantInput,
} from '@hdp/shared';
import { api } from './api';

export async function getToday(gardenId: string): Promise<TodayResponse> {
  return todaySchema.parse(await api(`/gardens/${gardenId}/today`));
}

export async function getPlants(gardenId: string): Promise<PlantSummary[]> {
  return plantListSchema.parse(await api(`/gardens/${gardenId}/plants`)).plants;
}

export async function addPlant(gardenId: string, input: AddPlantInput): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/gardens/${gardenId}/plants`, { method: 'POST', body: input }));
}

export async function completeAll(gardenId: string): Promise<number> {
  const r = await api<{ completed: number }>(`/gardens/${gardenId}/today/complete-all`, { method: 'POST' });
  return r.completed;
}

export async function getPlant(id: string): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}`));
}

export async function updatePlant(id: string, input: UpdatePlantInput): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}`, { method: 'PATCH', body: input }));
}

export async function removePlant(id: string): Promise<void> {
  await api(`/plants/${id}`, { method: 'DELETE' });
}

export async function completeTask(id: string, type: TaskType): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}/complete`, { method: 'POST', body: { type } }));
}

export async function undoTask(id: string, type: TaskType): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}/complete/${type}`, { method: 'DELETE' }));
}

export async function snoozeWatering(id: string, days: number): Promise<PlantDetail> {
  return plantDetailSchema.parse(await api(`/plants/${id}/snooze`, { method: 'POST', body: { days } }));
}

export async function getCalendar(id: string, from: string, to: string): Promise<CalendarResponse> {
  return calendarSchema.parse(await api(`/plants/${id}/calendar?from=${from}&to=${to}`));
}
