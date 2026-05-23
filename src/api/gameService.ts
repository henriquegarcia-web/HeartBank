import { get, onValue, push, ref, update } from 'firebase/database';

import { listRecords } from '@/api/firebaseDatabase';
import { realtimeDatabase } from '@/firebase/database';
import type { FirebaseRecord } from '@/types/firebase';
import type {
  Debt,
  Player,
  Room,
  Transaction,
  TransactionType,
} from '@/types/game';

const ALLOW_NEGATIVE_BALANCE = false;
const INITIAL_BALANCE = 1500;

type RoomSnapshot = {
  room: FirebaseRecord<Room>;
  players: Array<FirebaseRecord<Player>>;
  transactions: Array<FirebaseRecord<Transaction>>;
  debts: Array<FirebaseRecord<Debt>>;
};

type RoomListSnapshot = Array<
  FirebaseRecord<Room> & {
    player_count: number;
  }
>;

type TransferTransaction = Omit<Transaction, 'created_at'>;

type DebtPaymentContext = {
  roomId: string;
  executedByPlayerId: string;
  playersById: Map<string, FirebaseRecord<Player>>;
  playerBalances: Map<string, number>;
  debtRemaining: Map<string, number>;
  activeDebts: Array<FirebaseRecord<Debt>>;
  updates: Record<string, unknown>;
};

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
    throw new GameError('Nao foi possivel criar a sala.');
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
    throw new GameError('Sala nao encontrada.');
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

  const [players, transactions, debts] = await Promise.all([
    listRecords<Player>('players'),
    listRecords<Transaction>('transactions'),
    listRecords<Debt>('debts'),
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

  await update(ref(realtimeDatabase), updates);
};

export const enterRoomByCode = async (code: string) => {
  if (!code.trim()) {
    throw new GameError('Informe o codigo da sessao.');
  }

  const room = await getRoomByCode(code);

  if (!room) {
    throw new GameError('Sessao nao encontrada.');
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
      };
    }

    return existingPlayer;
  }

  const playerRef = push(ref(realtimeDatabase, 'players'));

  if (!playerRef.key) {
    throw new GameError('Nao foi possivel criar o jogador.');
  }

  const player: Player = {
    room_id: room.id,
    name: name.trim().replace(/\s+/g, ' '),
    normalized_name: normalizedName,
    balance: INITIAL_BALANCE,
    is_banker: shouldAssignBanker,
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
    throw new GameError('Jogador nao encontrado.');
  }

  return {
    id: playerId,
    ...(snapshot.val() as Player),
  };
};

