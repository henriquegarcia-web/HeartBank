import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  LuArrowLeft,
  LuCalculator,
  LuCircleDollarSign,
  LuDices,
  LuHistory,
  LuHouse,
  LuHotel,
  LuLock,
  LuLockOpen,
  LuLogOut,
  LuMedal,
  LuLandmark,
  LuScrollText,
  LuSkull,
  LuTrophy,
  LuWallet,
  LuX,
} from 'react-icons/lu';
import { GiHandcuffs } from 'react-icons/gi';

import {
  acceptPendingRequest,
  cancelPendingChargeRequest,
  createBankLoan,
  createPlayerLoanRequest,
  createRentChargeRequest,
  createStockChargeRequest,
  createTitleSaleRequest,
  declinePendingRequest,
  deleteRoom,
  enterRoomByCode,
  GameError,
  JAIL_BAIL_AMOUNT,
  moveMoney,
  payDebt,
  payJailBail,
  releasePlayerBail,
  requestTitlePurchase,
  resignPlayer,
  sellTitleToBank,
  setPlayerJailStatus,
  subscribeRoomSnapshot,
  upgradePurchasedTitle,
} from '@/api/gameService';
import { AppLayout } from '@/components/ui';
import {
  BANK_LOAN_INTEREST_RATE,
  getBankLoanDebtAmount,
  getBankLoanAmountByNetWorth,
} from '@/constants/bankLoans';
import {
  calculatePurchasedTitleAssetValue,
  getLandChargeAmount,
  getTitleDefinition,
  TITLE_OPTIONS,
} from '@/constants/gameTitles';
import type { FirebaseRecord } from '@/types/firebase';
import type {
  Debt,
  PendingRequest,
  Player,
  PurchasedTitle,
  Transaction,
} from '@/types/game';
import { formatCurrency } from '@/utils/formatters';
import {
  calculateAmountWithInterest,
  calculateAmountWithoutInterest,
  calculateInterestAmount,
  getDebtStage,
  isDebtStageBlockingPurchases,
  type DebtStage,
} from '@/utils/financialRules';

type MoneyFormValues = {
  playerId?: string;
  amount?: number;
  reason?: string;
};

type PlayerLoanFormValues = {
  creditorPlayerId?: string;
  requestedAmount?: number;
  repaymentAmount?: number;
  interestRate?: number;
};

type InterestCalculatorFormValues = {
  baseAmount?: number;
  interestRate?: number;
  mode?: 'ADD' | 'SUBTRACT';
};

type TitlePurchaseFormValues = {
  titleId?: string;
};

type ChargeFormValues = {
  payerPlayerId?: string;
  diceCount?: number;
};

type SaleFormValues = {
  mode?: 'BANK' | 'PLAYER';
  buyerPlayerId?: string;
  amount?: number;
};

type DebtPaymentFormValues = {
  amount?: number;
};

type CancelChargeFormValues = {
  masterPassword?: string;
};

type RoomState = {
  id: string;
  name: string;
  players: Array<FirebaseRecord<Player>>;
  transactions: Array<FirebaseRecord<Transaction>>;
  debts: Array<FirebaseRecord<Debt>>;
  purchasedTitles: Array<FirebaseRecord<PurchasedTitle>>;
  pendingRequests: Array<FirebaseRecord<PendingRequest>>;
};

type RankingPlayer = FirebaseRecord<Player> & {
  assetValue: number;
  rankingValue: number;
};

type TitleActionModal = {
  kind: 'RENT' | 'STOCK' | 'SALE';
  purchasedTitle: FirebaseRecord<PurchasedTitle>;
} | null;

type DebtPaymentModal = FirebaseRecord<Debt> | null;
type GameTabKey =
  | 'player'
  | 'loans'
  | 'titles'
  | 'ranking'
  | 'calculator'
  | 'history'
  | 'banker';

type GameNavigationItem = {
  key: GameTabKey;
  label: string;
  icon: ReactNode;
};

const QUICK_AMOUNTS = [20, 50, 100, 500, 1000];

const BANK_PAYMENT_REASON_OPTIONS = ['Notícia', 'Imposto'].map((reason) => ({
  label: reason,
  value: reason,
}));

const BANK_ACTION_REASON_OPTIONS = [
  'Notícia',
  'Bônus de Rodada',
  'Restituição do Imposto',
  'Outros',
].map((reason) => ({
  label: reason,
  value: reason,
}));
const PRESET_REASON_AMOUNTS: Record<string, number> = {
  Imposto: 2000,
  'Bônus de Rodada': 2000,
  'Restituição do Imposto': 2000,
};

const DICE_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = index + 1;

  return {
    label: String(value),
    value,
  };
});
const BANK_TITLE_SALE_RATE = 0.75;

const CALCULATOR_KEYS = [
  '7',
  '8',
  '9',
  '/',
  '4',
  '5',
  '6',
  '*',
  '1',
  '2',
  '3',
  '-',
  '0',
  'C',
  '=',
  '+',
];
const PIX_AUDIO_SRC = '/audio_pix.mp3';
const MASTER_DELETE_PASSWORD = import.meta.env
  .VITE_MASTER_ROOM_DELETE_PASSWORD as string | undefined;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const getPlayerName = (
  players: Array<FirebaseRecord<Player>>,
  playerId: string | null,
) => {
  if (!playerId) {
    return 'Banco';
  }

  return players.find((player) => player.id === playerId)?.name ?? 'Jogador';
};

