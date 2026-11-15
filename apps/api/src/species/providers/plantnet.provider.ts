import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { PhotoOrgan } from '@hdp/shared';
import { USER_AGENT } from '../../common/http.js';
import { env } from '../../config/env.js';

/**
 * Pl@ntNet (my-api.plantnet.org): identificación de plantas por foto.
 * Plan gratuito: 500 identificaciones/día. Requiere mostrar el crédito "Identificación: Pl@ntNet".
 */

type PlantNetResult = {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    family?: { scientificNameWithoutAuthor?: string };
    commonNames?: string[];
  };
  gbif?: { id?: string | number };
  images?: { url?: { o?: string; m?: string; s?: string } }[];
};
type PlantNetResponse = { results?: PlantNetResult[] };

export type PlantNetCandidate = {
  score: number;
  scientificName: string;
  family: string | null;
  commonName: string | null;
  gbifKey: number | null;
  imageUrl: string | null;
};

export type PhotoInput = { buffer: Buffer; mimetype: string; organ: PhotoOrgan };

@Injectable()
export class PlantNetProvider {
  private readonly logger = new Logger(PlantNetProvider.name);

  get enabled(): boolean {
    return !!env.PLANTNET_API_KEY;
  }

  async identify(photos: PhotoInput[]): Promise<PlantNetCandidate[]> {
    if (!env.PLANTNET_API_KEY) {
      throw new ServiceUnavailableException('La identificación por fotos no está configurada (falta PLANTNET_API_KEY).');
    }
    const form = new FormData();
    photos.forEach((p, i) => {
      form.append('images', new Blob([new Uint8Array(p.buffer)], { type: p.mimetype }), `foto-${i + 1}.jpg`);
      form.append('organs', p.organ);
    });

    const params = new URLSearchParams({
      'api-key': env.PLANTNET_API_KEY,
      lang: 'es',
      'nb-results': '5',
      'include-related-images': 'true',
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch(`https://my-api.plantnet.org/v2/identify/all?${params}`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
    } catch {
      throw new BadGatewayException('Pl@ntNet no responde. Inténtalo en un momento.');
    } finally {
      clearTimeout(timer);
    }

    // 404 = no reconoce ninguna planta en las fotos
    if (res.status === 404) return [];
    if (res.status === 429) {
      throw new ServiceUnavailableException('Se ha agotado el cupo diario de identificaciones. Prueba mañana.');
    }
    if (!res.ok) {
      this.logger.warn(`Pl@ntNet respondió ${res.status}: ${await res.text().catch(() => '')}`);
      throw new BadGatewayException('No se pudo identificar la planta. Prueba con otras fotos.');
    }

    const data = (await res.json()) as PlantNetResponse;
    return (data.results ?? []).map((r) => ({
      score: r.score,
      scientificName: r.species.scientificNameWithoutAuthor,
      family: r.species.family?.scientificNameWithoutAuthor ?? null,
      commonName: r.species.commonNames?.[0] ?? null,
      gbifKey: r.gbif?.id ? Number(r.gbif.id) : null,
      imageUrl: r.images?.[0]?.url?.m ?? r.images?.[0]?.url?.s ?? null,
    }));
  }
}
