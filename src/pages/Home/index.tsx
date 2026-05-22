import { App, Button, Card, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createRoom, enterRoomByCode, GameError } from '@/api/gameService';
import { AppLayout } from '@/components/ui';

const CREATOR_ROOM_CODE_KEY = 'coracao-bank.creator-room-code';

export function Home() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);

    try {
      const room = await createRoom();
      sessionStorage.setItem(CREATOR_ROOM_CODE_KEY, room.code);
      navigate(`/sala/${room.code}/nome`);
    } catch (error) {
      message.error(
        error instanceof GameError
          ? error.message
          : 'Nao foi possivel criar a sessao.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnterRoom = async () => {
    setIsEntering(true);

    try {
      const room = await enterRoomByCode(roomCode);
      navigate(`/sala/${room.code}/nome`);
    } catch (error) {
      message.error(
        error instanceof GameError ? error.message : 'Sessao nao encontrada.',
      );
    } finally {
      setIsEntering(false);
    }
  };

  return (
    <AppLayout>
      <Flex
        align="center"
        justify="center"
        style={{ minHeight: 'calc(100vh - 160px)' }}
      >
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Flex vertical gap={24}>
            <Flex vertical gap={4}>
              <Typography.Title level={1} style={{ margin: 0 }}>
                Banco Imobiliario
              </Typography.Title>
              <Typography.Text type="secondary">
                Controle o dinheiro da mesa por sessao.
              </Typography.Text>
            </Flex>

            <Button
              block
              size="large"
              type="primary"
              loading={isCreating}
              onClick={handleCreateRoom}
            >
              Criar sessao
            </Button>

            <Form layout="vertical" requiredMark={false} onFinish={handleEnterRoom}>
              <Form.Item label="Codigo da sessao" htmlFor="room-code" required>
                <Input
                  id="room-code"
                  size="large"
                  value={roomCode}
                  placeholder="ABC123"
                  onChange={(event) =>
                    setRoomCode(event.target.value.toUpperCase())
                  }
                />
              </Form.Item>
              <Button
                block
                size="large"
                htmlType="submit"
                loading={isEntering}
              >
                Entrar em sessao
              </Button>
            </Form>
          </Flex>
        </Card>
      </Flex>
    </AppLayout>
  );
}

export { CREATOR_ROOM_CODE_KEY };
