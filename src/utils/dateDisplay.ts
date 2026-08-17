/** Display helpers: European dd/MM/yyyy + 24h HH:mm (matches DatePicker placeholders). */

export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';
export const DISPLAY_TIME_FORMAT = 'HH:mm';
export const DISPLAY_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

export function getPreferredDateLocale(): string {
  return 'en-GB';
}

function parseYmd(ymd: string): Date | null {
  const trimmed = (ymd || '').trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Format ISO / date-parseable value as dd/MM/yyyy (same as create shipment). */
export function formatDisplayDateFromIso(iso?: string | null): string {
  if (!iso) return '';
  const trimmed = iso.trim();
  const ymd = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return formatDisplayDate(ymd);
  }
  const d = new Date(trimmed.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return trimmed;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/** Format YYYY-MM-DD for display as dd/MM/yyyy. */
export function formatDisplayDate(ymd: string): string {
  const date = parseYmd(ymd);
  if (!date) return ymd || '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format HH:mm for display as 24h.
 * Values already in HH:mm are returned as-is; otherwise format with hour12: false.
 */
export function formatDisplayTime(hm: string): string {
  const trimmed = (hm || '').trim();
  if (!trimmed) return '';
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  const parsed = new Date(`1970-01-01T${trimmed}`);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Combine date + optional time for appointment labels (`dd/MM/yyyy HH:mm`). */
export function formatDisplayDateTime(ymd?: string, hm?: string): string {
  if (!ymd) return '';
  let label = formatDisplayDate(ymd);
  if (hm) label += ` ${formatDisplayTime(hm)}`;
  return label;
}

/**
 * Format an ISO / Date-parseable timestamp as `dd/MM/yyyy HH:mm` (en-GB, 24h).
 */
export function formatIsoDisplayDateTime(iso?: string | null): string {
  if (!iso) return '';
  const normalized = typeof iso === 'string' ? iso.trim().replace(' ', 'T') : String(iso);
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
