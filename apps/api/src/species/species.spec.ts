import { speciesProfileSchema } from '@hdp/shared';
import { catalogCategoryOf, normalize, searchCatalog } from './catalog.data.js';
import { MONSTERA_PROFILE } from './fixtures/monstera.profile.js';

describe('catálogo de especies', () => {
  it('encuentra por nombre común sin tildes', () => {
    const r = searchCatalog('jazmin');
    expect(r.map((e) => e.scientificName)).toContain('Jasminum officinale');
  });

  it('encuentra por nombre científico', () => {
    expect(searchCatalog('monstera')[0]?.commonName).toBe('Costilla de Adán');
  });

  it('sabe la categoría de una especie conocida', () => {
    expect(catalogCategoryOf('Salvia rosmarinus')).toBe('herbs');
    expect(catalogCategoryOf('Planta inventada')).toBeNull();
  });

  it('normaliza tildes y mayúsculas', () => {
    expect(normalize('  Árbol de Jade ')).toBe('arbol de jade');
  });
});

describe('esquema de la ficha', () => {
  it('acepta una ficha completa', () => {
    expect(speciesProfileSchema.safeParse(MONSTERA_PROFILE).success).toBe(true);
  });
});