const getTransactionSignal = (
  transaction: FirebaseRecord<Transaction>,
  perspectivePlayerId?: string,
) => {
  if (perspectivePlayerId) {
    return transaction.to_player_id === perspectivePlayerId ? '+' : '-';
  }

  return transaction.type === 'BANK_TO_PLAYER' ? '+' : '-';
};

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const playPixAudio = () => {
  const audio = new Audio(PIX_AUDIO_SRC);
  audio.volume = 0.8;

  void audio.play().catch(() => {
    // Browsers can block audio before the user interacts with the page.
  });
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const getDebtStageLabel = (stage: DebtStage) => {
  if (stage === 3) {
    return 'Recuperação judicial';
  }

  if (stage === 2) {
    return 'Risco de falência';
  }

  if (stage === 1) {
    return 'Quitação necessária';
  }

  return 'Regular';
};

const getPurchasedTitleValuation = (
  purchasedTitle: FirebaseRecord<PurchasedTitle> | null | undefined,
) => {
  const definition = getTitleDefinition(purchasedTitle?.title_id ?? null);

  if (!purchasedTitle || !definition) {
    return null;
  }

  const improvements: Array<{ label: string; amount: number }> = [];

  if (definition.kind === 'LAND') {
    if (purchasedTitle.houses > 0) {
      improvements.push({
        label: `${purchasedTitle.houses}x casas`,
        amount: purchasedTitle.houses * definition.acquisition.house_price,
      });
    }

    if (purchasedTitle.has_hotel) {
      improvements.push({
        label: '1x hotel',
        amount: definition.acquisition.hotel_price,
      });
    }
  }

  const totalValue = calculatePurchasedTitleAssetValue(purchasedTitle);

  return {
    definition,
    baseValue: definition.purchase_price,
    improvements,
    totalValue,
    bankSaleValue: roundMoney(totalValue * BANK_TITLE_SALE_RATE),
  };
};

function PlayerFinancialSummary({
  player,
  assetValue,
  debtTotal,
  debtStage,
  isLoading,
}: {
  player: FirebaseRecord<Player> | null;
  assetValue: number;
  debtTotal: number;
  debtStage: DebtStage;
  isLoading: boolean;
}) {
  return (
    <Card loading={isLoading}>
      <Flex align="flex-start" justify="space-between" gap={16}>
        <Flex vertical gap={6} style={{ minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {player?.name}
          </Typography.Title>
          <Space wrap>
            {player?.is_banker ? <Tag color="gold">Banqueiro</Tag> : null}
            {debtStage > 0 ? (
              <Tag color={debtStage === 3 ? 'red' : 'orange'}>
                {getDebtStageLabel(debtStage)}
              </Tag>
            ) : null}
          </Space>
        </Flex>
        <Flex vertical gap={4} align="flex-end" style={{ flexShrink: 0 }}>
          <Flex vertical align="flex-end" gap={0}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Saldo atual
            </Typography.Text>
            <Typography.Text strong style={{ fontSize: 18, lineHeight: 1.2 }}>
              {formatCurrency(player?.balance ?? 0)}
            </Typography.Text>
          </Flex>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Patrimônio: {formatCurrency(assetValue)}
          </Typography.Text>
          <Typography.Text
            type={debtTotal > 0 ? 'danger' : undefined}
            style={{ fontSize: 12 }}
          >
            Dívidas: {formatCurrency(debtTotal)}
          </Typography.Text>
        </Flex>
      </Flex>
    </Card>
  );
}

function QuickAmountButtons({
  form,
  disabled = false,
}: {
  form: FormInstance<MoneyFormValues>;
  disabled?: boolean;
}) {
  const addAmount = (amount: number) => {
    const currentAmount = Number(form.getFieldValue('amount') ?? 0);
    form.setFieldValue('amount', roundMoney(currentAmount + amount));
  };

  return (
    <Flex
      gap={8}
      wrap="wrap"
      justify="end"
      style={{ marginTop: -12, marginBottom: 16 }}
    >
      {QUICK_AMOUNTS.map((amount) => (
        <Button
          key={amount}
          size="small"
          disabled={disabled}
          onClick={() => addAmount(amount)}
        >
          +{amount}
        </Button>
      ))}
    </Flex>
  );
}

function TransactionHistoryList({
  transactions,
  players,
  perspectivePlayerId,
}: {
  transactions: Array<FirebaseRecord<Transaction>>;
  players: Array<FirebaseRecord<Player>>;
  perspectivePlayerId?: string;
}) {
  if (transactions.length === 0) {
    return <Empty description="Sem movimentações" />;
  }

  return (
    <Flex
      vertical
      gap={10}
      style={{
        maxHeight: 280,
        overflowY: 'auto',
        paddingRight: 4,
      }}
    >
      {transactions.map((transaction) => {
        const signal = getTransactionSignal(transaction, perspectivePlayerId);

        return (
          <Flex
            key={transaction.id}
            vertical
            align="end"
            style={{
              paddingBottom: 6,
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              paddingRight: 10,
            }}
          >
            <Flex
              justify="space-between"
              align="center"
              style={{ width: '100%' }}
            >
              <Tag
                color={signal === '+' ? 'green' : 'red'}
                style={{ fontSize: 10 }}
              >
                {signal} {formatCurrency(transaction.amount)}
              </Tag>
              <Typography.Text
                style={{
                  display: 'block',
                  fontSize: 10,
                  lineHeight: 1.35,
                  fontWeight: 'bold',
                  whiteSpace: 'normal',
                }}
              >
                {getPlayerName(players, transaction.from_player_id)} {'→'}{' '}
                {getPlayerName(players, transaction.to_player_id)}
              </Typography.Text>
            </Flex>

            <Typography.Text
              key={transaction.id}
              style={{
                display: 'block',
                fontSize: 10,
                lineHeight: 1.35,
                whiteSpace: 'normal',
              }}
            >
              {transaction.reason || 'Sem motivo'}
            </Typography.Text>
          </Flex>
        );
      })}
    </Flex>
  );
}

function Calculator() {
  const [display, setDisplay] = useState('0');
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);

  const calculate = (first: number, second: number, nextOperator: string) => {
    if (nextOperator === '+') {
      return first + second;
    }

    if (nextOperator === '-') {
      return first - second;
    }

    if (nextOperator === '*') {
      return first * second;
    }

    if (nextOperator === '/') {
      return second === 0 ? 0 : Math.trunc(first / second);
    }

    return second;
  };

  const pressKey = (key: string) => {
    if (/^\d$/.test(key)) {
      setDisplay((current) =>
        current === '0' || shouldResetDisplay ? key : `${current}${key}`,
      );
      setShouldResetDisplay(false);
      return;
    }

    if (key === 'C') {
      setDisplay('0');
      setStoredValue(null);
      setOperator(null);
      setShouldResetDisplay(false);
      return;
    }

    if (key === '=') {
      if (storedValue === null || !operator) {
        return;
      }

      setDisplay(String(calculate(storedValue, Number(display), operator)));
      setStoredValue(null);
      setOperator(null);
      setShouldResetDisplay(true);
      return;
    }

    const currentNumber = Number(display);

    if (storedValue !== null && operator && !shouldResetDisplay) {
      const result = calculate(storedValue, currentNumber, operator);
      setStoredValue(result);
      setDisplay(String(result));
    } else {
      setStoredValue(currentNumber);
    }

    setOperator(key);
    setShouldResetDisplay(true);
  };

  return (
    <Card title="Calculadora">
      <Flex vertical gap={12} style={{ maxWidth: 360 }}>
        <Typography.Title
          level={3}
          style={{
            margin: 0,
            minHeight: 48,
            padding: '8px 12px',
            textAlign: 'right',
            background: '#f5f5f5',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {display}
        </Typography.Title>
        <div
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'repeat(4, minmax(56px, 1fr))',
          }}
        >
          {CALCULATOR_KEYS.map((key) => (
            <Button
              key={key}
              type={
                ['/', '*', '-', '+', '='].includes(key) ? 'primary' : 'default'
              }
              style={{ height: 44 }}
              onClick={() => pressKey(key)}
            >
              {key}
            </Button>
          ))}
        </div>
      </Flex>
    </Card>
  );
}

function InterestCalculator() {
  const [form] = Form.useForm<InterestCalculatorFormValues>();
  const baseAmount = Form.useWatch('baseAmount', form) ?? 0;
  const interestRate = Form.useWatch('interestRate', form) ?? 0;
  const mode = Form.useWatch('mode', form) ?? 'ADD';
  const interestAmount = calculateInterestAmount(baseAmount, interestRate);
  const result =
    mode === 'ADD'
      ? calculateAmountWithInterest(baseAmount, interestRate)
      : calculateAmountWithoutInterest(baseAmount, interestRate);

  return (
    <Card title="Calculadora de Juros">
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ mode: 'ADD', interestRate: 0 }}
      >
        <Form.Item name="baseAmount" label="Valor base">
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            prefix="R$"
          />
        </Form.Item>
        <Form.Item name="interestRate" label="Taxa de juros">
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            suffix="%"
          />
        </Form.Item>
        <Form.Item name="mode" label="Operação">
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: 'Acrescentar juros', value: 'ADD' },
              { label: 'Descontar juros', value: 'SUBTRACT' },
            ]}
          />
        </Form.Item>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Juros">
            {formatCurrency(interestAmount)}
          </Descriptions.Item>
          <Descriptions.Item label="Resultado">
            <Typography.Text strong>{formatCurrency(result)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Form>
    </Card>
  );
}

