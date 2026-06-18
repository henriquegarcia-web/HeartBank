export type DebtStage = 0 | 1 | 2 | 3;

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const calculateInterestAmount = (
  amount: number,
  interestRate: number,
) => roundMoney(amount * (interestRate / 100));

export const calculateAmountWithInterest = (
  amount: number,
  interestRate: number,
) => roundMoney(amount + calculateInterestAmount(amount, interestRate));

export const calculateAmountWithoutInterest = (
  amount: number,
  interestRate: number,
) => roundMoney(amount - calculateInterestAmount(amount, interestRate));

export const getDebtStage = (
  debtAmount: number,
  titleAssetValue: number,
): DebtStage => {
  if (debtAmount <= 0 || titleAssetValue <= 0) {
    return 0;
  }

  const debtRatio = debtAmount / titleAssetValue;

  if (debtRatio >= 1) {
    return 3;
  }

  if (debtRatio >= 0.8) {
    return 2;
  }

  if (debtRatio >= 0.5) {
    return 1;
  }

  return 0;
};

export const isDebtStageBlockingPurchases = (stage: DebtStage) => stage >= 1;
