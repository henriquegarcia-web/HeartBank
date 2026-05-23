import type {
  LandTitleDefinition,
  PurchasedTitle,
  StockTitleDefinition,
  TitleDefinition,
} from '@/types/game';
//

export const AVAILABLE_TITLES = {
  lands: [
    {
      id: 'av-9-de-julho',
      kind: 'LAND',
      name: 'Av. 9 de Julho',
      color: '#24910f',
      purchase_price: 1000,
      receivables: {
        rent: 60,
        one_house: 300,
        two_houses: 900,
        three_houses: 2700,
        four_houses: 4000,
        hotel: 5000,
      },
      acquisition: {
        house_price: 500,
        hotel_price: 500,
      },
    },
    {
      id: 'av-brasil',
      kind: 'LAND',
      name: 'Av. Brasil',
      color: '#24910f',
      purchase_price: 1000,
      receivables: {
        rent: 40,
        one_house: 200,
        two_houses: 600,
        three_houses: 1800,
        four_houses: 3200,
        hotel: 4500,
      },
      acquisition: {
        house_price: 500,
        hotel_price: 500,
      },
    },
    {
      id: 'av-beira-mar',
      kind: 'LAND',
      name: 'Av. Beira Mar',
      color: '#0f8f2f',
      purchase_price: 1000,
      receivables: {
        rent: 20,
        one_house: 100,
        two_houses: 300,
        three_houses: 900,
        four_houses: 1600,
        hotel: 2500,
      },
      acquisition: {
        house_price: 500,
        hotel_price: 500,
      },
    },
    {
      id: 'av-paulista',
      kind: 'LAND',
      name: 'Av. Paulista',
      color: '#0f8f2f',
      purchase_price: 1600,
      receivables: {
        rent: 120,
        one_house: 600,
        two_houses: 1800,
        three_houses: 5000,
        four_houses: 7000,
        hotel: 9000,
      },
      acquisition: {
        house_price: 1000,
        hotel_price: 1000,
      },
    },
    {
      id: 'av-recife',
      kind: 'LAND',
      name: 'Av. Recife',
      color: '#0f8f2f',
      purchase_price: 1400,
      receivables: {
        rent: 100,
        one_house: 500,
        two_houses: 1500,
        three_houses: 4500,
        four_houses: 6250,
        hotel: 7500,
      },
      acquisition: {
        house_price: 1000,
        hotel_price: 1000,
      },
    },
    {
      id: 'av-brigadeiro-faria-lima',
      kind: 'LAND',
      name: 'Av. Brigadeiro Faria Lima',
      color: '#0b7f3a',
      purchase_price: 1400,
      receivables: {
        rent: 100,
        one_house: 500,
        two_houses: 1500,
        three_houses: 4500,
        four_houses: 6250,
        hotel: 7500,
      },
      acquisition: {
        house_price: 1000,
        hotel_price: 1000,
      },
    },
    {
      id: 'av-sao-joao',
      kind: 'LAND',
      name: 'Av. São João',
      color: '#2e236f',
      purchase_price: 1200,
      receivables: {
        rent: 80,
        one_house: 400,
        two_houses: 1000,
        three_houses: 3000,
        four_houses: 4500,
        hotel: 6000,
      },
      acquisition: {
        house_price: 500,
        hotel_price: 500,
      },
    },
    {
      id: 'av-ipiranga',
      kind: 'LAND',
      name: 'Av. Ipiranga',
      color: '#3b2a7f',
      purchase_price: 1000,
      receivables: {
        rent: 60,
        one_house: 300,
        two_houses: 900,
        three_houses: 2700,
        four_houses: 4000,
        hotel: 5000,
      },
      acquisition: {
        house_price: 500,
        hotel_price: 500,
      },
    },
    {
      id: 'r-da-consolacao',
      kind: 'LAND',
      name: 'R. da Consolação',
      color: '#1f9bd1',
      purchase_price: 2000,
      receivables: {
        rent: 140,
        one_house: 700,
        two_houses: 2000,
        three_houses: 5500,
        four_houses: 7500,
        hotel: 9500,
      },
      acquisition: {
        house_price: 1000,
        hotel_price: 1000,
      },
    },
    {
      id: 'av-reboucas',
      kind: 'LAND',
      name: 'Av. Rebouças',
      color: '#1f9bd1',
      purchase_price: 2000,
      receivables: {
        rent: 160,
        one_house: 800,
        two_houses: 2200,
        three_houses: 6000,
        four_houses: 8000,
        hotel: 10000,
      },
      acquisition: {
        house_price: 1000,
        hotel_price: 1000,
      },
    },
    {
      id: 'av-santo-amaro',
      kind: 'LAND',
      name: 'Av. Santo Amaro',
      color: '#1f9bd1',
      purchase_price: 2000,
      receivables: {
        rent: 140,
        one_house: 700,
        two_houses: 2000,
        three_houses: 5500,
        four_houses: 7500,
        hotel: 9500,
      },
      acquisition: {
        house_price: 1000,
        hotel_price: 1000,
      },
    },
    {
      id: 'av-do-contorno',
      kind: 'LAND',
      name: 'Av. do Contorno',
      color: '#8f2115',
      purchase_price: 2000,
      receivables: {
        rent: 180,
        one_house: 900,
        two_houses: 2500,
        three_houses: 7000,
        four_houses: 8750,
        hotel: 10500,
      },
      acquisition: {
        house_price: 1500,
        hotel_price: 1500,
      },
    },
    {
      id: 'av-rio-branco',
      kind: 'LAND',
      name: 'Av. Rio Branco',
      color: '#8f2115',
      purchase_price: 2400,
      receivables: {
        rent: 200,
        one_house: 1000,
        two_houses: 3000,
        three_houses: 7500,
        four_houses: 9250,
        hotel: 11000,
      },
      acquisition: {
        house_price: 1500,
        hotel_price: 1500,
      },
    },
    {
      id: 'av-do-estado',
      kind: 'LAND',
      name: 'Av. do Estado',
      color: '#a8321f',
      purchase_price: 2200,
      receivables: {
        rent: 180,
        one_house: 900,
        two_houses: 2500,
        three_houses: 7000,
        four_houses: 8750,
        hotel: 10500,
      },
      acquisition: {
        house_price: 1500,
        hotel_price: 1500,
      },
    },
    {
      id: 'av-juscelino-kubitschek',
      kind: 'LAND',
      name: 'Av. Juscelino Kubitschek',
      color: '#b44412',
      purchase_price: 3200,
      receivables: {
        rent: 280,
        one_house: 1500,
        two_houses: 4500,
        three_houses: 10000,
        four_houses: 12000,
        hotel: 14000,
      },
      acquisition: {
        house_price: 2000,
        hotel_price: 2000,
      },
    },
    {
      id: 'rua-oscar-freire',
      kind: 'LAND',
      name: 'R. Oscar Freire',
      color: '#d96d16',
      purchase_price: 3000,
      receivables: {
        rent: 260,
        one_house: 1300,
        two_houses: 3900,
        three_houses: 9000,
        four_houses: 11000,
        hotel: 12750,
      },
      acquisition: {
        house_price: 2000,
        hotel_price: 2000,
      },
    },
    {
      id: 'av-ibirapuera',
      kind: 'LAND',
      name: 'Av. Ibirapuera',
      color: '#e67817',
      purchase_price: 3000,
      receivables: {
        rent: 260,
        one_house: 1300,
        two_houses: 3900,
        three_houses: 9000,
        four_houses: 11000,
        hotel: 12750,
      },
      acquisition: {
        house_price: 2000,
        hotel_price: 2000,
      },
    },
    {
      id: 'av-vieira-souto',
      kind: 'LAND',
      name: 'Av. Vieira Souto',
      color: '#e5a300',
      purchase_price: 2800,
      receivables: {
        rent: 260,
        one_house: 1300,
        two_houses: 3600,
        three_houses: 8500,
        four_houses: 10250,
        hotel: 12000,
      },
      acquisition: {
        house_price: 1500,
        hotel_price: 1500,
      },
    },
    {
      id: 'av-niemeyer',
      kind: 'LAND',
      name: 'Av. Niemeyer',
      color: '#e5a300',
      purchase_price: 2600,
      receivables: {
        rent: 220,
        one_house: 1100,
        two_houses: 3300,
        three_houses: 8000,
        four_houses: 9750,
        hotel: 11500,
      },
      acquisition: {
        house_price: 1500,
        hotel_price: 1500,
      },
    },
    {
      id: 'av-presidente-vargas',
      kind: 'LAND',
      name: 'Av. Presidente Vargas',
      color: '#dca000',
      purchase_price: 2600,
      receivables: {
        rent: 220,
        one_house: 1100,
        two_houses: 3300,
        three_houses: 8000,
        four_houses: 9750,
        hotel: 11500,
      },
      acquisition: {
        house_price: 1500,
        hotel_price: 1500,
      },
    },
    {
      id: 'av-morumbi',
      kind: 'LAND',
      name: 'Av. Morumbi',
      color: '#c2327f',
      purchase_price: 4000,
      receivables: {
        rent: 500,
        one_house: 2000,
        two_houses: 6000,
        three_houses: 14000,
        four_houses: 17000,
        hotel: 20000,
      },
      acquisition: {
        house_price: 2000,
        hotel_price: 2000,
      },
    },
    {
      id: 'av-higienopolis',
      kind: 'LAND',
      name: 'Av. Higienópolis',
      color: '#c83c86',
      purchase_price: 3500,
      receivables: {
        rent: 350,
        one_house: 1750,
        two_houses: 5000,
        three_houses: 11000,
        four_houses: 13000,
        hotel: 15000,
      },
      acquisition: {
        house_price: 2000,
        hotel_price: 2000,
      },
    },
  ] satisfies LandTitleDefinition[],

  stocks: [
    {
      id: 'petroleira',
      kind: 'STOCK',
      name: 'Petroleira',
      color: '#30343b',
      image_url: '/acao_petroleira.png',
      purchase_price: 1000,
      multiplier: 500,
    },
    {
      id: 'companhia-aerea',
      kind: 'STOCK',
      name: 'Companhia Aérea',
      color: '#30343b',
      image_url: '/acao_aero.png',
      purchase_price: 1000,
      multiplier: 500,
    },
    {
      id: 'estrela-card',
      kind: 'STOCK',
      name: 'Estrela Card',
      color: '#30343b',
      image_url: '/acao_estrela.png',
      purchase_price: 1000,
      multiplier: 500,
    },
    {
      id: 'emissora-de-tv',
      kind: 'STOCK',
      name: 'Emissora de TV',
      color: '#30343b',
      image_url: '/acao_startv.png',
      purchase_price: 1000,
      multiplier: 500,
    },
    {
      id: 'banco',
      kind: 'STOCK',
      name: 'Banco',
      color: '#30343b',
      image_url: '/acao_banco.png',
      purchase_price: 1000,
      multiplier: 500,
    },
    {
      id: 'ecommerce',
      kind: 'STOCK',
      name: 'Ecommerce',
      color: '#30343b',
      image_url: '/acao_ecommerce.png',
      purchase_price: 1000,
      multiplier: 500,
    },
  ] satisfies StockTitleDefinition[],
};

