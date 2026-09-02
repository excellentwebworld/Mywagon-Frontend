/** Centralized browser-timezone helpers for the shipper panel.
 * DB / API instants are UTC; UI selection & display use the browser IANA zone.
 * Date-only calendar values (YYYY-MM-DD) are not converted — use dateDisplay.ts.
 */

import { formatDisplayDate } from './dateDisplay';

/** Panel datetime display format: `dd/MM/yyyy HH:mm` */
export const ERP_LAST_UPDATE_FORMAT = 'd/m/Y H:i';

export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    // Some environments still report legacy IANA aliases (e.g. Asia/Calcutta).
    // Prefer the canonical identifier so strict validators / docs stay consistent.
    if (tz === 'Asia/Calcutta') return 'Asia/Kolkata';
    return tz;
  } catch {
    return 'UTC';
  }
}

/** True when value is a bare calendar date with no time component. */
export function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test((value || '').trim());
}

/**
 * Parse a UTC instant. Bare `YYYY-MM-DD HH:mm:ss` / ISO without offset are treated as UTC.
 */
export function parseUtcInstant(input: string | null | undefined): Date | null {
  if (input == null) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Handle dd/MM/yyyy HH:mm or dd/MM/yyyy HH:mm:ss format
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmyMatch) {
    const [, d, m, y, h = '00', min = '00', s = '00'] = dmyMatch;
    const isoString = `${y}-${pad2(m)}-${pad2(d)}T${pad2(h)}:${pad2(min)}:${pad2(s)}Z`;
    const parsed = new Date(isoString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed);
  const normalized = hasTimezone
    ? trimmed
    : trimmed.includes('T')
      ? `${trimmed}Z`
      : `${trimmed.replace(' ', 'T')}Z`;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** @deprecated Prefer parseUtcInstant — kept for existing ERP imports. */
export function parseUtcIsoDate(value: string): Date | null {
  return parseUtcInstant(value);
}

function pad2(n: number | string): string {
  return String(n).padStart(2, '0');
}

function getTzParts(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).formatToParts(date);
}

export function formatInTimeZone(
  date: Date,
  opts: Intl.DateTimeFormatOptions,
  tz: string = getBrowserTimezone()
): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts }).format(date);
}

