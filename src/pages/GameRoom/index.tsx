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
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import {
  enterRoomByCode,
  GameError,
  moveMoney,
  subscribeRoomSnapshot,
} from '@/api/gameService';
import { AppLayout } from '@/components/ui';
import type { FirebaseRecord } from '@/types/firebase';
import type { Player, Transaction } from '@/types/game';
import { formatCurrency } from '@/utils/formatters';

type MoneyFormValues = {
  playerId?: string;
  amount?: number;
  reason?: string;
};

type RoomState = {
  players: Array<FirebaseRecord<Player>>;
  transactions: Array<FirebaseRecord<Transaction>>;
  roomCode: string;
};

const REASON_OPTIONS = [
  'Compra de Terreno',
  'Compra de Ação',
  'Compra de Casa',
  'Compra de Hotel',
  'Aluguel',
  'Notícia',
  'Ações',
  'Bônus de Rodada',
  'Empréstimo',
  'Banco',
].map((reason) => ({
  label: reason,
  value: reason,
}));

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
            | {getPlayerName(players, transaction.from_player_id)} →{' '}
            {getPlayerName(players, transaction.to_player_id)} |{' '}
            {transaction.reason || 'Sem motivo'}
          </Typography.Text>
        );
      })}
    </Flex>
  );
}

export function GameRoom() {
  const { message } = App.useApp();
  const { code, playerId } = useParams<{ code: string; playerId: string }>();
  const [state, setState] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pixForm] = Form.useForm<MoneyFormValues>();
  const [bankPaymentForm] = Form.useForm<MoneyFormValues>();
  const [adminForm] = Form.useForm<MoneyFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          players: snapshot.players,
          transactions: snapshot.transactions,
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

  const currentPlayer = useMemo(
    () => state?.players.find((player) => player.id === playerId) ?? null,
    [playerId, state?.players],
  );

  const playerOptions = useMemo(
    () =>
      (state?.players ?? []).map((player) => ({
        label: `${player.name} - ${formatCurrency(player.balance)}`,
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

  const playerColumns: ColumnsType<FirebaseRecord<Player>> = [
    {
      title: 'Jogador',
      dataIndex: 'name',
      render: (name: string, player) => (
        <Space>
          {name}
          {player.is_banker ? <Tag color="gold">Banqueiro</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Saldo',
      dataIndex: 'balance',
      align: 'right',
      render: (balance: number) => formatCurrency(balance),
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
                    Sala {state?.roomCode}
                  </Typography.Text>
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
                </Flex>
              </Flex>
            </Card>
          </Col>
        </Row>

        <Tabs
          items={[
            {
              key: 'player',
              label: 'Jogador',
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
                        <Form.Item
                          name="reason"
                          label="Motivo"
                          rules={[{ required: true, message: 'Escolha o motivo.' }]}
                        >
                          <Select
                            options={REASON_OPTIONS}
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
                        <Form.Item
                          name="reason"
                          label="Motivo"
                          rules={[{ required: true, message: 'Escolha o motivo.' }]}
                        >
                          <Select
                            options={REASON_OPTIONS}
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

                  <Col span={24}>
                    <Card title="Historico Individual">
                      <TransactionHistoryList
                        transactions={personalTransactions}
                        players={state?.players ?? []}
                        perspectivePlayerId={playerId}
                      />
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
                                  options={REASON_OPTIONS}
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
                        <Col xs={24} lg={14}>
                          <Card title="Jogadores e saldos">
                            <Table
                              rowKey="id"
                              columns={playerColumns}
                              dataSource={state?.players ?? []}
                              pagination={false}
                            />
                          </Card>
                        </Col>
                        <Col span={24}>
                          <Card title="Historico Geral">
                            <TransactionHistoryList
                              transactions={state?.transactions ?? []}
                              players={state?.players ?? []}
                            />
                          </Card>
                        </Col>
                      </Row>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Flex>
    </AppLayout>
  );
}
