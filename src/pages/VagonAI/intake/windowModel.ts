/**
 * The window step's rules, pure (CONTRACT.md §5.1 `window`): a date, and optionally a from/to time of day. A past date is
 * ACCEPTED with a warning (§5.1), never refused. The times are `HH:MM`, 24 h, as `<input type="time">` gives them.
 */
import type { IntakeAnswerWire, WindowWidgetSpec } from './contract';

export const DEFAULT_FROM = '08:00';
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}
export const validTime = (s: string): boolean => TIME_RE.test(s);

/** Today as `YYYY-MM-DD` in the browser's own zone (the shipper's day, not UTC's). */
export function todayOf(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export type WindowIssue = 'date' | 'timeFrom' | 'timeTo' | 'order';

export interface WindowDraft { date: string; timeFrom: string; timeTo: string }

export function windowDraftOf(spec: WindowWidgetSpec): WindowDraft {
  return {
    date: typeof spec.date === 'string' ? spec.date : '',
    timeFrom: typeof spec.timeFrom === 'string' && spec.timeFrom !== '' ? spec.timeFrom : DEFAULT_FROM,
    timeTo: typeof spec.timeTo === 'string' ? spec.timeTo : '',
  };
}

export function windowIssues(d: WindowDraft): WindowIssue[] {
  const out: WindowIssue[] = [];
  if (!validDate(d.date)) out.push('date');
  if (d.timeFrom !== '' && !validTime(d.timeFrom)) out.push('timeFrom');
  if (d.timeTo !== '' && !validTime(d.timeTo)) out.push('timeTo');
  if (out.length === 0 && d.timeFrom !== '' && d.timeTo !== '' && d.timeTo <= d.timeFrom) out.push('order');
  return out;
}

/** A date before `today` (or before `minDate` when the gateway sent one). A warning, not an error. */
export const isPastDate = (date: string, minDate: string | null | undefined, today: string = todayOf()): boolean =>
  validDate(date) && date < (minDate && validDate(minDate) ? minDate : today);

export function windowAnswer(stopKey: string | undefined, d: WindowDraft): IntakeAnswerWire | null {
  if (!stopKey || windowIssues(d).length > 0) return null;
  return { step: 'window', stopKey, date: d.date, timeFrom: d.timeFrom === '' ? null : d.timeFrom, timeTo: d.timeTo === '' ? null : d.timeTo };
}

/**
 * MS3-408 "Any time": no slot, which is an answer. A pickup still needs its day (`needsDate`); a drop-off may leave the day
 * open too (it opens when the pickup does). A date that is typed must be a real one.
 */
export function anyTimeAnswer(stopKey: string | undefined, date: string, needsDate: boolean): IntakeAnswerWire | null {
  if (!stopKey) return null;
  if (date === '' ? needsDate : !validDate(date)) return null;
  return { step: 'window', stopKey, date, timeFrom: null, anyTime: true };
}

/** "Fri 23 Oct, 08:00–12:00" for the spent row. Plain, no locale lookup: the date is an ISO date with its times. */
export function windowText(d: WindowDraft): string {
  const t = d.timeFrom && d.timeTo ? `${d.timeFrom}–${d.timeTo}` : d.timeFrom ? `${d.timeFrom}` : '';
  return [d.date, t].filter(Boolean).join(' ');
}
