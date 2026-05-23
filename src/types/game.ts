export type TransactionType =
  | 'PLAYER_TO_PLAYER'
  | 'PLAYER_TO_BANK'
  | 'BANK_TO_PLAYER'
  | 'BANK_CHARGE_PLAYER';

export type TitleKind = 'LAND' | 'STOCK';

export type PendingRequestKind =
  | 'PLAYER_LOAN'
  | 'RENT_CHARGE'
  | 'STOCK_CHARGE'
  | 'TITLE_SALE'
  | 'TITLE_PURCHASE';

export type LandTitleDefinition = {
  id: string;
  kind: 'LAND';
  name: string;
  color: string;
  purchase_price: number;
  receivables: {
    rent: number;
    one_house: number;
    two_houses: number;
    three_houses: number;
    four_houses: number;
    hotel: number;
  };
  acquisition: {
    house_price: number;
    hotel_price: number;
  };
};

export type StockTitleDefinition = {
  id: string;
  kind: 'STOCK';
  name: string;
  color: string;
  image_url: string;
  purchase_price: number;
  multiplier: number;
};

export type TitleDefinition = LandTitleDefinition | StockTitleDefinition;

export type Room = {
  name: string;
  code: string;
  banker_player_id: string | null;
  created_at: string;
  last_played_at: string | null;
};

export type Player = {
  room_id: string;
  name: string;
  normalized_name: string;
  balance: number;
  is_banker: boolean;
  is_jailed: boolean;
  is_bail_available: boolean;
  created_at: string;
};

export type Transaction = {
  room_id: string;
  type: TransactionType;
  amount: number;
  from_player_id: string | null;
  to_player_id: string | null;
  executed_by_player_id: string;
  reason: string | null;
  created_at: string;
};

export type Debt = {
  room_id: string;
  from_player_id: string;
  to_player_id: string | null;
  original_amount: number;
  remaining_amount: number;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchasedTitle = {
  room_id: string;
  title_id: string;
  owner_player_id: string;
  kind: TitleKind;
  purchase_price: number;
  houses: number;
  has_hotel: boolean;
  created_at: string;
  updated_at: string;
};

export type PendingRequest = {
  room_id: string;
  kind: PendingRequestKind;
  requester_player_id: string;
  target_player_id: string;
  amount: number;
  title_id: string | null;
  purchased_title_id: string | null;
  requested_amount: number | null;
  repayment_amount: number | null;
  dice_count: number | null;
  created_at: string;
};
