import { get, onValue, push, ref, update } from 'firebase/database';

import { listRecords } from '@/api/firebaseDatabase';
import { realtimeDatabase } from '@/firebase/database';
import type { FirebaseRecord } from '@/types/firebase';
import type { Player, Room, Transaction, TransactionType } from '@/types/game';

const ALLOW_NEGATIVE_BALANCE = false;
const INITIAL_BALANCE = 1500;

type RoomSnapshot = {
  room: FirebaseRecord<Room>;
  players: Array<FirebaseRecord<Player>>;
  transactions: Array<FirebaseRecord<Transaction>>;
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

export const createRoom = async () => {
  let code = generateRoomCode();

  while (await getRoomByCode(code)) {
    code = generateRoomCode();
  }

  const roomRef = push(ref(realtimeDatabase, 'rooms'));
  const room: Room = {
    code,
    banker_player_id: null,
    created_at: now(),
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

const createTransactionUpdate = (
  transaction: Omit<Transaction, 'created_at'>,
) => {
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
      throw new GameError('Jogador so pode pagar ao banco com o proprio saldo.');
    }
  }

  if (type === 'BANK_TO_PLAYER' || type === 'BANK_CHARGE_PLAYER') {
    assertBanker(executedByPlayer);
  }

  if (fromPlayer) {
    assertCanDebit(fromPlayer, amount);
  }

  const transaction = createTransactionUpdate({
    room_id: roomId,
    type,
    amount,
    from_player_id: fromPlayerId,
    to_player_id: toPlayerId,
    executed_by_player_id: executedByPlayerId,
    reason: reason?.trim() || null,
  });

  const updates: Record<string, number | Transaction> = {
    [`transactions/${transaction.key}`]: transaction.value,
  };

  if (fromPlayer) {
    updates[`players/${fromPlayer.id}/balance`] = fromPlayer.balance - amount;
  }

  if (toPlayer) {
    updates[`players/${toPlayer.id}/balance`] = toPlayer.balance + amount;
  }

  await update(ref(realtimeDatabase), updates);
};

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

    callback({
      room: {
        id: roomId,
        ...room,
      },
      players,
      transactions,
    });
  });
