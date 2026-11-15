import type { SpeciesProfile } from '@hdp/shared';

/** Ficha de ejemplo (Monstera deliciosa) para pruebas y para ver la app sin clave de Claude. */
export const MONSTERA_PROFILE: SpeciesProfile = {
  commonNames: ['Costilla de Adán', 'Monstera', 'Cerima'],
  category: 'aroids',
  difficulty: 'easy',
  difficultyReason: 'Tolera bien la luz media y algún olvido de riego; solo sufre con el encharcamiento.',
  quickFacts: {
    watering: 'Cada 7–10 días en verano y cada 14–18 en invierno, cuando la mitad del sustrato esté seca.',
    sunType: 'Luz brillante indirecta; máximo 1–2 h de sol suave de mañana.',
    lightLux: { min: 2500, ideal: 10000, max: 20000 },
    plantType: 'Trepadora perenne tropical (hemiepífita)',
    matureSize: 'En maceta 150–250 cm de alto y 100–150 cm de ancho; en suelo tropical supera los 10 m trepando.',
    sunExposure: 'Semisombra luminosa',
    soilType: 'Aireado y rico en materia orgánica: sustrato universal + corteza + perlita',
    soilPh: '5,5–7,0 (ligeramente ácido a neutro)',
    bloomTime: 'En interior casi nunca florece; en exterior tropical, en verano (espata crema).',
    colors: 'Hojas verde intenso brillante; espata blanco crema',
    hardinessZones: 'USDA 10b–12',
    minTempC: 12,
    nativeArea: 'Selvas tropicales del sur de México a Panamá',
    toxicityHumans: {
      level: 'mild',
      details: 'Hojas y tallos contienen oxalato cálcico: irritación y ardor en boca y garganta si se mastican. El fruto solo es comestible totalmente maduro.',
    },
    toxicityPets: [
      { animal: 'Gatos', level: 'toxic', symptoms: 'Babeo, vómitos, irritación oral, dificultad para tragar.' },
      { animal: 'Perros', level: 'toxic', symptoms: 'Babeo, vómitos, inflamación de boca y lengua.' },
      { animal: 'Conejos y roedores', level: 'toxic', symptoms: 'Irritación oral y digestiva; evita que la muerdan.' },
    ],
  },
  sections: {
    description: {
      body: 'La costilla de Adán es una aroide trepadora famosa por sus hojas grandes con perforaciones (fenestraciones), que aparecen a medida que la planta madura y recibe más luz.\n\nEn la naturaleza trepa por los troncos sujetándose con raíces aéreas. En casa agradece un tutor de musgo o fibra de coco.',
    },
    howToGrow: {
      body: '- Colócala a 1–2 m de una ventana luminosa.\n- Riega a fondo cuando la mitad superior del sustrato esté seca y vacía el plato a los 15 minutos.\n- Ponle un tutor desde joven: hojas más grandes y más agujeros.\n- Limpia las hojas con un paño húmedo una vez al mes.',
    },
    containerGardening: {
      body: 'Usa una maceta solo 3–5 cm más ancha que el cepellón y siempre con agujeros de drenaje.\n\nMezcla recomendada:\n- 40 % sustrato universal de calidad\n- 30 % corteza de pino fina\n- 20 % perlita\n- 10 % humus de lombriz',
    },
    fromSeed: {
      body: 'Se propaga casi siempre por esqueje; las semillas son raras y pierden viabilidad en pocas semanas.\n\n1. Consigue semillas frescas (verdes, no secas) de un vivero especializado.\n2. Remójalas 24 h en agua templada (25 °C).\n3. Siémbralas a 5 mm de profundidad en turba con 30 % de perlita.\n4. Mantén 24–28 °C y 80 % de humedad (tapa con plástico transparente).\n5. Germinan en 2–4 semanas con luz indirecta.\n6. Repica cuando tengan 2 hojas verdaderas a macetas de 8 cm.\n7. Aclimata retirando el plástico poco a poco durante una semana.\n\nÉpoca: primavera (marzo–mayo).',
    },
    light: {
      body: 'Interior: junto a una ventana este u oeste, o a 2 m de una sur con cortina. Con poca luz las hojas salen pequeñas y sin agujeros.\n\nExterior: puede salir a terraza en sombra de mayo a septiembre si las noches superan 15 °C. Nunca a sol directo de mediodía: quema las hojas en un día.\n\nFuera de día y dentro de noche: útil en primavera y otoño cuando las mínimas bajan de 12–15 °C.',
    },
    soil: { body: 'Necesita un sustrato que drene rápido pero retenga algo de humedad. Evita la tierra de jardín compacta.' },
    water: {
      body: 'Riega cuando la mitad superior esté seca. Usa agua a temperatura ambiente; si tu agua tiene mucha cal, déjala reposar una noche.\n\n- Hojas amarillas y tallo blando: exceso de riego.\n- Bordes marrones y secos: falta de agua o ambiente muy seco.',
    },
    temperatureHumidity: {
      body: 'Ideal entre 18 y 27 °C. Por debajo de 12 °C deja de crecer y por debajo de 5 °C sufre daños.\n\nHumedad ideal 50–60 %. En invierno con calefacción, agrupa plantas o usa un humidificador.',
    },
    fertilizer: {
      body: 'De marzo a septiembre, abono líquido equilibrado (NPK 3-1-2 o similar) cada 3 semanas a la mitad de la dosis del fabricante. No abones en invierno ni en las 6 semanas siguientes a un trasplante.',
    },
    propagation: {
      body: '1. Corta un tallo con al menos un nudo y una raíz aérea.\n2. Ponlo en agua o en musgo húmedo.\n3. En 3–4 semanas tendrá raíces de 5 cm.\n4. Pásalo a maceta de 12–15 cm.',
    },
    varieties: {
      body: "- 'Thai Constellation': variegada crema, crecimiento lento.\n- 'Albo Variegata': manchas blancas, más delicada.\n- 'Borsigiana': forma más compacta y tallos más finos.",
    },
    pestsDiseases: {
      body: '- Cochinilla algodonosa: bolitas blancas en axilas. Retira con algodón y alcohol; luego jabón potásico al 1 %.\n- Araña roja: telarañas finas y punteado. Sube la humedad y aplica aceite de neem.\n- Pudrición de raíz: hojas amarillas y olor a humedad. Saca la planta, corta raíces negras y trasplanta a sustrato nuevo.',
    },
    harvest: {
      body: 'En interior casi nunca fructifica. El fruto solo es comestible cuando está totalmente maduro (las escamas se desprenden solas); verde es muy irritante.',
    },
    pruning: {
      body: 'Poda en primavera hojas dañadas o tallos demasiado largos, siempre por encima de un nudo y con tijera desinfectada. Las raíces aéreas no se cortan: guíalas al tutor o al sustrato.',
    },
    herbalism: {
      body: 'No se usa en infusiones. El fruto maduro se come en zonas tropicales (sabor entre piña y plátano), pero verde provoca fuerte irritación por los cristales de oxalato.\n\nUso tradicional: en su zona de origen las raíces aéreas se usaban para hacer cestas.',
    },
  },
  herbalism: {
    edible: false,
    usableForTea: false,
    warning: 'Hojas y tallos son irritantes para personas y tóxicos para mascotas. No la consumas.',
  },
  care: {
    tempMinC: 12,
    tempIdealMinC: 18,
    tempIdealMaxC: 27,
    tempMaxC: 32,
    frostTolerant: false,
    luxMin: 2500,
    luxIdeal: 10000,
    luxMax: 20000,
    waterStyle: 'dry_top_half',
    baseWaterDays: 8,
    humidityMinPct: 50,
    fertilizeEveryDays: 21,
    growingMonths: [3, 4, 5, 6, 7, 8, 9],
    repotEveryMonths: 18,
    rootGrowth: 'fast',
    matureHeightCm: 200,
  },
};
