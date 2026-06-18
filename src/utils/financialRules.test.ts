import { describe, expect, it } from 'vitest';

import {
  calculateAmountWithInterest,
  calculateAmountWithoutInterest,
  getDebtStage,
} from './financialRules';

describe('financial rules', () => {
  it('calculates player loan repayment by interest rate', () => {
    expect(calculateAmountWithInterest(1000, 10)).toBe(1100);
    expect(calculateAmountWithInterest(333.33, 12.5)).toBe(375);
  });

  it('calculates interest discount for the interest calculator', () => {
    expect(calculateAmountWithoutInterest(1000, 10)).toBe(900);
  });

  it('classifies debt stages by title asset value', () => {
    expect(getDebtStage(499, 1000)).toBe(0);
    expect(getDebtStage(500, 1000)).toBe(1);
    expect(getDebtStage(800, 1000)).toBe(2);
    expect(getDebtStage(1000, 1000)).toBe(3);
    expect(getDebtStage(250, 0)).toBe(0);
  });
});
