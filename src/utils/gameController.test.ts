import { describe, expect, it } from 'vitest';

import { BOARD_SPACES } from '@/constants/board';

import {
  advanceBoardPosition,
  getNextTurn,
  getRoundBonusAmount,
  normalizePlayerOrder,
  resolveJailRoll,
} from '@/utils/gameController';

describe('gameController', () => {

  it('keeps the board spaces in the exact registered order', () => {
    expect(BOARD_SPACES.map((space) => [space.index, space.name, space.kind])).toEqual([
      [1, 'Início', 'START'],
      [2, 'Av. 9 de Julho', 'LAND'],
      [3, 'Av. Brasil', 'LAND'],
      [4, 'Ações do banco', 'STOCK'],
      [5, 'Av. Beira Mar', 'LAND'],
      [6, 'Av. Rio Branco', 'LAND'],
      [7, 'Notícias', 'NEWS'],
      [8, 'Av. do Estado', 'LAND'],
      [9, 'Ações da Estrela Card', 'STOCK'],
      [10, 'Av. do Contorno', 'LAND'],
      [11, 'Prisão', 'JAIL'],
      [12, 'Notícias', 'NEWS'],
      [13, 'Av. Rebouças', 'LAND'],
      [14, 'Av. Santo Amaro', 'LAND'],
      [15, 'Ações do e-commerce', 'STOCK'],
      [16, 'Av. da Consolação', 'LAND'],
      [17, 'Restituição do imposto de renda', 'TAX_REFUND'],
      [18, 'Av. Morumbi', 'LAND'],
      [19, 'Av. Higienópolis', 'LAND'],
      [20, 'Av. São João', 'LAND'],
      [21, 'Feriado', 'HOLIDAY'],
      [22, 'Av. Ipiranga', 'LAND'],
      [23, 'Ações da petroleira', 'STOCK'],
      [24, 'Receita Federal', 'FEDERAL_TAX'],
      [25, 'Notícias', 'NEWS'],
      [26, 'Av. Brigadeiro Faria Lima', 'LAND'],
      [27, 'Av. Paulista', 'LAND'],
      [28, 'Notícias', 'NEWS'],
      [29, 'Av. Recife', 'LAND'],
      [30, 'Ações da companhia aérea', 'STOCK'],
      [31, 'Vá para a prisão', 'GO_TO_JAIL'],
      [32, 'Av. Juscelino Kubitschek', 'LAND'],
      [33, 'Notícias', 'NEWS'],
      [34, 'Rua Oscar Freire', 'LAND'],
      [35, 'Av. Ibirapuera', 'LAND'],
      [36, 'Av. Vieira Souto', 'LAND'],
      [37, 'Ações da emissora de TV', 'STOCK'],
      [38, 'Av. Presidente Vargas', 'LAND'],
      [39, 'Notícias', 'NEWS'],
      [40, 'Av. Niemeyer', 'LAND'],
    ]);
  });

  it('calculates each current imported player position independently', () => {
    expect(advanceBoardPosition(20, 1)).toMatchObject({
      fromPosition: 20,
      landedPosition: 21,
      toPosition: 21,
      landedSpace: { name: 'Feriado' },
    });
    expect(advanceBoardPosition(20, 10)).toMatchObject({
      landedPosition: 30,
      toPosition: 30,
      landedSpace: { name: 'Ações da companhia aérea' },
    });
    expect(advanceBoardPosition(6, 8)).toMatchObject({
      fromPosition: 6,
      landedPosition: 14,
      toPosition: 14,
      landedSpace: { name: 'Av. Santo Amaro' },
    });
    expect(advanceBoardPosition(14, 12)).toMatchObject({
      fromPosition: 14,
      landedPosition: 26,
      toPosition: 26,
      landedSpace: { name: 'Av. Brigadeiro Faria Lima' },
    });
  });

  it('separates landed position from final position when going to jail', () => {
    expect(advanceBoardPosition(20, 11)).toMatchObject({
      fromPosition: 20,
      landedPosition: 31,
      landedSpace: { kind: 'GO_TO_JAIL' },
      toPosition: 11,
      finalSpace: { kind: 'JAIL' },
      sendsToJail: true,
    });
    expect(advanceBoardPosition(11, 4)).toMatchObject({
      fromPosition: 11,
      landedPosition: 15,
      toPosition: 15,
      landedSpace: { name: 'Ações do e-commerce' },
    });
  });

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
