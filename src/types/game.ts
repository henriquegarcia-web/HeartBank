export type TransactionType =
  | 'PLAYER_TO_PLAYER'
  | 'PLAYER_TO_BANK'
  | 'BANK_TO_PLAYER'
  | 'BANK_CHARGE_PLAYER'
  | 'DEBT_FORGIVEN';

export type TitleKind = 'LAND' | 'STOCK';

export type BoardSpaceKind =
  | 'START'
  | 'LAND'
  | 'STOCK'
  | 'NEWS'
  | 'JAIL'
  | 'GO_TO_JAIL'
  | 'TAX_REFUND'
  | 'FEDERAL_TAX'
  | 'HOLIDAY';

export type NewsCardType = 'LUCK' | 'SETBACK';

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

export type BoardSpace = {
  index: number;
  name: string;
  kind: BoardSpaceKind;
  title_id: string | null;
  amount: number | null;
};

export type NewsCard = {
  id: string;
  action: string;
  type: NewsCardType;
  amount: number;
};

export type GameLastRoll = {
  player_id: string;
  dice: [number, number];
  total: number;
  from_position: number;
  to_position: number;
  is_double: boolean;
  message: string;
  created_at: string;
};

export type PendingNews = {
  player_id: string;
  card: NewsCard;
  space_index: number;
};

export type GameState = {
  room_id: string;
  player_order: string[];
  current_player_id: string | null;
  turn_index: number;
  round_number: number;
  round_bonus_amount: number;
  positions_by_player_id: Record<string, number>;
  started_at: string;
  updated_at: string;
  last_roll: GameLastRoll | null;
  last_news: PendingNews | null;
  pending_news: PendingNews | null;
};

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
  jail_attempts: number;
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
  last_development_round_number: number | null;
  last_development_position: number | null;
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
