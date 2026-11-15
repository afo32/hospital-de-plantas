import { Injectable } from '@nestjs/common';
import { fetchJson, MemoryCache } from '../../common/http.js';

type Summary = {
  type?: string;
  thumbnail?: { source?: string; uri?: string };
  originalimage?: { source?: string; uri?: string };
};

/**
 * Foto representativa de una especie desde Wikipedia (imagen principal del artículo).
 * Busca primero en es.wikipedia y luego en en.wikipedia por nombre científico.
 * Las imágenes son de Wikimedia Commons (licencias libres; la app muestra "Foto: Wikipedia").
 */
@Injectable()
export class WikipediaProvider {
  /** null también se cachea, para no repetir búsquedas de especies sin foto. */
  private readonly cache = new MemoryCache<string | null>(7 * 24 * 60 * 60 * 1000, 5000);

  async imageFor(scientificName: string): Promise<string | null> {
    const key = scientificName.toLowerCase();
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const title = encodeURIComponent(scientificName.replace(/ /g, '_'));
    let url: string | null = null;
    for (const lang of ['es', 'en']) {
      const s = await fetchJson<Summary>(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`, {}, 3000);
      if (s && s.type !== 'disambiguation') {
        url = s.thumbnail?.source ?? s.thumbnail?.uri ?? s.originalimage?.source ?? s.originalimage?.uri ?? null;
        if (url) break;
      }
    }
    this.cache.set(key, url);
    return url;
  }

  /** Busca fotos de varias especies en paralelo (máximo 6 peticiones a la vez). */
  async imagesFor(names: string[]): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    const queue = [...new Set(names)];
    const worker = async () => {
      for (let name = queue.shift(); name; name = queue.shift()) {
        result.set(name, await this.imageFor(name));
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker));
    return result;
  }
}
