import { Form } from 'antd';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/renderWithProviders';

import { TextInput } from './index';

type FormValues = {
  name: string;
};

function TextInputExample() {
  const { control } = useForm<FormValues>({
    defaultValues: {
      name: '',
    },
  });

  return (
    <Form>
      <TextInput
        control={control}
        name="name"
        label="Nome completo"
        placeholder="Digite seu nome completo"
      />
    </Form>
  );
}

describe('TextInput', () => {
  it('renders with label and placeholder', () => {
    renderWithProviders(<TextInputExample />);

    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Digite seu nome completo'),
    ).toBeInTheDocument();
  });
});
