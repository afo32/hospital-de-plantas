import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type ActivityItem,
  type GardenDetail,
  type GardenRoleValue,
  type GardenSummary,
  type Invite,
  type InvitePreview,
  MAX_GARDEN_MEMBERS,
  normalizeInviteCode,
} from '@hdp/shared';
import { randomInt } from 'node:crypto';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PushService } from '../push/push.service.js';
import { StorageService } from '../storage/storage.service.js';

/** Sin letras que se confunden (O/0, I/1, L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_DAYS = 7;
const ACTIVITY_DAYS = 30;

export function generateInviteCode(): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/** Enlace de invitación: https (se puede pulsar en WhatsApp) si hay PUBLIC_URL; si no, el de la app. */
export const inviteLink = (code: string) =>
  env.PUBLIC_URL ? `${env.PUBLIC_URL.replace(/\/$/, '')}/v1/unirse/${code}` : `hospitaldeplantas://unirse/${code}`;

/** Verbos en tercera persona ("Ana regó") y en segunda ("Tú regaste"). */
const VERBS = {
  water: ['regó', 'regaste'],
  fertilize: ['abonó', 'abonaste'],
  repot: ['trasplantó', 'trasplantaste'],
  snooze: ['pospuso el riego de', 'pospusiste el riego de'],
  plant_added: ['añadió', 'añadiste'],
  note: ['escribió una nota sobre', 'escribiste una nota sobre'],
  diagnosis: ['revisó la salud de', 'revisaste la salud de'],
  joined: ['se unió al jardín', 'te uniste al jardín'],
} as const;
const verb = (kind: keyof typeof VERBS, me: boolean) => VERBS[kind][me ? 1 : 0];

const plantName = (p: { nickname: string | null; species: { commonNames: string[]; scientificName: string } }) =>
  p.nickname ?? p.species.commonNames[0] ?? p.species.scientificName;

