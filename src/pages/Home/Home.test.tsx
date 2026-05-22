import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { Home } from './index';

vi.mock('@/api/gameService', () => ({
  GameError: class GameError extends Error {},
  createRoom: vi.fn(),
  enterRoomByCode: vi.fn(),
}));

describe('Home', () => {
  it('renders the session entry actions', () => {
    renderWithProviders(<Home />);

    expect(
      screen.getByRole('heading', {
        name: 'Banco Imobiliario',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Criar sessao' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Codigo da sessao')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Entrar em sessao' }),
    ).toBeInTheDocument();
  });
});
