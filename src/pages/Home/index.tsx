import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Row,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createRoom,
  GameError,
  subscribeRoomsSnapshot,
} from '@/api/gameService';
import { AppLayout } from '@/components/ui';
import type { FirebaseRecord } from '@/types/firebase';
import type { Room } from '@/types/game';

const CREATOR_ROOM_CODE_KEY = 'coracao-bank.creator-room-code';

type RoomListItem = FirebaseRecord<Room> & {
  player_count: number;
};

type CreateRoomFormValues = {
  roomName?: string;
};

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Ainda nao jogada';

export function Home() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateRoomFormValues>();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeRoomsSnapshot((snapshot) => {
      setRooms(snapshot);
      setIsLoadingRooms(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateRoom = async (values: CreateRoomFormValues) => {
    setIsCreating(true);

    try {
      const room = await createRoom(values.roomName ?? '');
      sessionStorage.setItem(CREATOR_ROOM_CODE_KEY, room.code);
      form.resetFields();
      navigate(`/sala/${room.code}/nome`);
    } catch (error) {
      message.error(
        error instanceof GameError
          ? error.message
          : 'Nao foi possivel criar a sala.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const roomColumns: ColumnsType<RoomListItem> = [
    {
      title: 'Sala',
      dataIndex: 'name',
      render: (name: string, room) => (
        <Flex vertical gap={2}>
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Codigo {room.code}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Criada em',
      dataIndex: 'created_at',
      responsive: ['md'],
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Ultimo dia jogado',
      dataIndex: 'last_played_at',
      responsive: ['lg'],
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: 'Jogadores',
      dataIndex: 'player_count',
      align: 'center',
      width: 110,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      width: 110,
      render: (_, room) => (
        <Button onClick={() => navigate(`/sala/${room.code}/nome`)}>
          Entrar
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <Row gutter={[16, 16]} justify="center">
        <Col xs={24} lg={8}>
          <Card title="Criar sala">
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={handleCreateRoom}
            >
              <Form.Item
                name="roomName"
                label="Nome da sala"
                rules={[{ required: true, message: 'Informe o nome da sala.' }]}
              >
                <Input size="large" placeholder="Mesa de sabado" />
              </Form.Item>
              <Button
                block
                size="large"
                type="primary"
                htmlType="submit"
                loading={isCreating}
              >
                Criar sala
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Salas criadas">
            <Table
              rowKey="id"
              columns={roomColumns}
              dataSource={rooms}
              loading={isLoadingRooms}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </AppLayout>
  );
}

export { CREATOR_ROOM_CODE_KEY };
