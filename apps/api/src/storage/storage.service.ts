import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { env } from '../config/env.js';

/** Tipos de foto: de la planta, de una nota o de un diagnóstico. */
export type PhotoKind = 'plant' | 'note' | 'diag' | 'prop';

/** Tamaño máximo de una foto ya decodificada (el móvil las reduce a ~300 KB). */
const MAX_BYTES = 6 * 1024 * 1024;
const WEEK_S = 7 * 24 * 3600;
const KEY_RE = /^(plant|note|diag|prop)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

const CONTENT_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;
type Ext = keyof typeof CONTENT_TYPES;

/** Reconoce el formato por los primeros bytes (no nos fiamos de lo que diga el cliente). */
export function sniffImage(buf: Buffer): Ext | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Quita el prefijo "data:image/jpeg;base64," si viene, y decodifica. */
export function decodeImage(base64: string): { buf: Buffer; ext: Ext } {
  const clean = base64.slice(base64.indexOf(',') + 1).replace(/\s/g, '');
  const buf = Buffer.from(clean, 'base64');
  if (buf.length > MAX_BYTES) throw new BadRequestException('La foto es demasiado grande (máximo 6 MB).');
  const ext = sniffImage(buf);
  if (!ext) throw new BadRequestException('El archivo no es una foto JPEG, PNG o WebP.');
  return { buf, ext };
}

/**
 * Guarda las fotos en Cloudflare R2 (si está configurado) o en una carpeta del servidor.
 * Las fotos nunca son públicas: la app las pide a /v1/files/... con una firma que caduca.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;
  private readonly bucket = env.R2_BUCKET ?? 'hospital-de-plantas';
  private readonly dir = resolve(env.UPLOADS_DIR);
  private readonly secret = createHmac('sha256', env.JWT_ACCESS_SECRET).update('files').digest();

  constructor() {
    const r2 = env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && (env.R2_ACCOUNT_ID || env.R2_ENDPOINT);
    this.s3 = r2
      ? new S3Client({
          region: 'auto',
          endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          forcePathStyle: Boolean(env.R2_ENDPOINT),
          credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
        })
      : null;
    if (this.s3) this.logger.log(`Fotos en R2 (bucket "${this.bucket}")`);
    else {
      this.logger.log(`Fotos en disco: ${this.dir}`);
      if (env.NODE_ENV === 'production') {
        this.logger.warn('Sin R2 en producción: las fotos se perderán en cada despliegue. Configura R2_* (docs/fotos-r2.md).');
      }
    }
  }

  get driver(): 'r2' | 'disk' {
    return this.s3 ? 'r2' : 'disk';
  }

  /** Guarda una foto en base64 y devuelve su clave, p. ej. "note/<plantId>/<uuid>.jpg". */
  async putImage(kind: PhotoKind, plantId: string, base64: string): Promise<string> {
    const { buf, ext } = decodeImage(base64);
    const key = `${kind}/${plantId}/${randomUUID()}.${ext}`;
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buf, ContentType: CONTENT_TYPES[ext] }),
      );
    } else {
      const file = join(this.dir, key);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, buf);
    }
    return key;
  }

  /** Guarda varias; si alguna falla, borra las que ya se subieron. */
  async putImages(kind: PhotoKind, plantId: string, photos: string[]): Promise<string[]> {
    const keys: string[] = [];
    try {
      for (const p of photos) keys.push(await this.putImage(kind, plantId, p));
      return keys;
    } catch (err) {
      await this.remove(keys);
      throw err;
    }
  }

  async read(key: string): Promise<{ body: Buffer; contentType: string }> {
    if (!KEY_RE.test(key)) throw new NotFoundException('Foto no encontrada');
    const contentType = CONTENT_TYPES[key.split('.').pop() as Ext];
    try {
      if (this.s3) {
        const out = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
        return { body: Buffer.from(await out.Body!.transformToByteArray()), contentType };
      }
      return { body: await readFile(join(this.dir, key)), contentType };
    } catch (err) {
      this.logger.warn(`No se pudo leer ${key}: ${(err as Error).message}`);
      throw new NotFoundException('Foto no encontrada');
    }
  }

  /** Borra fotos. Nunca falla: si algo no se puede borrar, solo lo apunta en el log. */
  async remove(keys: (string | null | undefined)[]): Promise<void> {
    const valid = keys.filter((k): k is string => !!k && KEY_RE.test(k));
    if (!valid.length) return;
    try {
      if (this.s3) {
        await this.s3.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: valid.map((Key) => ({ Key })) } }),
        );
      } else {
        await Promise.all(valid.map((k) => rm(join(this.dir, k), { force: true })));
      }
    } catch (err) {
      this.logger.warn(`No se pudieron borrar ${valid.length} fotos: ${(err as Error).message}`);
    }
  }

  /* ---------- Enlaces firmados ---------- */

  private sign(key: string, exp: number): string {
    return createHmac('sha256', this.secret).update(`${key}:${exp}`).digest('base64url').slice(0, 22);
  }

  /**
   * Enlace relativo al API ("/files/…?e=…&s=…"). La caducidad se redondea a semanas para que el
   * enlace sea el mismo durante días y el móvil pueda guardar la foto en caché.
   */
  url(key: string): string;
  url(key: string | null | undefined): string | null;
  url(key: string | null | undefined): string | null {
    if (!key) return null;
    const now = Math.floor(Date.now() / 1000);
    const exp = (Math.floor(now / WEEK_S) + 2) * WEEK_S; // entre 7 y 14 días de validez
    return `/files/${key}?e=${exp}&s=${this.sign(key, exp)}`;
  }

  verify(key: string, exp: number, sig: string): boolean {
    if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
    const expected = Buffer.from(this.sign(key, exp));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
