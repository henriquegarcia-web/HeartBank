import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { Home } from './index';

describe('Home', () => {
  it('renders the home page title and form', () => {
    renderWithProviders(<Home />);

    expect(
      screen.getByRole('heading', {
        name: 'Boilerplate React pronto para evoluir',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });
});
