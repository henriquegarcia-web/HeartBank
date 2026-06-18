import { get, onValue, push, ref, update } from 'firebase/database';

import { listRecords } from '@/api/firebaseDatabase';
import {
  getBankLoanDebtAmount,
  getBankLoanAmountByNetWorth,
} from '@/constants/bankLoans';
import {
  calculatePurchasedTitleAssetValue,
  getLandChargeAmount,
  getTitleDefinition,
} from '@/constants/gameTitles';
import { realtimeDatabase } from '@/firebase/database';
import type { FirebaseRecord } from '@/types/firebase';
import type {
  Debt,
  PendingRequest,
  Player,
  PurchasedTitle,
  Room,
  TitleKind,
  Transaction,
  TransactionType,
} from '@/types/game';
import {
  getDebtStage,
  isDebtStageBlockingPurchases,
} from '@/utils/financialRules';

const ALLOW_NEGATIVE_BALANCE = false;
const INITIAL_BALANCE = 1500;
export const JAIL_BAIL_AMOUNT = 500;

type RoomSnapshot = {
  room: FirebaseRecord<Room>;
  players: Array<FirebaseRecord<Player>>;
  transactions: Array<FirebaseRecord<Transaction>>;
  debts: Array<FirebaseRecord<Debt>>;
  purchasedTitles: Array<FirebaseRecord<PurchasedTitle>>;
  pendingRequests: Array<FirebaseRecord<PendingRequest>>;
};

type RoomListSnapshot = Array<
  FirebaseRecord<Room> & {
    player_count: number;
  }
>;

type TransferTransaction = Omit<Transaction, 'created_at'>;

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

const now = () => new Date().toISOString();

export const normalizePlayerName = (name: string) =>
  name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const generateRoomCode = () =>
  Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(Math.floor(Math.random() * 32)),
  ).join('');

const withPlayerDefaults = <T extends FirebaseRecord<Player>>(
  player: T,
): T => ({
  ...player,
  is_jailed: player.is_jailed ?? false,
  is_bail_available: player.is_bail_available ?? false,
});

export const getRoomByCode = async (code: string) => {
  const normalizedCode = code.trim().toUpperCase();
  const rooms = await listRecords<Room>('rooms');

  return (
    rooms.find((room) => room.code.trim().toUpperCase() === normalizedCode) ??
    null
  );
};

export const createRoom = async (name: string) => {
  const normalizedName = name.trim().replace(/\s+/g, ' ');

  if (!normalizedName) {
    throw new GameError('Informe o nome da sala.');
  }

  let code = generateRoomCode();

  while (await getRoomByCode(code)) {
    code = generateRoomCode();
  }

  const roomRef = push(ref(realtimeDatabase, 'rooms'));
  const room: Room = {
    name: normalizedName,
    code,
    banker_player_id: null,
    created_at: now(),
    last_played_at: null,
  };

  await update(ref(realtimeDatabase), {
    [`rooms/${roomRef.key}`]: room,
  });

  if (!roomRef.key) {
    throw new GameError('Não foi possível criar a sala.');
  }

  return {
    id: roomRef.key,
    ...room,
  };
};

export const deleteRoom = async (
  roomId: string,
  executedByPlayerId: string,
) => {
  const roomSnapshot = await get(ref(realtimeDatabase, `rooms/${roomId}`));

  if (!roomSnapshot.exists()) {
    throw new GameError('Sala não encontrada.');
  }

  const room = {
    id: roomId,
    ...(roomSnapshot.val() as Room),
  };
  const executedByPlayer = await getPlayer(executedByPlayerId);

  if (
    executedByPlayer.room_id !== roomId ||
    executedByPlayer.id !== room.banker_player_id ||
    !executedByPlayer.is_banker
  ) {
    throw new GameError('Apenas o criador da sala pode excluir a sala.');
  }

  const [players, transactions, debts, purchasedTitles, pendingRequests] =
    await Promise.all([
      listRecords<Player>('players'),
      listRecords<Transaction>('transactions'),
      listRecords<Debt>('debts'),
      listRecords<PurchasedTitle>('purchased_titles'),
      listRecords<PendingRequest>('pending_requests'),
    ]);
  const updates: Record<string, null> = {
    [`rooms/${roomId}`]: null,
  };

  players
    .filter((player) => player.room_id === roomId)
    .forEach((player) => {
      updates[`players/${player.id}`] = null;
    });

  transactions
    .filter((transaction) => transaction.room_id === roomId)
    .forEach((transaction) => {
      updates[`transactions/${transaction.id}`] = null;
    });

  debts
    .filter((debt) => debt.room_id === roomId)
    .forEach((debt) => {
      updates[`debts/${debt.id}`] = null;
    });

  purchasedTitles
    .filter((title) => title.room_id === roomId)
    .forEach((title) => {
      updates[`purchased_titles/${title.id}`] = null;
    });

  pendingRequests
    .filter((request) => request.room_id === roomId)
    .forEach((request) => {
      updates[`pending_requests/${request.id}`] = null;
    });

  await update(ref(realtimeDatabase), updates);
};

export const deleteRoomByMasterPassword = async (roomId: string) => {
  const roomSnapshot = await get(ref(realtimeDatabase, `rooms/${roomId}`));

  if (!roomSnapshot.exists()) {
    throw new GameError('Sala não encontrada.');
  }

  const [players, transactions, debts, purchasedTitles, pendingRequests] =
    await Promise.all([
      listRecords<Player>('players'),
      listRecords<Transaction>('transactions'),
      listRecords<Debt>('debts'),
      listRecords<PurchasedTitle>('purchased_titles'),
      listRecords<PendingRequest>('pending_requests'),
    ]);
  const updates: Record<string, null> = {
    [`rooms/${roomId}`]: null,
  };

  players
    .filter((player) => player.room_id === roomId)
    .forEach((player) => {
      updates[`players/${player.id}`] = null;
    });

  transactions
    .filter((transaction) => transaction.room_id === roomId)
    .forEach((transaction) => {
      updates[`transactions/${transaction.id}`] = null;
    });

  debts
    .filter((debt) => debt.room_id === roomId)
    .forEach((debt) => {
      updates[`debts/${debt.id}`] = null;
    });

  purchasedTitles
    .filter((title) => title.room_id === roomId)
    .forEach((title) => {
      updates[`purchased_titles/${title.id}`] = null;
    });

  pendingRequests
    .filter((request) => request.room_id === roomId)
    .forEach((request) => {
      updates[`pending_requests/${request.id}`] = null;
    });

  await update(ref(realtimeDatabase), updates);
};

