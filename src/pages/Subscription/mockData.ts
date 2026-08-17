export function formatDate(d: string, locale = 'en'): string {
  return new Date(d).toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(amount: number, currency = 'EUR'): string {
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  return `${symbol}${Number(amount || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function usageTone(used: number, limit: number | null): 'ok' | 'warn' | 'crit' {
  if (limit == null || limit <= 0) return 'ok';
  const pct = Math.round((used / limit) * 100);
  if (pct >= 90) return 'crit';
  if (pct >= 70) return 'warn';
  return 'ok';
}
