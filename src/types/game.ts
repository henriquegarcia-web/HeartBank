export type TransactionType =
  | 'PLAYER_TO_PLAYER'
  | 'PLAYER_TO_BANK'
  | 'BANK_TO_PLAYER'
  | 'BANK_CHARGE_PLAYER';

export type Room = {
  code: string;
  banker_player_id: string | null;
  created_at: string;
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