const createTransactionUpdate = (transaction: TransferTransaction) => {
  const transactionRef = push(ref(realtimeDatabase, 'transactions'));

  if (!transactionRef.key) {
    throw new GameError('Nao foi possivel registrar a transacao.');
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
    throw new GameError('Nao foi possivel registrar a divida.');
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

const assertCanDebit = (player: FirebaseRecord<Player>, amount: number) => {
  if (!ALLOW_NEGATIVE_BALANCE && player.balance < amount) {
    throw new GameError('Saldo insuficiente para esta operacao.');
  }
};

const assertBanker = (player: FirebaseRecord<Player>) => {
  if (!player.is_banker) {
    throw new GameError('Apenas o banqueiro pode executar esta acao.');
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

const settleDebtsWithIncomingMoney = (
  playerId: string,
  amount: number,
  context: DebtPaymentContext,
) => {
  let remainingIncoming = roundMoney(amount);

  for (const debt of context.activeDebts) {
    if (debt.from_player_id !== playerId || remainingIncoming <= 0) {
      continue;
    }

    const currentDebtAmount = context.debtRemaining.get(debt.id) ?? 0;

    if (currentDebtAmount <= 0) {
      continue;
    }

    const paymentAmount = roundMoney(
      Math.min(remainingIncoming, currentDebtAmount),
    );
    const nextDebtAmount = roundMoney(currentDebtAmount - paymentAmount);

    remainingIncoming = roundMoney(remainingIncoming - paymentAmount);
    context.debtRemaining.set(debt.id, nextDebtAmount);
    context.updates[`debts/${debt.id}/remaining_amount`] = nextDebtAmount;
    context.updates[`debts/${debt.id}/updated_at`] = now();

    addTransactionToUpdates(context.updates, {
      room_id: context.roomId,
      type: debt.to_player_id ? 'PLAYER_TO_PLAYER' : 'PLAYER_TO_BANK',
      amount: paymentAmount,
      from_player_id: playerId,
      to_player_id: debt.to_player_id,
      executed_by_player_id: context.executedByPlayerId,
      reason: debt.reason,
    });

    if (debt.to_player_id) {
      settleDebtsWithIncomingMoney(debt.to_player_id, paymentAmount, context);
    }
  }

  if (remainingIncoming > 0) {
    const currentBalance = context.playerBalances.get(playerId) ?? 0;
    context.playerBalances.set(
      playerId,
      roundMoney(currentBalance + remainingIncoming),
    );
  }
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
    throw new GameError('Jogador de origem invalido para esta sala.');
  }

  if (toPlayer && toPlayer.room_id !== roomId) {
    throw new GameError('Jogador de destino invalido para esta sala.');
  }

  if (executedByPlayer.room_id !== roomId) {
    throw new GameError('Executor invalido para esta sala.');
  }

  if (type === 'PLAYER_TO_PLAYER' && fromPlayerId === toPlayerId) {
    throw new GameError('Nao e permitido fazer Pix para si mesmo.');
  }

  if (type === 'PLAYER_TO_BANK') {
    if (!fromPlayerId || toPlayerId) {
      throw new GameError('Pagamento ao banco deve sair de um jogador.');
    }

    if (executedByPlayerId !== fromPlayerId) {
      throw new GameError(
        'Jogador so pode pagar ao banco com o proprio saldo.',
      );
    }
  }

  if (type === 'BANK_TO_PLAYER' || type === 'BANK_CHARGE_PLAYER') {
    assertBanker(executedByPlayer);
  }

  if (fromPlayer && ALLOW_NEGATIVE_BALANCE) {
    assertCanDebit(fromPlayer, normalizedAmount);
  }

  const [roomPlayers, roomDebts] = await Promise.all([
    listRecords<Player>('players'),
    listRecords<Debt>('debts'),
  ]);
  const playersById = new Map(
    roomPlayers
      .filter((player) => player.room_id === roomId)
      .map((player) => [player.id, player]),
  );
  const playerBalances = new Map(
    Array.from(playersById.values()).map((player) => [
      player.id,
      roundMoney(player.balance),
    ]),
  );
  const activeDebts = roomDebts
    .filter((debt) => debt.room_id === roomId && debt.remaining_amount > 0)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const debtRemaining = new Map(
    activeDebts.map((debt) => [debt.id, roundMoney(debt.remaining_amount)]),
  );
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/last_played_at`]: now(),
  };
  const context: DebtPaymentContext = {
    roomId,
    executedByPlayerId,
    playersById,
    playerBalances,
    debtRemaining,
    activeDebts,
    updates,
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
      settleDebtsWithIncomingMoney(toPlayer.id, debitAmount, context);
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
    addTransactionToUpdates(updates, {
      room_id: roomId,
      type,
      amount: normalizedAmount,
      from_player_id: fromPlayerId,
      to_player_id: toPlayerId,
      executed_by_player_id: executedByPlayerId,
      reason: normalizedReason,
    });

    settleDebtsWithIncomingMoney(toPlayer.id, normalizedAmount, context);
  }

  playerBalances.forEach((balance, id) => {
    updates[`players/${id}/balance`] = roundMoney(balance);
  });

  await update(ref(realtimeDatabase), updates);
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
    };
    const room = value.rooms?.[roomId];

    if (!room) {
      callback(null);
      return;
    }

    const players = Object.entries(value.players ?? {})
      .filter(([, player]) => player.room_id === roomId)
      .map(([id, player]) => ({ id, ...player }))
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
    });
  });
