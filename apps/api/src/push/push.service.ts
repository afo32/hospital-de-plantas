import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildGardenMessage, type PendingBatch, type PushKind } from './push.messages.js';

type RecordInput = {
  gardenId: string;
  actorId: string;
  kind: PushKind;
  plantId?: string | null;
  plantName?: string | null;
  extra?: string;
};

/**
 * Avisos push a las demás personas de un jardín compartido, a través del servicio de Expo
 * (que usa Firebase Cloud Messaging en Android). Las acciones de una misma persona se juntan
 * durante PUSH_BATCH_SECONDS para mandar "Ana regó 3 plantas" en vez de tres avisos.
 */
@Injectable()
export class PushService implements OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private readonly expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN || undefined });
  private readonly pending = new Map<string, { batch: PendingBatch; timer: NodeJS.Timeout }>();

  constructor(private readonly prisma: PrismaService) {}

  /* ---------- Tokens ---------- */

  async saveToken(userId: string, token: string, platform: string): Promise<void> {
    if (!Expo.isExpoPushToken(token)) return;
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { token, platform, userId },
      update: { userId, platform },
    });
  }

  async removeToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token, userId } });
  }

  /* ---------- Actividad del jardín ---------- */

  /** Apunta una acción. No espera ni falla nunca: los avisos son lo de menos. */
  record(input: RecordInput): void {
    void this.enqueue(input).catch((err) => this.logger.warn(`No se pudo preparar el aviso: ${(err as Error).message}`));
  }

  private async enqueue(input: RecordInput): Promise<void> {
    // Solo merece la pena si hay más personas en el jardín.
    const members = await this.prisma.gardenMember.count({ where: { gardenId: input.gardenId } });
    if (members < 2) return;

    const key = `${input.gardenId}:${input.actorId}`;
    let entry = this.pending.get(key);
    if (!entry) {
      const [garden, actor] = await Promise.all([
        this.prisma.garden.findUnique({ where: { id: input.gardenId }, select: { name: true } }),
        this.prisma.user.findUnique({ where: { id: input.actorId }, select: { name: true } }),
      ]);
      if (!garden) return;
      // Puede haberse creado mientras esperábamos a la base de datos.
      entry = this.pending.get(key);
      if (!entry) {
        const batch: PendingBatch = {
          gardenId: input.gardenId,
          gardenName: garden.name,
          actorId: input.actorId,
          actorName: actor?.name ?? 'Alguien',
          items: [],
        };
        const timer = setTimeout(() => void this.flush(key), env.PUSH_BATCH_SECONDS * 1000);
        timer.unref?.();
        entry = { batch, timer };
        this.pending.set(key, entry);
      }
    }
    entry.batch.items.push({
      kind: input.kind,
      plantId: input.plantId ?? null,
      plantName: input.plantName ?? null,
      extra: input.extra,
    });
  }

  /** Envía lo acumulado de una persona en un jardín. */
  async flush(key: string): Promise<number> {
    const entry = this.pending.get(key);
    if (!entry) return 0;
    this.pending.delete(key);
    clearTimeout(entry.timer);
    const { batch } = entry;
    if (!batch.items.length) return 0;

    const tokens = await this.prisma.pushToken.findMany({
      where: {
        userId: { not: batch.actorId },
        user: { notifyGarden: true, memberships: { some: { gardenId: batch.gardenId } } },
      },
      select: { token: true },
    });
    if (!tokens.length) return 0;

    const msg = buildGardenMessage(batch);
    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        title: msg.title,
        body: msg.body,
        sound: 'default',
        channelId: 'jardin',
        data: { type: 'garden', gardenId: batch.gardenId, plantId: msg.plantId },
      }));
    return this.send(messages);
  }

  /** Envía ya todo lo pendiente (al apagar el servidor o en las pruebas). */
  async flushAll(): Promise<void> {
    await Promise.all([...this.pending.keys()].map((k) => this.flush(k)));
  }

  async onModuleDestroy(): Promise<void> {
    await this.flushAll().catch(() => undefined);
  }

  private async send(messages: ExpoPushMessage[]): Promise<number> {
    let sent = 0;
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        for (const [i, ticket] of tickets.entries()) {
          if (ticket.status === 'ok') sent++;
          else if (ticket.details?.error === 'DeviceNotRegistered') {
            // La app se desinstaló o el token caducó: lo olvidamos.
            await this.prisma.pushToken.deleteMany({ where: { token: String(chunk[i]!.to) } });
          } else {
            this.logger.warn(`Aviso rechazado: ${ticket.message}`);
          }
        }
      } catch (err) {
        this.logger.warn(`No se pudieron enviar ${chunk.length} avisos: ${(err as Error).message}`);
      }
    }
    if (sent) this.logger.log(`${sent} avisos enviados`);
    return sent;
  }
}
