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
  LuArrowDown,
  LuArrowLeft,
  LuArrowUp,
  LuCheck,
  LuCalculator,
  LuCircleDollarSign,
  LuCircle,
  LuDices,
  LuHistory,
  LuHouse,
  LuHotel,
  LuLock,
  LuLockOpen,
  LuPlus,
  LuLogOut,
  LuTrash2,
  LuTriangleAlert,
  LuPlay,
  LuSave,
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
  confirmPendingNews,
  createBankLoan,
  createPlayerLoanRequest,
  createTitleSaleRequest,
  declinePendingRequest,
  deleteRoom,
  enterRoomByCode,
  GameError,
  JAIL_BAIL_AMOUNT,
  rollDiceForCurrentTurn,
  moveMoney,
  payDebt,
  payJailBail,
  releasePlayerBail,
  requestTitlePurchase,
  resignPlayer,
  sellTitleToBank,
  startGameState,
  setPlayerJailStatus,
  subscribeRoomSnapshot,
  updatePlayerOrder,
  upgradePurchasedTitle,
} from '@/api/gameService';
import { AppLayout } from '@/components/ui';
import {
  BANK_LOAN_INTEREST_RATE,
  getBankLoanDebtAmount,
  getBankLoanAmountByNetWorth,
} from '@/constants/bankLoans';
import { getBoardSpace } from '@/constants/board';
import {
  calculatePurchasedTitleAssetValue,
  getLandChargeAmount,
  getTitleDefinition,
} from '@/constants/gameTitles';
import type { FirebaseRecord } from '@/types/firebase';
import type {
  BoardSpaceKind,
  Debt,
  GameLastRoll,
  GameState,
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

type ChecklistFormValues = {
  text?: string;
};

type ChecklistItem = {
  id: string;
  text: string;
  isDone: boolean;
  createdAt: string;
};

type RoomState = {
  id: string;
  name: string;
  players: Array<FirebaseRecord<Player>>;
  transactions: Array<FirebaseRecord<Transaction>>;
  debts: Array<FirebaseRecord<Debt>>;
  purchasedTitles: Array<FirebaseRecord<PurchasedTitle>>;
  pendingRequests: Array<FirebaseRecord<PendingRequest>>;
  gameState: FirebaseRecord<GameState> | null;
};

type RankingPlayer = FirebaseRecord<Player> & {
  assetValue: number;
  rankingValue: number;
};

type TitleActionModal = {
  kind: 'SALE';
  purchasedTitle: FirebaseRecord<PurchasedTitle>;
} | null;

type DebtPaymentModal = FirebaseRecord<Debt> | null;
type DiceOverlayState = {
  isVisible: boolean;
  isRolling: boolean;
  dice: [number, number] | null;
  total: number | null;
};
type GameTabKey =
  | 'game'
  | 'loans'
  | 'titles'
  | 'ranking'
  | 'checklist'
  | 'calculator'
  | 'history'
  | 'banker';

type GameNavigationItem = {
  key: GameTabKey;
  label: string;
  icon: ReactNode;
};

const QUICK_AMOUNTS = [20, 50, 100, 500, 1000];

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
const DICE_AUDIO_SRC = '/dados.mp3';
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

const playAudio = (src: string, volume = 0.8) => {
  const audio = new Audio(src);
  audio.volume = volume;

  void audio.play().catch(() => {
    // Browsers can block audio before the user interacts with the page.
  });
};

const playPixAudio = () => playAudio(PIX_AUDIO_SRC, 0.8);

const playDiceAudio = () => playAudio(DICE_AUDIO_SRC, 0.9);

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

const BOARD_SPACE_KIND_LABELS: Record<BoardSpaceKind, string> = {
  START: 'Início',
  LAND: 'Terreno',
  STOCK: 'Ação',
  NEWS: 'Notícia',
  JAIL: 'Prisão',
  GO_TO_JAIL: 'Vá para a prisão',
  TAX_REFUND: 'Banco paga',
  FEDERAL_TAX: 'Imposto',
  HOLIDAY: 'Feriado',
};

const getBoardSpaceHeaderColor = ({
  kind,
  titleColor,
}: {
  kind: BoardSpaceKind;
  titleColor?: string;
}) => {
  if (titleColor) {
    return titleColor;
  }

  if (kind === 'JAIL' || kind === 'GO_TO_JAIL') {
    return '#102a56';
  }

  if (kind === 'START' || kind === 'TAX_REFUND' || kind === 'FEDERAL_TAX') {
    return '#1677ff';
  }

  if (kind === 'NEWS') {
    return '#d48806';
  }

  if (kind === 'HOLIDAY') {
    return '#389e0d';
  }

  return '#30343b';
};

const getBoardSpaceStatus = ({
  kind,
  amount,
  titleDefinitionName,
  ownerName,
  houses,
  hasHotel,
}: {
  kind: BoardSpaceKind;
  amount: number | null;
  titleDefinitionName?: string;
  ownerName?: string | null;
  houses?: number;
  hasHotel?: boolean;
}) => {
  if (titleDefinitionName) {
    if (!ownerName) {
      return 'Disponível para compra';
    }

    const improvements = hasHotel
      ? 'com hotel'
      : houses
        ? `com ${houses} casa${houses > 1 ? 's' : ''}`
        : 'sem construções';

    return `${ownerName} é dono, ${improvements}`;
  }

  if (kind === 'START') {
    return 'Recebe bônus ao passar por aqui';
  }

  if (kind === 'TAX_REFUND') {
    return `Recebe ${formatCurrency(amount ?? 0)} do banco`;
  }

  if (kind === 'FEDERAL_TAX') {
    return `Paga ${formatCurrency(amount ?? 0)} ao banco`;
  }

  if (kind === 'NEWS') {
    return 'Abre uma notícia para confirmação';
  }

  if (kind === 'JAIL') {
    return 'Casa da prisão';
  }

  if (kind === 'GO_TO_JAIL') {
    return 'Envia o jogador para a prisão';
  }

  return 'Nada acontece';
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
        <Row gutter={12}>
          <Col xs={12}>
            <Form.Item name="baseAmount" label="Valor base">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                prefix="R$"
              />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="interestRate" label="Taxa de juros">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                suffix="%"
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="mode" label="Operação">
          <Radio.Group
            buttonStyle="solid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              width: '100%',
            }}
          >
            <Radio.Button value="ADD" style={{ textAlign: 'center' }}>
              Acrescentar juros
            </Radio.Button>
            <Radio.Button value="SUBTRACT" style={{ textAlign: 'center' }}>
              Descontar juros
            </Radio.Button>
          </Radio.Group>
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

