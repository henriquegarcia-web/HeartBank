import type {
  LandTitleDefinition,
  PurchasedTitle,
  StockTitleDefinition,
  TitleDefinition,
} from '@/types/game';

export const AVAILABLE_TITLES = {
  lands: [
    {
      id: 'av-paulista',
      kind: 'LAND',
      name: 'Av. Paulista',
      color: '#1f77b4',
      purchase_price: 2600,
      receivables: {
        rent: 180,
        one_house: 650,
        two_houses: 1800,
        three_houses: 4500,
        four_houses: 6250,
        hotel: 8000,
      },
      acquisition: {
        house_price: 1500,
        hotel_price: 1500,
      },
    },
    {
      id: 'rua-oscar-freire',
      kind: 'LAND',
      name: 'Rua Oscar Freire',
      color: '#d94670',
      purchase_price: 2200,
      receivables: {
        rent: 160,
        one_house: 550,
        two_houses: 1600,
        three_houses: 3900,
        four_houses: 5200,
        hotel: 7000,
      },
      acquisition: {
        house_price: 1200,
        hotel_price: 1200,
      },
    },
  ] satisfies LandTitleDefinition[],
  stocks: [
    {
      id: 'coracao-energia',
      kind: 'STOCK',
      name: 'Coracao Energia',
      color: '#30343b',
      image_url:
        'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=640&q=80',
      purchase_price: 1500,
      multiplier: 500,
    },
    {
      id: 'metro-capital',
      kind: 'STOCK',
      name: 'Metro Capital',
      color: '#30343b',
      image_url:
        'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=640&q=80',
      purchase_price: 1800,
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