/** UTC instant → dd/MM/yyyy in browser (or explicit) TZ. */
export function formatUtcToDisplayDate(utc: string, tz: string = getBrowserTimezone()): string {
  const parsed = parseUtcInstant(utc);
  if (!parsed) return utc || '';
  const parts = getTzParts(parsed, tz, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  if (!day || !month || !year) return utc;
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

/** UTC instant → HH:mm in browser TZ. */
export function formatUtcToDisplayTime(utc: string, tz: string = getBrowserTimezone()): string {
  const parsed = parseUtcInstant(utc);
  if (!parsed) return '';
  const parts = getTzParts(parsed, tz, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  if (hour == null || minute == null) return '';
  return `${pad2(hour)}:${pad2(minute)}`;
}

/**
 * UTC instant → panel datetime label: `dd/MM/yyyy HH:mm` in browser TZ.
 */
export function formatUtcToDisplayDateTime(utc: string, tz: string = getBrowserTimezone()): string {
  const parsed = parseUtcInstant(utc);
  if (!parsed) return utc || '';
  const parts = getTzParts(parsed, tz, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  if (!day || !month || !year || hour == null || minute == null) return utc;
  return `${pad2(day)}/${pad2(month)}/${year} ${pad2(hour)}:${pad2(minute)}`;
}

/** ERP / Address Book / last-update timestamps: `dd/MM/yyyy HH:mm` in browser TZ. */
export function formatErpLastUpdate(value: string, timezone = getBrowserTimezone()): string {
  if (!value) return '—';
  const formatted = formatUtcToDisplayDateTime(value, timezone);
  return formatted || '—';
}

/** Split a UTC instant into local calendar date + time for DatePicker / TimePicker. */
export function utcToLocalParts(
  utc: string,
  tz: string = getBrowserTimezone()
): { date: string; time: string } {
  const parsed = parseUtcInstant(utc);
  if (!parsed) {
    return { date: '', time: '' };
  }
  const parts = getTzParts(parsed, tz, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  if (!year || !month || !day) {
    return { date: '', time: '' };
  }
  return {
    date: `${year}-${pad2(month)}-${pad2(day)}`,
    time: hour != null && minute != null ? `${pad2(hour)}:${pad2(minute)}` : '',
  };
}

/**
 * Interpret YYYY-MM-DD + HH:mm as wall clock in the browser local zone → UTC ISO.
 * (Browser TZ is the configured source of truth; `tz` is accepted for API symmetry.)
 */
export function localPartsToUtcIso(
  date: string,
  time: string = '00:00',
  _tz: string = getBrowserTimezone()
): string {
  const ymd = (date || '').trim();
  const hm = (time || '00:00').trim() || '00:00';
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const tm = hm.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!tm) return '';
  const local = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(tm[1]),
    Number(tm[2]),
    tm[3] ? Number(tm[3]) : 0,
    0
  );
  if (Number.isNaN(local.getTime())) return '';
  return local.toISOString();
}

/** Convert `<input type="datetime-local">` value (local wall clock) → UTC ISO. */
export function localDateTimeLocalToUtcIso(
  value: string,
  tz: string = getBrowserTimezone()
): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const [datePart, timePart = '00:00'] = trimmed.replace(' ', 'T').split('T');
  return localPartsToUtcIso(datePart, timePart.slice(0, 8), tz);
}

/** Local Date / parseable local string → UTC ISO. */
export function localToUtcIso(local: Date | string, _tz: string = getBrowserTimezone()): string {
  if (local instanceof Date) {
    return Number.isNaN(local.getTime()) ? '' : local.toISOString();
  }
  const trimmed = String(local).trim();
  if (!trimmed) return '';
  if (trimmed.includes('T') && !trimmed.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return localDateTimeLocalToUtcIso(trimmed);
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** Calendar YMD from a Date using local year/month/day — never toISOString().slice. */
export function toCalendarYmd(localDate: Date): string {
  if (Number.isNaN(localDate.getTime())) return '';
  return `${localDate.getFullYear()}-${pad2(localDate.getMonth() + 1)}-${pad2(localDate.getDate())}`;
}

/** Format a calendar YYYY-MM-DD for display (no TZ conversion). */
export function formatCalendarDate(ymd: string): string {
  if (!ymd) return '—';
  if (isDateOnly(ymd)) return formatDisplayDate(ymd);
  const parts = utcToLocalParts(ymd);
  return parts.date ? formatDisplayDate(parts.date) : ymd;
}

/** Add calendar days to a YYYY-MM-DD string. */
export function addCalendarDays(ymd: string, days: number): string {
  const m = (ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  return toCalendarYmd(d);
}

/** Days from today for a calendar YYYY-MM-DD (no UTC day-shift). */
export function calendarDaysFromToday(ymd: string): number | null {
  const m = (ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/**
 * Format a message timestamp to local 24h `HH:mm`.
 * Correctly parses UTC ISO strings from API/Socket and converts to user's browser local time.
 */
export function formatMessageTime(input?: string | Date | null): string {
  if (!input) return '';
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return '';
    return formatInTimeZone(input, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  const str = String(input).trim();
  if (!str) return '';

  // If already pure HH:mm (e.g. from local optimistic insert), verify if it has date info
  const parsed = parseUtcInstant(str);
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return formatInTimeZone(parsed, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return str;
}

/**
 * Format conversation list last activity time to local time representation:
 * - Today: `Today HH:mm`
 * - Yesterday: `Yesterday HH:mm`
 * - Older: `dd/MM HH:mm`
 */
export function formatConversationTime(
  input?: string | Date | number | null,
  timestampSeconds?: number | null
): string {
  let date: Date | null = null;
  if (typeof timestampSeconds === 'number' && timestampSeconds > 0) {
    date = new Date(timestampSeconds * 1000);
  } else if (typeof input === 'number' && input > 0) {
    date = new Date(input > 1e11 ? input : input * 1000);
  } else if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === 'Just now' || trimmed === 'Τώρα') {
      return trimmed;
    }
    date = parseUtcInstant(trimmed);
  }

  if (!date || Number.isNaN(date.getTime())) {
    return typeof input === 'string' ? input : '';
  }

  const now = new Date();
  const dateLocalStr = toCalendarYmd(date);
  const nowLocalStr = toCalendarYmd(now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayLocalStr = toCalendarYmd(yesterday);

  const timeStr = formatInTimeZone(date, { hour: '2-digit', minute: '2-digit', hour12: false });

  if (dateLocalStr === nowLocalStr) {
    return `Today ${timeStr}`;
  }
  if (dateLocalStr === yesterdayLocalStr) {
    return `Yesterday ${timeStr}`;
  }
  const dateFormatted = formatUtcToDisplayDate(date.toISOString());
  return `${dateFormatted} ${timeStr}`;
}
