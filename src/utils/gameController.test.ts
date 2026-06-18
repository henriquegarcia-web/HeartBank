import { describe, expect, it } from 'vitest';

import {
  advanceBoardPosition,
  getNextTurn,
  getRoundBonusAmount,
  normalizePlayerOrder,
  resolveJailRoll,
} from '@/utils/gameController';

describe('gameController', () => {
  it('advances around the board and detects start crossing', () => {
    expect(advanceBoardPosition(39, 4)).toMatchObject({
      fromPosition: 39,
      toPosition: 3,
      passedStart: true,
    });
    expect(advanceBoardPosition(10, 6)).toMatchObject({
      toPosition: 16,
      passedStart: false,
    });
  });

  it('increases round bonus each 10 rounds', () => {
    expect(getRoundBonusAmount(1)).toBe(2000);
    expect(getRoundBonusAmount(10)).toBe(3000);
    expect(getRoundBonusAmount(20)).toBe(4000);
    expect(getRoundBonusAmount(30)).toBe(5000);
  });

  it('counts a full round when the active order wraps', () => {
    expect(
      getNextTurn({
        playerOrder: ['a', 'b', 'c'],
        currentPlayerId: 'b',
        roundNumber: 4,
      }),
    ).toMatchObject({ currentPlayerId: 'c', roundNumber: 4 });
    expect(
      getNextTurn({
        playerOrder: ['a', 'b', 'c'],
        currentPlayerId: 'c',
        roundNumber: 4,
      }),
    ).toMatchObject({ currentPlayerId: 'a', roundNumber: 5 });
  });

  it('keeps active players when the room player list changes', () => {
    expect(normalizePlayerOrder(['b', 'removed', 'a'], ['a', 'b', 'c'])).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('resolves jail attempts and release by doubles', () => {
    expect(resolveJailRoll({ dice: [2, 2], currentAttempts: 2 })).toEqual({
      isReleased: true,
      jailAttempts: 0,
      isBailAvailable: false,
    });
    expect(resolveJailRoll({ dice: [2, 3], currentAttempts: 2 })).toEqual({
      isReleased: false,
      jailAttempts: 3,
      isBailAvailable: true,
    });
  });
});
