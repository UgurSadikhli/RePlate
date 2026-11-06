export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AZN';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AZN: '₼',
};

export const getCurrencySymbol = (code?: string): string => {
  if (!code) return '$';
  return CURRENCY_SYMBOLS[code] || code;
};

export const formatCurrency = (amount: number, code?: string): string => {
  const numericAmount = Number.isFinite(amount) ? amount : 0;
  return `${getCurrencySymbol(code)}${numericAmount.toFixed(2)}`;
};