function ChecklistPage({ storageKey }: { storageKey: string }) {
  const [form] = Form.useForm<ChecklistFormValues>();
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const storedItems = window.localStorage.getItem(storageKey);

      return storedItems ? (JSON.parse(storedItems) as ChecklistItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const addItem = ({ text }: ChecklistFormValues) => {
    const trimmedText = text?.trim();

    if (!trimmedText) {
      return;
    }

    setItems((currentItems) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: trimmedText,
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      ...currentItems,
    ]);
    form.resetFields();
  };

  const toggleItem = (itemId: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, isDone: !item.isDone } : item,
      ),
    );
  };

  const deleteItem = (itemId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    );
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="Meus objetivos">
          <Flex vertical gap={16}>
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={addItem}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item
                  name="text"
                  noStyle
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: 'Informe uma meta.',
                    },
                  ]}
                >
                  <Input placeholder="Adicionar meta" />
                </Form.Item>
                <Button type="primary" htmlType="submit" icon={<LuPlus />}>
                  Adicionar
                </Button>
              </Space.Compact>
            </Form>

            {items.length > 0 ? (
              <Flex vertical gap={8}>
                {items.map((item) => (
                  <Flex
                    key={item.id}
                    align="center"
                    gap={8}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: 8,
                      background: item.isDone ? '#f6ffed' : '#fff',
                    }}
                  >
                    <Button
                      aria-label={
                        item.isDone
                          ? 'Marcar como pendente'
                          : 'Marcar como concluída'
                      }
                      shape="circle"
                      type={item.isDone ? 'primary' : 'default'}
                      icon={item.isDone ? <LuCheck /> : <LuCircle />}
                      onClick={() => toggleItem(item.id)}
                    />
                    <Typography.Text
                      delete={item.isDone}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      {item.text}
                    </Typography.Text>
                    <Button
                      aria-label="Excluir meta"
                      danger
                      icon={<LuTrash2 />}
                      onClick={() => deleteItem(item.id)}
                    />
                  </Flex>
                ))}
              </Flex>
            ) : (
              <Empty description="Nenhuma meta criada" />
            )}
          </Flex>
        </Card>
      </Col>
    </Row>
  );
}
export function GameRoom() {
  const { message, modal, notification } = App.useApp();
  const navigate = useNavigate();
  const { code, playerId } = useParams<{ code: string; playerId: string }>();
  const [state, setState] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminForm] = Form.useForm<MoneyFormValues>();
  const [playerLoanForm] = Form.useForm<PlayerLoanFormValues>();
  const [saleForm] = Form.useForm<SaleFormValues>();
  const [debtPaymentForm] = Form.useForm<DebtPaymentFormValues>();
  const [cancelChargeForm] = Form.useForm<CancelChargeFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleActionModal, setTitleActionModal] =
    useState<TitleActionModal>(null);
  const [debtPaymentModal, setDebtPaymentModal] =
    useState<DebtPaymentModal>(null);
  const [isCancelChargeModalOpen, setIsCancelChargeModalOpen] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<GameTabKey>('game');
  const [playerOrderDraft, setPlayerOrderDraft] = useState<string[]>([]);
  const [diceOverlay, setDiceOverlay] = useState<DiceOverlayState>({
    isVisible: false,
    isRolling: false,
    dice: null,
    total: null,
  });
  const seenTransactionIdsRef = useRef<Set<string>>(new Set());
  const didInitializeNotificationsRef = useRef(false);
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
  const isAdminAmountLocked = Boolean(
    adminReason && PRESET_REASON_AMOUNTS[adminReason],
  );

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
      const room = await enterRoomByCode(code, playerId);

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
          gameState: snapshot.gameState,
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

    const newReceivedTransactions = state.transactions.filter(
      (transaction) =>
        !seenTransactionIdsRef.current.has(transaction.id) &&
        transaction.to_player_id === playerId &&
        transaction.amount > 0,
    );

    newReceivedTransactions.forEach((transaction) => {
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
  const checklistStorageKey = `coracao-bank:checklist:${code ?? 'room'}:${
    playerId ?? 'player'
  }`;
  useEffect(() => {
    if (!state) {
      setPlayerOrderDraft([]);
      return;
    }

    const activePlayerIds = state.players.map((player) => player.id);

    setPlayerOrderDraft((currentOrder) => {
      const sourceOrder = state.gameState?.player_order.length
        ? state.gameState.player_order
        : currentOrder;
      const nextOrder = sourceOrder.filter((orderedPlayerId) =>
        activePlayerIds.includes(orderedPlayerId),
      );

      activePlayerIds.forEach((activePlayerId) => {
        if (!nextOrder.includes(activePlayerId)) {
          nextOrder.push(activePlayerId);
        }
      });

      return currentOrder.join('|') === nextOrder.join('|')
        ? currentOrder
        : nextOrder;
    });
  }, [state]);

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
      setActiveTabKey('game');
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
  const isDebtPurchaseBlocked = isDebtStageBlockingPurchases(currentDebtStage);
  const isCurrentPlayerJailed = currentPlayer?.is_jailed ?? false;
  const isTitlesTabAvailableWhileRestricted =
    activeTabKey === 'titles' || activeTabKey === 'game';
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
        Math.min(
          debtPaymentModal.remaining_amount,
          currentPlayer?.balance ?? 0,
        ),
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
  const selectedSaleValuation =
    titleActionModal?.kind === 'SALE'
      ? getPurchasedTitleValuation(titleActionModal.purchasedTitle)
      : null;
  const gameState = state?.gameState ?? null;
  const currentTurnPlayer =
    state?.players.find(
      (player) => player.id === gameState?.current_player_id,
    ) ?? null;
  const currentPlayerPosition = currentPlayer
    ? (gameState?.positions_by_player_id[currentPlayer.id] ?? 1)
    : 1;
  const currentPlayerSpace = getBoardSpace(currentPlayerPosition);
  const currentPlayerSpacePurchasedTitle = currentPlayerSpace.title_id
    ? (state?.purchasedTitles ?? []).find(
        (title) => title.title_id === currentPlayerSpace.title_id,
      )
    : null;
  const currentPlayerSpaceTitleDefinition = getTitleDefinition(
    currentPlayerSpace.title_id,
  );
  const currentPlayerSpaceTitleOwner = currentPlayerSpacePurchasedTitle
    ? getPlayerName(
        state?.players ?? [],
        currentPlayerSpacePurchasedTitle.owner_player_id,
      )
    : null;
  const currentPlayerSpaceColor = getBoardSpaceHeaderColor({
    kind: currentPlayerSpace.kind,
    titleColor: currentPlayerSpaceTitleDefinition?.color,
  });
  const hasCurrentPlayerSpaceActionThisRound = Boolean(
    gameState &&
    currentPlayerSpacePurchasedTitle &&
    currentPlayerSpacePurchasedTitle.last_development_round_number ===
      gameState.round_number &&
    currentPlayerSpacePurchasedTitle.last_development_position ===
      currentPlayerPosition,
  );
  const currentPlayerSpaceStatus = getBoardSpaceStatus({
    kind: currentPlayerSpace.kind,
    amount: currentPlayerSpace.amount,
    titleDefinitionName: currentPlayerSpaceTitleDefinition?.name,
    ownerName: currentPlayerSpaceTitleOwner,
    houses: currentPlayerSpacePurchasedTitle?.houses,
    hasHotel: currentPlayerSpacePurchasedTitle?.has_hotel,
  });
  const canBuyCurrentPlayerSpaceTitle = Boolean(
    currentPlayerSpaceTitleDefinition &&
    !currentPlayerSpacePurchasedTitle &&
    !isCurrentPlayerJailed &&
    !isDebtPurchaseBlocked &&
    (currentPlayer?.balance ?? 0) >=
      currentPlayerSpaceTitleDefinition.purchase_price,
  );
  const canUpgradeCurrentPlayerSpaceTitle = Boolean(
    currentPlayerSpaceTitleDefinition?.kind === 'LAND' &&
    currentPlayerSpacePurchasedTitle &&
    currentPlayerSpacePurchasedTitle.owner_player_id === playerId &&
    !currentPlayerSpacePurchasedTitle.has_hotel &&
    !hasCurrentPlayerSpaceActionThisRound &&
    !isCurrentPlayerJailed &&
    !isDebtPurchaseBlocked,
  );
  const nextCurrentPlayerSpaceUpgrade =
    currentPlayerSpaceTitleDefinition?.kind === 'LAND' &&
    currentPlayerSpacePurchasedTitle
      ? currentPlayerSpacePurchasedTitle.houses < 4
        ? 'HOUSE'
        : 'HOTEL'
      : null;
  const currentPlayerSpaceUpgradeAmount =
    currentPlayerSpaceTitleDefinition?.kind === 'LAND'
      ? nextCurrentPlayerSpaceUpgrade === 'HOUSE'
        ? currentPlayerSpaceTitleDefinition.acquisition.house_price
        : currentPlayerSpaceTitleDefinition.acquisition.hotel_price
      : 0;
  const canPayCurrentPlayerSpaceUpgrade = Boolean(
    canUpgradeCurrentPlayerSpaceTitle &&
    currentPlayerSpacePurchasedTitle &&
    nextCurrentPlayerSpaceUpgrade &&
    (currentPlayer?.balance ?? 0) >= currentPlayerSpaceUpgradeAmount,
  );
  const pendingNewsForCurrentPlayer =
    gameState?.pending_news && gameState.pending_news.player_id === playerId
      ? gameState.pending_news
      : null;
  const lastRollPlayerName = gameState?.last_roll
    ? getPlayerName(state?.players ?? [], gameState.last_roll.player_id)
    : null;
  const lastNews = gameState?.last_news ?? null;
  const lastNewsColor = lastNews?.card.type === 'LUCK' ? '#237804' : '#cf1322';
  const isRollBlocked =
    !gameState ||
    !gameState.current_player_id ||
    Boolean(gameState?.pending_news) ||
    gameState.current_player_id !== playerId ||
    isSubmitting ||
    diceOverlay.isVisible;
  const orderedPlayers = playerOrderDraft
    .map((orderedPlayerId) =>
      (state?.players ?? []).find((player) => player.id === orderedPlayerId),
    )
    .filter((player): player is FirebaseRecord<Player> => Boolean(player));

  useEffect(() => {
    if (titleActionModal?.kind !== 'SALE') {
      return;
    }

    if (saleMode === 'BANK') {
      saleForm.setFieldValue('amount', selectedSaleValuation?.bankSaleValue);
      saleForm.setFieldValue('buyerPlayerId', undefined);
    }
  }, [
    saleForm,
    saleMode,
    selectedSaleValuation?.bankSaleValue,
    titleActionModal,
  ]);

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
      adminForm.resetFields();
      playerLoanForm.resetFields();
      saleForm.resetFields();
      debtPaymentForm.resetFields();
      cancelChargeForm.resetFields();
      setTitleActionModal(null);
      setDebtPaymentModal(null);
      setIsCancelChargeModalOpen(false);
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

  const movePlayerInOrder = (playerIdToMove: string, direction: -1 | 1) => {
    setPlayerOrderDraft((currentOrder) => {
      const currentIndex = currentOrder.indexOf(playerIdToMove);
      const nextIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= currentOrder.length
      ) {
        return currentOrder;
      }

      const nextOrder = [...currentOrder];
      const [removedPlayerId] = nextOrder.splice(currentIndex, 1);
      nextOrder.splice(nextIndex, 0, removedPlayerId);

      return nextOrder;
    });
  };

  const handleStartGameState = () =>
    executeAction(
      () =>
        startGameState({
          roomId: currentPlayer?.room_id ?? '',
          executedByPlayerId: playerId,
          playerOrder: playerOrderDraft,
        }),
      gameState ? 'Partida resetada.' : 'Partida iniciada.',
    );

  const handleSavePlayerOrder = () =>
    executeAction(
      () =>
        updatePlayerOrder({
          roomId: currentPlayer?.room_id ?? '',
          executedByPlayerId: playerId,
          playerOrder: playerOrderDraft,
        }),
      'Ordem dos jogadores salva.',
    );

  const showDiceOverlayResult = (lastRoll: GameLastRoll) => {
    setDiceOverlay({
      isVisible: true,
      isRolling: false,
      dice: lastRoll.dice,
      total: lastRoll.total,
    });

    window.setTimeout(() => {
      setDiceOverlay({
        isVisible: false,
        isRolling: false,
        dice: null,
        total: null,
      });
    }, 2000);
  };

  const handleRollDice = async () => {
    setIsSubmitting(true);
    setDiceOverlay({
      isVisible: true,
      isRolling: true,
      dice: null,
      total: null,
    });
    playDiceAudio();

    try {
      const lastRoll = await rollDiceForCurrentTurn({
        roomId: currentPlayer?.room_id ?? '',
        executedByPlayerId: playerId,
      });

      showDiceOverlayResult(lastRoll);
      message.success(lastRoll.message);
    } catch (error) {
      setDiceOverlay({
        isVisible: false,
        isRolling: false,
        dice: null,
        total: null,
      });
      message.error(
        error instanceof GameError
          ? error.message
          : 'Não foi possível rolar os dados.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPendingNews = () =>
    executeAction(
      () =>
        confirmPendingNews({
          roomId: currentPlayer?.room_id ?? '',
          playerId,
        }),
      'Notícia confirmada.',
    );
  /*
   * Fluxo antigo de Pix direto preservado apenas como referência:
   * moveMoney({ type: 'PLAYER_TO_PLAYER', fromPlayerId: playerId, toPlayerId, amount, reason }).
   * A UI foi retirada porque aluguel, ações e vendas agora usam solicitações persistentes.
   */

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

  const handleBuyCurrentPlayerSpace = () => {
    if (!currentPlayerSpaceTitleDefinition) {
      return;
    }

    if (!currentPlayerSpacePurchasedTitle) {
      void executeAction(
        () =>
          requestTitlePurchase({
            roomId: currentPlayer?.room_id ?? '',
            playerId,
            titleId: currentPlayerSpaceTitleDefinition.id,
          }),
        'Confirmação de compra criada.',
      );
      return;
    }

    if (
      currentPlayerSpaceTitleDefinition.kind !== 'LAND' ||
      currentPlayerSpacePurchasedTitle.owner_player_id !== playerId ||
      !nextCurrentPlayerSpaceUpgrade
    ) {
      return;
    }

    handleUpgradeTitle(
      currentPlayerSpacePurchasedTitle.id,
      nextCurrentPlayerSpaceUpgrade,
    );
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
    { key: 'game', label: 'Partida', icon: <LuDices /> },
    { key: 'loans', label: 'Banco', icon: <LuLandmark /> },
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
      : activeTabKey === 'checklist'
        ? 'Checklist'
        : (navigationItems.find((item) => item.key === activeTabKey)?.label ??
          'Partida');

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
  const playerOrderColumns: ColumnsType<FirebaseRecord<Player>> = [
    {
      title: 'Ordem',
      key: 'order',
      width: 72,
      render: (_, player) => playerOrderDraft.indexOf(player.id) + 1,
    },
    {
      title: 'Jogador',
      key: 'player',
      render: (_, player) => (
        <Space>
          <Typography.Text>{player.name}</Typography.Text>
          {gameState?.current_player_id === player.id ? (
            <Tag color="blue">Vez</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Ações',
      key: 'actions',
      align: 'right',
      render: (_, player) => {
        const orderIndex = playerOrderDraft.indexOf(player.id);

        return (
          <Space>
            <Button
              aria-label="Subir jogador"
              icon={<LuArrowUp />}
              disabled={orderIndex <= 0}
              onClick={() => movePlayerInOrder(player.id, -1)}
            />
            <Button
              aria-label="Descer jogador"
              icon={<LuArrowDown />}
              disabled={
                orderIndex < 0 || orderIndex >= playerOrderDraft.length - 1
              }
              onClick={() => movePlayerInOrder(player.id, 1)}
            />
          </Space>
        );
      },
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
            <Divider style={{ margin: '4px 0' }} />
            <Flex gap={8} wrap="wrap" justify="end">
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
            onClick={() => setActiveTabKey('game')}
          />
        )
      }
      headerTitle={activeNavigationLabel}
      headerRightAction={
        isNavigatorTab ? (
          <Space size={8}>
            <Button
              aria-label="Abrir checklist"
              icon={<LuCheck />}
              onClick={() => setActiveTabKey('checklist')}
            />
            <Button
              aria-label="Abrir calculadora"
              icon={<LuCalculator />}
              onClick={() => setActiveTabKey('calculator')}
            />
          </Space>
        ) : null
      }
    >
      <Flex vertical gap={24} style={{ paddingBottom: 104 }}>
        <Tabs
          activeKey={activeTabKey}
          renderTabBar={() => <></>}
          items={[
            {
              key: 'game',
              label: 'Partida',
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

                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={14}>
                      <Card title="Controle de partida">
                        <Flex vertical gap={16}>
                          {gameState ? (
                            <Descriptions column={1} size="small" bordered>
                              <Descriptions.Item label="Rodada atual">
                                {gameState.round_number}
                              </Descriptions.Item>
                              <Descriptions.Item label="Bônus de rodada">
                                {formatCurrency(gameState.round_bonus_amount)}
                              </Descriptions.Item>
                              <Descriptions.Item label="Jogador da vez">
                                {currentTurnPlayer?.name ?? 'Sem jogador'}
                              </Descriptions.Item>
                              {lastRollPlayerName ? (
                                <Descriptions.Item label="Último jogador">
                                  {lastRollPlayerName}
                                </Descriptions.Item>
                              ) : null}
                              {gameState.last_roll ? (
                                <Descriptions.Item label="Última rolagem">
                                  {gameState.last_roll.dice.join(' + ')} ={' '}
                                  {gameState.last_roll.total}
                                </Descriptions.Item>
                              ) : null}
                            </Descriptions>
                          ) : (
                            <Alert
                              type="warning"
                              showIcon
                              message="Partida ainda não iniciada pelo banqueiro."
                            />
                          )}
                          <Button
                            type="primary"
                            size="large"
                            icon={<LuDices />}
                            loading={isSubmitting || diceOverlay.isRolling}
                            disabled={isRollBlocked}
                            onClick={() => void handleRollDice()}
                          >
                            Girar dados
                          </Button>
                        </Flex>
                      </Card>
                    </Col>

                    <Col xs={24} lg={10}>
                      <Card
                        title={
                          <Typography.Text style={{ color: '#fff' }} strong>
                            {currentPlayerSpace.name}
                          </Typography.Text>
                        }
                        styles={{
                          header: {
                            background: currentPlayerSpaceColor,
                            borderBottom: 0,
                          },
                        }}
                      >
                        {currentPlayerSpacePurchasedTitle &&
                        currentPlayerSpaceTitleDefinition?.kind === 'LAND' ? (
                          <Space wrap style={{ marginBottom: 12 }}>
                            {currentPlayerSpacePurchasedTitle.has_hotel ? (
                              <LuHotel size={30} aria-label="Hotel comprado" />
                            ) : (
                              Array.from(
                                {
                                  length:
                                    currentPlayerSpacePurchasedTitle.houses,
                                },
                                (_, index) => (
                                  <LuHouse
                                    key={index}
                                    size={30}
                                    aria-label={`Casa ${index + 1} comprada`}
                                  />
                                ),
                              )
                            )}
                            {!currentPlayerSpacePurchasedTitle.has_hotel &&
                            currentPlayerSpacePurchasedTitle.houses === 0 ? (
                              <Tag>Sem melhorias</Tag>
                            ) : null}
                          </Space>
                        ) : null}
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="Tipo">
                            {BOARD_SPACE_KIND_LABELS[currentPlayerSpace.kind]}
                          </Descriptions.Item>
                          <Descriptions.Item label="Status">
                            {currentPlayerSpaceStatus}
                          </Descriptions.Item>
                          {currentPlayerSpace.kind === 'NEWS' && lastNews ? (
                            <Descriptions.Item label="Notícia">
                              <Typography.Text style={{ color: lastNewsColor }}>
                                {lastNews.card.action}{' '}
                                <Typography.Text
                                  strong
                                  style={{ color: lastNewsColor }}
                                >
                                  ({formatCurrency(lastNews.card.amount)})
                                </Typography.Text>
                              </Typography.Text>
                            </Descriptions.Item>
                          ) : null}
                          {currentPlayerSpacePurchasedTitle &&
                          currentPlayerSpaceTitleDefinition?.kind === 'LAND' ? (
                            <Descriptions.Item label="Aluguel atual">
                              {formatCurrency(
                                getLandChargeAmount(
                                  currentPlayerSpacePurchasedTitle,
                                ),
                              )}
                            </Descriptions.Item>
                          ) : null}
                          {currentPlayerSpacePurchasedTitle &&
                          currentPlayerSpaceTitleDefinition?.kind ===
                            'STOCK' ? (
                            <Descriptions.Item label="Cobrança da ação">
                              {formatCurrency(
                                currentPlayerSpaceTitleDefinition.multiplier,
                              )}{' '}
                              por ponto dos dados
                            </Descriptions.Item>
                          ) : null}
                        </Descriptions>
                        {currentPlayerSpaceTitleDefinition &&
                        !currentPlayerSpacePurchasedTitle ? (
                          <Button
                            type="primary"
                            block
                            loading={isSubmitting}
                            disabled={!canBuyCurrentPlayerSpaceTitle}
                            onClick={handleBuyCurrentPlayerSpace}
                            style={{ marginTop: 12 }}
                          >
                            Comprar por{' '}
                            {formatCurrency(
                              currentPlayerSpaceTitleDefinition.purchase_price,
                            )}
                          </Button>
                        ) : null}
                        {currentPlayerSpaceTitleDefinition?.kind === 'LAND' &&
                        currentPlayerSpacePurchasedTitle?.owner_player_id ===
                          playerId &&
                        !currentPlayerSpacePurchasedTitle.has_hotel ? (
                          <Button
                            type="primary"
                            block
                            loading={isSubmitting}
                            disabled={!canPayCurrentPlayerSpaceUpgrade}
                            onClick={handleBuyCurrentPlayerSpace}
                            style={{ marginTop: 12 }}
                          >
                            {nextCurrentPlayerSpaceUpgrade === 'HOUSE'
                              ? 'Comprar casa'
                              : 'Comprar hotel'}{' '}
                            por{' '}
                            {formatCurrency(currentPlayerSpaceUpgradeAmount)}
                          </Button>
                        ) : null}
                      </Card>
                    </Col>
                  </Row>
                </Flex>
              ),
            },
            {
              key: 'loans',
              label: 'Banco',
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
                  <Tabs
                    defaultActiveKey="request"
                    items={[
                      {
                        key: 'request',
                        label: 'Empréstimos',
                        children: (
                          <Row gutter={[16, 16]}>
                            <Col xs={24} lg={10}>
                              <Card title="Empréstimo do banco">
                                <Flex vertical gap={12}>
                                  <Descriptions
                                    column={1}
                                    size="small"
                                    bordered
                                  >
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
                                      {
                                        required: true,
                                        message: 'Escolha o credor.',
                                      },
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
                                      {
                                        required: true,
                                        message: 'Informe o valor.',
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
                        key: 'pending',
                        label: 'Pendências',
                        children: (
                          <Flex vertical gap={16}>
                            {currentPlayerDebts.length > 0 ? (
                              <Alert
                                type="warning"
                                message={
                                  <Flex
                                    align="center"
                                    justify="space-between"
                                    gap={12}
                                  >
                                    <Typography.Text strong>
                                      Você possui dívidas ativas.
                                    </Typography.Text>
                                    <LuTriangleAlert
                                      aria-label="Alerta de dívida ativa"
                                      color="#d48806"
                                      size={20}
                                    />
                                  </Flex>
                                }
                              />
                            ) : null}
                            <Row gutter={[16, 16]}>
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
                          </Flex>
                        ),
                      },
                    ]}
                  />
                </Flex>
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
              key: 'checklist',
              label: 'Checklist',
              children: <ChecklistPage storageKey={checklistStorageKey} />,
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
                          <Card title="Ordem dos jogadores">
                            <Flex vertical gap={12}>
                              <Table
                                rowKey="id"
                                size="small"
                                columns={playerOrderColumns}
                                dataSource={orderedPlayers}
                                pagination={false}
                              />
                              <Flex gap={8} wrap="wrap">
                                <Button
                                  type="primary"
                                  icon={<LuPlay />}
                                  loading={isSubmitting}
                                  onClick={handleStartGameState}
                                  style={{ flex: 1 }}
                                >
                                  {gameState
                                    ? 'Resetar partida'
                                    : 'Iniciar partida'}
                                </Button>
                                <Button
                                  icon={<LuSave />}
                                  loading={isSubmitting}
                                  disabled={!gameState}
                                  onClick={handleSavePlayerOrder}
                                  style={{ flex: 1 }}
                                >
                                  Salvar ordem
                                </Button>
                              </Flex>
                            </Flex>
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

      {diceOverlay.isVisible ? (
        <Flex
          vertical
          align="center"
          justify="center"
          gap={20}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0, 0, 0, 0.42)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
          }}
        >
          <style>{`
            @keyframes dice-spin {
              from { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
              to { transform: rotateX(720deg) rotateY(540deg) rotateZ(360deg); }
            }
          `}</style>
          <Flex gap={18}>
            {[0, 1].map((diceIndex) => (
              <Flex
                key={diceIndex}
                align="center"
                justify="center"
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 14,
                  background: '#fff',
                  color: '#d81860',
                  fontSize: 34,
                  fontWeight: 800,
                  boxShadow: '0 18px 50px rgba(0, 0, 0, 0.34)',
                  transformStyle: 'preserve-3d',
                  animation: diceOverlay.isRolling
                    ? 'dice-spin 0.7s linear infinite'
                    : 'none',
                }}
              >
                {diceOverlay.dice?.[diceIndex] ?? '?'}
              </Flex>
            ))}
          </Flex>
          <Typography.Title level={3} style={{ margin: 0, color: '#fff' }}>
            {diceOverlay.isRolling
              ? 'Girando dados...'
              : `Resultado: ${diceOverlay.total}`}
          </Typography.Title>
        </Flex>
      ) : null}

      <Modal
        open={Boolean(pendingNewsForCurrentPlayer)}
        title="Notícia"
        mask={{ closable: false }}
        keyboard={false}
        closable={false}
        footer={
          <Button
            type="primary"
            loading={isSubmitting}
            onClick={handleConfirmPendingNews}
          >
            Ok
          </Button>
        }
      >
        {pendingNewsForCurrentPlayer ? (
          <Flex vertical gap={8} align="center" style={{ textAlign: 'center' }}>
            <Typography.Text
              strong
              style={{
                color:
                  pendingNewsForCurrentPlayer.card.type === 'LUCK'
                    ? '#237804'
                    : '#cf1322',
                fontSize: 18,
              }}
            >
              {pendingNewsForCurrentPlayer.card.action}
            </Typography.Text>
            <Typography.Text
              strong
              style={{
                color:
                  pendingNewsForCurrentPlayer.card.type === 'LUCK'
                    ? '#237804'
                    : '#cf1322',
                fontSize: 24,
              }}
            >
              {formatCurrency(pendingNewsForCurrentPlayer.card.amount)}
            </Typography.Text>
          </Flex>
        ) : null}
      </Modal>
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
            <Form form={debtPaymentForm} layout="vertical" requiredMark={false}>
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
        title="Vender título"
        onCancel={() => setTitleActionModal(null)}
        footer={
          <Space>
            <Button onClick={() => setTitleActionModal(null)}>Cancelar</Button>
            <Button
              type="primary"
              loading={isSubmitting}
              onClick={() => void handleCreateTitleSale()}
            >
              {saleMode === 'BANK' ? 'Vender ao banco' : 'Enviar proposta'}
            </Button>
          </Space>
        }
      >
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

                  return Promise.reject(new Error('Escolha o comprador.'));
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
            label={
              saleMode === 'BANK'
                ? 'Valor pago pelo banco'
                : 'Valor da proposta'
            }
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
      </Modal>
    </AppLayout>
  );
}
