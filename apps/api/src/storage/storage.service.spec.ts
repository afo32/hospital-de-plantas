import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeImage, sniffImage, StorageService } from './storage.service.js';

// JPEG mínimo válido (1×1 px)
const JPEG_1PX =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const PLANT = '11111111-2222-4333-8444-555555555555';

function diskStorage() {
  const s = new StorageService();
  (s as unknown as { dir: string }).dir = mkdtempSync(join(tmpdir(), 'hdp-files-'));
  return s;
}

describe('fotos', () => {
  it('reconoce JPEG, PNG y WebP por sus bytes', () => {
    expect(sniffImage(Buffer.from(JPEG_1PX, 'base64'))).toBe('jpg');
    expect(sniffImage(Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'))).toBe('png');
    expect(sniffImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'binary'))).toBe('webp');
    expect(sniffImage(Buffer.from('<html>hola</html>'))).toBeNull();
  });

  it('rechaza lo que no es una foto, aunque venga con prefijo data:', () => {
    expect(decodeImage(`data:image/jpeg;base64,${JPEG_1PX}`).ext).toBe('jpg');
    expect(() => decodeImage(Buffer.from('no soy una foto').toString('base64'))).toThrow(/no es una foto/);
  });

  it('guarda, sirve con enlace firmado y borra en disco', async () => {
    const s = diskStorage();
    const key = await s.putImage('note', PLANT, JPEG_1PX);
    expect(key).toMatch(new RegExp(`^note/${PLANT}/[0-9a-f-]{36}\\.jpg$`));

    const url = s.url(key);
    const u = new URL(url, 'http://x');
    expect(u.pathname).toBe(`/files/${key}`);
    const exp = Number(u.searchParams.get('e'));
    expect(exp - Date.now() / 1000).toBeGreaterThan(6.9 * 86400);
    expect(s.url(key)).toBe(url); // estable para la caché del móvil
    expect(s.verify(key, exp, u.searchParams.get('s')!)).toBe(true);
    expect(s.verify(key, exp, 'firmafalsa')).toBe(false);
    expect(s.verify(key.replace('note', 'diag'), exp, u.searchParams.get('s')!)).toBe(false);
    expect(s.verify(key, Math.floor(Date.now() / 1000) - 10, u.searchParams.get('s')!)).toBe(false);

    const file = await s.read(key);
    expect(file.contentType).toBe('image/jpeg');
    expect(file.body.equals(Buffer.from(JPEG_1PX, 'base64'))).toBe(true);

    await s.remove([key, null, '../../etc/passwd']);
    await expect(s.read(key)).rejects.toThrow(/no encontrada/);
  });

  it('no permite leer rutas fuera de la carpeta', async () => {
    const s = diskStorage();
    await expect(s.read('../../.env')).rejects.toThrow(/no encontrada/);
  });

  it('si falla una foto de varias, borra las ya guardadas', async () => {
    const s = diskStorage();
    const removed: string[][] = [];
    const original = s.remove.bind(s);
    s.remove = async (keys) => {
      removed.push(keys as string[]);
      return original(keys);
    };
    await expect(s.putImages('note', PLANT, [JPEG_1PX, 'bm8gZXMgdW5hIGZvdG8gcGVybyBlcyBsYXJnbyBwYXJhIHBhc2FyIGVsIG1pbmltby4uLg=='])).rejects.toThrow();
    expect(removed[0]).toHaveLength(1);
  });
});
