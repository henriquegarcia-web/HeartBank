const onlyDigits = (value: string) => value.replace(/\D/g, '');

const hasRepeatedDigits = (value: string) => /^(\d)\1+$/.test(value);

export const isFullName = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length >= 2;

export const isCep = (value: string) => onlyDigits(value).length === 8;

export const isPhone = (value: string) => {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
};

export const isCpf = (value: string) => {
  const digits = onlyDigits(value);

  if (digits.length !== 11 || hasRepeatedDigits(digits)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }

  const firstCheck = (sum * 10) % 11;
  const normalizedFirstCheck = firstCheck === 10 ? 0 : firstCheck;

  if (normalizedFirstCheck !== Number(digits[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }

  const secondCheck = (sum * 10) % 11;
  const normalizedSecondCheck = secondCheck === 10 ? 0 : secondCheck;

  return normalizedSecondCheck === Number(digits[10]);
};

export const isCnpj = (value: string) => {
  const digits = onlyDigits(value);
  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weightsSecond = [6, ...weightsFirst];

  if (digits.length !== 14 || hasRepeatedDigits(digits)) {
    return false;
  }

  const calculate = (weights: number[]) => {
    const sum = weights.reduce(
      (accumulator, weight, index) =>
        accumulator + Number(digits[index]) * weight,
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    calculate(weightsFirst) === Number(digits[12]) &&
    calculate(weightsSecond) === Number(digits[13])
  );
};

export const isCpfOrCnpj = (value: string) => {
  const digits = onlyDigits(value);
  return digits.length <= 11 ? isCpf(digits) : isCnpj(digits);
};

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
