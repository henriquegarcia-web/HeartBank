import { App, Button, Card, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  enterPlayerProfile,
  enterRoomByCode,
  GameError,
} from '@/api/gameService';
import { AppLayout } from '@/components/ui';
import { CREATOR_ROOM_CODE_KEY } from '@/pages/Home';

export function DefineName() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!code) {
    return <Navigate to="/" replace />;
  }

  const handleContinue = async () => {
    setIsSubmitting(true);

    try {
      const room = await enterRoomByCode(code);
      const creatorRoomCode = sessionStorage.getItem(CREATOR_ROOM_CODE_KEY);
      const player = await enterPlayerProfile({
        room,
        name,
        shouldBecomeBanker:
          creatorRoomCode?.trim().toUpperCase() === room.code.toUpperCase(),
      });

      if (player.is_banker) {
        sessionStorage.removeItem(CREATOR_ROOM_CODE_KEY);
      }

      navigate(`/sala/${room.code}/jogador/${player.id}`);
    } catch (error) {
      message.error(
        error instanceof GameError
          ? error.message
          : 'Nao foi possivel acessar o perfil.',
      );
    } finally {
      setIsSubmitting(false);
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
          <Form layout="vertical" requiredMark={false} onFinish={handleContinue}>
            <Flex vertical gap={16}>
              <Flex vertical gap={4}>
                <Typography.Text type="secondary">Codigo da sala</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0 }}>
                  {code.toUpperCase()}
                </Typography.Title>
              </Flex>

              <Form.Item label="Nome" htmlFor="player-name" required>
                <Input
                  id="player-name"
                  autoFocus
                  size="large"
                  value={name}
                  placeholder="Seu nome na mesa"
                  onChange={(event) => setName(event.target.value)}
                />
              </Form.Item>

              <Button
                block
                size="large"
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
              >
                Continuar
              </Button>
            </Flex>
          </Form>
        </Card>
      </Flex>
    </AppLayout>
  );
}
