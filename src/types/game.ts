export type TransactionType =
  | 'PLAYER_TO_PLAYER'
  | 'PLAYER_TO_BANK'
  | 'BANK_TO_PLAYER'
  | 'BANK_CHARGE_PLAYER';

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
