import { formatDisplayDateFromIso } from '../../utils/dateDisplay';

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

export function formatDate(dStr: string | null | undefined, _locale: string = 'en'): string {
  if (!dStr || dStr === 'null' || dStr === 'undefined') return '—';
  const formatted = formatDisplayDateFromIso(dStr);
  return formatted || dStr;
}

export function csvDate(dStr: string | null | undefined): string {
  if (!dStr || dStr === 'null' || dStr === 'undefined') return '';
  return dStr;
}

/** Months from account registration through the current month, newest first. */
export function buildStatementPeriodOptions(registeredAt?: string | null, now: Date = new Date()): string[] {
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  let start = new Date(end);

  if (registeredAt) {
    const match = /^(\d{4})-(\d{2})/.exec(registeredAt);
    if (match) {
      start = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    } else {
      const parsed = new Date(registeredAt);
      if (!Number.isNaN(parsed.getTime())) {
        start = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    }
  }

  if (start > end) {
    start = new Date(end);
  }

  const options: string[] = [];
  const cursor = new Date(end);
  while (cursor >= start) {
    options.push(cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return options;
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
