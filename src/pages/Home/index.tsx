import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuTrash2 } from 'react-icons/lu';

import {
  createRoom,
  deleteRoomByMasterPassword,
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

type DeleteRoomFormValues = {
  masterPassword?: string;
};

const MASTER_DELETE_PASSWORD = import.meta.env
  .VITE_MASTER_ROOM_DELETE_PASSWORD as string | undefined;

export function Home() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateRoomFormValues>();
  const [deleteForm] = Form.useForm<DeleteRoomFormValues>();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<RoomListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const openDeleteRoomModal = (room: RoomListItem) => {
    deleteForm.resetFields();
    setRoomToDelete(room);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!roomToDelete) {
      return;
    }

    try {
      const values = await deleteForm.validateFields();

      if (!MASTER_DELETE_PASSWORD) {
        message.error('Senha mestra de exclusão não configurada.');
        return;
      }

      if (values.masterPassword !== MASTER_DELETE_PASSWORD) {
        message.error('Senha mestra inválida.');
        return;
      }

      setIsDeleting(true);
      await deleteRoomByMasterPassword(roomToDelete.id);
      message.success('Sala excluída.');
      setRoomToDelete(null);
      deleteForm.resetFields();
    } catch (error) {
      if (error instanceof GameError) {
        message.error(error.message);
        return;
      }

      if (error instanceof Error && !('errorFields' in error)) {
        message.error('Não foi possível excluir a sala.');
      }
    } finally {
      setIsDeleting(false);
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
                    <Space>
                      <Button
                        onClick={() => navigate(`/sala/${room.code}/nome`)}
                      >
                        Entrar
                      </Button>
                      <Button
                        aria-label="Excluir sala"
                        danger
                        icon={<LuTrash2 />}
                        onClick={() => openDeleteRoomModal(room)}
                      />
                    </Space>
                  </Flex>
                ))}
              </Flex>
            ) : (
              <Empty description="Nenhuma sala criada" />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        open={Boolean(roomToDelete)}
        title="Excluir sala?"
        okText="Excluir"
        cancelText="Cancelar"
        okButtonProps={{ danger: true, loading: isDeleting }}
        onOk={() => void handleConfirmDeleteRoom()}
        onCancel={() => setRoomToDelete(null)}
      >
        <Flex vertical gap={12}>
          <Typography.Text>
            Confirme a senha mestra para excluir {roomToDelete?.name}.
          </Typography.Text>
          <Form form={deleteForm} layout="vertical" requiredMark={false}>
            <Form.Item
              name="masterPassword"
              label="Senha mestra"
              rules={[{ required: true, message: 'Informe a senha mestra.' }]}
            >
              <Input.Password autoFocus placeholder="Senha mestra" />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    </AppLayout>
  );
}

export { CREATOR_ROOM_CODE_KEY };
