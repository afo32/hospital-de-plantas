import { z } from 'zod';

/* =====================================================================
 * Jardines compartidos: miembros, roles, invitaciones y actividad
 * ===================================================================== */

export const ROLE_LABELS = {
  owner: 'Dueño',
  editor: 'Cuida',
  viewer: 'Solo mira',
} as const;

export const ROLE_HINTS = {
  owner: 'Puede hacerlo todo: invitar, cambiar permisos y borrar el jardín.',
  editor: 'Puede regar, añadir plantas, escribir notas y hacer revisiones de salud.',
  viewer: 'Ve las plantas y sus cuidados, pero no puede cambiar nada.',
} as const;

export const gardenRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export type GardenRoleValue = z.infer<typeof gardenRoleSchema>;
export const inviteRoleSchema = z.enum(['editor', 'viewer']);

/** Máximo de personas por jardín. */
export const MAX_GARDEN_MEMBERS = 10;

export const gardenNameSchema = z.string().trim().min(1, 'Ponle un nombre').max(40, 'Máximo 40 caracteres');

export const createGardenSchema = z.object({ name: gardenNameSchema });
export type CreateGardenInput = z.infer<typeof createGardenSchema>;

export const gardenSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: gardenRoleSchema,
  memberCount: z.number().int(),
  plantCount: z.number().int(),
  ownerName: z.string().nullable().default(null),
});
export type GardenSummary = z.infer<typeof gardenSummarySchema>;

/**
 * Nombre para mostrar: los jardines compartidos contigo que se llaman "Mi jardín" pasan a
 * "Jardín de Juan", para no confundirlos con el tuyo.
 */
export function gardenLabel(g: { name: string; role: string; ownerName?: string | null }): string {
  if (g.role !== 'owner' && g.ownerName && g.name.trim().toLowerCase() === 'mi jardín') {
    return `Jardín de ${g.ownerName.split(' ')[0]}`;
  }
  return g.name;
}

export const gardenListSchema = z.object({ gardens: z.array(gardenSummarySchema) });

export const memberSchema = z.object({
  userId: z.uuid(),
  name: z.string(),
  role: gardenRoleSchema,
  joinedAt: z.string(),
  isMe: z.boolean(),
});
export type Member = z.infer<typeof memberSchema>;

export const inviteSchema = z.object({
  id: z.uuid(),
  /** Código para escribir a mano, p. ej. "HOJA-7K3Q" */
  code: z.string(),
  role: inviteRoleSchema,
  expiresAt: z.string(),
  /** Enlace que abre la app directamente */
  link: z.string(),
});
export type Invite = z.infer<typeof inviteSchema>;

export const gardenDetailSchema = z.object({
  garden: gardenSummarySchema,
  members: z.array(memberSchema),
  /** Invitaciones pendientes (solo las ve el dueño) */
  invites: z.array(inviteSchema),
});
export type GardenDetail = z.infer<typeof gardenDetailSchema>;

export const createInviteSchema = z.object({ role: inviteRoleSchema.default('editor') });
export type CreateInviteInput = z.input<typeof createInviteSchema>;

export const updateMemberSchema = z.object({ role: inviteRoleSchema });

/** Lo que ves antes de aceptar una invitación. */
export const invitePreviewSchema = z.object({
  code: z.string(),
  gardenId: z.uuid(),
  gardenName: z.string(),
  invitedBy: z.string().nullable(),
  role: inviteRoleSchema,
  plantCount: z.number().int(),
  memberCount: z.number().int(),
  alreadyMember: z.boolean(),
});
export type InvitePreview = z.infer<typeof invitePreviewSchema>;

/** "hoja7k3q", "HOJA 7K3Q" o "hoja-7k3q" → "HOJA-7K3Q". */
export function normalizeInviteCode(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

export const ACTIVITY_KINDS = ['water', 'fertilize', 'repot', 'snooze', 'plant_added', 'note', 'diagnosis', 'joined'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const activityItemSchema = z.object({
  id: z.string(),
  kind: z.enum(ACTIVITY_KINDS),
  actorName: z.string(),
  isMe: z.boolean(),
  plantId: z.uuid().nullable(),
  plantName: z.string().nullable(),
  /** Frase lista para mostrar: "regó Monstera" */
  text: z.string(),
  at: z.string(),
});
export type ActivityItem = z.infer<typeof activityItemSchema>;

export const activityListSchema = z.object({ items: z.array(activityItemSchema) });

/* ---------- Notificaciones push ---------- */

export const pushTokenSchema = z.object({
  /** Token de Expo: "ExponentPushToken[…]" */
  token: z.string().min(10).max(200),
  platform: z.enum(['android', 'ios']),
});
export type PushTokenInput = z.infer<typeof pushTokenSchema>;

export const removePushTokenSchema = z.object({ token: z.string().min(10).max(200) });