export const TITLE_OPTIONS: TitleDefinition[] = [
  ...AVAILABLE_TITLES.lands,
  ...AVAILABLE_TITLES.stocks,
];

export const getTitleDefinition = (titleId: string | null) =>
  TITLE_OPTIONS.find((title) => title.id === titleId) ?? null;

export const calculatePurchasedTitleAssetValue = (
  purchasedTitle: PurchasedTitle,
) => {
  const definition = getTitleDefinition(purchasedTitle.title_id);

  if (!definition) {
    return purchasedTitle.purchase_price;
  }

  if (definition.kind === 'STOCK') {
    return definition.purchase_price;
  }

  return (
    definition.purchase_price +
    purchasedTitle.houses * definition.acquisition.house_price +
    (purchasedTitle.has_hotel ? definition.acquisition.hotel_price : 0)
  );
};

export const getLandChargeAmount = (purchasedTitle: PurchasedTitle) => {
  const definition = getTitleDefinition(purchasedTitle.title_id);

  if (!definition || definition.kind !== 'LAND') {
    return 0;
  }

  if (purchasedTitle.has_hotel) {
    return definition.receivables.hotel;
  }

  const houseRentByCount = [
    definition.receivables.rent,
    definition.receivables.one_house,
    definition.receivables.two_houses,
    definition.receivables.three_houses,
    definition.receivables.four_houses,
  ];

  return houseRentByCount[purchasedTitle.houses] ?? definition.receivables.rent;
};
