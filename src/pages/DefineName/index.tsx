import { App, Button, Card, Divider, Empty, Flex, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  enterPlayerProfile,
  enterRoomByCode,
  GameError,
  subscribeRoomSnapshot,
} from '@/api/gameService';
import { AppLayout } from '@/components/ui';
import { CREATOR_ROOM_CODE_KEY } from '@/pages/Home';
import type { FirebaseRecord } from '@/types/firebase';
import type { Player, Room } from '@/types/game';

export function DefineName() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [room, setRoom] = useState<FirebaseRecord<Room> | null>(null);
  const [players, setPlayers] = useState<Array<FirebaseRecord<Player>>>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  useEffect(() => {
    if (!code) {
      return undefined;
    }

    let unsubscribe = () => {};

    const loadRoomProfiles = async () => {
      const foundRoom = await enterRoomByCode(code);

      setRoom(foundRoom);
      unsubscribe = subscribeRoomSnapshot(foundRoom.id, (snapshot) => {
        setPlayers(snapshot?.players ?? []);
        setIsLoadingProfiles(false);
      });
    };

    loadRoomProfiles().catch(() => {
      setIsLoadingProfiles(false);
      setRoom(null);
      setPlayers([]);
    });

    return () => unsubscribe();
  }, [code]);

  if (!code) {
    return <Navigate to="/" replace />;
  }

  const enterProfile = async (profileName: string) => {
    setIsSubmitting(true);

    try {
      const currentRoom = room ?? (await enterRoomByCode(code));
      const creatorRoomCode = sessionStorage.getItem(CREATOR_ROOM_CODE_KEY);
      const player = await enterPlayerProfile({
        room: currentRoom,
        name: profileName,
        shouldBecomeBanker:
          creatorRoomCode?.trim().toUpperCase() ===
          currentRoom.code.toUpperCase(),
      });

      if (player.is_banker) {
        sessionStorage.removeItem(CREATOR_ROOM_CODE_KEY);
      }

      navigate(`/sala/${currentRoom.code}/jogador/${player.id}`);
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

  const handleContinue = () => enterProfile(name);

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

              <Divider style={{ margin: '4px 0' }}>Perfis existentes</Divider>

              <Card size="small" loading={isLoadingProfiles}>
                {players.length > 0 ? (
                  <Flex vertical gap={8}>
                    {players.map((player) => (
                      <Flex
                        key={player.id}
                        align="center"
                        justify="space-between"
                        gap={12}
                        wrap="wrap"
                      >
                        <Flex vertical gap={0}>
                          <Typography.Text strong>{player.name}</Typography.Text>
                          {player.is_banker ? (
                            <Typography.Text
                              type="secondary"
                              style={{ fontSize: 12 }}
                            >
                              Banqueiro
                            </Typography.Text>
                          ) : null}
                        </Flex>
                        <Button
                          size="small"
                          loading={isSubmitting}
                          onClick={() => void enterProfile(player.name)}
                        >
                          Entrar
                        </Button>
                      </Flex>
                    ))}
                  </Flex>
                ) : (
                  <Empty description="Nenhum perfil criado nesta sala" />
                )}
              </Card>
            </Flex>
          </Form>
        </Card>
      </Flex>
    </AppLayout>
  );
}
