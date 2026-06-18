import { describe, expect, it } from 'vitest';

import {
  BANK_LOAN_INTEREST_RATE,
  getBankLoanAmountByNetWorth,
  getBankLoanDebtAmount,
} from './bankLoans';

describe('bank loan rules', () => {
  it('keeps the available loan amount based on net worth', () => {
    expect(getBankLoanAmountByNetWorth(1500)).toBe(2000);
  });

  it('adds 20 percent interest to the bank loan debt amount', () => {
    expect(getBankLoanDebtAmount(2000)).toBe(2400);
    expect(getBankLoanDebtAmount(3000)).toBe(
      3000 + 3000 * (BANK_LOAN_INTEREST_RATE / 100),
    );
  });

  it('does not reinterpret already stored debt values', () => {
    const existingDebtAmount = 2000;

    expect(existingDebtAmount).toBe(2000);
    expect(getBankLoanDebtAmount(existingDebtAmount)).toBe(2400);
  });
});
