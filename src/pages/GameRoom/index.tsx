import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Form,
  InputNumber,
  Modal,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  LuCopy,
  LuDices,
  LuHouse,
  LuHotel,
  LuPiggyBank,
  LuWallet,
} from 'react-icons/lu';

import {
  acceptPendingRequest,
  createBankLoan,
  createPlayerLoanRequest,
  createRentChargeRequest,
  createStockChargeRequest,
  createTitleSaleRequest,
  declinePendingRequest,
  deleteRoom,
  enterRoomByCode,
  GameError,
  moveMoney,
  requestTitlePurchase,
  subscribeRoomSnapshot,
  upgradePurchasedTitle,
} from '@/api/gameService';
import { AppLayout } from '@/components/ui';
import { getBankLoanAmountByNetWorth } from '@/constants/bankLoans';
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

type MoneyFormValues = {
  playerId?: string;
  amount?: number;
  reason?: string;
};

type PlayerLoanFormValues = {
  creditorPlayerId?: string;
  requestedAmount?: number;
  repaymentAmount?: number;
};

type TitlePurchaseFormValues = {
  titleId?: string;
};

type ChargeFormValues = {
  payerPlayerId?: string;
  diceCount?: number;
};

type SaleFormValues = {
  buyerPlayerId?: string;
  amount?: number;
};

type RoomState = {
  id: string;
  name: string;
  players: Array<FirebaseRecord<Player>>;
  transactions: Array<FirebaseRecord<Transaction>>;
  debts: Array<FirebaseRecord<Debt>>;
  purchasedTitles: Array<FirebaseRecord<PurchasedTitle>>;
  pendingRequests: Array<FirebaseRecord<PendingRequest>>;
  roomCode: string;
};

type RankingPlayer = FirebaseRecord<Player> & {
  assetValue: number;
  rankingValue: number;
};

type TitleActionModal = {
  kind: 'RENT' | 'STOCK' | 'SALE';
  purchasedTitle: FirebaseRecord<PurchasedTitle>;
} | null;

const QUICK_AMOUNTS = [20, 50, 100, 500, 1000];

const BANK_PAYMENT_REASON_OPTIONS = ['Noticia', 'Imposto', 'Fianca'].map(
  (reason) => ({
    label: reason,
    value: reason,
  }),
);

const BANK_ACTION_REASON_OPTIONS = [
  'Noticia',
  'Bonus de Rodada',
  'Restituicao do Imposto',
].map((reason) => ({
  label: reason,
  value: reason,
}));

const DICE_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = index + 1;

  return {
    label: String(value),
    value,
  };
});

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