export function GameRoom() {
  const { message, modal, notification } = App.useApp();
  const navigate = useNavigate();
  const { code, playerId } = useParams<{ code: string; playerId: string }>();
  const [state, setState] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bankPaymentForm] = Form.useForm<MoneyFormValues>();
  const [adminForm] = Form.useForm<MoneyFormValues>();
  const [playerLoanForm] = Form.useForm<PlayerLoanFormValues>();
  const [titlePurchaseForm] = Form.useForm<TitlePurchaseFormValues>();
  const [chargeForm] = Form.useForm<ChargeFormValues>();
  const [saleForm] = Form.useForm<SaleFormValues>();
  const [debtPaymentForm] = Form.useForm<DebtPaymentFormValues>();
  const [cancelChargeForm] = Form.useForm<CancelChargeFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleActionModal, setTitleActionModal] =
    useState<TitleActionModal>(null);
  const [debtPaymentModal, setDebtPaymentModal] =
    useState<DebtPaymentModal>(null);
  const [isCancelChargeModalOpen, setIsCancelChargeModalOpen] =
    useState(false);
  const [activeTabKey, setActiveTabKey] = useState<GameTabKey>('player');
  const [selectedTitleId, setSelectedTitleId] = useState<string>();
  const [selectedDiceCount, setSelectedDiceCount] = useState<number>();
  const seenTransactionIdsRef = useRef<Set<string>>(new Set());
  const didInitializeNotificationsRef = useRef(false);
  const bankPaymentReason = Form.useWatch('reason', bankPaymentForm);
  const adminReason = Form.useWatch('reason', adminForm);
  const debtPaymentAmount = Form.useWatch('amount', debtPaymentForm);
  const saleMode = Form.useWatch('mode', saleForm) ?? 'PLAYER';
  const playerLoanRequestedAmount =
    Form.useWatch('requestedAmount', playerLoanForm) ?? 0;
  const playerLoanInterestRate =
    Form.useWatch('interestRate', playerLoanForm) ?? 0;
  const playerLoanRepaymentAmount = calculateAmountWithInterest(
    playerLoanRequestedAmount,
    playerLoanInterestRate,
  );
  const isBankPaymentAmountLocked = Boolean(
    bankPaymentReason && PRESET_REASON_AMOUNTS[bankPaymentReason],
  );
  const isAdminAmountLocked = Boolean(
    adminReason && PRESET_REASON_AMOUNTS[adminReason],
  );

  useEffect(() => {
    const amount = bankPaymentReason
      ? PRESET_REASON_AMOUNTS[bankPaymentReason]
      : undefined;

    bankPaymentForm.setFieldValue('amount', amount);
  }, [bankPaymentForm, bankPaymentReason]);

  useEffect(() => {
    const amount = adminReason ? PRESET_REASON_AMOUNTS[adminReason] : undefined;

    adminForm.setFieldValue('amount', amount);
  }, [adminForm, adminReason]);

  useEffect(() => {
    playerLoanForm.setFieldValue('repaymentAmount', playerLoanRepaymentAmount);
  }, [playerLoanForm, playerLoanRepaymentAmount]);

  useEffect(() => {
    if (!code || !playerId) {
      return undefined;
    }

    setIsLoading(true);

    let unsubscribe = () => {};

    const loadRoom = async () => {
      const room = await enterRoomByCode(code);

      unsubscribe = subscribeRoomSnapshot(room.id, (snapshot) => {
        setIsLoading(false);

        if (!snapshot) {
          setState(null);
          return;
        }

        setState({
          id: snapshot.room.id,
          name: snapshot.room.name,
          players: snapshot.players,
          transactions: snapshot.transactions,
          debts: snapshot.debts,
          purchasedTitles: snapshot.purchasedTitles,
          pendingRequests: snapshot.pendingRequests,
        });
      });
    };

    loadRoom().catch(() => {
      setIsLoading(false);
      setState(null);
    });

    return () => unsubscribe();
  }, [code, playerId]);

  useEffect(() => {
    if (!state || !playerId) {
      return;
    }

    if (!didInitializeNotificationsRef.current) {
      seenTransactionIdsRef.current = new Set(
        state.transactions.map((transaction) => transaction.id),
      );
      didInitializeNotificationsRef.current = true;
      return;
    }

    const newReceivedPixTransactions = state.transactions.filter(
      (transaction) =>
        !seenTransactionIdsRef.current.has(transaction.id) &&
        transaction.type === 'PLAYER_TO_PLAYER' &&
        transaction.to_player_id === playerId &&
        transaction.executed_by_player_id !== playerId,
    );

    newReceivedPixTransactions.forEach((transaction) => {
      playPixAudio();

      notification.success({
        message: 'Pagamento recebido',
        description: `${getPlayerName(
          state.players,
          transaction.from_player_id,
        )} enviou ${formatCurrency(transaction.amount)}.`,
      });
    });

    state.transactions.forEach((transaction) => {
      seenTransactionIdsRef.current.add(transaction.id);
    });
  }, [notification, playerId, state]);

  const currentPlayer = useMemo(
    () => state?.players.find((player) => player.id === playerId) ?? null,
    [playerId, state?.players],
  );

  useEffect(() => {
    if (!debtPaymentModal) {
      debtPaymentForm.resetFields();
      return;
    }

    debtPaymentForm.setFieldsValue({
      amount: Math.min(
        debtPaymentModal.remaining_amount,
        currentPlayer?.balance ?? debtPaymentModal.remaining_amount,
      ),
    });
  }, [currentPlayer?.balance, debtPaymentForm, debtPaymentModal]);

  useEffect(() => {
    if (activeTabKey === 'banker' && !currentPlayer?.is_banker) {
      setActiveTabKey('player');
    }
  }, [activeTabKey, currentPlayer?.is_banker]);

  const playerOptions = useMemo(
    () =>
      (state?.players ?? []).map((player) => ({
        label: player.name,
        value: player.id,
        disabled: player.id === playerId,
      })),
    [playerId, state?.players],
  );

  const adminPlayerOptions = useMemo(
    () =>
      (state?.players ?? []).map((player) => ({
        label: `${player.name} - ${formatCurrency(player.balance)}`,
        value: player.id,
      })),
    [state?.players],
  );

  const purchasedTitleIds = useMemo(
    () =>
      new Set((state?.purchasedTitles ?? []).map((title) => title.title_id)),
    [state?.purchasedTitles],
  );

  const availableTitleOptions = useMemo(
    () =>
      TITLE_OPTIONS.filter((title) => !purchasedTitleIds.has(title.id)).map(
        (title) => ({
          label: `${title.name} - ${formatCurrency(title.purchase_price)}`,
          value: title.id,
          searchText: normalizeSearchText(title.name),
        }),
      ),
    [purchasedTitleIds],
  );

  const selectedTitle = useMemo(
    () => getTitleDefinition(selectedTitleId ?? null),
    [selectedTitleId],
  );

  const currentPlayerTitles = useMemo(
    () =>
      (state?.purchasedTitles ?? []).filter(
        (title) => title.owner_player_id === playerId,
      ),
    [playerId, state?.purchasedTitles],
  );

  const assetValueByPlayerId = useMemo(() => {
    const assetValues = new Map<string, number>();

    (state?.purchasedTitles ?? []).forEach((title) => {
      const currentValue = assetValues.get(title.owner_player_id) ?? 0;
      assetValues.set(
        title.owner_player_id,
        roundMoney(currentValue + calculatePurchasedTitleAssetValue(title)),
      );
    });

    return assetValues;
  }, [state?.purchasedTitles]);

  const currentPlayerAssetValue = currentPlayer
    ? (assetValueByPlayerId.get(currentPlayer.id) ?? 0)
    : 0;
  const currentPlayerNetWorth = roundMoney(
    (currentPlayer?.balance ?? 0) + currentPlayerAssetValue,
  );
  const bankLoanAmount = getBankLoanAmountByNetWorth(currentPlayerNetWorth);
  const bankLoanDebtAmount = roundMoney(getBankLoanDebtAmount(bankLoanAmount));

  const currentPlayerDebts = useMemo(
    () =>
      (state?.debts ?? []).filter((debt) => debt.from_player_id === playerId),
    [playerId, state?.debts],
  );

  const currentPlayerReceivables = useMemo(
    () => (state?.debts ?? []).filter((debt) => debt.to_player_id === playerId),
    [playerId, state?.debts],
  );

  const currentPlayerDebtTotal = useMemo(
    () =>
      currentPlayerDebts.reduce(
        (total, debt) => total + debt.remaining_amount,
        0,
      ),
    [currentPlayerDebts],
  );

  const currentDebtStage = getDebtStage(
    currentPlayerDebtTotal,
    currentPlayerAssetValue,
  );
  const isDebtPurchaseBlocked =
    isDebtStageBlockingPurchases(currentDebtStage);
  const isCurrentPlayerJailed = currentPlayer?.is_jailed ?? false;
  const isTitlesTabAvailableWhileRestricted = activeTabKey === 'titles';
  const shouldShowJailBackdrop =
    isCurrentPlayerJailed &&
    !isTitlesTabAvailableWhileRestricted &&
    !(currentPlayer?.is_banker && activeTabKey === 'banker');
  const shouldShowJudicialRecoveryBackdrop =
    currentDebtStage === 3 &&
    !isTitlesTabAvailableWhileRestricted &&
    !shouldShowJailBackdrop;
  const maxDebtPaymentAmount = debtPaymentModal
    ? roundMoney(
        Math.min(debtPaymentModal.remaining_amount, currentPlayer?.balance ?? 0),
      )
    : 0;
  const isDebtPaymentAmountInvalid =
    !debtPaymentAmount ||
    debtPaymentAmount <= 0 ||
    debtPaymentAmount > maxDebtPaymentAmount;

  const rankedPlayers = useMemo<RankingPlayer[]>(
    () =>
      (state?.players ?? [])
        .map((player) => {
          const assetValue = assetValueByPlayerId.get(player.id) ?? 0;

          return {
            ...player,
            assetValue,
            rankingValue: roundMoney(player.balance + assetValue),
          };
        })
        .sort((a, b) => b.rankingValue - a.rankingValue),
    [assetValueByPlayerId, state?.players],
  );

  const activePendingRequest = useMemo(
    () =>
      (state?.pendingRequests ?? []).find(
        (request) => request.target_player_id === playerId,
      ) ?? null,
    [playerId, state?.pendingRequests],
  );

  const activePendingRequestTitle = useMemo(
    () => getTitleDefinition(activePendingRequest?.title_id ?? null),
    [activePendingRequest],
  );

  const selectedModalTitleDefinition = useMemo(
    () => getTitleDefinition(titleActionModal?.purchasedTitle.title_id ?? null),
    [titleActionModal],
  );

  const selectedStockChargeAmount =
    titleActionModal?.kind === 'STOCK' &&
    selectedModalTitleDefinition?.kind === 'STOCK'
      ? (selectedDiceCount ?? 0) * selectedModalTitleDefinition.multiplier
      : 0;
  const selectedSaleValuation =
    titleActionModal?.kind === 'SALE'
      ? getPurchasedTitleValuation(titleActionModal.purchasedTitle)
      : null;

  useEffect(() => {
    if (titleActionModal?.kind !== 'SALE') {
      return;
    }

    if (saleMode === 'BANK') {
      saleForm.setFieldValue('amount', selectedSaleValuation?.bankSaleValue);
      saleForm.setFieldValue('buyerPlayerId', undefined);
    }
  }, [saleForm, saleMode, selectedSaleValuation?.bankSaleValue, titleActionModal]);

  if (!code || !playerId) {
    return <Navigate to="/" replace />;
  }

  if (!isLoading && (!state || !currentPlayer)) {
    return <Navigate to="/" replace />;
  }

  const executeAction = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setIsSubmitting(true);

    try {
      await action();
      message.success(successMessage);
      bankPaymentForm.resetFields();
      adminForm.resetFields();
      playerLoanForm.resetFields();
      titlePurchaseForm.resetFields();
      chargeForm.resetFields();
      saleForm.resetFields();
      debtPaymentForm.resetFields();
      cancelChargeForm.resetFields();
      setTitleActionModal(null);
      setDebtPaymentModal(null);
      setIsCancelChargeModalOpen(false);
      setSelectedTitleId(undefined);
      setSelectedDiceCount(undefined);
    } catch (error) {
      message.error(
        error instanceof GameError
          ? error.message
          : 'Não foi possível executar a operação.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * Fluxo antigo de Pix direto preservado apenas como referência:
   * moveMoney({ type: 'PLAYER_TO_PLAYER', fromPlayerId: playerId, toPlayerId, amount, reason }).
   * A UI foi retirada porque aluguel, ações e vendas agora usam solicitações persistentes.
   */

  const handlePayBank = (values: MoneyFormValues) =>
    executeAction(
      () =>
        moveMoney({
          roomId: currentPlayer?.room_id ?? '',
          type: 'PLAYER_TO_BANK',
          amount: values.amount ?? 0,
          fromPlayerId: playerId,
          toPlayerId: null,
          executedByPlayerId: playerId,
          reason: values.reason,
        }),
      'Pagamento registrado.',
    );

  const handleBankAction = async (
    type: 'BANK_TO_PLAYER' | 'BANK_CHARGE_PLAYER',
  ) => {
    try {
      const values = await adminForm.validateFields();

      await executeAction(
        () =>
          moveMoney({
            roomId: currentPlayer?.room_id ?? '',
            type,
            amount: values.amount ?? 0,
            fromPlayerId:
              type === 'BANK_CHARGE_PLAYER' ? (values.playerId ?? null) : null,
            toPlayerId:
              type === 'BANK_TO_PLAYER' ? (values.playerId ?? null) : null,
            executedByPlayerId: playerId,
            reason: values.reason,
          }),
        type === 'BANK_TO_PLAYER'
          ? 'Dinheiro adicionado.'
          : 'Dinheiro retirado.',
      );
    } catch (error) {
      if (!(error instanceof Error)) {
        return;
      }

      message.error(error.message);
    }
  };

  const handleSetPlayerJailStatus = (
    targetPlayer: FirebaseRecord<Player>,
    isJailed: boolean,
  ) => {
    if (!currentPlayer) {
      return;
    }

    modal.confirm({
      title: isJailed ? 'Deseja prender?' : 'Deseja soltar?',
      content: `${isJailed ? 'Prender' : 'Soltar'} ${targetPlayer.name}?`,
      okText: isJailed ? 'Prender' : 'Soltar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: isJailed },
      onOk: () =>
        executeAction(
          () =>
            setPlayerJailStatus({
              roomId: currentPlayer.room_id,
              targetPlayerId: targetPlayer.id,
              executedByPlayerId: currentPlayer.id,
              isJailed,
            }),
          isJailed ? 'Jogador preso.' : 'Jogador solto.',
        ),
    });
  };

  const handleResignPlayer = (targetPlayer: FirebaseRecord<Player>) => {
    if (!currentPlayer) {
      return;
    }

    modal.confirm({
      title: 'Confirmar desistência?',
      content: `${targetPlayer.name} será removido do banco e seus títulos voltarão a ficar disponíveis para todos.`,
      okText: 'Confirmar desistência',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: () =>
        executeAction(
          () =>
            resignPlayer({
              roomId: currentPlayer.room_id,
              targetPlayerId: targetPlayer.id,
              executedByPlayerId: currentPlayer.id,
            }),
          'Jogador removido e títulos liberados.',
        ),
    });
  };
  const handleReleaseBail = (targetPlayer: FirebaseRecord<Player>) => {
    if (!currentPlayer) {
      return;
    }

    modal.confirm({
      title: 'Liberar fiança?',
      content: `Liberar pagamento de fiança para ${targetPlayer.name}?`,
      okText: 'Liberar',
      cancelText: 'Cancelar',
      onOk: () =>
        executeAction(
          () =>
            releasePlayerBail({
              roomId: currentPlayer.room_id,
              targetPlayerId: targetPlayer.id,
              executedByPlayerId: currentPlayer.id,
            }),
          'Fiança liberada.',
        ),
    });
  };

  const handlePayJailBail = () =>
    executeAction(
      () =>
        payJailBail({
          roomId: currentPlayer?.room_id ?? '',
          playerId,
        }),
      'Fiança paga. Você está livre.',
    );

  const handleCreateBankLoan = () => {
    if (currentPlayerDebtTotal > 0) {
      message.error('Quite suas dívidas ativas antes de pedir empréstimo.');
      return;
    }

    modal.confirm({
      title: 'Confirmar empréstimo bancário?',
      content: `O banco vai liberar ${formatCurrency(
        bankLoanAmount,
      )} e criar uma dívida ativa de ${formatCurrency(
        bankLoanDebtAmount,
      )}, incluindo ${BANK_LOAN_INTEREST_RATE}% de juros.`,
      okText: 'Confirmar',
      cancelText: 'Cancelar',
      onOk: () =>
        executeAction(
          () =>
            createBankLoan({
              roomId: currentPlayer?.room_id ?? '',
              playerId,
            }),
          'Empréstimo bancário registrado.',
        ),
    });
  };

  const handleCreatePlayerLoanRequest = (values: PlayerLoanFormValues) =>
    executeAction(
      () =>
        createPlayerLoanRequest({
          roomId: currentPlayer?.room_id ?? '',
          borrowerPlayerId: playerId,
          creditorPlayerId: values.creditorPlayerId ?? '',
          requestedAmount: values.requestedAmount ?? 0,
          repaymentAmount: values.repaymentAmount ?? 0,
        }),
      'Solicitação de empréstimo enviada.',
    );

  const handleRequestTitlePurchase = (values: TitlePurchaseFormValues) => {
    const title = getTitleDefinition(values.titleId ?? null);

    if (!title) {
      message.error('Escolha um título.');
      return;
    }

    if ((currentPlayer?.balance ?? 0) < title.purchase_price) {
      message.error('Saldo insuficiente.');
      return;
    }

    if (isDebtPurchaseBlocked) {
      message.error('Quite seus débitos antes de comprar títulos.');
      return;
    }

    void executeAction(
      () =>
        requestTitlePurchase({
          roomId: currentPlayer?.room_id ?? '',
          playerId,
          titleId: values.titleId ?? '',
        }),
      'Confirmação de compra criada.',
    );
  };

  const handleUpgradeTitle = (
    purchasedTitleId: string,
    upgrade: 'HOUSE' | 'HOTEL',
  ) => {
    const purchasedTitle = currentPlayerTitles.find(
      (title) => title.id === purchasedTitleId,
    );
    const definition = getTitleDefinition(purchasedTitle?.title_id ?? null);
    const amount =
      definition?.kind === 'LAND'
        ? upgrade === 'HOUSE'
          ? definition.acquisition.house_price
          : definition.acquisition.hotel_price
        : 0;

    if ((currentPlayer?.balance ?? 0) < amount) {
      message.error('Saldo insuficiente.');
      return;
    }

    if (isDebtPurchaseBlocked) {
      message.error('Quite seus débitos antes de comprar casas ou hotéis.');
      return;
    }

    modal.confirm({
      title: upgrade === 'HOUSE' ? 'Comprar casa?' : 'Comprar hotel?',
      content: `Você vai pagar ${formatCurrency(amount)} do seu saldo.`,
      okText: 'Confirmar',
      cancelText: 'Cancelar',
      onOk: () =>
        executeAction(
          () =>
            upgradePurchasedTitle({
              roomId: currentPlayer?.room_id ?? '',
              playerId,
              purchasedTitleId,
              upgrade,
            }),
          upgrade === 'HOUSE' ? 'Casa comprada.' : 'Hotel comprado.',
        ),
    });
  };

  const handlePayDebt = async () => {
    if (!debtPaymentModal) {
      return;
    }

    const values = await debtPaymentForm.validateFields();

    void executeAction(
      () =>
        payDebt({
          roomId: currentPlayer?.room_id ?? '',
          debtId: debtPaymentModal.id,
          executedByPlayerId: playerId,
          amount: values.amount ?? 0,
        }),
      roundMoney(values.amount ?? 0) ===
        roundMoney(debtPaymentModal.remaining_amount)
        ? 'Dívida paga.'
        : 'Pagamento parcial registrado.',
    );
  };

  const handleCreateCharge = async () => {
    if (!titleActionModal) {
      return;
    }

    const values = await chargeForm.validateFields();

    if (titleActionModal.kind === 'RENT') {
      await executeAction(
        () =>
          createRentChargeRequest({
            roomId: currentPlayer?.room_id ?? '',
            ownerPlayerId: playerId,
            payerPlayerId: values.payerPlayerId ?? '',
            purchasedTitleId: titleActionModal.purchasedTitle.id,
          }),
        'Cobrança de aluguel enviada.',
      );
      return;
    }

    await executeAction(
      () =>
        createStockChargeRequest({
          roomId: currentPlayer?.room_id ?? '',
          ownerPlayerId: playerId,
          payerPlayerId: values.payerPlayerId ?? '',
          purchasedTitleId: titleActionModal.purchasedTitle.id,
          diceCount: values.diceCount ?? 0,
        }),
      'Cobrança de ação enviada.',
    );
  };

  const handleCreateTitleSale = async () => {
    if (!titleActionModal) {
      return;
    }

    const values = await saleForm.validateFields();

    if (values.mode === 'BANK') {
      await executeAction(
        () =>
          sellTitleToBank({
            roomId: currentPlayer?.room_id ?? '',
            sellerPlayerId: playerId,
            purchasedTitleId: titleActionModal.purchasedTitle.id,
          }),
        'Título vendido ao banco.',
      );
      return;
    }

    await executeAction(
      () =>
        createTitleSaleRequest({
          roomId: currentPlayer?.room_id ?? '',
          sellerPlayerId: playerId,
          buyerPlayerId: values.buyerPlayerId ?? '',
          purchasedTitleId: titleActionModal.purchasedTitle.id,
          amount: values.amount ?? 0,
        }),
      'Proposta de venda enviada.',
    );
  };

  const handleAcceptPendingRequest = () => {
    if (!activePendingRequest) {
      return;
    }

    void executeAction(
      () =>
        acceptPendingRequest({
          requestId: activePendingRequest.id,
          executedByPlayerId: playerId,
        }),
      'Solicitação confirmada.',
    );
  };

  const handleDeclinePendingRequest = () => {
    if (!activePendingRequest) {
      return;
    }

    void executeAction(
      () =>
        declinePendingRequest({
          requestId: activePendingRequest.id,
          executedByPlayerId: playerId,
        }),
      'Solicitação recusada.',
    );
  };

  const handleOpenCancelChargeModal = () => {
    cancelChargeForm.resetFields();
    setIsCancelChargeModalOpen(true);
  };

  const handleCancelPendingCharge = async () => {
    if (!activePendingRequest) {
      return;
    }

    const values = await cancelChargeForm.validateFields();

    if (!MASTER_DELETE_PASSWORD) {
      message.error('Senha mestra não configurada.');
      return;
    }

    if (values.masterPassword !== MASTER_DELETE_PASSWORD) {
      message.error('Senha mestra inválida.');
      return;
    }

    await executeAction(
      () =>
        cancelPendingChargeRequest({
          requestId: activePendingRequest.id,
          executedByPlayerId: playerId,
        }),
      'Cobrança cancelada.',
    );
    setIsCancelChargeModalOpen(false);
    cancelChargeForm.resetFields();
  };

  const handleDeleteRoom = () => {
    if (!state || !currentPlayer) {
      return;
    }

    modal.confirm({
      title: 'Excluir sala?',
      content:
        'Esta ação remove a sala, jogadores, histórico, títulos e dívidas.',
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteRoom(state.id, currentPlayer.id);
          message.success('Sala excluida.');
          navigate('/');
        } catch (error) {
          message.error(
            error instanceof GameError
              ? error.message
              : 'Não foi possível excluir a sala.',
          );
        }
      },
    });
  };

  const rankingItems = rankedPlayers.map((player) => ({
    title: (
      <Flex justify="space-between">
        <Typography.Text strong>{player.name.toUpperCase()}</Typography.Text>
        <Typography.Text
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <LuWallet aria-label="Total" /> {formatCurrency(player.rankingValue)}
        </Typography.Text>
      </Flex>
    ),
    content: <Space wrap></Space>,
  }));
  const navigationItems: GameNavigationItem[] = [
    { key: 'player', label: 'Principal', icon: <LuWallet /> },
    { key: 'loans', label: 'Empréstimos', icon: <LuLandmark /> },
    { key: 'titles', label: 'Títulos', icon: <LuScrollText /> },
    { key: 'ranking', label: 'Ranking', icon: <LuTrophy /> },
    { key: 'history', label: 'Histórico', icon: <LuHistory /> },
    ...(currentPlayer?.is_banker
      ? [
          {
            key: 'banker' as const,
            label: 'Banco',
            icon: <LuMedal />,
          },
        ]
      : []),
  ];
  const isNavigatorTab = navigationItems.some(
    (item) => item.key === activeTabKey,
  );
  const activeNavigationLabel =
    activeTabKey === 'calculator'
      ? 'Calculadora'
      : (navigationItems.find((item) => item.key === activeTabKey)?.label ??
        'Principal');

  const renderDebtParty = (name: string, reason?: string | null) => (
    <Flex vertical gap={2}>
      <Typography.Text>{name}</Typography.Text>
      <Typography.Text
        type="secondary"
        style={{
          display: 'block',
          fontSize: 10,
          lineHeight: 1.35,
          whiteSpace: 'normal',
        }}
      >
        {reason || 'Sem motivo'}
      </Typography.Text>
    </Flex>
  );

  const debtColumns: ColumnsType<FirebaseRecord<Debt>> = [
    {
      title: 'Devedor',
      dataIndex: 'from_player_id',
      render: (fromPlayerId: string) =>
        getPlayerName(state?.players ?? [], fromPlayerId),
    },
    {
      title: 'Credor',
      dataIndex: 'to_player_id',
      render: (toPlayerId: string | null, debt) =>
        renderDebtParty(
          getPlayerName(state?.players ?? [], toPlayerId),
          debt.reason,
        ),
    },
    {
      title: 'Original',
      dataIndex: 'original_amount',
      align: 'right',
      responsive: ['md'],
      render: (originalAmount: number) => formatCurrency(originalAmount),
    },
    {
      title: 'Pendente',
      dataIndex: 'remaining_amount',
      align: 'right',
      render: (remainingAmount: number) => (
        <Typography.Text type="danger" strong>
          {formatCurrency(remainingAmount)}
        </Typography.Text>
      ),
    },
    {
      title: 'Atualização',
      dataIndex: 'updated_at',
      responsive: ['lg'],
      render: (updatedAt: string) => formatDateTime(updatedAt),
    },
  ];
  const personalDebtColumns: ColumnsType<FirebaseRecord<Debt>> = [
    ...debtColumns.filter(
      (column) =>
        !('dataIndex' in column) || column.dataIndex !== 'from_player_id',
    ),
    {
      title: '',
      key: 'payDebt',
      align: 'right',
      render: (_, debt) => (
        <Button size="small" onClick={() => setDebtPaymentModal(debt)}>
          Pagar
        </Button>
      ),
    },
  ];
  const personalReceivableColumns: ColumnsType<FirebaseRecord<Debt>> =
    debtColumns
      .filter(
        (column) =>
          !('dataIndex' in column) || column.dataIndex !== 'to_player_id',
      )
      .map((column) =>
        'dataIndex' in column && column.dataIndex === 'remaining_amount'
          ? {
              ...column,
              render: (remainingAmount: number) => (
                <Typography.Text type="success" strong>
                  {formatCurrency(remainingAmount)}
                </Typography.Text>
              ),
            }
          : 'dataIndex' in column && column.dataIndex === 'from_player_id'
            ? {
                ...column,
                render: (fromPlayerId: string, debt: FirebaseRecord<Debt>) =>
                  renderDebtParty(
                    getPlayerName(state?.players ?? [], fromPlayerId),
                    debt.reason,
                  ),
              }
          : column,
      );
  const bankerDebtColumns: ColumnsType<FirebaseRecord<Debt>> = [
    {
      title: 'Devedor / Credor',
      key: 'debtRelation',
      render: (_, debt) =>
        renderDebtParty(
          `${getPlayerName(
            state?.players ?? [],
            debt.from_player_id,
          )} → ${getPlayerName(state?.players ?? [], debt.to_player_id)}`,
          debt.reason,
        ),
    },
    {
      title: 'Original',
      dataIndex: 'original_amount',
      align: 'right',
      responsive: ['md'],
      render: (originalAmount: number) => formatCurrency(originalAmount),
    },
    {
      title: 'Pendente',
      dataIndex: 'remaining_amount',
      align: 'right',
      render: (remainingAmount: number) => (
        <Typography.Text type="danger" strong>
          {formatCurrency(remainingAmount)}
        </Typography.Text>
      ),
    },
    {
      title: 'Atualização',
      dataIndex: 'updated_at',
      responsive: ['lg'],
      render: (updatedAt: string) => formatDateTime(updatedAt),
    },
  ];
  const jailColumns: ColumnsType<FirebaseRecord<Player>> = [
    {
      title: 'Ações',
      key: 'player',
      render: (_, player) => (
        <Space>
          <Typography.Text>{player.name}</Typography.Text>
          {player.is_jailed ? <Tag color="red">Preso</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Prisão',
      key: 'jail',
      align: 'right',
      render: (_, player) => (
        <Space>
          <Button
            aria-label={player.is_jailed ? 'Soltar jogador' : 'Prender jogador'}
            icon={player.is_jailed ? <LuLock /> : <LuLockOpen />}
            danger={player.is_jailed}
            type={player.is_jailed ? 'primary' : 'default'}
            style={player.is_jailed ? undefined : { color: '#389e0d' }}
            onClick={() => handleSetPlayerJailStatus(player, !player.is_jailed)}
          />
          {player.is_jailed && !player.is_bail_available ? (
            <Button
              aria-label="Liberar fiança"
              icon={<LuCircleDollarSign />}
              danger
              onClick={() => handleReleaseBail(player)}
            />
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Desistir',
      key: 'resign',
      align: 'right',
      render: (_, player) => (
        <Button
          aria-label="Aplicar desistência"
          danger
          disabled={player.id === currentPlayer?.id}
          icon={<LuSkull />}
          onClick={() => handleResignPlayer(player)}
        />
      ),
    },
  ];

  const personalTransactions = (state?.transactions ?? []).filter(
    (transaction) =>
      transaction.from_player_id === playerId ||
      transaction.to_player_id === playerId,
  );

  const getPendingRequestTitle = () => {
    if (!activePendingRequest) {
      return '';
    }

    if (activePendingRequest.kind === 'PLAYER_LOAN') {
      return 'Solicitação de empréstimo';
    }

    if (activePendingRequest.kind === 'TITLE_PURCHASE') {
      return 'Confirmar compra de título';
    }

    if (activePendingRequest.kind === 'TITLE_SALE') {
      return 'Proposta de venda de título';
    }

    if (activePendingRequest.kind === 'RENT_CHARGE') {
      return 'Confirmar aluguel';
    }

    return 'Confirmar cobrança de ação';
  };

  const renderPendingRequestDescription = () => {
    if (!activePendingRequest) {
      return null;
    }

    if (activePendingRequest.kind === 'PLAYER_LOAN') {
      return (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Solicitante">
            {getPlayerName(
              state?.players ?? [],
              activePendingRequest.requester_player_id,
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Valor solicitado">
            {formatCurrency(
              activePendingRequest.requested_amount ??
                activePendingRequest.amount,
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Valor a receber">
            {formatCurrency(
              activePendingRequest.repayment_amount ??
                activePendingRequest.amount,
            )}
          </Descriptions.Item>
        </Descriptions>
      );
    }

    return (
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Origem">
          {getPlayerName(
            state?.players ?? [],
            activePendingRequest.requester_player_id,
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Título">
          {activePendingRequestTitle?.name ?? 'Título'}
        </Descriptions.Item>
        {activePendingRequest.dice_count ? (
          <Descriptions.Item label="Dados">
            {activePendingRequest.dice_count}
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="Valor">
          {formatCurrency(activePendingRequest.amount)}
        </Descriptions.Item>
      </Descriptions>
    );
  };

  const renderPurchasedTitleCard = (title: FirebaseRecord<PurchasedTitle>) => {
    const definition = getTitleDefinition(title.title_id);

    if (!definition) {
      return null;
    }

    const titleCardHeaderColor =
      definition.kind === 'STOCK' ? '#30343b' : definition.color;
    const titleCardStyles = {
      header: {
        background: titleCardHeaderColor,
      },
    };
    const cardTitle = (
      <Flex justify="space-between" gap={12} align="center">
        <Space>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: '#fff',
              display: 'inline-block',
            }}
          />
          <Typography.Text strong style={{ color: '#fff' }}>
            {definition.name}
          </Typography.Text>
        </Space>
        <Tag>{definition.kind === 'LAND' ? 'Terreno' : 'Ação'}</Tag>
      </Flex>
    );

    if (definition.kind === 'STOCK') {
      return (
        <Col xs={24} lg={12} key={title.id}>
          <Card title={cardTitle} styles={titleCardStyles}>
            <Flex vertical gap={12}>
              <img
                alt={definition.name}
                src={definition.image_url}
                style={{
                  width: '100%',
                  height: 160,
                  objectFit: 'cover',
                  borderRadius: 8,
                }}
              />
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Valor de compra">
                  {formatCurrency(definition.purchase_price)}
                </Descriptions.Item>
                <Descriptions.Item label="Multiplicador">
                  {formatCurrency(definition.multiplier)} por dado
                </Descriptions.Item>
              </Descriptions>
              <Flex gap={8} wrap="wrap" justify="end">
                <Button
                  icon={<LuDices />}
                  type="primary"
                  onClick={() => {
                    chargeForm.resetFields();
                    setSelectedDiceCount(undefined);
                    setTitleActionModal({
                      kind: 'STOCK',
                      purchasedTitle: title,
                    });
                  }}
                  style={{ flex: 1 }}
                >
                  Cobrar ação
                </Button>
                <Button
                  onClick={() => {
                    saleForm.resetFields();
                    saleForm.setFieldValue('mode', 'PLAYER');
                    setTitleActionModal({
                      kind: 'SALE',
                      purchasedTitle: title,
                    });
                  }}
                  style={{ flex: 1 }}
                >
                  Vender
                </Button>
              </Flex>
            </Flex>
          </Card>
        </Col>
      );
    }

    return (
      <Col xs={24} lg={12} key={title.id}>
        <Card title={cardTitle} styles={titleCardStyles}>
          <Flex vertical gap={12}>
            <Space wrap>
              {title.has_hotel ? (
                <LuHotel size={30} aria-label="Hotel comprado" />
              ) : (
                Array.from({ length: title.houses }, (_, index) => (
                  <LuHouse
                    key={index}
                    size={30}
                    aria-label={`Casa ${index + 1} comprada`}
                  />
                ))
              )}
              {!title.has_hotel && title.houses === 0 ? (
                <Tag>Sem melhorias</Tag>
              ) : null}
            </Space>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Valor de compra">
                {formatCurrency(definition.purchase_price)}
              </Descriptions.Item>
              <Descriptions.Item label="Comprar casa">
                {formatCurrency(definition.acquisition.house_price)}
              </Descriptions.Item>
              <Descriptions.Item label="Comprar hotel">
                {formatCurrency(definition.acquisition.hotel_price)}
              </Descriptions.Item>
            </Descriptions>
            <Divider style={{ margin: '4px 0' }} />
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Aluguel">
                {formatCurrency(definition.receivables.rent)}
              </Descriptions.Item>
              <Descriptions.Item label="1 casa">
                {formatCurrency(definition.receivables.one_house)}
              </Descriptions.Item>
              <Descriptions.Item label="2 casas">
                {formatCurrency(definition.receivables.two_houses)}
              </Descriptions.Item>
              <Descriptions.Item label="3 casas">
                {formatCurrency(definition.receivables.three_houses)}
              </Descriptions.Item>
              <Descriptions.Item label="4 casas">
                {formatCurrency(definition.receivables.four_houses)}
              </Descriptions.Item>
              <Descriptions.Item label="Hotel">
                {formatCurrency(definition.receivables.hotel)}
              </Descriptions.Item>
            </Descriptions>
            <Flex gap={8} wrap="wrap" justify="end">
              <Button
                icon={<LuHouse />}
                disabled={
                  isCurrentPlayerJailed ||
                  isDebtPurchaseBlocked ||
                  title.has_hotel ||
                  title.houses >= 4 ||
                  (currentPlayer?.balance ?? 0) <
                    definition.acquisition.house_price
                }
                loading={isSubmitting}
                onClick={() => void handleUpgradeTitle(title.id, 'HOUSE')}
                style={{ flex: 1 }}
              >
                Comprar
              </Button>
              <Button
                icon={<LuHotel />}
                disabled={
                  isCurrentPlayerJailed ||
                  isDebtPurchaseBlocked ||
                  title.has_hotel ||
                  title.houses !== 4 ||
                  (currentPlayer?.balance ?? 0) <
                    definition.acquisition.hotel_price
                }
                loading={isSubmitting}
                onClick={() => void handleUpgradeTitle(title.id, 'HOTEL')}
                style={{ flex: 1 }}
              >
                Comprar
              </Button>
              <Button
                onClick={() => {
                  chargeForm.resetFields();
                  setSelectedDiceCount(undefined);
                  setTitleActionModal({ kind: 'RENT', purchasedTitle: title });
                }}
                style={{ flex: 1 }}
                type="primary"
              >
                Cobrar aluguel
              </Button>
              <Button
                onClick={() => {
                  saleForm.resetFields();
                  saleForm.setFieldValue('mode', 'PLAYER');
                  setTitleActionModal({ kind: 'SALE', purchasedTitle: title });
                }}
                style={{ flex: 1 }}
              >
                Vender
              </Button>
            </Flex>
          </Flex>
        </Card>
      </Col>
    );
  };

  return (
    <AppLayout
      headerLeftAction={
        isNavigatorTab ? (
          <Button
            aria-label="Sair"
            icon={<LuLogOut />}
            onClick={() => navigate('/')}
          />
        ) : (
          <Button
            aria-label="Voltar ao principal"
            icon={<LuArrowLeft />}
            onClick={() => setActiveTabKey('player')}
          />
        )
      }
      headerTitle={activeNavigationLabel}
      headerRightAction={
        isNavigatorTab ? (
          <Button
            aria-label="Abrir calculadora"
            icon={<LuCalculator />}
            onClick={() => setActiveTabKey('calculator')}
          />
        ) : null
      }
    >
      <Flex vertical gap={24} style={{ paddingBottom: 104 }}>
        <Tabs
          activeKey={activeTabKey}
          renderTabBar={() => <></>}
          items={[
            {
              key: 'player',
              label: 'Principal',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={16}>
                    <PlayerFinancialSummary
                      player={currentPlayer}
                      assetValue={currentPlayerAssetValue}
                      debtTotal={currentPlayerDebtTotal}
                      debtStage={currentDebtStage}
                      isLoading={isLoading}
                    />
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title="Pagar Banco">
                      <Form
                        form={bankPaymentForm}
                        layout="vertical"
                        requiredMark={false}
                        onFinish={handlePayBank}
                      >
                        <Form.Item
                          name="reason"
                          label="Motivo"
                          rules={[
                            { required: true, message: 'Escolha o motivo.' },
                          ]}
                        >
                          <Select
                            allowClear
                            options={BANK_PAYMENT_REASON_OPTIONS}
                            placeholder="Selecione o motivo"
                          />
                        </Form.Item>
                        <Form.Item
                          name="amount"
                          label="Valor"
                          rules={[
                            { required: true, message: 'Informe o valor.' },
                          ]}
                        >
                          <InputNumber
                            disabled={isBankPaymentAmountLocked}
                            min={0.01}
                            precision={2}
                            style={{ width: '100%' }}
                            prefix="R$"
                          />
                        </Form.Item>
                        <QuickAmountButtons
                          form={bankPaymentForm}
                          disabled={isBankPaymentAmountLocked}
                        />
                        <Flex gap={8} justify="end">
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={isSubmitting}
                            style={{ flex: 1 }}
                          >
                            Confirmar pagamento
                          </Button>
                        </Flex>
                      </Form>
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title="Dívidas ativas">
                      <Table
                        rowKey="id"
                        columns={personalDebtColumns}
                        dataSource={currentPlayerDebts}
                        pagination={false}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title="Valores à receber">
                      <Table
                        rowKey="id"
                        columns={personalReceivableColumns}
                        dataSource={currentPlayerReceivables}
                        pagination={false}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'loans',
              label: 'Empréstimos',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={16}>
                    <PlayerFinancialSummary
                      player={currentPlayer}
                      assetValue={currentPlayerAssetValue}
                      debtTotal={currentPlayerDebtTotal}
                      debtStage={currentDebtStage}
                      isLoading={isLoading}
                    />
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card title="Empréstimo do banco">
                      <Flex vertical gap={12}>
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="Patrimônio + Saldo">
                            {formatCurrency(currentPlayerNetWorth)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Valor disponível">
                            {formatCurrency(bankLoanAmount)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Juros">
                            {BANK_LOAN_INTEREST_RATE}%
                          </Descriptions.Item>
                          <Descriptions.Item label="Total da dívida">
                            {formatCurrency(bankLoanDebtAmount)}
                          </Descriptions.Item>
                        </Descriptions>
                        {currentPlayerDebtTotal > 0 ? (
                          <Alert
                            type="warning"
                            showIcon
                            title="Quite suas dívidas ativas antes de pedir empréstimo."
                          />
                        ) : null}
                        <Button
                          type="primary"
                          disabled={currentPlayerDebtTotal > 0}
                          loading={isSubmitting}
                          onClick={() => void handleCreateBankLoan()}
                        >
                          Solicitar empréstimo
                        </Button>
                      </Flex>
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card title="Empréstimo com jogadores">
                      <Form
                        form={playerLoanForm}
                        layout="vertical"
                        requiredMark={false}
                        onFinish={handleCreatePlayerLoanRequest}
                      >
                        <Form.Item
                          name="creditorPlayerId"
                          label="Jogador credor"
                          rules={[
                            { required: true, message: 'Escolha o credor.' },
                          ]}
                        >
                          <Select
                            options={playerOptions}
                            placeholder="Selecione um jogador"
                          />
                        </Form.Item>
                        <Form.Item
                          name="requestedAmount"
                          label="Valor solicitado"
                          rules={[
                            { required: true, message: 'Informe o valor.' },
                          ]}
                        >
                          <InputNumber
                            min={1}
                            precision={2}
                            style={{ width: '100%' }}
                            prefix="R$"
                          />
                        </Form.Item>
                        <Row gutter={12}>
                          <Col xs={12}>
                            <Form.Item
                              name="interestRate"
                              label="Taxa de juros"
                              rules={[
                                {
                                  required: true,
                                  message: 'Informe a taxa de juros.',
                                },
                              ]}
                            >
                              <InputNumber
                                min={0}
                                precision={2}
                                style={{ width: '100%' }}
                                suffix="%"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={12}>
                            <Form.Item
                              name="repaymentAmount"
                              label="Total a pagar"
                              rules={[
                                {
                                  required: true,
                                  message: 'Informe o valor a pagar.',
                                },
                              ]}
                            >
                              <InputNumber
                                disabled
                                min={1}
                                precision={2}
                                style={{ width: '100%' }}
                                prefix="R$"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Flex>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={isSubmitting}
                            style={{ flex: 1 }}
                          >
                            Pedir empréstimo
                          </Button>
                        </Flex>
                      </Form>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'titles',
              label: 'Títulos',
              children: (
                <Flex vertical gap={16}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={16}>
                      <PlayerFinancialSummary
                        player={currentPlayer}
                        assetValue={currentPlayerAssetValue}
                        debtTotal={currentPlayerDebtTotal}
                        debtStage={currentDebtStage}
                        isLoading={isLoading}
                      />
                    </Col>
                  </Row>
                  {currentDebtStage > 0 ? (
                    <Alert
                      type={currentDebtStage === 3 ? 'error' : 'warning'}
                      showIcon
                      title={getDebtStageLabel(currentDebtStage)}
                      description={
                        currentDebtStage === 1
                          ? 'Quite seus débitos antes de comprar títulos, casas ou hotéis.'
                          : currentDebtStage === 2
                            ? 'Sua dívida atingiu nível de risco de falência. Venda propriedades ou quite débitos.'
                            : 'Você está em recuperação judicial. Venda propriedades para reduzir suas dívidas.'
                      }
                    />
                  ) : null}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card title="Aquisição de títulos">
                        <Form
                          form={titlePurchaseForm}
                          layout="vertical"
                          requiredMark={false}
                          onFinish={handleRequestTitlePurchase}
                        >
                          <Form.Item
                            name="titleId"
                            label="Título"
                            rules={[
                              {
                                required: true,
                                message: 'Escolha o título.',
                              },
                            ]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="searchText"
                              options={availableTitleOptions}
                              placeholder="Buscar por nome do título"
                              onChange={(value) => setSelectedTitleId(value)}
                              filterOption={(input, option) =>
                                String(option?.searchText ?? '').includes(
                                  normalizeSearchText(input),
                                )
                              }
                            />
                          </Form.Item>
                          {selectedTitle ? (
                            <Alert
                              type={
                                isDebtPurchaseBlocked ||
                                isCurrentPlayerJailed ||
                                (currentPlayer?.balance ?? 0) <
                                  selectedTitle.purchase_price
                                  ? 'error'
                                  : 'info'
                              }
                              showIcon
                              title={`${selectedTitle.name} - ${formatCurrency(
                                selectedTitle.purchase_price,
                              )}`}
                              description={
                                isCurrentPlayerJailed
                                  ? 'Você está preso e não pode comprar títulos.'
                                  : isDebtPurchaseBlocked
                                    ? 'Quite seus débitos antes de comprar títulos.'
                                    : (currentPlayer?.balance ?? 0) >=
                                        selectedTitle.purchase_price
                                      ? 'Depois de pedir, confirme a compra para ganhar o título.'
                                      : 'Saldo insuficiente.'
                              }
                              style={{ marginBottom: 16 }}
                            />
                          ) : null}
                          <Flex justify="end">
                            <Button
                              type="primary"
                              htmlType="submit"
                              disabled={
                                isCurrentPlayerJailed || isDebtPurchaseBlocked
                              }
                              loading={isSubmitting}
                              style={{ flex: 1 }}
                            >
                              Comprar título
                            </Button>
                          </Flex>
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                  <Card title="Títulos comprados">
                    {currentPlayerTitles.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {currentPlayerTitles.map(renderPurchasedTitleCard)}
                      </Row>
                    ) : (
                      <Empty description="Nenhum título comprado" />
                    )}
                  </Card>
                </Flex>
              ),
            },
            {
              key: 'ranking',
              label: 'Ranking',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <Card title="Ranking">
                      {rankingItems.length > 0 ? (
                        <Steps
                          orientation="vertical"
                          current={0}
                          size="small"
                          items={rankingItems}
                        />
                      ) : (
                        <Empty description="Sem jogadores" />
                      )}
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'calculator',
              label: 'Calculadora',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={10}>
                    <Calculator />
                  </Col>
                  <Col xs={24} lg={10}>
                    <InterestCalculator />
                  </Col>
                </Row>
              ),
            },
            ...(currentPlayer?.is_banker
              ? [
                  {
                    key: 'banker',
                    label: 'Banqueiro',
                    children: (
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={10}>
                          <Card title="Ações do banco">
                            <Form
                              form={adminForm}
                              layout="vertical"
                              requiredMark={false}
                            >
                              <Form.Item
                                name="playerId"
                                label="Jogador"
                                rules={[
                                  {
                                    required: true,
                                    message: 'Escolha o jogador.',
                                  },
                                ]}
                              >
                                <Select
                                  options={adminPlayerOptions}
                                  placeholder="Selecione um jogador"
                                />
                              </Form.Item>
                              <Form.Item
                                name="reason"
                                label="Motivo"
                                rules={[
                                  {
                                    required: true,
                                    message: 'Escolha o motivo.',
                                  },
                                ]}
                              >
                                <Select
                                  allowClear
                                  options={BANK_ACTION_REASON_OPTIONS}
                                  placeholder="Selecione o motivo"
                                />
                              </Form.Item>
                              <Form.Item
                                name="amount"
                                label="Valor"
                                rules={[
                                  {
                                    required: true,
                                    message: 'Informe o valor.',
                                  },
                                ]}
                              >
                                <InputNumber
                                  disabled={isAdminAmountLocked}
                                  min={0.01}
                                  precision={2}
                                  style={{ width: '100%' }}
                                  prefix="R$"
                                />
                              </Form.Item>
                              <QuickAmountButtons
                                form={adminForm}
                                disabled={isAdminAmountLocked}
                              />
                              <Flex gap={8} justify="end">
                                <Button
                                  type="primary"
                                  loading={isSubmitting}
                                  onClick={() =>
                                    void handleBankAction('BANK_TO_PLAYER')
                                  }
                                  style={{ flex: 1 }}
                                >
                                  Adicionar
                                </Button>
                                <Button
                                  danger
                                  loading={isSubmitting}
                                  onClick={() =>
                                    void handleBankAction('BANK_CHARGE_PLAYER')
                                  }
                                  style={{ flex: 1 }}
                                >
                                  Retirar
                                </Button>
                              </Flex>
                            </Form>
                          </Card>
                        </Col>

                        <Col xs={24} lg={10}>
                          <Card title="Dívidas ativas">
                            <Table
                              rowKey="id"
                              columns={bankerDebtColumns}
                              dataSource={state?.debts ?? []}
                              pagination={false}
                            />
                          </Card>
                        </Col>

                        <Col xs={24} lg={10}>
                          <Card title="Prisão">
                            <Table
                              rowKey="id"
                              columns={jailColumns}
                              dataSource={state?.players ?? []}
                              pagination={false}
                            />
                          </Card>
                        </Col>

                        <Col xs={24} lg={10}>
                          <Card title="Configurações">
                            <Flex vertical gap={8}>
                              <Typography.Text type="secondary">
                                Sala {state?.name}
                              </Typography.Text>
                              <Button danger onClick={handleDeleteRoom}>
                                Excluir sala
                              </Button>
                            </Flex>
                          </Card>
                        </Col>
                      </Row>
                    ),
                  },
                ]
              : []),
            {
              key: 'history',
              label: 'Histórico',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <Card title="Histórico Individual">
                      <TransactionHistoryList
                        transactions={personalTransactions}
                        players={state?.players ?? []}
                        perspectivePlayerId={playerId}
                      />
                    </Card>
                  </Col>
                  {currentPlayer?.is_banker ? (
                    <Col xs={24} lg={10}>
                      <Card title="Histórico Geral">
                        <TransactionHistoryList
                          transactions={state?.transactions ?? []}
                          players={state?.players ?? []}
                        />
                      </Card>
                    </Col>
                  ) : null}
                </Row>
              ),
            },
          ]}
        />
      </Flex>

      <nav
        aria-label="Navegação principal"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          display: 'grid',
          gridTemplateColumns: `repeat(${navigationItems.length}, minmax(0, 1fr))`,
          gap: 1,
          minHeight: 56,
          padding: '10px 14px',
          // borderRadius: 18,
          background: 'rgba(255, 255, 255, 0.96)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.14)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        {navigationItems.map((item) => {
          const isSelected = activeTabKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              aria-current={isSelected ? 'page' : undefined}
              onClick={() => setActiveTabKey(item.key)}
              style={{
                display: 'flex',
                minWidth: 0,
                minHeight: 52,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                border: 0,
                borderRadius: 8,
                background: isSelected ? 'rgba(216, 24, 96, 0.1)' : 'none',
                color: isSelected ? '#d81860' : 'rgba(0, 0, 0, 0.62)',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', fontSize: 22 }}>{item.icon}</span>
              <span
                style={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 8,
                  lineHeight: 1.1,
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                {item.label}
              </span>
              {/* <span
                aria-hidden
                style={{
                  width: 20,
                  height: 3,
                  borderRadius: 999,
                  background: isSelected ? '#d81860' : 'transparent',
                }}
              /> */}
            </button>
          );
        })}
      </nav>

      {shouldShowJailBackdrop && currentPlayer ? (
        <Flex
          vertical
          align="center"
          justify="center"
          gap={16}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 900,
            padding: 24,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(6px)',
            textAlign: 'center',
          }}
        >
          <GiHandcuffs size={72} color="#fff" aria-hidden />
          <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>
            Você está preso
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
            Aguarde o banqueiro liberar sua fiança ou soltar você.
          </Typography.Text>
          {currentPlayer.is_bail_available ? (
            <>
              {(currentPlayer.balance ?? 0) < JAIL_BAIL_AMOUNT ? (
                <Alert
                  type="error"
                  showIcon
                  message="Saldo insuficiente para pagar a fiança."
                />
              ) : null}
              <Button
                size="large"
                type="primary"
                icon={<LuCircleDollarSign />}
                loading={isSubmitting}
                disabled={(currentPlayer.balance ?? 0) < JAIL_BAIL_AMOUNT}
                onClick={handlePayJailBail}
              >
                Pagar fiança de {formatCurrency(JAIL_BAIL_AMOUNT)}
              </Button>
            </>
          ) : null}
        </Flex>
      ) : null}

      {shouldShowJudicialRecoveryBackdrop && currentPlayer ? (
        <Flex
          vertical
          align="center"
          justify="center"
          gap={16}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 900,
            padding: 24,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(6px)',
            textAlign: 'center',
          }}
        >
          <LuSkull size={72} color="#fff" aria-hidden />
          <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>
            Recuperação judicial
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
            Sua dívida chegou ao valor do patrimônio em títulos. Venda
            propriedades para reduzir os débitos.
          </Typography.Text>
          <Button
            size="large"
            type="primary"
            icon={<LuScrollText />}
            onClick={() => setActiveTabKey('titles')}
          >
            Ir para títulos
          </Button>
        </Flex>
      ) : null}

      <Modal
        open={Boolean(activePendingRequest)}
        title={getPendingRequestTitle()}
        mask={{ closable: false }}
        keyboard={false}
        closable={false}
        footer={
          activePendingRequest?.kind === 'RENT_CHARGE' ||
          activePendingRequest?.kind === 'STOCK_CHARGE' ? (
            <Space>
              <Button
                danger
                aria-label="Cancelar cobrança"
                icon={<LuX />}
                onClick={handleOpenCancelChargeModal}
              />
              <Button
                type="primary"
                loading={isSubmitting}
                onClick={handleAcceptPendingRequest}
              >
                Aceitar e confirmar pagamento
              </Button>
            </Space>
          ) : (
            <Space>
              <Button
                danger
                loading={isSubmitting}
                onClick={handleDeclinePendingRequest}
              >
                Recusar
              </Button>
              <Button
                type="primary"
                loading={isSubmitting}
                onClick={handleAcceptPendingRequest}
              >
                Aceitar
              </Button>
            </Space>
          )
        }
      >
        {renderPendingRequestDescription()}
      </Modal>

      <Modal
        open={isCancelChargeModalOpen}
        title="Cancelar cobrança?"
        onCancel={() => setIsCancelChargeModalOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setIsCancelChargeModalOpen(false)}>
              Voltar
            </Button>
            <Button
              danger
              loading={isSubmitting}
              onClick={() => void handleCancelPendingCharge()}
            >
              Cancelar operação
            </Button>
          </Space>
        }
      >
        <Form form={cancelChargeForm} layout="vertical" requiredMark={false}>
          <Form.Item
            name="masterPassword"
            label="Senha mestra"
            rules={[{ required: true, message: 'Informe a senha mestra.' }]}
          >
            <Input.Password placeholder="Digite a senha mestra" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(debtPaymentModal)}
        title="Pagar dívida?"
        onCancel={() => setDebtPaymentModal(null)}
        footer={
          <Space>
            <Button onClick={() => setDebtPaymentModal(null)}>Cancelar</Button>
            <Button
              type="primary"
              loading={isSubmitting}
              disabled={isDebtPaymentAmountInvalid}
              onClick={() => void handlePayDebt()}
            >
              Registrar pagamento
            </Button>
          </Space>
        }
      >
        {debtPaymentModal ? (
          <Flex vertical gap={12}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Credor">
                {getPlayerName(
                  state?.players ?? [],
                  debtPaymentModal.to_player_id,
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Motivo">
                {debtPaymentModal.reason || 'Sem motivo'}
              </Descriptions.Item>
              <Descriptions.Item label="Valor total">
                {formatCurrency(debtPaymentModal.remaining_amount)}
              </Descriptions.Item>
              <Descriptions.Item label="Saldo disponível">
                {formatCurrency(currentPlayer?.balance ?? 0)}
              </Descriptions.Item>
            </Descriptions>
            <Form
              form={debtPaymentForm}
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="amount"
                label="Valor a pagar"
                rules={[
                  {
                    required: true,
                    message: 'Informe o valor do pagamento.',
                  },
                  {
                    type: 'number',
                    min: 0.01,
                    message: 'Informe um valor maior que zero.',
                  },
                  {
                    validator: (_, value?: number) => {
                      if (!value || value <= maxDebtPaymentAmount) {
                        return Promise.resolve();
                      }

                      return Promise.reject(
                        new Error(
                          'O valor não pode passar da dívida ou do seu saldo.',
                        ),
                      );
                    },
                  },
                ]}
              >
                <InputNumber
                  min={0.01}
                  max={maxDebtPaymentAmount || undefined}
                  precision={2}
                  style={{ width: '100%' }}
                  prefix="R$"
                />
              </Form.Item>
            </Form>
            {maxDebtPaymentAmount < debtPaymentModal.remaining_amount ? (
              <Alert
                type="warning"
                showIcon
                title="Você pode registrar um pagamento parcial com o saldo disponível."
              />
            ) : null}
          </Flex>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(titleActionModal)}
        title={
          titleActionModal?.kind === 'SALE'
            ? 'Vender título'
            : titleActionModal?.kind === 'STOCK'
              ? 'Cobrar ação'
              : 'Cobrar aluguel'
        }
        onCancel={() => setTitleActionModal(null)}
        footer={
          titleActionModal?.kind === 'SALE' ? (
            <Space>
              <Button onClick={() => setTitleActionModal(null)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                loading={isSubmitting}
                onClick={() => void handleCreateTitleSale()}
              >
                {saleMode === 'BANK' ? 'Vender ao banco' : 'Enviar proposta'}
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={() => setTitleActionModal(null)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                loading={isSubmitting}
                onClick={() => void handleCreateCharge()}
              >
                Enviar cobrança
              </Button>
            </Space>
          )
        }
      >
        {titleActionModal?.kind === 'SALE' ? (
          <Form
            form={saleForm}
            layout="vertical"
            requiredMark={false}
            initialValues={{ mode: 'PLAYER' }}
          >
            {selectedSaleValuation ? (
              <Flex vertical gap={12} style={{ marginBottom: 16 }}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Título">
                    {selectedSaleValuation.definition.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tipo">
                    {selectedSaleValuation.definition.kind === 'LAND'
                      ? 'Terreno'
                      : 'Ação'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Valor base">
                    {formatCurrency(selectedSaleValuation.baseValue)}
                  </Descriptions.Item>
                  {selectedSaleValuation.improvements.length > 0 ? (
                    selectedSaleValuation.improvements.map((improvement) => (
                      <Descriptions.Item
                        key={improvement.label}
                        label={improvement.label}
                      >
                        {formatCurrency(improvement.amount)}
                      </Descriptions.Item>
                    ))
                  ) : (
                    <Descriptions.Item label="Valores agregados">
                      Sem melhorias
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Valor estimado">
                    <Typography.Text strong>
                      {formatCurrency(selectedSaleValuation.totalValue)}
                    </Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Banco paga 75%">
                    <Typography.Text type="success" strong>
                      {formatCurrency(selectedSaleValuation.bankSaleValue)}
                    </Typography.Text>
                  </Descriptions.Item>
                </Descriptions>
              </Flex>
            ) : null}
            <Form.Item name="mode" label="Destino da venda">
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: 'Outro jogador', value: 'PLAYER' },
                  { label: 'Banco', value: 'BANK' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="buyerPlayerId"
              label="Comprador"
              rules={[
                {
                  validator: (_, value?: string) => {
                    if (saleMode === 'BANK' || value) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error('Escolha o comprador.'),
                    );
                  },
                },
              ]}
            >
              <Select
                disabled={saleMode === 'BANK'}
                options={playerOptions}
                placeholder="Selecione um jogador"
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label={saleMode === 'BANK' ? 'Valor pago pelo banco' : 'Valor da proposta'}
              rules={[{ required: true, message: 'Informe o valor.' }]}
            >
              <InputNumber
                disabled={saleMode === 'BANK'}
                min={1}
                precision={2}
                style={{ width: '100%' }}
                prefix="R$"
              />
            </Form.Item>
          </Form>
        ) : (
          <Form form={chargeForm} layout="vertical" requiredMark={false}>
            <Form.Item
              name="payerPlayerId"
              label="Jogador que irá pagar"
              rules={[{ required: true, message: 'Escolha o jogador.' }]}
            >
              <Select
                options={playerOptions}
                placeholder="Selecione um jogador"
              />
            </Form.Item>
            {titleActionModal?.kind === 'STOCK' ? (
              <>
                <Form.Item
                  name="diceCount"
                  label="Número dos dados"
                  rules={[{ required: true, message: 'Escolha os dados.' }]}
                >
                  <Select
                    options={DICE_OPTIONS}
                    placeholder="Selecione de 1 a 12"
                    onChange={(value) => setSelectedDiceCount(value)}
                  />
                </Form.Item>
                <Form.Item label="Valor a cobrar">
                  <InputNumber
                    disabled
                    value={selectedStockChargeAmount}
                    style={{ width: '100%' }}
                    prefix="R$"
                  />
                </Form.Item>
              </>
            ) : titleActionModal?.purchasedTitle ? (
              <Alert
                type="info"
                showIcon
                title={`Valor do aluguel: ${formatCurrency(
                  getLandChargeAmount(titleActionModal.purchasedTitle),
                )}`}
              />
            ) : null}
          </Form>
        )}
      </Modal>
    </AppLayout>
  );
}
