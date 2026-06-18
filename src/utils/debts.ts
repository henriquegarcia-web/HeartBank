import type { Debt } from '@/types/game';

const normalizeDebtReason = (reason: string | null) =>
  reason
    ?.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase() ?? '';

export const isLoanDebt = (debt: Pick<Debt, 'reason'>) =>
  normalizeDebtReason(debt.reason).includes('emprestimo');

export const isBlockingDebtForTitlePurchase = (
  debt: Pick<
    Debt,
    'room_id' | 'from_player_id' | 'to_player_id' | 'remaining_amount' | 'reason'
  >,
  roomId: string,
  playerId: string,
) =>
  debt.room_id === roomId &&
  debt.from_player_id === playerId &&
  debt.to_player_id !== null &&
  debt.remaining_amount > 0 &&
  !isLoanDebt(debt);
