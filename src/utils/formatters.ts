const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const formatNumber = (
  value: number,
  locale = 'pt-BR',
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(locale, options).format(value);

export const formatCep = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d{0,3})/, (_, first, second) =>
    second ? `${first}-${second}` : first,
  );
};

export const formatCurrency = (value: number, locale = 'pt-BR') =>
  formatNumber(value, locale, {
    style: 'currency',
    currency: 'BRL',
  });

export const getNameInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';

  return `${first}${last}`.toUpperCase();
};

export const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

export const formatCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const formatCpfOrCnpj = (value: string) => {
  const digits = onlyDigits(value);
  return digits.length <= 11 ? formatCpf(digits) : formatCnpj(digits);
};

export const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{0,4})(\d{0,4})/, (_, ddd, start, end) =>
      [ddd && `(${ddd}`, ddd && ') ', start, end && `-${end}`]
        .filter(Boolean)
        .join(''),
    );
  }

  return digits.replace(/^(\d{2})(\d{0,5})(\d{0,4})/, (_, ddd, start, end) =>
    [ddd && `(${ddd}`, ddd && ') ', start, end && `-${end}`]
      .filter(Boolean)
      .join(''),
  );
};
