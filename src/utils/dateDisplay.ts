/** Display helpers: European dd/mm/yyyy + 24h time (matches DatePicker placeholders). */

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

/** Format YYYY-MM-DD for display as dd/mm/yyyy. */
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

/** Combine date + optional time for appointment labels. */
export function formatDisplayDateTime(ymd?: string, hm?: string): string {
  if (!ymd) return '';
  let label = formatDisplayDate(ymd);
  if (hm) label += ` · ${formatDisplayTime(hm)}`;
  return label;
}
