import {
  BOARD_SIZE,
  INITIAL_ROUND_BONUS,
  JAIL_MAX_DICE_ATTEMPTS,
  ROUND_BONUS_INCREMENT,
  ROUND_BONUS_INTERVAL,
  START_POSITION,
  getBoardSpace,
} from '@/constants/board';
import type { BoardSpace, GameState, Player } from '@/types/game';
import type { FirebaseRecord } from '@/types/firebase';

export type AdvanceResult = {
  fromPosition: number;
  toPosition: number;
  passedStart: boolean;
  space: BoardSpace;
};

export type NextTurnResult = {
  currentPlayerId: string | null;
  turnIndex: number;
  roundNumber: number;
  roundBonusAmount: number;
};

export type JailRollResult = {
  isReleased: boolean;
  jailAttempts: number;
  isBailAvailable: boolean;
};

export const getRoundBonusAmount = (roundNumber: number) =>
  INITIAL_ROUND_BONUS +
  Math.floor(roundNumber / ROUND_BONUS_INTERVAL) * ROUND_BONUS_INCREMENT;

export const normalizePlayerOrder = (
  requestedOrder: string[],
  activePlayerIds: string[],
) => {
  const activeIds = new Set(activePlayerIds);
  const normalized = requestedOrder.filter(
    (playerId, index, order) =>
      activeIds.has(playerId) && order.indexOf(playerId) === index,
  );

  activePlayerIds.forEach((playerId) => {
    if (!normalized.includes(playerId)) {
      normalized.push(playerId);
    }
  });

  return normalized;
};

export const getActivePlayerIds = (players: Array<FirebaseRecord<Player>>) =>
  players.map((player) => player.id);

export const getInitialPositions = (playerOrder: string[]) =>
  playerOrder.reduce<Record<string, number>>((positions, playerId) => {
    positions[playerId] = START_POSITION;
    return positions;
  }, {});

export const advanceBoardPosition = (
  fromPosition: number,
  diceTotal: number,
): AdvanceResult => {
  const normalizedFrom =
    fromPosition >= START_POSITION && fromPosition <= BOARD_SIZE
      ? fromPosition
      : START_POSITION;
  const zeroBasedPosition = normalizedFrom - 1 + diceTotal;
  const toPosition = (zeroBasedPosition % BOARD_SIZE) + 1;
  const passedStart = zeroBasedPosition >= BOARD_SIZE;

  return {
    fromPosition: normalizedFrom,
    toPosition,
    passedStart,
    space: getBoardSpace(toPosition),
  };
};

export const getNextTurn = ({
  playerOrder,
  currentPlayerId,
  roundNumber,
}: {
  playerOrder: string[];
  currentPlayerId: string | null;
  roundNumber: number;
}): NextTurnResult => {
  if (playerOrder.length === 0) {
    return {
      currentPlayerId: null,
      turnIndex: 0,
      roundNumber,
      roundBonusAmount: getRoundBonusAmount(roundNumber),
    };
  }

  const currentIndex = Math.max(0, playerOrder.indexOf(currentPlayerId ?? ''));
  const nextIndex = currentIndex >= playerOrder.length - 1 ? 0 : currentIndex + 1;
  const nextRoundNumber =
    currentIndex >= playerOrder.length - 1 ? roundNumber + 1 : roundNumber;

  return {
    currentPlayerId: playerOrder[nextIndex],
    turnIndex: nextIndex,
    roundNumber: nextRoundNumber,
    roundBonusAmount: getRoundBonusAmount(nextRoundNumber),
  };
};

export const resolveJailRoll = ({
  dice,
  currentAttempts,
}: {
  dice: [number, number];
  currentAttempts: number;
}): JailRollResult => {
  if (dice[0] === dice[1]) {
    return {
      isReleased: true,
      jailAttempts: 0,
      isBailAvailable: false,
    };
  }

  const jailAttempts = currentAttempts + 1;

  return {
    isReleased: false,
    jailAttempts,
    isBailAvailable: jailAttempts >= JAIL_MAX_DICE_ATTEMPTS,
  };
};

export const syncGameStateWithPlayers = <T extends GameState>(
  gameState: T,
  players: Array<FirebaseRecord<Player>>,
) => {
  const activePlayerIds = getActivePlayerIds(players);
  const playerOrder = normalizePlayerOrder(
    gameState.player_order,
    activePlayerIds,
  );
  const currentPlayerId = playerOrder.includes(gameState.current_player_id ?? '')
    ? gameState.current_player_id
    : (playerOrder[0] ?? null);
  const turnIndex = Math.max(0, playerOrder.indexOf(currentPlayerId ?? ''));
  const positionsByPlayerId = getInitialPositions(playerOrder);

  Object.entries(gameState.positions_by_player_id ?? {}).forEach(
    ([playerId, position]) => {
      if (playerOrder.includes(playerId)) {
        positionsByPlayerId[playerId] = position;
      }
    },
  );

  return {
    ...gameState,
    player_order: playerOrder,
    current_player_id: currentPlayerId,
    turn_index: turnIndex,
    positions_by_player_id: positionsByPlayerId,
  } as T;
};


