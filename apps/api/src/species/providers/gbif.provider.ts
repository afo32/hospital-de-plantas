import { Injectable, Logger } from '@nestjs/common';
import { fetchJson, MemoryCache } from '../../common/http.js';

/**
 * GBIF (api.gbif.org): taxonomía mundial gratuita y sin clave.
 * Se usa para buscar plantas por nombre científico o común (qField=VERNACULAR).
 */

const BASE = 'https://api.gbif.org/v1';
/** Taxonomía troncal de GBIF ("Backbone"): evita duplicados de otras listas. */
const BACKBONE = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c';
/** Reino Plantae */
const PLANTAE = 6;

type GbifVernacular = { vernacularName: string; language?: string };
type GbifResult = {
  key: number;
  nubKey?: number;
  scientificName?: string;
  canonicalName?: string;
  family?: string;
  rank?: string;
  taxonomicStatus?: string;
  kingdomKey?: number;
  vernacularNames?: GbifVernacular[];
};
type GbifSearch = { results?: GbifResult[] };

export type GbifSpecies = {
  gbifKey: number;
  scientificName: string;
  family: string | null;
  commonNameEs: string | null;
};

const SPANISH = new Set(['spa', 'es', 'esp', 'spanish']);

@Injectable()
export class GbifProvider {
  private readonly logger = new Logger(GbifProvider.name);
  private readonly cache = new MemoryCache<GbifSpecies[]>(24 * 60 * 60 * 1000);

  /** Busca especies de plantas aceptadas por nombre común y científico a la vez. */
  async search(query: string, limit = 15): Promise<GbifSpecies[]> {
    const key = `${query.toLowerCase()}|${limit}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const params = (extra: Record<string, string>) =>
      new URLSearchParams({
        q: query,
        datasetKey: BACKBONE,
        rank: 'SPECIES',
        status: 'ACCEPTED',
        highertaxon_key: String(PLANTAE),
        limit: String(limit),
        ...extra,
      }).toString();

    const [vernacular, scientific] = await Promise.all([
      fetchJson<GbifSearch>(`${BASE}/species/search?${params({ qField: 'VERNACULAR' })}`),
      fetchJson<GbifSearch>(`${BASE}/species/search?${params({ qField: 'SCIENTIFIC' })}`),
    ]);
    if (!vernacular && !scientific) {
      this.logger.warn(`GBIF no respondió para "${query}"`);
      return [];
    }

    const seen = new Set<string>();
    const out: GbifSpecies[] = [];
    for (const r of [...(vernacular?.results ?? []), ...(scientific?.results ?? [])]) {
      const name = r.canonicalName ?? r.scientificName;
      if (!name || r.kingdomKey !== PLANTAE) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const es = r.vernacularNames?.find((v) => v.language && SPANISH.has(v.language.toLowerCase()));
      out.push({
        gbifKey: r.nubKey ?? r.key,
        scientificName: name,
        family: r.family ?? null,
        commonNameEs: es ? capitalize(es.vernacularName) : null,
      });
      if (out.length >= limit) break;
    }
    this.cache.set(key, out);
    return out;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
