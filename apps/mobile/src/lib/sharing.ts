import {
  activityListSchema,
  type ActivityItem,
  gardenDetailSchema,
  type GardenDetail,
  gardenListSchema,
  gardenSummarySchema,
  type GardenSummary,
  inviteSchema,
  type Invite,
  invitePreviewSchema,
  type InvitePreview,
} from '@hdp/shared';
import { api } from './api';

export async function getGardens(): Promise<GardenSummary[]> {
  return gardenListSchema.parse(await api('/gardens')).gardens;
}

export async function createGarden(name: string): Promise<GardenSummary> {
  return gardenSummarySchema.parse(await api('/gardens', { method: 'POST', body: { name } }));
}

export async function getGarden(id: string): Promise<GardenDetail> {
  return gardenDetailSchema.parse(await api(`/gardens/${id}`));
}

export async function renameGarden(id: string, name: string): Promise<GardenDetail> {
  return gardenDetailSchema.parse(await api(`/gardens/${id}`, { method: 'PATCH', body: { name } }));
}

export async function deleteGarden(id: string): Promise<void> {
  await api(`/gardens/${id}`, { method: 'DELETE' });
}

export async function setMemberRole(gardenId: string, userId: string, role: 'editor' | 'viewer'): Promise<GardenDetail> {
  return gardenDetailSchema.parse(await api(`/gardens/${gardenId}/members/${userId}`, { method: 'PATCH', body: { role } }));
}

/** Quitar a alguien, o salir tú (con tu propio id). */
export async function removeMember(gardenId: string, userId: string): Promise<void> {
  await api(`/gardens/${gardenId}/members/${userId}`, { method: 'DELETE' });
}

export async function createInvite(gardenId: string, role: 'editor' | 'viewer'): Promise<Invite> {
  return inviteSchema.parse(await api(`/gardens/${gardenId}/invites`, { method: 'POST', body: { role } }));
}

export async function deleteInvite(id: string): Promise<void> {
  await api(`/invites/${id}`, { method: 'DELETE' });
}

export async function previewInvite(code: string): Promise<InvitePreview> {
  return invitePreviewSchema.parse(await api(`/invites/${encodeURIComponent(code)}`));
}

export async function acceptInvite(code: string): Promise<GardenSummary> {
  return gardenSummarySchema.parse(await api(`/invites/${encodeURIComponent(code)}/accept`, { method: 'POST' }));
}

export async function getActivity(gardenId: string): Promise<ActivityItem[]> {
  return activityListSchema.parse(await api(`/gardens/${gardenId}/activity`)).items;
}

export async function deleteMyAccount(): Promise<void> {
  await api('/me', { method: 'DELETE' });
}
