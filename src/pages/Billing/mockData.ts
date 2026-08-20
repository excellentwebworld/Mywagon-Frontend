import i18n from 'i18next';
import { formatDisplayDateFromIso } from '../../utils/dateDisplay';
import { downloadBlob } from '../../utils/webviewDownload';

export function formatCurrency(val: number, cur: string = 'EUR', overrideLocale?: string): string {
  const symbol = cur === 'USD' ? '$' : cur === 'GBP' ? '£' : '€';
  const lang = overrideLocale || i18n.language || 'en';
  const loc = lang === 'el' || lang === 'greek' ? 'el-GR' : 'en-US';
  return `${symbol}${Number(val || 0).toLocaleString(loc, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function canSubmitBankReceipt(inv: import('../../api/types/billing').Invoice): boolean {
  if (inv.rem <= 0 || inv.status === 'Paid' || inv.status === 'Voided') return false;
  if (inv.under_process || inv.bank_transfer_admin_status === 'uploaded') return false;
  if (inv.can_bank_transfer === false) return false;
  return true;
}

/** Display dates as dd/MM/yyyy — same as Create Shipment. */
export function formatDate(dStr: string | null | undefined, _locale: string = 'en'): string {
  if (!dStr || dStr === 'null' || dStr === 'undefined') return '—';
  return formatDisplayDateFromIso(dStr) || dStr;
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
  void downloadBlob(blob, filename, `${mimeType};charset=utf-8`);
}