export const enterRoomByCode = async (code: string) => {
  if (!code.trim()) {
    throw new GameError('Informe o código da sessão.');
  }

  const room = await getRoomByCode(code);

  if (!room) {
    throw new GameError('Sessão não encontrada.');
  }

  return room;
};

export const enterPlayerProfile = async ({
  room,
  name,
  shouldBecomeBanker,
}: {
  room: FirebaseRecord<Room>;
  name: string;
  shouldBecomeBanker: boolean;
}) => {
  const normalizedName = normalizePlayerName(name);

  if (!normalizedName) {
    throw new GameError('Informe o nome do jogador.');
  }

  const players = await listRecords<Player>('players');
  const existingPlayer = players.find(
    (player) =>
      player.room_id === room.id && player.normalized_name === normalizedName,
  );
  const shouldAssignBanker = shouldBecomeBanker && !room.banker_player_id;

  if (existingPlayer) {
    if (shouldAssignBanker && !existingPlayer.is_banker) {
      await update(ref(realtimeDatabase), {
        [`rooms/${room.id}/banker_player_id`]: existingPlayer.id,
        [`players/${existingPlayer.id}/is_banker`]: true,
      });

      return {
        ...existingPlayer,
        is_banker: true,
        is_jailed: existingPlayer.is_jailed ?? false,
        is_bail_available: existingPlayer.is_bail_available ?? false,
      };
    }

    return withPlayerDefaults(existingPlayer);
  }

  const playerRef = push(ref(realtimeDatabase, 'players'));

  if (!playerRef.key) {
    throw new GameError('Não foi possível criar o jogador.');
  }

  const player: Player = {
    room_id: room.id,
    name: name.trim().replace(/\s+/g, ' '),
    normalized_name: normalizedName,
    balance: INITIAL_BALANCE,
    is_banker: shouldAssignBanker,
    is_jailed: false,
    is_bail_available: false,
    created_at: now(),
  };

  const updates: Record<string, Player | string> = {
    [`players/${playerRef.key}`]: player,
  };

  if (shouldAssignBanker) {
    updates[`rooms/${room.id}/banker_player_id`] = playerRef.key;
  }

  await update(ref(realtimeDatabase), updates);

  return {
    id: playerRef.key,
    ...player,
  };
};

const assertPositiveAmount = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GameError('Informe um valor maior que zero.');
  }
};

const getPlayer = async (playerId: string) => {
  const snapshot = await get(ref(realtimeDatabase, `players/${playerId}`));

  if (!snapshot.exists()) {
    throw new GameError('Jogador não encontrado.');
  }

  return {
    id: playerId,
    ...(snapshot.val() as Player),
    is_jailed: (snapshot.val() as Player).is_jailed ?? false,
    is_bail_available: (snapshot.val() as Player).is_bail_available ?? false,
  };
};

const getPurchasedTitle = async (purchasedTitleId: string) => {
  const snapshot = await get(
    ref(realtimeDatabase, `purchased_titles/${purchasedTitleId}`),
  );

  if (!snapshot.exists()) {
    throw new GameError('Título não encontrado.');
  }

  return {
    id: purchasedTitleId,
    ...(snapshot.val() as PurchasedTitle),
  };
};

const getPendingRequest = async (requestId: string) => {
  const snapshot = await get(
    ref(realtimeDatabase, `pending_requests/${requestId}`),
  );

  if (!snapshot.exists()) {
    throw new GameError('Solicitação não encontrada.');
  }

  return {
    id: requestId,
    ...(snapshot.val() as PendingRequest),
  };
};

const createTransactionUpdate = (transaction: TransferTransaction) => {
  const transactionRef = push(ref(realtimeDatabase, 'transactions'));

  if (!transactionRef.key) {
    throw new GameError('Não foi possível registrar a transação.');
  }

  return {
    key: transactionRef.key,
    value: {
      ...transaction,
      created_at: now(),
    } satisfies Transaction,
  };
};

const createDebtUpdate = (debt: Omit<Debt, 'created_at' | 'updated_at'>) => {
  const debtRef = push(ref(realtimeDatabase, 'debts'));

  if (!debtRef.key) {
    throw new GameError('Não foi possível registrar a dívida.');
  }

  const createdAt = now();

  return {
    key: debtRef.key,
    value: {
      ...debt,
      created_at: createdAt,
      updated_at: createdAt,
    } satisfies Debt,
  };
};

const createPendingRequestUpdate = (
  request: Omit<PendingRequest, 'created_at'>,
) => {
  const requestRef = push(ref(realtimeDatabase, 'pending_requests'));

  if (!requestRef.key) {
    throw new GameError('Não foi possível registrar a solicitação.');
  }

  return {
    key: requestRef.key,
    value: {
      ...request,
      created_at: now(),
    } satisfies PendingRequest,
  };
};

const createPurchasedTitleUpdate = (
  title: Omit<PurchasedTitle, 'created_at' | 'updated_at'>,
) => {
  const titleRef = push(ref(realtimeDatabase, 'purchased_titles'));

  if (!titleRef.key) {
    throw new GameError('Não foi possível registrar o título.');
  }

  const createdAt = now();

  return {
    key: titleRef.key,
    value: {
      ...title,
      created_at: createdAt,
      updated_at: createdAt,
    } satisfies PurchasedTitle,
  };
};

const assertCanDebit = (player: FirebaseRecord<Player>, amount: number) => {
  if (!ALLOW_NEGATIVE_BALANCE && player.balance < amount) {
    throw new GameError('Saldo insuficiente para esta operação.');
  }
};

const assertBanker = (player: FirebaseRecord<Player>) => {
  if (!player.is_banker) {
    throw new GameError('Apenas o banqueiro pode executar esta ação.');
  }
};

