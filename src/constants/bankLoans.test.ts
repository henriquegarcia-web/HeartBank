import { describe, expect, it } from 'vitest';

import {
  BANK_LOAN_INTEREST_AMOUNT,
  getBankLoanAmountByNetWorth,
  getBankLoanDebtAmount,
} from './bankLoans';

describe('bank loan rules', () => {
  it('keeps the available loan amount based on net worth', () => {
    expect(getBankLoanAmountByNetWorth(1500)).toBe(2000);
  });

  it('adds fixed interest to the bank loan debt amount', () => {
    expect(getBankLoanDebtAmount(2000)).toBe(2500);
    expect(getBankLoanDebtAmount(3000)).toBe(
      3000 + BANK_LOAN_INTEREST_AMOUNT,
    );
  });

  it('does not reinterpret already stored debt values', () => {
    const existingDebtAmount = 2000;

    expect(existingDebtAmount).toBe(2000);
    expect(getBankLoanDebtAmount(existingDebtAmount)).toBe(2500);
  });
});