function QuickAmountButtons({ form }: { form: FormInstance<MoneyFormValues> }) {
  const addAmount = (amount: number) => {
    const currentAmount = Number(form.getFieldValue('amount') ?? 0);
    form.setFieldValue('amount', roundMoney(currentAmount + amount));
  };

  return (
    <Flex gap={8} wrap="wrap" style={{ marginTop: -12, marginBottom: 16 }}>
      {QUICK_AMOUNTS.map((amount) => (
        <Button key={amount} size="small" onClick={() => addAmount(amount)}>
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
    return <Empty description="Sem movimentacoes" />;
  }

  return (
    <Flex
      vertical
      gap={8}
      style={{
        maxHeight: 280,
        overflowY: 'auto',
        paddingRight: 4,
      }}
    >
      {transactions.map((transaction) => {
        const signal = getTransactionSignal(transaction, perspectivePlayerId);

        return (
          <Typography.Text
            key={transaction.id}
            style={{
              display: 'block',
              fontSize: 12,
              lineHeight: 1.35,
              whiteSpace: 'normal',
            }}
          >
            <Typography.Text
              strong
              type={signal === '+' ? 'success' : 'danger'}
              style={{ fontSize: 12 }}
            >
              {signal} {formatCurrency(transaction.amount)}
            </Typography.Text>{' '}
            | {getPlayerName(players, transaction.from_player_id)} {'->'}{' '}
            {getPlayerName(players, transaction.to_player_id)} |{' '}
            {transaction.reason || 'Sem motivo'}
          </Typography.Text>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleActionModal, setTitleActionModal] =
    useState<TitleActionModal>(null);
  const seenTransactionIdsRef = useRef<Set<string>>(new Set());
  const didInitializeNotificationsRef = useRef(false);
  const selectedTitleId = Form.useWatch('titleId', titlePurchaseForm);
  const selectedDiceCount = Form.useWatch('diceCount', chargeForm);

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
          roomCode: snapshot.room.code,
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

  const currentPlayerReceivableTotal = useMemo(
    () =>
      currentPlayerReceivables.reduce(
        (total, debt) => total + debt.remaining_amount,
        0,
      ),
    [currentPlayerReceivables],
  );

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
      setTitleActionModal(null);
    } catch (error) {
      message.error(
        error instanceof GameError
          ? error.message
          : 'Nao foi possivel executar a operacao.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * Fluxo antigo de Pix direto preservado apenas como referencia:
   * moveMoney({ type: 'PLAYER_TO_PLAYER', fromPlayerId: playerId, toPlayerId, amount, reason }).
   * A UI foi retirada porque aluguel, acoes e vendas agora usam solicitacoes persistentes.
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

  const handleCreateBankLoan = () =>
    executeAction(
      () =>
        createBankLoan({
          roomId: currentPlayer?.room_id ?? '',
          playerId,
        }),
      'Emprestimo bancario registrado.',
    );

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
      'Solicitacao de emprestimo enviada.',
    );

  const handleRequestTitlePurchase = (values: TitlePurchaseFormValues) => {
    const title = getTitleDefinition(values.titleId ?? null);

    if (!title) {
      message.error('Escolha um titulo.');
      return;
    }

    if ((currentPlayer?.balance ?? 0) < title.purchase_price) {
      message.error('Saldo insuficiente.');
      return;
    }

    void executeAction(
      () =>
        requestTitlePurchase({
          roomId: currentPlayer?.room_id ?? '',
          playerId,
          titleId: values.titleId ?? '',
        }),
      'Confirmacao de compra criada.',
    );
  };

  const handleUpgradeTitle = (
    purchasedTitleId: string,
    upgrade: 'HOUSE' | 'HOTEL',
  ) =>
    executeAction(
      () =>
        upgradePurchasedTitle({
          roomId: currentPlayer?.room_id ?? '',
          playerId,
          purchasedTitleId,
          upgrade,
        }),
      upgrade === 'HOUSE' ? 'Casa comprada.' : 'Hotel comprado.',
    );

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
        'Cobranca de aluguel enviada.',
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
      'Cobranca de acao enviada.',
    );
  };

  const handleCreateTitleSale = async () => {
    if (!titleActionModal) {
      return;
    }

    const values = await saleForm.validateFields();

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
      'Solicitacao confirmada.',
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
      'Solicitacao recusada.',
    );
  };

  const handleCopyRoomCode = async () => {
    const roomCode = state?.roomCode ?? '';

    if (!roomCode) {
      return;
    }

    await navigator.clipboard.writeText(roomCode);
    message.success('Codigo da sala copiado.');
  };

  const handleDeleteRoom = () => {
    if (!state || !currentPlayer) {
      return;
    }

    modal.confirm({
      title: 'Excluir sala?',
      content:
        'Esta acao remove a sala, jogadores, historico, titulos e dividas.',
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
              : 'Nao foi possivel excluir a sala.',
          );
        }
      },
    });
  };

  const rankingItems = rankedPlayers.map((player) => ({
    title: player.name.toUpperCase(),
    description: (
      <Space wrap>
        <Typography.Text
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <LuWallet aria-label="Saldo" /> {formatCurrency(player.balance)}
        </Typography.Text>
        -
        <Typography.Text
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <LuPiggyBank aria-label="Patrimonio" />{' '}
          {formatCurrency(player.assetValue)}
        </Typography.Text>
      </Space>
    ),
  }));

  const debtColumns: ColumnsType<FirebaseRecord<Debt>> = [
    {
      title: 'Quem deve',
      dataIndex: 'from_player_id',
      render: (fromPlayerId: string) =>
        getPlayerName(state?.players ?? [], fromPlayerId),
    },
    {
      title: 'Para quem',
      dataIndex: 'to_player_id',
      render: (toPlayerId: string | null) =>
        getPlayerName(state?.players ?? [], toPlayerId),
    },
    {
      title: 'Motivo',
      dataIndex: 'reason',
      responsive: ['md'],
      render: (reason: string | null) => reason || 'Sem motivo',
    },
    {
      title: 'Valor',
      dataIndex: 'remaining_amount',
      align: 'right',
      render: (remainingAmount: number) => (
        <Typography.Text type="danger" strong>
          {formatCurrency(remainingAmount)}
        </Typography.Text>
      ),
    },
  ];
  const personalDebtColumns = debtColumns.filter(
    (column) =>
      !('dataIndex' in column) || column.dataIndex !== 'from_player_id',
  );
  const personalReceivableColumns = debtColumns.filter(
    (column) => !('dataIndex' in column) || column.dataIndex !== 'to_player_id',
  );
  const bankerDebtColumns: ColumnsType<FirebaseRecord<Debt>> = [
    {
      title: 'Devedor -> Credor',
      key: 'debtRelation',
      render: (_, debt) =>
        `${getPlayerName(state?.players ?? [], debt.from_player_id)} -> ${getPlayerName(
          state?.players ?? [],
          debt.to_player_id,
        )}`,
    },
    {
      title: 'Motivo',
      dataIndex: 'reason',
      responsive: ['md'],
      render: (reason: string | null) => reason || 'Sem motivo',
    },
    {
      title: 'Valor',
      dataIndex: 'remaining_amount',
      align: 'right',
      render: (remainingAmount: number) => (
        <Typography.Text type="danger" strong>
          {formatCurrency(remainingAmount)}
        </Typography.Text>
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
      return 'Solicitacao de emprestimo';
    }

    if (activePendingRequest.kind === 'TITLE_PURCHASE') {
      return 'Confirmar compra de titulo';
    }

    if (activePendingRequest.kind === 'TITLE_SALE') {
      return 'Proposta de venda de titulo';
    }

    if (activePendingRequest.kind === 'RENT_CHARGE') {
      return 'Confirmar aluguel';
    }

    return 'Confirmar cobranca de acao';
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
        <Descriptions.Item label="Titulo">
          {activePendingRequestTitle?.name ?? 'Titulo'}
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

    const cardTitle = (
      <Flex justify="space-between" gap={12} align="center">
        <Space>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: definition.color,
              display: 'inline-block',
            }}
          />
          <Typography.Text strong>{definition.name}</Typography.Text>
        </Space>
        <Tag>{definition.kind === 'LAND' ? 'Terreno' : 'Acao'}</Tag>
      </Flex>
    );

    if (definition.kind === 'STOCK') {
      return (
        <Col xs={24} lg={12} key={title.id}>
          <Card title={cardTitle}>
            <Flex vertical gap={12}>
              <img
                alt={definition.name}
                src={definition.image_url}
                style={{
                  width: '100%',
                  height: 120,
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
              <Flex gap={8} wrap="wrap">
                <Button
                  icon={<LuDices />}
                  onClick={() => {
                    chargeForm.resetFields();
                    setTitleActionModal({
                      kind: 'STOCK',
                      purchasedTitle: title,
                    });
                  }}
                >
                  Cobrar acao
                </Button>
                <Button
                  onClick={() => {
                    saleForm.resetFields();
                    setTitleActionModal({
                      kind: 'SALE',
                      purchasedTitle: title,
                    });
                  }}
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
        <Card title={cardTitle}>
          <Flex vertical gap={12}>
            <Space wrap>
              {title.has_hotel ? (
                <Tag icon={<LuHotel />}>Hotel</Tag>
              ) : (
                Array.from({ length: title.houses }, (_, index) => (
                  <Tag key={index} icon={<LuHouse />}>
                    {' '}
                    Casa {index + 1}
                  </Tag>
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
            <Flex gap={8} wrap="wrap">
              <Button
                icon={<LuHouse />}
                disabled={title.has_hotel || title.houses >= 4}
                loading={isSubmitting}
                onClick={() => void handleUpgradeTitle(title.id, 'HOUSE')}
              >
                Comprar
              </Button>
              <Button
                icon={<LuHotel />}
                disabled={title.has_hotel || title.houses !== 4}
                loading={isSubmitting}
                onClick={() => void handleUpgradeTitle(title.id, 'HOTEL')}
              >
                Comprar
              </Button>
              <Button
                onClick={() => {
                  chargeForm.resetFields();
                  setTitleActionModal({ kind: 'RENT', purchasedTitle: title });
                }}
              >
                Cobrar aluguel
              </Button>
              <Button
                onClick={() => {
                  saleForm.resetFields();
                  setTitleActionModal({ kind: 'SALE', purchasedTitle: title });
                }}
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
    <AppLayout>
      <Flex vertical gap={24}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card loading={isLoading}>
              <Flex justify="space-between" gap={16} wrap="wrap">
                <Flex vertical gap={4}>
                  <Space>
                    <Button
                      aria-label="Copiar codigo da sala"
                      size="small"
                      variant="text"
                      icon={<LuCopy />}
                      onClick={() => void handleCopyRoomCode()}
                    >
                      Sala {state?.roomCode}
                    </Button>
                  </Space>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {currentPlayer?.name}
                  </Typography.Title>
                  {currentPlayer?.is_banker ? (
                    <Tag color="gold" style={{ width: 'fit-content' }}>
                      Banqueiro
                    </Tag>
                  ) : null}
                </Flex>
                <Flex vertical align="flex-end" gap={4}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Saldo atual
                  </Typography.Text>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {formatCurrency(currentPlayer?.balance ?? 0)}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Patrimonio: {formatCurrency(currentPlayerAssetValue)}
                  </Typography.Text>
                  {currentPlayerDebtTotal > 0 ? (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                      Dividas: {formatCurrency(currentPlayerDebtTotal)}
                    </Typography.Text>
                  ) : null}
                  {currentPlayerReceivableTotal > 0 ? (
                    <Typography.Text type="success" style={{ fontSize: 12 }}>
                      A receber: {formatCurrency(currentPlayerReceivableTotal)}
                    </Typography.Text>
                  ) : null}
                </Flex>
              </Flex>
            </Card>
          </Col>
        </Row>

        <Tabs
          items={[
            {
              key: 'player',
              label: 'Principal',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card title="Pagar Banco">
                      <Form
                        form={bankPaymentForm}
                        layout="vertical"
                        requiredMark={false}
                        onFinish={handlePayBank}
                      >
                        <Form.Item
                          name="amount"
                          label="Valor"
                          rules={[
                            { required: true, message: 'Informe o valor.' },
                          ]}
                        >
                          <InputNumber
                            min={0.01}
                            precision={2}
                            style={{ width: '100%' }}
                            prefix="R$"
                          />
                        </Form.Item>
                        <QuickAmountButtons form={bankPaymentForm} />
                        <Form.Item
                          name="reason"
                          label="Motivo"
                          rules={[
                            { required: true, message: 'Escolha o motivo.' },
                          ]}
                        >
                          <Select
                            options={BANK_PAYMENT_REASON_OPTIONS}
                            placeholder="Selecione o motivo"
                          />
                        </Form.Item>
                        <Flex gap={8} justify="end">
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={isSubmitting}
                          >
                            Confirmar Pagamento
                          </Button>
                        </Flex>
                      </Form>
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title="Dividas ativas">
                      <Table
                        rowKey="id"
                        columns={personalDebtColumns}
                        dataSource={currentPlayerDebts}
                        pagination={false}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title="Valores a receber">
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
              label: 'Emprestimos',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={10}>
                    <Card title="Emprestimo do banco">
                      <Flex vertical gap={12}>
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="Patrimonio">
                            {formatCurrency(currentPlayerNetWorth)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Valor disponivel">
                            {formatCurrency(bankLoanAmount)}
                          </Descriptions.Item>
                        </Descriptions>
                        {currentPlayerDebtTotal > 0 ? (
                          <Alert
                            type="warning"
                            showIcon
                            message="Quite suas dividas ativas antes de pedir ao banco."
                          />
                        ) : null}
                        <Button
                          type="primary"
                          disabled={currentPlayerDebtTotal > 0}
                          loading={isSubmitting}
                          onClick={() => void handleCreateBankLoan()}
                        >
                          Solicitar emprestimo
                        </Button>
                      </Flex>
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card title="Emprestimo com jogadores">
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
                        <Form.Item
                          name="repaymentAmount"
                          label="Valor que sera pago"
                          rules={[
                            {
                              required: true,
                              message: 'Informe o valor a pagar.',
                            },
                          ]}
                        >
                          <InputNumber
                            min={1}
                            precision={2}
                            style={{ width: '100%' }}
                            prefix="R$"
                          />
                        </Form.Item>
                        <Flex justify="end">
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={isSubmitting}
                          >
                            Pedir emprestimo
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
              label: 'Titulos',
              children: (
                <Flex vertical gap={16}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card title="Aquisicao de titulos">
                        <Form
                          form={titlePurchaseForm}
                          layout="vertical"
                          requiredMark={false}
                          onFinish={handleRequestTitlePurchase}
                        >
                          <Form.Item
                            name="titleId"
                            label="Titulo"
                            rules={[
                              {
                                required: true,
                                message: 'Escolha o titulo.',
                              },
                            ]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="searchText"
                              options={availableTitleOptions}
                              placeholder="Buscar por nome do titulo"
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
                                (currentPlayer?.balance ?? 0) >=
                                selectedTitle.purchase_price
                                  ? 'info'
                                  : 'error'
                              }
                              showIcon
                              message={`${selectedTitle.name} - ${formatCurrency(
                                selectedTitle.purchase_price,
                              )}`}
                              description={
                                (currentPlayer?.balance ?? 0) >=
                                selectedTitle.purchase_price
                                  ? 'A compra cria uma confirmacao persistente antes do registro.'
                                  : 'Saldo insuficiente.'
                              }
                              style={{ marginBottom: 16 }}
                            />
                          ) : null}
                          <Flex justify="end">
                            <Button
                              type="primary"
                              htmlType="submit"
                              loading={isSubmitting}
                            >
                              Comprar titulo
                            </Button>
                          </Flex>
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                  <Card title="Titulos comprados">
                    {currentPlayerTitles.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {currentPlayerTitles.map(renderPurchasedTitleCard)}
                      </Row>
                    ) : (
                      <Empty description="Nenhum titulo comprado" />
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
                          <Card title="Acoes do banco">
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
                                  min={0.01}
                                  precision={2}
                                  style={{ width: '100%' }}
                                  prefix="R$"
                                />
                              </Form.Item>
                              <QuickAmountButtons form={adminForm} />
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
                                  options={BANK_ACTION_REASON_OPTIONS}
                                  placeholder="Selecione o motivo"
                                />
                              </Form.Item>
                              <Flex gap={8} justify="end">
                                <Button
                                  type="primary"
                                  loading={isSubmitting}
                                  onClick={() =>
                                    void handleBankAction('BANK_TO_PLAYER')
                                  }
                                >
                                  Adicionar
                                </Button>
                                <Button
                                  danger
                                  loading={isSubmitting}
                                  onClick={() =>
                                    void handleBankAction('BANK_CHARGE_PLAYER')
                                  }
                                >
                                  Retirar
                                </Button>
                              </Flex>
                            </Form>
                          </Card>
                        </Col>

                        <Col xs={24} lg={10}>
                          <Card title="Dividas ativas">
                            <Table
                              rowKey="id"
                              columns={bankerDebtColumns}
                              dataSource={state?.debts ?? []}
                              pagination={false}
                            />
                          </Card>
                        </Col>

                        <Col xs={24} lg={10}>
                          <Card title="Configuracoes">
                            <Flex vertical gap={8}>
                              <Typography.Text type="secondary">
                                Sala {state?.roomCode}
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
              label: 'Historico',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <Card title="Historico Individual">
                      <TransactionHistoryList
                        transactions={personalTransactions}
                        players={state?.players ?? []}
                        perspectivePlayerId={playerId}
                      />
                    </Card>
                  </Col>
                  {currentPlayer?.is_banker ? (
                    <Col xs={24} lg={10}>
                      <Card title="Historico Geral">
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

      <Modal
        open={Boolean(activePendingRequest)}
        title={getPendingRequestTitle()}
        maskClosable={false}
        keyboard={false}
        closable={false}
        footer={
          activePendingRequest?.kind === 'RENT_CHARGE' ||
          activePendingRequest?.kind === 'STOCK_CHARGE' ? (
            <Button
              type="primary"
              loading={isSubmitting}
              onClick={handleAcceptPendingRequest}
            >
              Aceitar e confirmar pagamento
            </Button>
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
        open={Boolean(titleActionModal)}
        title={
          titleActionModal?.kind === 'SALE'
            ? 'Vender titulo'
            : titleActionModal?.kind === 'STOCK'
              ? 'Cobrar acao'
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
                Enviar proposta
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
                Enviar cobranca
              </Button>
            </Space>
          )
        }
      >
        {titleActionModal?.kind === 'SALE' ? (
          <Form form={saleForm} layout="vertical" requiredMark={false}>
            <Form.Item
              name="buyerPlayerId"
              label="Comprador"
              rules={[{ required: true, message: 'Escolha o comprador.' }]}
            >
              <Select
                options={playerOptions}
                placeholder="Selecione um jogador"
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Valor da proposta"
              rules={[{ required: true, message: 'Informe o valor.' }]}
            >
              <InputNumber
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
              label="Jogador que ira pagar"
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
                  label="Numero dos dados"
                  rules={[{ required: true, message: 'Escolha os dados.' }]}
                >
                  <Select
                    options={DICE_OPTIONS}
                    placeholder="Selecione de 1 a 12"
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
                message={`Valor do aluguel: ${formatCurrency(
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
