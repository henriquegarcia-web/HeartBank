import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { Home } from './index';

vi.mock('@/api/gameService', () => ({
  GameError: class GameError extends Error {},
  createRoom: vi.fn(),
  subscribeRoomsSnapshot: vi.fn((callback: (rooms: unknown[]) => void) => {
    callback([]);

    return vi.fn();
  }),
}));

describe('Home', () => {
  it('renders the room creation and room list actions', () => {
    renderWithProviders(<Home />);

    expect(screen.getAllByText('Criar sala')).toHaveLength(2);
    expect(screen.getByLabelText('Nome da sala')).toBeInTheDocument();
    expect(screen.getByText('Salas criadas')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Criar sala' }),
    ).toBeInTheDocument();
  });
});
