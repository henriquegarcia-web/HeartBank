import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  InputNumber,
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
  deleteRoom,
  enterRoomByCode,
  GameError,
  moveMoney,
  subscribeRoomSnapshot,
} from '@/api/gameService';
import { AppLayout } from '@/components/ui';
import type { FirebaseRecord } from '@/types/firebase';
import type { Debt, Player, Transaction } from '@/types/game';
import { formatCurrency } from '@/utils/formatters';

type MoneyFormValues = {
  playerId?: string;
  amount?: number;
  reason?: string;
};

type RoomState = {
  id: string;
  name: string;
  players: Array<FirebaseRecord<Player>>;
  transactions: Array<FirebaseRecord<Transaction>>;
  debts: Array<FirebaseRecord<Debt>>;
  roomCode: string;
};

type RankingPlayer = FirebaseRecord<Player> & {
  assetValue: number;
  rankingValue: number;
};

const QUICK_AMOUNTS = [20, 50, 100, 500, 1000];

const PIX_REASON_OPTIONS = ['Aluguel', 'Acoes', 'Comprar Propriedade'].map(
  (reason) => ({
    label: reason,
    value: reason,
  }),
);

const BANK_PAYMENT_REASON_OPTIONS = [
  'Compra de Terreno',
  'Compra de Acao',
  'Compra de Casa',
  'Compra de Hotel',
  'Noticia',
  'Imposto',
  'Fianca',
].map((reason) => ({
  label: reason,
  value: reason,
}));

const BANK_ACTION_REASON_OPTIONS = [
  'Noticia',
  'Bonus de Rodada',
  'Restituicao do Imposto',
].map((reason) => ({
  label: reason,
  value: reason,
}));

const ASSET_REASONS = new Set([
  'Compra de Terreno',
  'Compra de Casa',
  'Compra de Hotel',
]);

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

export function GameRoom() {
  const { message, modal, notification } = App.useApp();
  const navigate = useNavigate();
  const { code, playerId } = useParams<{ code: string; playerId: string }>();
  const [state, setState] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pixForm] = Form.useForm<MoneyFormValues>();
  const [bankPaymentForm] = Form.useForm<MoneyFormValues>();
  const [adminForm] = Form.useForm<MoneyFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const seenTransactionIdsRef = useRef<Set<string>>(new Set());
  const didInitializeNotificationsRef = useRef(false);

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
        message: 'Pix recebido',
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

  const currentPlayerDebts = useMemo(
    () =>
      (state?.debts ?? []).filter((debt) => debt.from_player_id === playerId),
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

  const rankedPlayers = useMemo<RankingPlayer[]>(() => {
    const transactions = state?.transactions ?? [];

    return (state?.players ?? [])
      .map((player) => {
        const assetValue = transactions
          .filter(
            (transaction) =>
              transaction.from_player_id === player.id &&
              ASSET_REASONS.has(transaction.reason ?? '') &&
              (transaction.type === 'PLAYER_TO_BANK' ||
                transaction.type === 'BANK_CHARGE_PLAYER'),
          )
          .reduce((total, transaction) => total + transaction.amount, 0);

        return {
          ...player,
          assetValue,
          rankingValue: roundMoney(player.balance + assetValue),
        };
      })
      .sort((a, b) => b.rankingValue - a.rankingValue);
  }, [state?.players, state?.transactions]);

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
      pixForm.resetFields();
      bankPaymentForm.resetFields();
      adminForm.resetFields();
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

  const handlePix = (values: MoneyFormValues) =>
    executeAction(
      () =>
        moveMoney({
          roomId: currentPlayer?.room_id ?? '',
          type: 'PLAYER_TO_PLAYER',
          amount: values.amount ?? 0,
          fromPlayerId: playerId,
          toPlayerId: values.playerId ?? null,
          executedByPlayerId: playerId,
          reason: values.reason,
        }),
      'Pix realizado.',
    );

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

  const handleDeleteRoom = () => {
    if (!state || !currentPlayer) {
      return;
    }

    modal.confirm({
      title: 'Excluir sala?',
      content: 'Esta acao remove a sala, jogadores, historico e dividas.',
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
    title: player.name,
    description: `Saldo: ${formatCurrency(player.balance)} - Patrimônio: ${formatCurrency(
      player.assetValue,
    )}`,
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

  return (
    <AppLayout>
      <Flex vertical gap={24}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card loading={isLoading}>
              <Flex justify="space-between" gap={16} wrap="wrap">
                <Flex vertical gap={4}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {state?.name} | Sala {state?.roomCode}
                  </Typography.Text>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {currentPlayer?.name}
                  </Typography.Title>
                  <Space>
                    {currentPlayer?.is_banker ? (
                      <Tag color="gold" style={{ width: 'fit-content' }}>
                        Banqueiro
                      </Tag>
                    ) : null}
                    {currentPlayer?.is_banker ? (
                      <Button size="small" danger onClick={handleDeleteRoom}>
                        Excluir sala
                      </Button>
                    ) : null}
                  </Space>
                </Flex>
                <Flex vertical align="flex-end" gap={4}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Saldo atual
                  </Typography.Text>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {formatCurrency(currentPlayer?.balance ?? 0)}
                  </Typography.Title>
                  {currentPlayerDebtTotal > 0 ? (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                      Dividas: {formatCurrency(currentPlayerDebtTotal)}
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
                    <Card title="Fazer Pix">
                      <Form
                        form={pixForm}
                        layout="vertical"
                        requiredMark={false}
                        onFinish={handlePix}
                      >
                        <Form.Item
                          name="playerId"
                          label="Jogador destino"
                          rules={[
                            { required: true, message: 'Escolha o jogador.' },
                          ]}
                        >
                          <Select
                            options={playerOptions}
                            placeholder="Selecione um jogador"
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
                            min={0.01}
                            precision={2}
                            style={{ width: '100%' }}
                            prefix="R$"
                          />
                        </Form.Item>
                        <QuickAmountButtons form={pixForm} />
                        <Form.Item
                          name="reason"
                          label="Motivo"
                          rules={[
                            { required: true, message: 'Escolha o motivo.' },
                          ]}
                        >
                          <Select
                            options={PIX_REASON_OPTIONS}
                            placeholder="Selecione o motivo"
                          />
                        </Form.Item>
                        <Flex gap={8} justify="end">
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={isSubmitting}
                          >
                            Confirmar Pix
                          </Button>
                        </Flex>
                      </Form>
                    </Card>
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

                  <Col xs={24} lg={10}>
                    <Card title="Dividas ativas">
                      <Table
                        rowKey="id"
                        columns={personalDebtColumns}
                        dataSource={currentPlayerDebts}
                        pagination={false}
                      />
                    </Card>
                  </Col>
                </Row>
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
    </AppLayout>
  );
}
