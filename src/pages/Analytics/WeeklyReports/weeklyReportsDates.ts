import {
  formatDisplayDate,
  formatIsoDisplayDateTime,
} from '../../../utils/dateDisplay';

/** Week period as panel-standard `dd/MM/yyyy – dd/MM/yyyy`. */
export function formatWeeklyPeriodLabel(
  weekStart?: string | null,
  weekEnd?: string | null
): string {
  const from = formatDisplayDate((weekStart || '').slice(0, 10));
  const to = formatDisplayDate((weekEnd || '').slice(0, 10));
  if (from && to) return `${from} – ${to}`;
  return from || to || '';
}

/** Delivery / sent timestamp as `dd/MM/yyyy HH:mm`, falling back to date-only. */
export function formatWeeklyDeliveryDate(
  sentAt?: string | null,
  deliveryDate?: string | null
): string {
  const withTime = formatIsoDisplayDateTime(sentAt);
  if (withTime) return withTime;
  return formatDisplayDate((deliveryDate || '').slice(0, 10));
}

/** Filter / KPI range labels as `dd/MM/yyyy`. */
export function formatWeeklyDateLabel(ymd?: string | null): string {
  if (!ymd) return '';
  return formatDisplayDate(ymd.slice(0, 10)) || ymd;
}
