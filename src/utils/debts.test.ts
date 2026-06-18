import { describe, expect, it } from 'vitest';

import { isBlockingDebtForTitlePurchase } from './debts';

const baseDebt = {
  room_id: 'room-1',
  from_player_id: 'player-1',
  to_player_id: 'player-2',
  original_amount: 100,
  remaining_amount: 100,
  reason: 'Aluguel',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('isBlockingDebtForTitlePurchase', () => {
  it('blocks active debts owed to another player when they are not loans', () => {
    expect(
      isBlockingDebtForTitlePurchase(baseDebt, 'room-1', 'player-1'),
    ).toBe(true);
  });

  it('does not block bank loans', () => {
    expect(
      isBlockingDebtForTitlePurchase(
        { ...baseDebt, to_player_id: null, reason: 'Empréstimo bancário' },
        'room-1',
        'player-1',
      ),
    ).toBe(false);
  });

  it('does not block old bank debts without a loan reason', () => {
    expect(
      isBlockingDebtForTitlePurchase(
        { ...baseDebt, to_player_id: null, reason: null },
        'room-1',
        'player-1',
      ),
    ).toBe(false);
  });

  it('does not block player loans', () => {
    expect(
      isBlockingDebtForTitlePurchase(
        { ...baseDebt, reason: 'Empréstimo entre jogadores' },
        'room-1',
        'player-1',
      ),
    ).toBe(false);
  });
});