@Injectable()
export class SharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly storage: StorageService,
  ) {}

  /* ---------- Permisos ---------- */

  private async roleIn(userId: string, gardenId: string): Promise<GardenRoleValue> {
    const m = await this.prisma.gardenMember.findUnique({ where: { gardenId_userId: { gardenId, userId } } });
    if (!m) throw new NotFoundException('Jardín no encontrado');
    return m.role as GardenRoleValue;
  }

  private async assertOwner(userId: string, gardenId: string): Promise<void> {
    if ((await this.roleIn(userId, gardenId)) !== 'owner') {
      throw new ForbiddenException('Solo el dueño del jardín puede hacer esto.');
    }
  }

  /* ---------- Jardines ---------- */

  async list(userId: string): Promise<GardenSummary[]> {
    const rows = await this.prisma.gardenMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      include: {
        garden: {
          include: {
            _count: { select: { members: true, plants: { where: { archivedAt: null } } } },
            members: { where: { role: 'owner' }, take: 1, select: { user: { select: { name: true } } } },
          },
        },
      },
    });
    return rows.map((m) => ({
      ownerName: m.garden.members[0]?.user.name ?? null,
      id: m.gardenId,
      name: m.garden.name,
      role: m.role as GardenRoleValue,
      memberCount: m.garden._count.members,
      plantCount: m.garden._count.plants,
    }));
  }

  async create(userId: string, name: string): Promise<GardenSummary> {
    const count = await this.prisma.gardenMember.count({ where: { userId } });
    if (count >= 10) throw new ConflictException('Puedes tener como máximo 10 jardines.');
    const garden = await this.prisma.garden.create({
      data: { name, members: { create: { userId, role: 'owner' } } },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { activeGardenId: garden.id } });
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return { id: garden.id, name: garden.name, role: 'owner', memberCount: 1, plantCount: 0, ownerName: me?.name ?? null };
  }

  async detail(userId: string, gardenId: string): Promise<GardenDetail> {
    const role = await this.roleIn(userId, gardenId);
    const garden = await this.prisma.garden.findUniqueOrThrow({
      where: { id: gardenId },
      include: {
        members: { include: { user: { select: { name: true, email: true } } }, orderBy: { joinedAt: 'asc' } },
        invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } },
        _count: { select: { plants: { where: { archivedAt: null } } } },
      },
    });
    const ROLE_ORDER = { owner: 0, editor: 1, viewer: 2 } as const;
    return {
      garden: {
        id: garden.id,
        name: garden.name,
        role,
        memberCount: garden.members.length,
        plantCount: garden._count.plants,
        ownerName: garden.members.find((m) => m.role === 'owner')?.user.name ?? null,
      },
      members: garden.members
        .map((m) => ({
          userId: m.userId,
          // El email solo se usa si la persona no puso nombre, y nunca entero.
          name: m.user.name ?? `${m.user.email.split('@')[0]!.slice(0, 3)}…`,
          role: m.role as GardenRoleValue,
          joinedAt: m.joinedAt.toISOString(),
          isMe: m.userId === userId,
        }))
        .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.joinedAt.localeCompare(b.joinedAt)),
      invites: role === 'owner' ? garden.invites.map((i) => this.inviteDto(i)) : [],
    };
  }

  async rename(userId: string, gardenId: string, name: string): Promise<GardenDetail> {
    await this.assertOwner(userId, gardenId);
    await this.prisma.garden.update({ where: { id: gardenId }, data: { name } });
    return this.detail(userId, gardenId);
  }

  /** Borra el jardín con todo lo que tiene. No se puede borrar el último jardín que te queda. */
  async remove(userId: string, gardenId: string): Promise<void> {
    await this.assertOwner(userId, gardenId);
    const mine = await this.prisma.gardenMember.count({ where: { userId } });
    if (mine <= 1) throw new ConflictException('Es tu único jardín. Crea otro antes de borrar este.');
    const plants = await this.prisma.userPlant.findMany({
      where: { gardenId },
      select: { photoKey: true, notes: { select: { photoKeys: true } }, diagnoses: { select: { photoKeys: true } } },
    });
    const logs = await this.prisma.propagationLog.findMany({
      where: { propagation: { gardenId } },
      select: { photoKeys: true },
    });
    await this.prisma.$transaction([
      this.prisma.userPlant.deleteMany({ where: { gardenId } }),
      this.prisma.garden.delete({ where: { id: gardenId } }),
    ]);
    await this.storage.remove([
      ...plants.flatMap((p) => [p.photoKey, ...p.notes.flatMap((n) => n.photoKeys), ...p.diagnoses.flatMap((d) => d.photoKeys)]),
      ...logs.flatMap((l) => l.photoKeys),
    ]);
  }

  /* ---------- Miembros ---------- */

  async setRole(userId: string, gardenId: string, memberId: string, role: 'editor' | 'viewer'): Promise<GardenDetail> {
    await this.assertOwner(userId, gardenId);
    if (memberId === userId) throw new BadRequestException('No puedes cambiar tu propio permiso.');
    const updated = await this.prisma.gardenMember.updateMany({ where: { gardenId, userId: memberId }, data: { role } });
    if (!updated.count) throw new NotFoundException('Esa persona no está en el jardín');
    return this.detail(userId, gardenId);
  }

  /** El dueño echa a alguien, o alguien se va (memberId = su propio id). */
  async removeMember(userId: string, gardenId: string, memberId: string): Promise<void> {
    const role = await this.roleIn(userId, gardenId);
    if (memberId === userId) {
      if (role === 'owner') {
        throw new ConflictException('Eres el dueño: no puedes salir. Si ya no lo quieres, bórralo.');
      }
    } else if (role !== 'owner') {
      throw new ForbiddenException('Solo el dueño del jardín puede quitar a otras personas.');
    }
    const removed = await this.prisma.gardenMember.deleteMany({ where: { gardenId, userId: memberId } });
    if (!removed.count) throw new NotFoundException('Esa persona no está en el jardín');
    await this.prisma.user.updateMany({ where: { id: memberId, activeGardenId: gardenId }, data: { activeGardenId: null } });
  }

  /* ---------- Invitaciones ---------- */

  private inviteDto(i: { id: string; code: string; role: string; expiresAt: Date }): Invite {
    return {
      id: i.id,
      code: i.code,
      role: i.role as 'editor' | 'viewer',
      expiresAt: i.expiresAt.toISOString(),
      link: inviteLink(i.code),
    };
  }

  async createInvite(userId: string, gardenId: string, role: 'editor' | 'viewer'): Promise<Invite> {
    await this.assertOwner(userId, gardenId);
    const members = await this.prisma.gardenMember.count({ where: { gardenId } });
    if (members >= MAX_GARDEN_MEMBERS) {
      throw new ConflictException(`Un jardín puede tener como máximo ${MAX_GARDEN_MEMBERS} personas.`);
    }
    const pending = await this.prisma.gardenInvite.count({
      where: { gardenId, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending >= 20) throw new ConflictException('Tienes demasiadas invitaciones pendientes. Borra alguna.');
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const invite = await this.prisma.gardenInvite.create({
          data: {
            gardenId,
            role,
            code: generateInviteCode(),
            createdById: userId,
            expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
          },
        });
        return this.inviteDto(invite);
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err; // código repetido: otro intento
      }
    }
    throw new ConflictException('No se pudo crear la invitación. Inténtalo de nuevo.');
  }

  async deleteInvite(userId: string, inviteId: string): Promise<void> {
    const invite = await this.prisma.gardenInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Invitación no encontrada');
    await this.assertOwner(userId, invite.gardenId);
    await this.prisma.gardenInvite.delete({ where: { id: inviteId } });
  }

  private async findInvite(rawCode: string) {
    const code = normalizeInviteCode(rawCode);
    const invite = await this.prisma.gardenInvite.findUnique({
      where: { code },
      include: {
        garden: { include: { _count: { select: { members: true, plants: { where: { archivedAt: null } } } } } },
      },
    });
    if (!invite) throw new NotFoundException('Ese código no existe. Revisa que esté bien escrito.');
    if (invite.acceptedAt) throw new GoneException('Esta invitación ya se ha usado. Pide una nueva.');
    if (invite.expiresAt < new Date()) throw new GoneException('Esta invitación ha caducado. Pide una nueva.');
    return invite;
  }

  async preview(userId: string, rawCode: string): Promise<InvitePreview> {
    const invite = await this.findInvite(rawCode);
    const [inviter, member] = await Promise.all([
      invite.createdById
        ? this.prisma.user.findUnique({ where: { id: invite.createdById }, select: { name: true } })
        : null,
      this.prisma.gardenMember.findUnique({ where: { gardenId_userId: { gardenId: invite.gardenId, userId } } }),
    ]);
    return {
      code: invite.code,
      gardenId: invite.gardenId,
      gardenName: invite.garden.name,
      invitedBy: inviter?.name ?? null,
      role: invite.role as 'editor' | 'viewer',
      plantCount: invite.garden._count.plants,
      memberCount: invite.garden._count.members,
      alreadyMember: !!member,
    };
  }

  /** Acepta la invitación: entras en el jardín y pasa a ser tu jardín activo. */
  async accept(userId: string, rawCode: string): Promise<GardenSummary> {
    const invite = await this.findInvite(rawCode);
    const already = await this.prisma.gardenMember.findUnique({
      where: { gardenId_userId: { gardenId: invite.gardenId, userId } },
    });
    if (already) throw new ConflictException('Ya estás en este jardín.');
    if (invite.garden._count.members >= MAX_GARDEN_MEMBERS) {
      throw new ConflictException(`Este jardín ya tiene ${MAX_GARDEN_MEMBERS} personas.`);
    }
    // Marcar como usada solo si nadie la usó a la vez.
    const claimed = await this.prisma.gardenInvite.updateMany({
      where: { id: invite.id, acceptedAt: null },
      data: { acceptedAt: new Date(), acceptedBy: userId },
    });
    if (!claimed.count) throw new GoneException('Esta invitación ya se ha usado. Pide una nueva.');
    await this.prisma.$transaction([
      this.prisma.gardenMember.create({ data: { gardenId: invite.gardenId, userId, role: invite.role } }),
      this.prisma.user.update({ where: { id: userId }, data: { activeGardenId: invite.gardenId } }),
    ]);
    this.push.record({ gardenId: invite.gardenId, actorId: userId, kind: 'joined' });
    const owner = await this.prisma.gardenMember.findFirst({
      where: { gardenId: invite.gardenId, role: 'owner' },
      select: { user: { select: { name: true } } },
    });
    return {
      ownerName: owner?.user.name ?? null,
      id: invite.gardenId,
      name: invite.garden.name,
      role: invite.role as 'editor' | 'viewer',
      memberCount: invite.garden._count.members + 1,
      plantCount: invite.garden._count.plants,
    };
  }

  /* ---------- Actividad ---------- */

  /** Lo que ha pasado en el jardín en los últimos 30 días, lo más reciente primero. */
  async activity(userId: string, gardenId: string, limit = 60): Promise<ActivityItem[]> {
    await this.roleIn(userId, gardenId);
    const since = new Date(Date.now() - ACTIVITY_DAYS * 86_400_000);
    const plantSelect = { id: true, nickname: true, species: { select: { commonNames: true, scientificName: true } } };
    const [events, added, notes, diagnoses, joins] = await Promise.all([
      this.prisma.careEvent.findMany({
        where: { plant: { gardenId }, doneAt: { gte: since }, type: { in: ['water', 'fertilize', 'repot', 'snooze'] } },
        orderBy: { doneAt: 'desc' },
        take: limit,
        include: { doneBy: { select: { id: true, name: true } }, plant: { select: plantSelect } },
      }),
      this.prisma.userPlant.findMany({
        where: { gardenId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { ...plantSelect, createdAt: true, addedBy: { select: { id: true, name: true } } },
      }),
      this.prisma.note.findMany({
        where: { plant: { gardenId }, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { author: { select: { id: true, name: true } }, plant: { select: plantSelect } },
      }),
      this.prisma.diagnosis.findMany({
        where: { plant: { gardenId }, createdAt: { gte: since }, status: { in: ['done', 'resolved'] } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { plant: { select: plantSelect } },
      }),
      this.prisma.gardenMember.findMany({
        where: { gardenId, joinedAt: { gte: since }, role: { not: 'owner' } },
        include: { user: { select: { name: true } } },
      }),
    ]);

    const diagAuthors = await this.prisma.user.findMany({
      where: { id: { in: diagnoses.map((d) => d.createdById).filter((x): x is string => !!x) } },
      select: { id: true, name: true },
    });

    const actor = (u: { id: string; name: string | null } | null | undefined) => ({
      actorName: u ? (u.id === userId ? 'Tú' : (u.name ?? 'Alguien')) : 'Alguien',
      isMe: u?.id === userId,
    });
    const items: ActivityItem[] = [];

    for (const e of events) {
      const name = plantName(e.plant);
      const a = actor(e.doneBy);
      const kind = e.type as 'water' | 'fertilize' | 'repot' | 'snooze';
      const text =
        kind === 'snooze'
          ? `${verb(kind, a.isMe)} ${name}${e.snoozeDays ? ` ${e.snoozeDays} ${e.snoozeDays === 1 ? 'día' : 'días'}` : ''}`
          : `${verb(kind, a.isMe)} ${name}`;
      items.push({
        id: `e-${e.id}`,
        kind,
        ...a,
        plantId: e.plant.id,
        plantName: name,
        text,
        at: e.doneAt.toISOString(),
      });
    }
    for (const p of added) {
      const a = actor(p.addedBy);
      items.push({
        id: `p-${p.id}`,
        kind: 'plant_added',
        ...a,
        plantId: p.id,
        plantName: plantName(p),
        text: `${verb('plant_added', a.isMe)} ${plantName(p)} al jardín`,
        at: p.createdAt.toISOString(),
      });
    }
    for (const n of notes) {
      const a = actor(n.author);
      items.push({
        id: `n-${n.id}`,
        kind: 'note',
        ...a,
        plantId: n.plant.id,
        plantName: plantName(n.plant),
        text: `${verb('note', a.isMe)} ${plantName(n.plant)}${n.photoKeys.length ? ` (${n.photoKeys.length} ${n.photoKeys.length === 1 ? 'foto' : 'fotos'})` : ''}`,
        at: n.createdAt.toISOString(),
      });
    }
    for (const d of diagnoses) {
      const title = (d.result as { title?: string } | null)?.title;
      const a = actor(diagAuthors.find((u) => u.id === d.createdById));
      items.push({
        id: `d-${d.id}`,
        kind: 'diagnosis',
        ...a,
        plantId: d.plant.id,
        plantName: plantName(d.plant),
        text: `${verb('diagnosis', a.isMe)} ${plantName(d.plant)}${title ? `: ${title}` : ''}`,
        at: d.createdAt.toISOString(),
      });
    }
    for (const j of joins) {
      items.push({
        id: `j-${j.userId}`,
        kind: 'joined',
        ...actor({ id: j.userId, name: j.user.name }),
        plantId: null,
        plantName: null,
        text: verb('joined', j.userId === userId),
        at: j.joinedAt.toISOString(),
      });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }
}
