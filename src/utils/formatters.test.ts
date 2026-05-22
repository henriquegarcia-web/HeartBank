import { describe, expect, it } from 'vitest';

import {
  formatCep,
  formatCnpj,
  formatCpf,
  formatCpfOrCnpj,
  formatCurrency,
  formatPhone,
  getNameInitials,
} from './formatters';

describe('formatters', () => {
  it('formats Brazilian documents and contact values', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
    expect(formatCnpj('12345678000199')).toBe('12.345.678/0001-99');
    expect(formatCpfOrCnpj('12345678901')).toBe('123.456.789-01');
    expect(formatCep('60123456')).toBe('60123-456');
    expect(formatPhone('85999998888')).toBe('(85) 99999-8888');
  });

  it('formats money and initials', () => {
    expect(formatCurrency(1200)).toContain('1.200,00');
    expect(getNameInitials('Maria Silva Souza')).toBe('MS');
  });
});
