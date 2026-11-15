import type { PlantCategory } from '@hdp/shared';

/**
 * Plantas populares por categoría, para que los botones de "Añadir planta" muestren
 * resultados al instante y la búsqueda por nombre común en español funcione sin red.
 * Añade aquí las que quieras: nombre científico (sin autor) + nombre común más usado en España.
 */
export type CatalogEntry = { scientificName: string; commonName: string };

export const SPECIES_CATALOG: Record<PlantCategory, CatalogEntry[]> = {
  ferns: [
    { scientificName: 'Nephrolepis exaltata', commonName: 'Helecho de Boston' },
    { scientificName: 'Asplenium nidus', commonName: 'Helecho nido de ave' },
    { scientificName: 'Adiantum raddianum', commonName: 'Culantrillo' },
    { scientificName: 'Platycerium bifurcatum', commonName: 'Cuerno de alce' },
    { scientificName: 'Davallia canariensis', commonName: 'Pata de liebre' },
    { scientificName: 'Pteris cretica', commonName: 'Helecho de Creta' },
    { scientificName: 'Polypodium vulgare', commonName: 'Polipodio' },
    { scientificName: 'Blechnum gibbum', commonName: 'Helecho palmera' },
  ],
  cacti: [
    { scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
    { scientificName: 'Opuntia ficus-indica', commonName: 'Chumbera' },
    { scientificName: 'Schlumbergera truncata', commonName: 'Cactus de Navidad' },
    { scientificName: 'Mammillaria elongata', commonName: 'Mamilaria dedos de dama' },
    { scientificName: 'Cereus peruvianus', commonName: 'Cactus candelabro' },
    { scientificName: 'Gymnocalycium mihanovichii', commonName: 'Cactus luna' },
    { scientificName: 'Astrophytum myriostigma', commonName: 'Mitra de obispo' },
    { scientificName: 'Rhipsalis baccifera', commonName: 'Cactus muérdago' },
  ],
  succulents: [
    { scientificName: 'Aloe vera', commonName: 'Aloe vera' },
    { scientificName: 'Crassula ovata', commonName: 'Árbol de jade' },
    { scientificName: 'Echeveria elegans', commonName: 'Echeveria' },
    { scientificName: 'Haworthiopsis attenuata', commonName: 'Haworthia cebra' },
    { scientificName: 'Sedum morganianum', commonName: 'Cola de burro' },
    { scientificName: 'Kalanchoe blossfeldiana', commonName: 'Kalanchoe' },
    { scientificName: 'Dracaena trifasciata', commonName: 'Sansevieria, lengua de suegra' },
    { scientificName: 'Senecio rowleyanus', commonName: 'Rosario' },
    { scientificName: 'Zamioculcas zamiifolia', commonName: 'Zamioculca' },
  ],
  aroids: [
    { scientificName: 'Monstera deliciosa', commonName: 'Costilla de Adán' },
    { scientificName: 'Epipremnum aureum', commonName: 'Potos' },
    { scientificName: 'Philodendron hederaceum', commonName: 'Filodendro corazón' },
    { scientificName: 'Spathiphyllum wallisii', commonName: 'Espatifilo, cuna de Moisés' },
    { scientificName: 'Anthurium andraeanum', commonName: 'Anturio' },
    { scientificName: 'Alocasia amazonica', commonName: 'Alocasia' },
    { scientificName: 'Aglaonema commutatum', commonName: 'Aglaonema' },
    { scientificName: 'Syngonium podophyllum', commonName: 'Singonio' },
    { scientificName: 'Dieffenbachia seguine', commonName: 'Difenbaquia' },
    { scientificName: 'Zantedeschia aethiopica', commonName: 'Cala' },
  ],
  palms: [
    { scientificName: 'Dypsis lutescens', commonName: 'Palmera areca' },
    { scientificName: 'Chamaedorea elegans', commonName: 'Palmera de salón' },
    { scientificName: 'Howea forsteriana', commonName: 'Kentia' },
    { scientificName: 'Rhapis excelsa', commonName: 'Palmera bambú' },
    { scientificName: 'Phoenix canariensis', commonName: 'Palmera canaria' },
    { scientificName: 'Chamaerops humilis', commonName: 'Palmito' },
    { scientificName: 'Trachycarpus fortunei', commonName: 'Palmera de Fortune' },
    { scientificName: 'Cycas revoluta', commonName: 'Cica' },
  ],
  orchids: [
    { scientificName: 'Phalaenopsis amabilis', commonName: 'Orquídea mariposa' },
    { scientificName: 'Dendrobium nobile', commonName: 'Dendrobium' },
    { scientificName: 'Cattleya labiata', commonName: 'Cattleya' },
    { scientificName: 'Oncidium flexuosum', commonName: 'Oncidium, bailarina' },
    { scientificName: 'Cymbidium eburneum', commonName: 'Cymbidium' },
    { scientificName: 'Vanilla planifolia', commonName: 'Vainilla' },
    { scientificName: 'Paphiopedilum insigne', commonName: 'Zapatito de Venus' },
  ],
  herbs: [
    { scientificName: 'Salvia rosmarinus', commonName: 'Romero' },
    { scientificName: 'Ocimum basilicum', commonName: 'Albahaca' },
    { scientificName: 'Mentha spicata', commonName: 'Hierbabuena' },
    { scientificName: 'Thymus vulgaris', commonName: 'Tomillo' },
    { scientificName: 'Lavandula angustifolia', commonName: 'Lavanda' },
    { scientificName: 'Origanum vulgare', commonName: 'Orégano' },
    { scientificName: 'Petroselinum crispum', commonName: 'Perejil' },
    { scientificName: 'Coriandrum sativum', commonName: 'Cilantro' },
    { scientificName: 'Salvia officinalis', commonName: 'Salvia' },
    { scientificName: 'Melissa officinalis', commonName: 'Melisa, toronjil' },
    { scientificName: 'Aloysia citrodora', commonName: 'Hierba luisa' },
    { scientificName: 'Matricaria chamomilla', commonName: 'Manzanilla' },
    { scientificName: 'Laurus nobilis', commonName: 'Laurel' },
    { scientificName: 'Allium schoenoprasum', commonName: 'Cebollino' },
  ],
  vegetables: [
    { scientificName: 'Solanum lycopersicum', commonName: 'Tomatera' },
    { scientificName: 'Capsicum annuum', commonName: 'Pimiento' },
    { scientificName: 'Lactuca sativa', commonName: 'Lechuga' },
    { scientificName: 'Cucurbita pepo', commonName: 'Calabacín' },
    { scientificName: 'Cucumis sativus', commonName: 'Pepino' },
    { scientificName: 'Solanum melongena', commonName: 'Berenjena' },
    { scientificName: 'Phaseolus vulgaris', commonName: 'Judía verde' },
    { scientificName: 'Spinacia oleracea', commonName: 'Espinaca' },
    { scientificName: 'Daucus carota', commonName: 'Zanahoria' },
    { scientificName: 'Allium cepa', commonName: 'Cebolla' },
    { scientificName: 'Raphanus sativus', commonName: 'Rábano' },
  ],
  fruit: [
    { scientificName: 'Citrus limon', commonName: 'Limonero' },
    { scientificName: 'Citrus × sinensis', commonName: 'Naranjo' },
    { scientificName: 'Fragaria × ananassa', commonName: 'Fresa' },
    { scientificName: 'Ficus carica', commonName: 'Higuera' },
    { scientificName: 'Olea europaea', commonName: 'Olivo' },
    { scientificName: 'Punica granatum', commonName: 'Granado' },
    { scientificName: 'Vaccinium corymbosum', commonName: 'Arándano' },
    { scientificName: 'Prunus persica', commonName: 'Melocotonero' },
    { scientificName: 'Musa acuminata', commonName: 'Platanera' },
    { scientificName: 'Persea americana', commonName: 'Aguacate' },
  ],
  seasonal_flowers: [
    { scientificName: 'Pelargonium zonale', commonName: 'Geranio' },
    { scientificName: 'Petunia × atkinsiana', commonName: 'Petunia' },
    { scientificName: 'Tagetes erecta', commonName: 'Clavel de moro' },
    { scientificName: 'Viola × wittrockiana', commonName: 'Pensamiento' },
    { scientificName: 'Euphorbia pulcherrima', commonName: 'Flor de Pascua' },
    { scientificName: 'Cyclamen persicum', commonName: 'Ciclamen' },
    { scientificName: 'Begonia semperflorens', commonName: 'Begonia' },
    { scientificName: 'Impatiens walleriana', commonName: 'Alegría de la casa' },
    { scientificName: 'Dianthus caryophyllus', commonName: 'Clavel' },
    { scientificName: 'Chrysanthemum × morifolium', commonName: 'Crisantemo' },
    { scientificName: 'Rosa chinensis', commonName: 'Rosal' },
  ],
  bonsai: [
    { scientificName: 'Ficus retusa', commonName: 'Ficus retusa (bonsái)' },
    { scientificName: 'Carmona retusa', commonName: 'Carmona, árbol del té' },
    { scientificName: 'Juniperus procumbens', commonName: 'Junípero' },
    { scientificName: 'Ulmus parvifolia', commonName: 'Olmo chino' },
    { scientificName: 'Acer palmatum', commonName: 'Arce japonés' },
    { scientificName: 'Serissa japonica', commonName: 'Serissa' },
    { scientificName: 'Zelkova serrata', commonName: 'Zelkova' },
    { scientificName: 'Portulacaria afra', commonName: 'Árbol de la abundancia' },
  ],
  carnivorous: [
    { scientificName: 'Dionaea muscipula', commonName: 'Venus atrapamoscas' },
    { scientificName: 'Sarracenia purpurea', commonName: 'Sarracenia' },
    { scientificName: 'Drosera capensis', commonName: 'Drosera, rocío del sol' },
    { scientificName: 'Nepenthes alata', commonName: 'Nepenthes, planta jarra' },
    { scientificName: 'Pinguicula moranensis', commonName: 'Pinguícula' },
  ],
  bulbs: [
    { scientificName: 'Tulipa gesneriana', commonName: 'Tulipán' },
    { scientificName: 'Narcissus pseudonarcissus', commonName: 'Narciso' },
    { scientificName: 'Hyacinthus orientalis', commonName: 'Jacinto' },
    { scientificName: 'Hippeastrum × hybridum', commonName: 'Amarilis' },
    { scientificName: 'Crocus sativus', commonName: 'Azafrán' },
    { scientificName: 'Lilium candidum', commonName: 'Azucena' },
    { scientificName: 'Gladiolus × hortulanus', commonName: 'Gladiolo' },
    { scientificName: 'Dahlia pinnata', commonName: 'Dalia' },
  ],
  climbers: [
    { scientificName: 'Hedera helix', commonName: 'Hiedra' },
    { scientificName: 'Jasminum officinale', commonName: 'Jazmín' },
    { scientificName: 'Bougainvillea spectabilis', commonName: 'Buganvilla' },
    { scientificName: 'Wisteria sinensis', commonName: 'Glicinia' },
    { scientificName: 'Passiflora caerulea', commonName: 'Pasionaria' },
    { scientificName: 'Trachelospermum jasminoides', commonName: 'Falso jazmín' },
    { scientificName: 'Ipomoea purpurea', commonName: 'Campanilla' },
    { scientificName: 'Hoya carnosa', commonName: 'Flor de cera' },
    { scientificName: 'Mandevilla sanderi', commonName: 'Dipladenia' },
  ],
  trees_shrubs: [
    { scientificName: 'Ficus elastica', commonName: 'Árbol del caucho, gomero' },
    { scientificName: 'Ficus lyrata', commonName: 'Ficus lira' },
    { scientificName: 'Ficus benjamina', commonName: 'Ficus benjamina' },
    { scientificName: 'Dracaena marginata', commonName: 'Drácena' },
    { scientificName: 'Strelitzia reginae', commonName: 'Ave del paraíso' },
    { scientificName: 'Hibiscus rosa-sinensis', commonName: 'Hibisco' },
    { scientificName: 'Gardenia jasminoides', commonName: 'Gardenia' },
    { scientificName: 'Nerium oleander', commonName: 'Adelfa' },
    { scientificName: 'Hydrangea macrophylla', commonName: 'Hortensia' },
    { scientificName: 'Camellia japonica', commonName: 'Camelia' },
    { scientificName: 'Schefflera arboricola', commonName: 'Chefflera' },
    { scientificName: 'Pachira aquatica', commonName: 'Pachira, árbol del dinero' },
  ],
  bromeliads: [
    { scientificName: 'Guzmania lingulata', commonName: 'Guzmania' },
    { scientificName: 'Aechmea fasciata', commonName: 'Aechmea' },
    { scientificName: 'Vriesea splendens', commonName: 'Espada de fuego' },
    { scientificName: 'Tillandsia ionantha', commonName: 'Clavel del aire' },
    { scientificName: 'Ananas comosus', commonName: 'Piña' },
    { scientificName: 'Neoregelia carolinae', commonName: 'Neoregelia' },
    { scientificName: 'Cryptanthus bivittatus', commonName: 'Estrella de tierra' },
  ],
};

/** Quita tildes y pasa a minúsculas para comparar ("Albahaca" == "albahaca", "Jazmín" == "jazmin"). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

type FlatEntry = CatalogEntry & { category: PlantCategory };

const FLAT: FlatEntry[] = Object.entries(SPECIES_CATALOG).flatMap(([category, list]) =>
  list.map((e) => ({ ...e, category: category as PlantCategory })),
);

/** Busca en el catálogo por nombre común o científico. */
export function searchCatalog(query: string): FlatEntry[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  return FLAT.filter((e) => normalize(e.commonName).includes(q) || normalize(e.scientificName).includes(q));
}

/** Categoría del catálogo para un nombre científico, si la conocemos. */
export function catalogCategoryOf(scientificName: string): PlantCategory | null {
  const n = normalize(scientificName);
  return FLAT.find((e) => normalize(e.scientificName) === n)?.category ?? null;
}

export function catalogEntryOf(scientificName: string): FlatEntry | null {
  const n = normalize(scientificName);
  return FLAT.find((e) => normalize(e.scientificName) === n) ?? null;
}
