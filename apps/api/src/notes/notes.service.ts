import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateNoteInput, Note, UpdateNoteInput } from '@hdp/shared';
import { GardenService } from '../garden/garden.service.js';
import type { Note as NoteRow } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PushService } from '../push/push.service.js';
import { StorageService } from '../storage/storage.service.js';

type NoteWithAuthor = NoteRow & { author: { name: string | null } | null };

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly garden: GardenService,
    private readonly storage: StorageService,
    private readonly push: PushService,
  ) {}

  private toDto(n: NoteWithAuthor, userId: string): Note {
    return {
      id: n.id,
      plantId: n.plantId,
      text: n.text,
      photos: n.photoKeys.map((k) => this.storage.url(k)),
      authorName: n.author?.name ?? null,
      mine: n.authorId === userId,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async list(userId: string, plantId: string): Promise<Note[]> {
    await this.garden.accessPlant(userId, plantId);
    const rows = await this.prisma.note.findMany({
      where: { plantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { author: { select: { name: true } } },
    });
    return rows.map((n) => this.toDto(n, userId));
  }

  async create(userId: string, plantId: string, input: CreateNoteInput): Promise<Note> {
    const plant = await this.garden.accessPlant(userId, plantId, true);
    const keys = await this.storage.putImages('note', plantId, input.photos ?? []);
    try {
      const row = await this.prisma.note.create({
        data: { plantId, authorId: userId, text: input.text?.trim() || null, photoKeys: keys },
        include: { author: { select: { name: true } } },
      });
      this.push.record({
        gardenId: plant.gardenId,
        actorId: userId,
        kind: 'note',
        plantId,
        plantName: plant.nickname ?? plant.species.commonNames[0] ?? plant.species.scientificName,
      });
      return this.toDto(row, userId);
    } catch (err) {
      await this.storage.remove(keys);
      throw err;
    }
  }

  private async loadOwn(userId: string, id: string): Promise<NoteWithAuthor> {
    const n = await this.prisma.note.findUnique({ where: { id }, include: { author: { select: { name: true } } } });
    if (!n) throw new NotFoundException('Nota no encontrada');
    await this.garden.accessPlant(userId, n.plantId, true);
    if (n.authorId !== userId) throw new ForbiddenException('Solo quien escribió la nota puede cambiarla.');
    return n;
  }

  async update(userId: string, id: string, input: UpdateNoteInput): Promise<Note> {
    const n = await this.loadOwn(userId, id);
    if (!input.text && n.photoKeys.length === 0) {
      throw new ForbiddenException('Una nota sin fotos necesita texto. Si quieres, bórrala.');
    }
    const row = await this.prisma.note.update({
      where: { id },
      data: { text: input.text || null },
      include: { author: { select: { name: true } } },
    });
    return this.toDto(row, userId);
  }

  async remove(userId: string, id: string): Promise<void> {
    const n = await this.loadOwn(userId, id);
    await this.prisma.note.delete({ where: { id } });
    await this.storage.remove(n.photoKeys);
  }
}
