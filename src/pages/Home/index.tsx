import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Row,
  Typography,
} from 'antd';
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
          : 'Não foi possível criar a sala.',
      );
    } finally {
      setIsCreating(false);
    }
  };

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
                label="Nome da Sala"
                rules={[{ required: true, message: 'Informe o nome da sala.' }]}
              >
                <Input size="large" placeholder="Mesa de Sábado" />
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
          <Card title="Salas criadas" loading={isLoadingRooms}>
            {rooms.length > 0 ? (
              <Flex vertical gap={8}>
                {rooms.map((room) => (
                  <Flex
                    key={room.id}
                    align="center"
                    justify="space-between"
                    gap={16}
                    wrap="wrap"
                    style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <Typography.Text strong>
                      {room.name} - {room.player_count} jogadores
                    </Typography.Text>
                    <Button onClick={() => navigate(`/sala/${room.code}/nome`)}>
                      Entrar
                    </Button>
                  </Flex>
                ))}
              </Flex>
            ) : (
              <Empty description="Nenhuma sala criada" />
            )}
          </Card>
        </Col>
      </Row>
    </AppLayout>
  );
}

export { CREATOR_ROOM_CODE_KEY };
