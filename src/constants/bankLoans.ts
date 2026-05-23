export type BankLoanTier = {
  minNetWorth: number;
  maxNetWorth: number | null;
  loanAmount: number;
};

export const BANK_LOAN_TIERS: BankLoanTier[] = [
  { minNetWorth: 0, maxNetWorth: 5000, loanAmount: 2000 },
  { minNetWorth: 5001, maxNetWorth: 10000, loanAmount: 3000 },
  { minNetWorth: 10001, maxNetWorth: 15000, loanAmount: 4000 },
  { minNetWorth: 15001, maxNetWorth: null, loanAmount: 5000 },
];

export const getBankLoanAmountByNetWorth = (netWorth: number) =>
  BANK_LOAN_TIERS.find(
    (tier) =>
      netWorth >= tier.minNetWorth &&
      (tier.maxNetWorth === null || netWorth <= tier.maxNetWorth),
  )?.loanAmount ?? BANK_LOAN_TIERS[0].loanAmount;