const assertPlayerInRoom = (player: FirebaseRecord<Player>, roomId: string) => {
  if (player.room_id !== roomId) {
    throw new GameError('Jogador inválido para esta sala.');
  }
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const addTransactionToUpdates = (
  updates: Record<string, unknown>,
  transaction: TransferTransaction,
) => {
  if (transaction.amount <= 0) {
    return;
  }

  const createdTransaction = createTransactionUpdate({
    ...transaction,
    amount: roundMoney(transaction.amount),
  });

  updates[`transactions/${createdTransaction.key}`] = createdTransaction.value;
};

const addDebtToUpdates = (
  updates: Record<string, unknown>,
  debt: Omit<Debt, 'created_at' | 'updated_at'>,
) => {
  const createdDebt = createDebtUpdate({
    ...debt,
    original_amount: roundMoney(debt.original_amount),
    remaining_amount: roundMoney(debt.remaining_amount),
  });

  updates[`debts/${createdDebt.key}`] = createdDebt.value;
};

const assertTitleAvailable = async (roomId: string, titleId: string) => {
  const purchasedTitles = await listRecords<PurchasedTitle>('purchased_titles');
  const isPurchased = purchasedTitles.some(
    (title) => title.room_id === roomId && title.title_id === titleId,
  );

  if (isPurchased) {
    throw new GameError('Este título já foi comprado.');
  }
};

const getPlayerTitleAssetValue = (
  purchasedTitles: Array<FirebaseRecord<PurchasedTitle>>,
  roomId: string,
  playerId: string,
) =>
  purchasedTitles
    .filter(
      (title) => title.room_id === roomId && title.owner_player_id === playerId,
    )
    .reduce(
      (total, title) => total + calculatePurchasedTitleAssetValue(title),
      0,
    );

const getPlayerActiveDebtTotal = (
  debts: Array<FirebaseRecord<Debt>>,
  roomId: string,
  playerId: string,
) =>
  debts
    .filter(
      (debt) =>
        debt.room_id === roomId &&
        debt.from_player_id === playerId &&
        debt.remaining_amount > 0,
    )
    .reduce((total, debt) => total + debt.remaining_amount, 0);

const assertPlayerCanAcquireAssets = async (
  roomId: string,
  playerId: string,
) => {
  const [debts, purchasedTitles] = await Promise.all([
    listRecords<Debt>('debts'),
    listRecords<PurchasedTitle>('purchased_titles'),
  ]);
  const debtTotal = getPlayerActiveDebtTotal(debts, roomId, playerId);
  const titleAssetValue = getPlayerTitleAssetValue(
    purchasedTitles,
    roomId,
    playerId,
  );

  if (isDebtStageBlockingPurchases(getDebtStage(debtTotal, titleAssetValue))) {
    throw new GameError(
      'Quite seus débitos antes de comprar títulos, casas ou hotéis.',
    );
  }
};

const addDirectPlayerToBankPayment = ({
  updates,
  roomId,
  player,
  amount,
  executedByPlayerId,
  reason,
}: {
  updates: Record<string, unknown>;
  roomId: string;
  player: FirebaseRecord<Player>;
  amount: number;
  executedByPlayerId: string;
  reason: string;
}) => {
  assertCanDebit(player, amount);
  updates[`players/${player.id}/balance`] = roundMoney(player.balance - amount);
  addTransactionToUpdates(updates, {
    room_id: roomId,
    type: 'PLAYER_TO_BANK',
    amount,
    from_player_id: player.id,
    to_player_id: null,
    executed_by_player_id: executedByPlayerId,
    reason,
  });
};

const addDirectPlayerToPlayerPayment = ({
  updates,
  roomId,
  fromPlayer,
  toPlayer,
  amount,
  executedByPlayerId,
  reason,
}: {
  updates: Record<string, unknown>;
  roomId: string;
  fromPlayer: FirebaseRecord<Player>;
  toPlayer: FirebaseRecord<Player>;
  amount: number;
  executedByPlayerId: string;
  reason: string;
}) => {
  assertCanDebit(fromPlayer, amount);
  updates[`players/${fromPlayer.id}/balance`] = roundMoney(
    fromPlayer.balance - amount,
  );
  updates[`players/${toPlayer.id}/balance`] = roundMoney(
    toPlayer.balance + amount,
  );
  addTransactionToUpdates(updates, {
    room_id: roomId,
    type: 'PLAYER_TO_PLAYER',
    amount,
    from_player_id: fromPlayer.id,
    to_player_id: toPlayer.id,
    executed_by_player_id: executedByPlayerId,
    reason,
  });
};

const addFlexiblePlayerToBankPayment = ({
  updates,
  roomId,
  player,
  amount,
  executedByPlayerId,
  reason,
}: {
  updates: Record<string, unknown>;
  roomId: string;
  player: FirebaseRecord<Player>;
  amount: number;
  executedByPlayerId: string;
  reason: string;
}) => {
  const debitAmount = roundMoney(Math.min(player.balance, amount));
  const pendingDebtAmount = roundMoney(amount - debitAmount);

  updates[`players/${player.id}/balance`] = roundMoney(
    player.balance - debitAmount,
  );
  addTransactionToUpdates(updates, {
    room_id: roomId,
    type: 'PLAYER_TO_BANK',
    amount: debitAmount,
    from_player_id: player.id,
    to_player_id: null,
    executed_by_player_id: executedByPlayerId,
    reason,
  });
  createPendingDebt({
    roomId,
    fromPlayerId: player.id,
    toPlayerId: null,
    amount: pendingDebtAmount,
    reason,
    updates,
  });
};

const addFlexiblePlayerToPlayerPayment = ({
  updates,
  roomId,
  fromPlayer,
  toPlayer,
  amount,
  executedByPlayerId,
  reason,
}: {
  updates: Record<string, unknown>;
  roomId: string;
  fromPlayer: FirebaseRecord<Player>;
  toPlayer: FirebaseRecord<Player>;
  amount: number;
  executedByPlayerId: string;
  reason: string;
}) => {
  const debitAmount = roundMoney(Math.min(fromPlayer.balance, amount));
  const pendingDebtAmount = roundMoney(amount - debitAmount);

  updates[`players/${fromPlayer.id}/balance`] = roundMoney(
    fromPlayer.balance - debitAmount,
  );
  updates[`players/${toPlayer.id}/balance`] = roundMoney(
    toPlayer.balance + debitAmount,
  );
  addTransactionToUpdates(updates, {
    room_id: roomId,
    type: 'PLAYER_TO_PLAYER',
    amount: debitAmount,
    from_player_id: fromPlayer.id,
    to_player_id: toPlayer.id,
    executed_by_player_id: executedByPlayerId,
    reason,
  });
  createPendingDebt({
    roomId,
    fromPlayerId: fromPlayer.id,
    toPlayerId: toPlayer.id,
    amount: pendingDebtAmount,
    reason,
    updates,
  });
};

const createPendingDebt = ({
  roomId,
  fromPlayerId,
  toPlayerId,
  amount,
  reason,
  updates,
}: {
  roomId: string;
  fromPlayerId: string;
  toPlayerId: string | null;
  amount: number;
  reason?: string;
  updates: Record<string, unknown>;
}) => {
  const roundedAmount = roundMoney(amount);

  if (roundedAmount <= 0) {
    return;
  }

  const debt = createDebtUpdate({
    room_id: roomId,
    from_player_id: fromPlayerId,
    to_player_id: toPlayerId,
    original_amount: roundedAmount,
    remaining_amount: roundedAmount,
    reason: reason?.trim() || null,
  });

  updates[`debts/${debt.key}`] = debt.value;
};

export const moveMoney = async ({
  roomId,
  type,
  amount,
  fromPlayerId,
  toPlayerId,
  executedByPlayerId,
  reason,
}: {
  roomId: string;
  type: TransactionType;
  amount: number;
  fromPlayerId: string | null;
  toPlayerId: string | null;
  executedByPlayerId: string;
  reason?: string;
}) => {
  assertPositiveAmount(amount);
  const normalizedAmount = roundMoney(amount);

  const executedByPlayer = await getPlayer(executedByPlayerId);
  const fromPlayer = fromPlayerId ? await getPlayer(fromPlayerId) : null;
  const toPlayer = toPlayerId ? await getPlayer(toPlayerId) : null;

  if (fromPlayer && fromPlayer.room_id !== roomId) {
    throw new GameError('Jogador de origem inválido para esta sala.');
  }

  if (toPlayer && toPlayer.room_id !== roomId) {
    throw new GameError('Jogador de destino inválido para esta sala.');
  }

  if (executedByPlayer.room_id !== roomId) {
    throw new GameError('Executor inválido para esta sala.');
  }

  if (type === 'PLAYER_TO_PLAYER' && fromPlayerId === toPlayerId) {
    throw new GameError('Não é permitido fazer Pix para si mesmo.');
  }

  if (type === 'PLAYER_TO_BANK') {
    if (!fromPlayerId || toPlayerId) {
      throw new GameError('Pagamento ao banco deve sair de um jogador.');
    }

    if (executedByPlayerId !== fromPlayerId) {
      throw new GameError(
        'Jogador só pode pagar ao banco com o próprio saldo.',
      );
    }
  }

  if (type === 'BANK_TO_PLAYER' || type === 'BANK_CHARGE_PLAYER') {
    assertBanker(executedByPlayer);
  }

  if (fromPlayer && ALLOW_NEGATIVE_BALANCE) {
    assertCanDebit(fromPlayer, normalizedAmount);
  }

  const roomPlayers = await listRecords<Player>('players');
  const playerBalances = new Map(
    roomPlayers
      .filter((player) => player.room_id === roomId)
      .map((player) => [player.id, roundMoney(player.balance)]),
  );
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/last_played_at`]: now(),
  };
  const normalizedReason = reason?.trim() || null;

  if (fromPlayer) {
    const currentBalance = playerBalances.get(fromPlayer.id) ?? 0;
    const debitAmount = roundMoney(Math.min(currentBalance, normalizedAmount));
    const pendingDebtAmount = roundMoney(normalizedAmount - debitAmount);

    playerBalances.set(fromPlayer.id, roundMoney(currentBalance - debitAmount));

    addTransactionToUpdates(updates, {
      room_id: roomId,
      type,
      amount: debitAmount,
      from_player_id: fromPlayerId,
      to_player_id: toPlayerId,
      executed_by_player_id: executedByPlayerId,
      reason: normalizedReason,
    });

    if (toPlayer && debitAmount > 0) {
      const currentToBalance = playerBalances.get(toPlayer.id) ?? 0;
      playerBalances.set(
        toPlayer.id,
        roundMoney(currentToBalance + debitAmount),
      );
    }

    createPendingDebt({
      roomId,
      fromPlayerId: fromPlayer.id,
      toPlayerId,
      amount: pendingDebtAmount,
      reason: normalizedReason ?? undefined,
      updates,
    });
  } else if (toPlayer) {
    const currentToBalance = playerBalances.get(toPlayer.id) ?? 0;

    addTransactionToUpdates(updates, {
      room_id: roomId,
      type,
      amount: normalizedAmount,
      from_player_id: fromPlayerId,
      to_player_id: toPlayerId,
      executed_by_player_id: executedByPlayerId,
      reason: normalizedReason,
    });

    playerBalances.set(
      toPlayer.id,
      roundMoney(currentToBalance + normalizedAmount),
    );
  }

  playerBalances.forEach((balance, id) => {
    updates[`players/${id}/balance`] = roundMoney(balance);
  });

  await update(ref(realtimeDatabase), updates);
};

export const setPlayerJailStatus = async ({
  roomId,
  targetPlayerId,
  executedByPlayerId,
  isJailed,
}: {
  roomId: string;
  targetPlayerId: string;
  executedByPlayerId: string;
  isJailed: boolean;
}) => {
  const [executedByPlayer, targetPlayer] = await Promise.all([
    getPlayer(executedByPlayerId),
    getPlayer(targetPlayerId),
  ]);

  assertBanker(executedByPlayer);
  assertPlayerInRoom(executedByPlayer, roomId);
  assertPlayerInRoom(targetPlayer, roomId);

  await update(ref(realtimeDatabase), {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`players/${targetPlayerId}/is_jailed`]: isJailed,
    [`players/${targetPlayerId}/is_bail_available`]: false,
  });
};

export const resignPlayer = async ({
  roomId,
  targetPlayerId,
  executedByPlayerId,
}: {
  roomId: string;
  targetPlayerId: string;
  executedByPlayerId: string;
}) => {
  const [executedByPlayer, targetPlayer] = await Promise.all([
    getPlayer(executedByPlayerId),
    getPlayer(targetPlayerId),
  ]);

  assertBanker(executedByPlayer);
  assertPlayerInRoom(executedByPlayer, roomId);
  assertPlayerInRoom(targetPlayer, roomId);

  if (targetPlayer.id === executedByPlayer.id) {
    throw new GameError('O banqueiro não pode remover a si mesmo.');
  }

  const [debts, purchasedTitles, pendingRequests] = await Promise.all([
    listRecords<Debt>('debts'),
    listRecords<PurchasedTitle>('purchased_titles'),
    listRecords<PendingRequest>('pending_requests'),
  ]);

  const targetTitleIds = new Set(
    purchasedTitles
      .filter(
        (title) =>
          title.room_id === roomId && title.owner_player_id === targetPlayerId,
      )
      .map((title) => title.id),
  );
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`players/${targetPlayerId}`]: null,
  };

  purchasedTitles
    .filter(
      (title) =>
        title.room_id === roomId && title.owner_player_id === targetPlayerId,
    )
    .forEach((title) => {
      updates[`purchased_titles/${title.id}`] = null;
    });

  debts
    .filter(
      (debt) =>
        debt.room_id === roomId &&
        (debt.from_player_id === targetPlayerId ||
          debt.to_player_id === targetPlayerId),
    )
    .forEach((debt) => {
      updates[`debts/${debt.id}`] = null;
    });

  pendingRequests
    .filter(
      (request) =>
        request.room_id === roomId &&
        (request.requester_player_id === targetPlayerId ||
          request.target_player_id === targetPlayerId ||
          (request.purchased_title_id
            ? targetTitleIds.has(request.purchased_title_id)
            : false)),
    )
    .forEach((request) => {
      updates[`pending_requests/${request.id}`] = null;
    });

  await update(ref(realtimeDatabase), updates);
};
export const releasePlayerBail = async ({
  roomId,
  targetPlayerId,
  executedByPlayerId,
}: {
  roomId: string;
  targetPlayerId: string;
  executedByPlayerId: string;
}) => {
  const [executedByPlayer, targetPlayer] = await Promise.all([
    getPlayer(executedByPlayerId),
    getPlayer(targetPlayerId),
  ]);

  assertBanker(executedByPlayer);
  assertPlayerInRoom(executedByPlayer, roomId);
  assertPlayerInRoom(targetPlayer, roomId);

  if (!targetPlayer.is_jailed) {
    throw new GameError('Jogador não está preso.');
  }

  await update(ref(realtimeDatabase), {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`players/${targetPlayerId}/is_bail_available`]: true,
  });
};

export const payJailBail = async ({
  roomId,
  playerId,
}: {
  roomId: string;
  playerId: string;
}) => {
  const player = await getPlayer(playerId);

  assertPlayerInRoom(player, roomId);

  if (!player.is_jailed) {
    throw new GameError('Você não está preso.');
  }

  if (!player.is_bail_available) {
    throw new GameError('A fiança ainda não foi liberada.');
  }

  assertCanDebit(player, JAIL_BAIL_AMOUNT);

  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`players/${playerId}/is_jailed`]: false,
    [`players/${playerId}/is_bail_available`]: false,
  };

  addFlexiblePlayerToBankPayment({
    updates,
    roomId,
    player,
    amount: JAIL_BAIL_AMOUNT,
    executedByPlayerId: playerId,
    reason: 'Fiança',
  });

  await update(ref(realtimeDatabase), updates);
};

export const payDebt = async ({
  roomId,
  debtId,
  executedByPlayerId,
  amount,
}: {
  roomId: string;
  debtId: string;
  executedByPlayerId: string;
  amount?: number;
}) => {
  const debtSnapshot = await get(ref(realtimeDatabase, `debts/${debtId}`));

  if (!debtSnapshot.exists()) {
    throw new GameError('Dívida não encontrada.');
  }

  const debt = {
    id: debtId,
    ...(debtSnapshot.val() as Debt),
  };

  if (debt.room_id !== roomId || debt.remaining_amount <= 0) {
    throw new GameError('Dívida inválida para esta sala.');
  }

  if (debt.from_player_id !== executedByPlayerId) {
    throw new GameError('Apenas o devedor pode pagar esta dívida.');
  }

  const debtor = await getPlayer(debt.from_player_id);
  const creditor = debt.to_player_id
    ? await getPlayer(debt.to_player_id)
    : null;
  const paymentAmount = roundMoney(amount ?? debt.remaining_amount);
  const remainingAmount = roundMoney(debt.remaining_amount);

  assertPositiveAmount(paymentAmount);

  if (paymentAmount > remainingAmount) {
    throw new GameError('O valor informado é maior que a dívida pendente.');
  }

  assertPlayerInRoom(debtor, roomId);

  if (creditor) {
    assertPlayerInRoom(creditor, roomId);
  }

  assertCanDebit(debtor, paymentAmount);

  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`players/${debtor.id}/balance`]: roundMoney(
      debtor.balance - paymentAmount,
    ),
    [`debts/${debt.id}/remaining_amount`]: roundMoney(
      remainingAmount - paymentAmount,
    ),
    [`debts/${debt.id}/updated_at`]: now(),
  };

  if (creditor) {
    updates[`players/${creditor.id}/balance`] = roundMoney(
      creditor.balance + paymentAmount,
    );
  }

  addTransactionToUpdates(updates, {
    room_id: roomId,
    type: creditor ? 'PLAYER_TO_PLAYER' : 'PLAYER_TO_BANK',
    amount: paymentAmount,
    from_player_id: debtor.id,
    to_player_id: creditor?.id ?? null,
    executed_by_player_id: executedByPlayerId,
    reason: debt.reason ?? 'Pagamento de dívida',
  });

  await update(ref(realtimeDatabase), updates);
};

export const createBankLoan = async ({
  roomId,
  playerId,
}: {
  roomId: string;
  playerId: string;
}) => {
  const player = await getPlayer(playerId);
  assertPlayerInRoom(player, roomId);

  const [debts, purchasedTitles] = await Promise.all([
    listRecords<Debt>('debts'),
    listRecords<PurchasedTitle>('purchased_titles'),
  ]);
  const hasActiveDebt = debts.some(
    (debt) =>
      debt.room_id === roomId &&
      debt.from_player_id === playerId &&
      debt.remaining_amount > 0,
  );

  if (hasActiveDebt) {
    throw new GameError('Quite suas dívidas ativas antes de pedir empréstimo.');
  }

  const assetValue = getPlayerTitleAssetValue(purchasedTitles, roomId, playerId);
  const loanAmount = getBankLoanAmountByNetWorth(player.balance + assetValue);
  const debtAmount = roundMoney(getBankLoanDebtAmount(loanAmount));
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`players/${playerId}/balance`]: roundMoney(player.balance + loanAmount),
  };

  addTransactionToUpdates(updates, {
    room_id: roomId,
    type: 'BANK_TO_PLAYER',
    amount: loanAmount,
    from_player_id: null,
    to_player_id: playerId,
    executed_by_player_id: playerId,
    reason: 'Empréstimo bancário',
  });
  addDebtToUpdates(updates, {
    room_id: roomId,
    from_player_id: playerId,
    to_player_id: null,
    original_amount: debtAmount,
    remaining_amount: debtAmount,
    reason: 'Empréstimo bancário',
  });

  await update(ref(realtimeDatabase), updates);
};

export const createPlayerLoanRequest = async ({
  roomId,
  borrowerPlayerId,
  creditorPlayerId,
  requestedAmount,
  repaymentAmount,
}: {
  roomId: string;
  borrowerPlayerId: string;
  creditorPlayerId: string;
  requestedAmount: number;
  repaymentAmount: number;
}) => {
  assertPositiveAmount(requestedAmount);
  assertPositiveAmount(repaymentAmount);

  if (borrowerPlayerId === creditorPlayerId) {
    throw new GameError('Escolha outro jogador como credor.');
  }

  if (repaymentAmount < requestedAmount) {
    throw new GameError(
      'O valor a pagar deve ser maior ou igual ao solicitado.',
    );
  }

  const [borrower, creditor] = await Promise.all([
    getPlayer(borrowerPlayerId),
    getPlayer(creditorPlayerId),
  ]);
  assertPlayerInRoom(borrower, roomId);
  assertPlayerInRoom(creditor, roomId);

  const createdRequest = createPendingRequestUpdate({
    room_id: roomId,
    kind: 'PLAYER_LOAN',
    requester_player_id: borrowerPlayerId,
    target_player_id: creditorPlayerId,
    amount: roundMoney(requestedAmount),
    title_id: null,
    purchased_title_id: null,
    requested_amount: roundMoney(requestedAmount),
    repayment_amount: roundMoney(repaymentAmount),
    dice_count: null,
  });

  await update(ref(realtimeDatabase), {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`pending_requests/${createdRequest.key}`]: createdRequest.value,
  });
};
export const requestTitlePurchase = async ({
  roomId,
  playerId,
  titleId,
}: {
  roomId: string;
  playerId: string;
  titleId: string;
}) => {
  const definition = getTitleDefinition(titleId);

  if (!definition) {
    throw new GameError('Título inválido.');
  }

  const player = await getPlayer(playerId);
  assertPlayerInRoom(player, roomId);
  await assertPlayerCanAcquireAssets(roomId, playerId);
  assertCanDebit(player, definition.purchase_price);
  await assertTitleAvailable(roomId, titleId);

  const createdRequest = createPendingRequestUpdate({
    room_id: roomId,
    kind: 'TITLE_PURCHASE',
    requester_player_id: playerId,
    target_player_id: playerId,
    amount: definition.purchase_price,
    title_id: titleId,
    purchased_title_id: null,
    requested_amount: null,
    repayment_amount: null,
    dice_count: null,
  });

  await update(ref(realtimeDatabase), {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`pending_requests/${createdRequest.key}`]: createdRequest.value,
  });
};

export const upgradePurchasedTitle = async ({
  roomId,
  playerId,
  purchasedTitleId,
  upgrade,
}: {
  roomId: string;
  playerId: string;
  purchasedTitleId: string;
  upgrade: 'HOUSE' | 'HOTEL';
}) => {
  const [player, purchasedTitle] = await Promise.all([
    getPlayer(playerId),
    getPurchasedTitle(purchasedTitleId),
  ]);
  const definition = getTitleDefinition(purchasedTitle.title_id);

  assertPlayerInRoom(player, roomId);
  await assertPlayerCanAcquireAssets(roomId, playerId);

  if (
    purchasedTitle.room_id !== roomId ||
    purchasedTitle.owner_player_id !== playerId
  ) {
    throw new GameError('Você não possui este título.');
  }

  if (!definition || definition.kind !== 'LAND') {
    throw new GameError('Apenas terrenos podem receber casas ou hotel.');
  }

  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`purchased_titles/${purchasedTitleId}/updated_at`]: now(),
  };

  if (upgrade === 'HOUSE') {
    if (purchasedTitle.has_hotel || purchasedTitle.houses >= 4) {
      throw new GameError('Este terreno não pode receber mais casas.');
    }

    addFlexiblePlayerToBankPayment({
      updates,
      roomId,
      player,
      amount: definition.acquisition.house_price,
      executedByPlayerId: playerId,
      reason: `Compra de casa - ${definition.name}`,
    });
    updates[`purchased_titles/${purchasedTitleId}/houses`] =
      purchasedTitle.houses + 1;
  } else {
    if (purchasedTitle.has_hotel || purchasedTitle.houses !== 4) {
      throw new GameError('O hotel só pode ser comprado depois de 4 casas.');
    }

    addFlexiblePlayerToBankPayment({
      updates,
      roomId,
      player,
      amount: definition.acquisition.hotel_price,
      executedByPlayerId: playerId,
      reason: `Compra de hotel - ${definition.name}`,
    });
    updates[`purchased_titles/${purchasedTitleId}/has_hotel`] = true;
  }

  await update(ref(realtimeDatabase), updates);
};
export const createRentChargeRequest = async ({
  roomId,
  ownerPlayerId,
  payerPlayerId,
  purchasedTitleId,
}: {
  roomId: string;
  ownerPlayerId: string;
  payerPlayerId: string;
  purchasedTitleId: string;
}) => {
  if (ownerPlayerId === payerPlayerId) {
    throw new GameError('Escolha outro jogador para cobrar.');
  }

  const [owner, payer, purchasedTitle] = await Promise.all([
    getPlayer(ownerPlayerId),
    getPlayer(payerPlayerId),
    getPurchasedTitle(purchasedTitleId),
  ]);
  const amount = getLandChargeAmount(purchasedTitle);

  assertPlayerInRoom(owner, roomId);
  assertPlayerInRoom(payer, roomId);

  if (
    purchasedTitle.room_id !== roomId ||
    purchasedTitle.owner_player_id !== ownerPlayerId
  ) {
    throw new GameError('Você não possui este terreno.');
  }

  assertPositiveAmount(amount);

  const createdRequest = createPendingRequestUpdate({
    room_id: roomId,
    kind: 'RENT_CHARGE',
    requester_player_id: ownerPlayerId,
    target_player_id: payerPlayerId,
    amount,
    title_id: purchasedTitle.title_id,
    purchased_title_id: purchasedTitleId,
    requested_amount: null,
    repayment_amount: null,
    dice_count: null,
  });

  await update(ref(realtimeDatabase), {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`pending_requests/${createdRequest.key}`]: createdRequest.value,
  });
};

export const createStockChargeRequest = async ({
  roomId,
  ownerPlayerId,
  payerPlayerId,
  purchasedTitleId,
  diceCount,
}: {
  roomId: string;
  ownerPlayerId: string;
  payerPlayerId: string;
  purchasedTitleId: string;
  diceCount: number;
}) => {
  if (ownerPlayerId === payerPlayerId) {
    throw new GameError('Escolha outro jogador para cobrar.');
  }

  if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > 12) {
    throw new GameError('Informe um valor de dados entre 1 e 12.');
  }

  const [owner, payer, purchasedTitle] = await Promise.all([
    getPlayer(ownerPlayerId),
    getPlayer(payerPlayerId),
    getPurchasedTitle(purchasedTitleId),
  ]);
  const definition = getTitleDefinition(purchasedTitle.title_id);

  assertPlayerInRoom(owner, roomId);
  assertPlayerInRoom(payer, roomId);

  if (
    purchasedTitle.room_id !== roomId ||
    purchasedTitle.owner_player_id !== ownerPlayerId
  ) {
    throw new GameError('Você não possui esta ação.');
  }

  if (!definition || definition.kind !== 'STOCK') {
    throw new GameError('Título de ação inválido.');
  }

  const amount = diceCount * definition.multiplier;
  const createdRequest = createPendingRequestUpdate({
    room_id: roomId,
    kind: 'STOCK_CHARGE',
    requester_player_id: ownerPlayerId,
    target_player_id: payerPlayerId,
    amount,
    title_id: purchasedTitle.title_id,
    purchased_title_id: purchasedTitleId,
    requested_amount: null,
    repayment_amount: null,
    dice_count: diceCount,
  });

  await update(ref(realtimeDatabase), {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`pending_requests/${createdRequest.key}`]: createdRequest.value,
  });
};
export const createTitleSaleRequest = async ({
  roomId,
  sellerPlayerId,
  buyerPlayerId,
  purchasedTitleId,
  amount,
}: {
  roomId: string;
  sellerPlayerId: string;
  buyerPlayerId: string;
  purchasedTitleId: string;
  amount: number;
}) => {
  assertPositiveAmount(amount);

  if (sellerPlayerId === buyerPlayerId) {
    throw new GameError('Escolha outro jogador como comprador.');
  }

  const [seller, buyer, purchasedTitle] = await Promise.all([
    getPlayer(sellerPlayerId),
    getPlayer(buyerPlayerId),
    getPurchasedTitle(purchasedTitleId),
  ]);

  assertPlayerInRoom(seller, roomId);
  assertPlayerInRoom(buyer, roomId);

  if (
    purchasedTitle.room_id !== roomId ||
    purchasedTitle.owner_player_id !== sellerPlayerId
  ) {
    throw new GameError('Você não possui este título.');
  }

  const createdRequest = createPendingRequestUpdate({
    room_id: roomId,
    kind: 'TITLE_SALE',
    requester_player_id: sellerPlayerId,
    target_player_id: buyerPlayerId,
    amount: roundMoney(amount),
    title_id: purchasedTitle.title_id,
    purchased_title_id: purchasedTitleId,
    requested_amount: null,
    repayment_amount: null,
    dice_count: null,
  });

  await update(ref(realtimeDatabase), {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`pending_requests/${createdRequest.key}`]: createdRequest.value,
  });
};

export const sellTitleToBank = async ({
  roomId,
  sellerPlayerId,
  purchasedTitleId,
}: {
  roomId: string;
  sellerPlayerId: string;
  purchasedTitleId: string;
}) => {
  const [seller, purchasedTitle, pendingRequests] = await Promise.all([
    getPlayer(sellerPlayerId),
    getPurchasedTitle(purchasedTitleId),
    listRecords<PendingRequest>('pending_requests'),
  ]);
  const definition = getTitleDefinition(purchasedTitle.title_id);

  assertPlayerInRoom(seller, roomId);

  if (
    purchasedTitle.room_id !== roomId ||
    purchasedTitle.owner_player_id !== sellerPlayerId
  ) {
    throw new GameError('Você não possui este título.');
  }

  const titleValue = calculatePurchasedTitleAssetValue(purchasedTitle);
  const saleAmount = roundMoney(titleValue * 0.75);
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/last_played_at`]: now(),
    [`players/${seller.id}/balance`]: roundMoney(seller.balance + saleAmount),
    [`purchased_titles/${purchasedTitle.id}`]: null,
  };

  pendingRequests
    .filter(
      (request) =>
        request.room_id === roomId &&
        request.purchased_title_id === purchasedTitle.id,
    )
    .forEach((request) => {
      updates[`pending_requests/${request.id}`] = null;
    });

  addTransactionToUpdates(updates, {
    room_id: roomId,
    type: 'BANK_TO_PLAYER',
    amount: saleAmount,
    from_player_id: null,
    to_player_id: seller.id,
    executed_by_player_id: seller.id,
    reason: `Venda de título ao banco - ${definition?.name ?? 'Título'}`,
  });

  await update(ref(realtimeDatabase), updates);
};
export const acceptPendingRequest = async ({
  requestId,
  executedByPlayerId,
}: {
  requestId: string;
  executedByPlayerId: string;
}) => {
  const request = await getPendingRequest(requestId);

  if (request.target_player_id !== executedByPlayerId) {
    throw new GameError('Esta solicitação não pertence a você.');
  }

  if (request.kind === 'RENT_CHARGE' || request.kind === 'STOCK_CHARGE') {
    const definition = getTitleDefinition(request.title_id);
    await moveMoney({
      roomId: request.room_id,
      type: 'PLAYER_TO_PLAYER',
      amount: request.amount,
      fromPlayerId: request.target_player_id,
      toPlayerId: request.requester_player_id,
      executedByPlayerId,
      reason:
        request.kind === 'RENT_CHARGE'
          ? `Aluguel - ${definition?.name ?? 'Título'}`
          : `Ação - ${definition?.name ?? 'Título'}`,
    });

    await update(ref(realtimeDatabase), {
      [`pending_requests/${request.id}`]: null,
      [`rooms/${request.room_id}/last_played_at`]: now(),
    });
    return;
  }

  const updates: Record<string, unknown> = {
    [`pending_requests/${request.id}`]: null,
    [`rooms/${request.room_id}/last_played_at`]: now(),
  };

  if (request.kind === 'TITLE_PURCHASE') {
    if (!request.title_id) {
      throw new GameError('Título inválido.');
    }

    const definition = getTitleDefinition(request.title_id);
    const buyer = await getPlayer(request.target_player_id);

    if (!definition) {
      throw new GameError('Título inválido.');
    }

    assertPlayerInRoom(buyer, request.room_id);
    await assertPlayerCanAcquireAssets(request.room_id, buyer.id);
    await assertTitleAvailable(request.room_id, request.title_id);
    addDirectPlayerToBankPayment({
      updates,
      roomId: request.room_id,
      player: buyer,
      amount: definition.purchase_price,
      executedByPlayerId,
      reason: `Compra de título - ${definition.name}`,
    });

    const purchasedTitle = createPurchasedTitleUpdate({
      room_id: request.room_id,
      title_id: definition.id,
      owner_player_id: buyer.id,
      kind: definition.kind as TitleKind,
      purchase_price: definition.purchase_price,
      houses: 0,
      has_hotel: false,
    });
    updates[`purchased_titles/${purchasedTitle.key}`] = purchasedTitle.value;
  }
  if (request.kind === 'PLAYER_LOAN') {
    const [borrower, creditor] = await Promise.all([
      getPlayer(request.requester_player_id),
      getPlayer(request.target_player_id),
    ]);
    const requestedAmount = request.requested_amount ?? request.amount;
    const repaymentAmount = request.repayment_amount ?? request.amount;

    assertPlayerInRoom(borrower, request.room_id);
    assertPlayerInRoom(creditor, request.room_id);
    addFlexiblePlayerToPlayerPayment({
      updates,
      roomId: request.room_id,
      fromPlayer: creditor,
      toPlayer: borrower,
      amount: requestedAmount,
      executedByPlayerId,
      reason: 'Empréstimo entre jogadores',
    });
    addDebtToUpdates(updates, {
      room_id: request.room_id,
      from_player_id: borrower.id,
      to_player_id: creditor.id,
      original_amount: repaymentAmount,
      remaining_amount: repaymentAmount,
      reason: 'Empréstimo entre jogadores',
    });
  }

  if (request.kind === 'TITLE_SALE') {
    if (!request.purchased_title_id) {
      throw new GameError('Título inválido.');
    }

    const [seller, buyer, purchasedTitle] = await Promise.all([
      getPlayer(request.requester_player_id),
      getPlayer(request.target_player_id),
      getPurchasedTitle(request.purchased_title_id),
    ]);
    const definition = getTitleDefinition(purchasedTitle.title_id);

    assertPlayerInRoom(seller, request.room_id);
    assertPlayerInRoom(buyer, request.room_id);

    if (purchasedTitle.owner_player_id !== seller.id) {
      throw new GameError('Este título não pertence mais ao vendedor.');
    }

    addDirectPlayerToPlayerPayment({
      updates,
      roomId: request.room_id,
      fromPlayer: buyer,
      toPlayer: seller,
      amount: request.amount,
      executedByPlayerId,
      reason: `Compra de título - ${definition?.name ?? 'Título'}`,
    });
    updates[`purchased_titles/${purchasedTitle.id}/owner_player_id`] = buyer.id;
    updates[`purchased_titles/${purchasedTitle.id}/updated_at`] = now();
  }

  await update(ref(realtimeDatabase), updates);
};

