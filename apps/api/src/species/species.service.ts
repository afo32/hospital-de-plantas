import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  type IdentifyResponse,
  type PlantCategory,
  type ResolveSpeciesInput,
  type SpeciesDetail,
  speciesProfileSchema,
  type SpeciesSearchQuery,
  type SpeciesSummary,
} from '@hdp/shared';
import { env } from '../config/env.js';
import type { Species } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsageService } from '../usage/usage.service.js';
import { catalogEntryOf, normalize, searchCatalog, SPECIES_CATALOG } from './catalog.data.js';
import { GbifProvider } from './providers/gbif.provider.js';
import { type PhotoInput, PlantNetProvider } from './providers/plantnet.provider.js';
import { ProfileGenerator } from './providers/profile.generator.js';
import { WikipediaProvider } from './providers/wikipedia.provider.js';

/** Cambia este número cuando cambie el esquema de la ficha: se regenerarán al abrirlas. */
const PROFILE_VERSION = 1;
const MAX_RESULTS = 20;

@Injectable()
export class SpeciesService {
  private readonly logger = new Logger(SpeciesService.name);
  /** Fichas que se están generando ahora mismo (evita pedir dos veces la misma). */
  private readonly generating = new Map<string, Promise<void>>();
  /** Último error por especie, para mostrarlo en la app. */
  private readonly failures = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gbif: GbifProvider,
    private readonly wikipedia: WikipediaProvider,
    private readonly plantnet: PlantNetProvider,
    private readonly generator: ProfileGenerator,
    private readonly usage: UsageService,
  ) {}

  /* ---------- Búsqueda ---------- */

  /**
   * Con categoría: las plantas del catálogo de esa categoría (+ las guardadas de esa categoría).
   * Con texto: guardadas en la base de datos → catálogo en español → GBIF (mundial).
   */
  async search({ q, category }: SpeciesSearchQuery): Promise<SpeciesSummary[]> {
    const results: SpeciesSummary[] = [];
    const seen = new Set<string>();
    const push = (s: SpeciesSummary) => {
      const k = normalize(s.scientificName);
      if (seen.has(k) || results.length >= MAX_RESULTS) return;
      seen.add(k);
      results.push(s);
    };

    const text = q?.trim() ?? '';

    if (category && !text) {
      const stored = await this.prisma.species.findMany({ where: { category }, take: MAX_RESULTS });
      const storedByName = new Map(stored.map((s) => [normalize(s.scientificName), s]));
      for (const entry of SPECIES_CATALOG[category]) {
        const db = storedByName.get(normalize(entry.scientificName));
        push(db ? this.toSummary(db) : { ...this.empty(entry.scientificName), commonName: entry.commonName, category });
      }
      for (const s of stored) push(this.toSummary(s));
      return this.withImages(results);
    }

    if (text.length < 2) return [];

    for (const s of await this.searchStored(text)) {
      if (!category || s.category === category) push(this.toSummary(s));
    }
    for (const e of searchCatalog(text)) {
      if (!category || e.category === category) {
        push({ ...this.empty(e.scientificName), commonName: e.commonName, category: e.category });
      }
    }
    if (results.length < MAX_RESULTS && !category) {
      for (const g of await this.gbif.search(text)) {
        const catalog = catalogEntryOf(g.scientificName);
        push({
          ...this.empty(g.scientificName),
          commonName: catalog?.commonName ?? g.commonNameEs,
          family: g.family,
          gbifKey: g.gbifKey,
          category: catalog?.category ?? null,
        });
      }
    }
    return this.withImages(results);
  }

  /** Busca en las especies ya guardadas, por nombre científico o cualquiera de sus nombres comunes. */
  private searchStored(text: string): Promise<Species[]> {
    const pattern = `%${text}%`;
    return this.prisma.$queryRaw<Species[]>`
      SELECT * FROM "Species"
      WHERE "scientificName" ILIKE ${pattern}
         OR EXISTS (SELECT 1 FROM unnest("commonNames") AS n WHERE n ILIKE ${pattern})
      ORDER BY "updatedAt" DESC
      LIMIT ${MAX_RESULTS}`;
  }

  /** Completa las fotos que falten con la imagen principal de Wikipedia. */
  private async withImages(list: SpeciesSummary[]): Promise<SpeciesSummary[]> {
    const missing = list.filter((s) => !s.imageUrl).map((s) => s.scientificName);
    if (missing.length === 0) return list;
    const images = await this.wikipedia.imagesFor(missing);
    return list.map((s) => (s.imageUrl ? s : { ...s, imageUrl: images.get(s.scientificName) ?? null }));
  }

  /* ---------- Identificación por fotos ---------- */

  async identify(userId: string, photos: PhotoInput[]): Promise<IdentifyResponse> {
    const limit = env.IDENTIFY_DAILY_LIMIT;
    await this.usage.assertAvailable(userId, 'identify', limit);
    const candidates = await this.plantnet.identify(photos);
    const remainingToday = await this.usage.record(userId, 'identify', limit);

    const enriched = await Promise.all(
      candidates.map(async (c) => {
        const stored = await this.prisma.species.findUnique({ where: { scientificName: c.scientificName } });
        const catalog = catalogEntryOf(c.scientificName);
        const base: SpeciesSummary = stored
          ? this.toSummary(stored)
          : {
              ...this.empty(c.scientificName),
              commonName: catalog?.commonName ?? c.commonName,
              family: c.family,
              gbifKey: c.gbifKey,
              imageUrl: c.imageUrl,
              category: catalog?.category ?? null,
            };
        return { ...base, imageUrl: base.imageUrl ?? c.imageUrl, score: c.score };
      }),
    );
    return { candidates: enriched, remainingToday };
  }

  /* ---------- Guardar una especie elegida ---------- */

  /** Devuelve la especie guardada con ese nombre científico, creándola si no existe. */
  async resolve(input: ResolveSpeciesInput): Promise<SpeciesSummary> {
    const existing = await this.prisma.species.findUnique({ where: { scientificName: input.scientificName } });
    if (existing) return this.toSummary(existing);

    const catalog = catalogEntryOf(input.scientificName);
    const commonName = catalog?.commonName ?? input.commonName ?? null;
    const imageUrl = input.imageUrl ?? (await this.wikipedia.imageFor(input.scientificName));
    const created = await this.prisma.species.upsert({
      where: { scientificName: input.scientificName },
      update: {},
      create: {
        scientificName: input.scientificName,
        commonNames: commonName ? [commonName] : [],
        family: input.family ?? null,
        category: catalog?.category ?? 'unknown',
        imageUrl,
        externalIds: input.gbifKey ? { gbif: input.gbifKey } : {},
      },
    });
    return this.toSummary(created);
  }

  /* ---------- Ficha ---------- */

  async detail(id: string, retry = false): Promise<SpeciesDetail> {
    const species = await this.prisma.species.findUnique({ where: { id } });
    if (!species) throw new NotFoundException('Especie no encontrada');

    const parsed = speciesProfileSchema.omit({ care: true }).safeParse(species.profileEs);
    const ready = parsed.success && species.profileVersion >= PROFILE_VERSION;

    const base = {
      species: { ...this.toSummary(species), id: species.id, commonNames: species.commonNames },
    };
    if (ready) return { ...base, profileStatus: 'ready', profile: parsed.data, message: null };

    if (!this.generator.enabled) {
      return {
        ...base,
        profileStatus: 'unavailable',
        profile: null,
        message: 'La ficha con IA no está configurada en el servidor (falta ANTHROPIC_API_KEY).',
      };
    }

    const failure = this.failures.get(id);
    if (failure && !retry && !this.generating.has(id)) {
      return { ...base, profileStatus: 'failed', profile: null, message: failure };
    }

    this.startGeneration(species);
    return { ...base, profileStatus: 'generating', profile: null, message: null };
  }

  /** Lanza la generación en segundo plano (una sola vez por especie a la vez). */
  private startGeneration(species: Species): void {
    if (this.generating.has(species.id)) return;
    this.failures.delete(species.id);

    const job = (async () => {
      try {
        const profile = await this.generator.generate({
          scientificName: species.scientificName,
          family: species.family,
          knownCommonNames: species.commonNames,
        });
        const { care, ...rest } = profile;
        const commonNames = [...new Set([...species.commonNames, ...profile.commonNames])];
        await this.prisma.species.update({
          where: { id: species.id },
          data: {
            profileEs: rest,
            care,
            commonNames,
            category: species.category === 'unknown' ? profile.category : species.category,
            profileVersion: PROFILE_VERSION,
          },
        });
      } catch (err) {
        this.logger.error(`No se pudo generar la ficha de ${species.scientificName}: ${(err as Error).message}`);
        this.failures.set(species.id, 'No se pudo escribir la ficha. Vuelve a intentarlo en un momento.');
      } finally {
        this.generating.delete(species.id);
      }
    })();
    this.generating.set(species.id, job);
  }

  /* ---------- Utilidades ---------- */

  private empty(scientificName: string): SpeciesSummary {
    return { id: null, scientificName, commonName: null, family: null, imageUrl: null, category: null, gbifKey: null };
  }

  private toSummary(s: Species): SpeciesSummary {
    const ids = (s.externalIds ?? {}) as { gbif?: number };
    return {
      id: s.id,
      scientificName: s.scientificName,
      commonName: s.commonNames[0] ?? null,
      family: s.family,
      imageUrl: s.imageUrl,
      category: s.category === 'unknown' ? null : (s.category as PlantCategory),
      gbifKey: typeof ids.gbif === 'number' ? ids.gbif : null,
    };
  }
}
