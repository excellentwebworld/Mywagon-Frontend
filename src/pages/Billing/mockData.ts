import i18n from 'i18next';
import type { TFunction } from 'i18next';
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
  if (inv.rem <= 0 || isInvoicePaid(inv.status) || normalizeInvoiceStatus(inv.status) === 'voided') return false;
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

/** Months from account registration through the current month, newest first.
 * Values stay English (`F Y`) for the billing API; pass `locale` for display labels. */
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
    // Always English for API monthToDateRange('F Y')
    options.push(cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return options;
}

/** Localize an English `F Y` period label (e.g. "September 2026") for UI display. */
export function formatStatementPeriodLabel(period: string, lang?: string): string {
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(period.trim());
  if (!match) return period;
  const parsed = new Date(Date.parse(`${match[1]} 1, ${match[2]}`));
  if (Number.isNaN(parsed.getTime())) return period;
  const locale = (lang || i18n.language || 'en').toLowerCase().startsWith('el') ? 'el-GR' : 'en-US';
  return parsed.toLocaleString(locale, { month: 'long', year: 'numeric' });
}

const LEGACY_STATUS_SLUGS: Record<string, string> = {
  Paid: 'paid',
  Unpaid: 'unpaid',
  Overdue: 'overdue',
  Voided: 'voided',
  Draft: 'draft',
};

const LEGACY_TYPE_SLUGS: Record<string, string> = {
  Subscription: 'subscription',
  'Add-on': 'add-on',
  'Commission with penalty': 'commission-with-penalty',
  Penalty: 'commission-with-penalty',
  Commission: 'commission-with-penalty',
  'Credit note': 'credit-note',
};

/** Normalize API / legacy invoice status to Laravel slug key. */
export function normalizeInvoiceStatus(status: string): string {
  const trimmed = (status || '').trim();
  return LEGACY_STATUS_SLUGS[trimmed] ?? trimmed.toLowerCase();
}

/** Normalize API / legacy invoice type to Laravel slug key. */
export function normalizeInvoiceType(type: string): string {
  const trimmed = (type || '').trim();
  return LEGACY_TYPE_SLUGS[trimmed] ?? trimmed.toLowerCase();
}

export function isInvoicePaid(status: string): boolean {
  return normalizeInvoiceStatus(status) === 'paid';
}

export function isInvoiceOverdue(status: string): boolean {
  return normalizeInvoiceStatus(status) === 'overdue';
}

/** Label via billingPage.{slug} — same keys as Laravel Shipper Web translations. */
export function billingCatalogLabel(slug: string, t: TFunction): string {
  const key = (slug || '').trim();
  if (!key) return '';
  const nested = t(`billingPage.${key}`, '');
  if (nested && nested !== `billingPage.${key}`) return nested;
  return t(key, key);
}

export function invoiceStatusLabel(
  statusOrInvoice: string | { status: string; status_label?: string | null },
  t: TFunction,
): string {
  if (typeof statusOrInvoice === 'object') {
    if (statusOrInvoice.status_label) return statusOrInvoice.status_label;
    return billingCatalogLabel(normalizeInvoiceStatus(statusOrInvoice.status), t);
  }
  return billingCatalogLabel(normalizeInvoiceStatus(statusOrInvoice), t);
}

export function invoiceTypeLabel(
  typeOrInvoice: string | { type: string; type_label?: string | null },
  t: TFunction,
): string {
  if (typeof typeOrInvoice === 'object') {
    if (typeOrInvoice.type_label) return typeOrInvoice.type_label;
    return billingCatalogLabel(normalizeInvoiceType(typeOrInvoice.type), t);
  }
  return billingCatalogLabel(normalizeInvoiceType(typeOrInvoice), t);
}

/** Localize known wallet movement reason strings (API may return English stored text). */
export function walletReasonLabel(reason: string, t: TFunction): string {
  if (!reason) return reason;
  const known: Record<string, string> = {
    'Incentive Achieved: Bonus Earned': 'billingPage.reasonIncentiveBonus',
    'Wallet credit': 'billingPage.reasonWalletCredit',
    'Wallet debit': 'billingPage.reasonWalletDebit',
  };
  const key = known[reason];
  return key ? t(key, reason) : reason;
}

export function downloadFileBlob(filename: string, content: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
  void downloadBlob(blob, filename, `${mimeType};charset=utf-8`);
}