export const declinePendingRequest = async ({
  requestId,
  executedByPlayerId,
}: {
  requestId: string;
  executedByPlayerId: string;
}) => {
  const request = await getPendingRequest(requestId);

  if (request.target_player_id !== executedByPlayerId) {
    throw new GameError('Esta solicitação não pertence a você.');
  }

  if (request.kind === 'RENT_CHARGE' || request.kind === 'STOCK_CHARGE') {
    throw new GameError(
      'Cobranças de aluguel e ação precisam ser confirmadas.',
    );
  }

  await update(ref(realtimeDatabase), {
    [`pending_requests/${request.id}`]: null,
    [`rooms/${request.room_id}/last_played_at`]: now(),
  });
};

export const cancelPendingChargeRequest = async ({
  requestId,
  executedByPlayerId,
}: {
  requestId: string;
  executedByPlayerId: string;
}) => {
  const [request, executedByPlayer] = await Promise.all([
    getPendingRequest(requestId),
    getPlayer(executedByPlayerId),
  ]);

  if (request.kind !== 'RENT_CHARGE' && request.kind !== 'STOCK_CHARGE') {
    throw new GameError('Apenas cobranças de aluguel e ação podem ser canceladas.');
  }

  assertPlayerInRoom(executedByPlayer, request.room_id);

  await update(ref(realtimeDatabase), {
    [`pending_requests/${request.id}`]: null,
    [`rooms/${request.room_id}/last_played_at`]: now(),
  });
};
export const subscribeRoomsSnapshot = (
  callback: (snapshot: RoomListSnapshot) => void,
) =>
  onValue(ref(realtimeDatabase), (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const value = snapshot.val() as {
      rooms?: Record<string, Room>;
      players?: Record<string, Player>;
    };
    const players = Object.values(value.players ?? {});
    const rooms = Object.entries(value.rooms ?? {})
      .map(([id, room]) => ({
        id,
        name: room.name || room.code,
        code: room.code,
        banker_player_id: room.banker_player_id,
        created_at: room.created_at,
        last_played_at: room.last_played_at ?? null,
        player_count: players.filter((player) => player.room_id === id).length,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    callback(rooms);
  });

export const subscribeRoomSnapshot = (
  roomId: string,
  callback: (snapshot: RoomSnapshot | null) => void,
) =>
  onValue(ref(realtimeDatabase), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const value = snapshot.val() as {
      rooms?: Record<string, Room>;
      players?: Record<string, Player>;
      transactions?: Record<string, Transaction>;
      debts?: Record<string, Debt>;
      purchased_titles?: Record<string, PurchasedTitle>;
      pending_requests?: Record<string, PendingRequest>;
    };
    const room = value.rooms?.[roomId];

    if (!room) {
      callback(null);
      return;
    }

    const players = Object.entries(value.players ?? {})
      .filter(([, player]) => player.room_id === roomId)
      .map(([id, player]) => withPlayerDefaults({ id, ...player }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const transactions = Object.entries(value.transactions ?? {})
      .filter(([, transaction]) => transaction.room_id === roomId)
      .map(([id, transaction]) => ({ id, ...transaction }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const debts = Object.entries(value.debts ?? {})
      .filter(
        ([, debt]) => debt.room_id === roomId && debt.remaining_amount > 0,
      )
      .map(([id, debt]) => ({ id, ...debt }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const purchasedTitles = Object.entries(value.purchased_titles ?? {})
      .filter(([, title]) => title.room_id === roomId)
      .map(([id, title]) => ({ id, ...title }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const pendingRequests = Object.entries(value.pending_requests ?? {})
      .filter(([, request]) => request.room_id === roomId)
      .map(([id, request]) => ({ id, ...request }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    callback({
      room: {
        id: roomId,
        ...room,
        name: room.name || room.code,
        last_played_at: room.last_played_at ?? null,
      },
      players,
      transactions,
      debts,
      purchasedTitles,
      pendingRequests,
    });
  });
