/** Matches backend `ShipperErpOrdersExport` / Carbon format: `26 Jun, 18:48` */
export const ERP_LAST_UPDATE_FORMAT = 'd M, H:i';

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function parseUtcIsoDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed);
  const normalized = hasTimezone
    ? trimmed
    : trimmed.includes('T')
      ? `${trimmed}Z`
      : `${trimmed.replace(' ', 'T')}Z`;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatErpLastUpdate(value: string, timezone = getBrowserTimezone()): string {
  if (!value) return '—';

  const parsed = parseUtcIsoDate(value);
  if (!parsed) return value;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);

  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const hour = parts.find((part) => part.type === 'hour')?.value?.padStart(2, '0');
  const minute = parts.find((part) => part.type === 'minute')?.value?.padStart(2, '0');

  if (!day || !month || !hour || !minute) return '—';

  return `${day} ${month}, ${hour}:${minute}`;
}
