import { describe, expect, it } from 'vitest';

import {
  isCep,
  isCnpj,
  isCpf,
  isCpfOrCnpj,
  isEmail,
  isFullName,
  isPhone,
} from './validators';

describe('validators', () => {
  it('validates common Brazilian fields', () => {
    expect(isFullName('Ana Souza')).toBe(true);
    expect(isCep('60123-456')).toBe(true);
    expect(isPhone('(85) 99999-8888')).toBe(true);
    expect(isCpf('529.982.247-25')).toBe(true);
    expect(isCnpj('11.222.333/0001-81')).toBe(true);
    expect(isCpfOrCnpj('52998224725')).toBe(true);
    expect(isEmail('ana@email.com')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isFullName('Ana')).toBe(false);
    expect(isCep('123')).toBe(false);
    expect(isCpf('111.111.111-11')).toBe(false);
    expect(isCnpj('11.111.111/1111-11')).toBe(false);
    expect(isEmail('ana')).toBe(false);
  });
});
