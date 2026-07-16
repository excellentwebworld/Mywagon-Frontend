const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

export function currencySymbol(currency?: string | null): string {
  const code = (currency || 'EUR').toUpperCase();
  return CURRENCY_SYMBOLS[code] || `${code} `;
}

export function formatMoney(
  amount: number | null | undefined,
  currency?: string | null,
  fallback = '—'
): string {
  if (amount == null || Number.isNaN(amount)) return fallback;
  return `${currencySymbol(currency)} ${amount.toLocaleString()}`;
}
