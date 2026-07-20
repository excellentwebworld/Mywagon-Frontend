import type { ErpOrder } from './types';
import {
  calendarDaysFromToday,
  formatCalendarDate,
  formatErpLastUpdate,
} from '../../utils/timezone';

export {
  formatErpLastUpdate,
  getBrowserTimezone,
  parseUtcIsoDate,
} from '../../utils/timezone';

export const ERP_SOURCE_STYLE = {
  icon: '📥',
  bg: '#EDE9FE',
  fg: '#5B21B6',
  bd: '#DDD6FE',
  labelKey: 'erpOrdersSourceErp',
} as const;

export function daysFromToday(iso: string): number | null {
  return calendarDaysFromToday(iso);
}

export type UrgencyKind = 'today' | 'tomorrow' | 'in2' | 'in3';

export function getShipUrgency(
  shipDate: string,
  t: (key: string) => string
): { label: string; bg: string; fg: string; bd: string } | null {
  const days = daysFromToday(shipDate);
  if (days === null) return null;
  if (days === 0) return { label: t('erpOrdersUpcomingToday'), bg: '#FEF2F2', fg: '#EF4444', bd: '#FECACA' };
  if (days === 1) return { label: t('erpOrdersUpcomingTomorrow'), bg: '#FFF7ED', fg: '#EA580C', bd: '#FED7AA' };
  if (days === 2) return { label: t('erpOrdersUpcomingIn2'), bg: '#FFFBEB', fg: '#D97706', bd: '#FDE68A' };
  if (days === 3) return { label: t('erpOrdersUpcomingIn3'), bg: '#FEFCE8', fg: '#CA8A04', bd: '#FEF08A' };
  return null;
}

export function formatShipDate(d: string): string {
  if (!d) return '—';
  const m = d.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const local = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return local.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return formatCalendarDate(d);
}

export function formatDateTime(d: string): string {
  return formatErpLastUpdate(d);
}

export function getOrderListTotals(order: Partial<ErpOrder> | null | undefined) {
  const lines = Array.isArray(order?.lines) ? order.lines : [];
  const lineCount = order?.productCount ?? lines.length ?? 0;
  let pallets = 0;
  let weightKg = 0;

  for (const line of lines) {
    const unit = (line.unit || '').toLowerCase();
    if (unit.includes('pallet') && line.quantity != null) pallets += line.quantity;
    if (line.weight != null) {
      const wUnit = (line.weightUnit || '').toLowerCase();
      weightKg += wUnit.startsWith('t') ? line.weight * 1000 : line.weight;
    }
  }

  if (lineCount > 0 && pallets === 0 && weightKg === 0) {
    pallets = Math.max(1, Math.ceil(lineCount / 2));
  }

  return {
    lineCount,
    pallets,
    weightTons: (weightKg / 1000).toFixed(1),
  };
}

export function shouldSuggestSplit(order: Partial<ErpOrder> | null | undefined): boolean {
  return getOrderListTotals(order).pallets > 30;
}

export function isUpcoming48h(shipDate: string): boolean {
  const days = daysFromToday(shipDate);
  return days !== null && days >= 0 && days <= 2;
}

export function formatProductsPreview(preview: string | undefined, productCount: number): string {
  if (preview) return preview;
  if (productCount <= 0) return '—';
  return String(productCount);
}

export function truncateText(value: string, max = 30): string {
  if (!value) return '—';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
