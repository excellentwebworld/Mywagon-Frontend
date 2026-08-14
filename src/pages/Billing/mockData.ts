export type { Invoice, LineItem, CreditNote, ActivityItem } from './types';

export const INITIAL_LINE_ITEMS: Record<string, import('./types').LineItem[]> = {
  DEFAULT: [],
};

export function formatCurrency(val: number, cur: string = 'EUR'): string {
  const symbol = cur === 'USD' ? '$' : cur === 'GBP' ? '£' : '€';
  return `${symbol}${Number(val || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function canSubmitBankReceipt(inv: import('./types').Invoice): boolean {
  if (inv.rem <= 0 || inv.status === 'Paid' || inv.status === 'Voided') return false;
  if (inv.under_process || inv.bank_transfer_admin_status === 'uploaded') return false;
  if (inv.can_bank_transfer === false) return false;
  return true;
}

export function formatDate(dStr: string | null | undefined, locale: string = 'en'): string {
  if (!dStr) return '—';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  return d.toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function downloadFileBlob(filename: string, content: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
