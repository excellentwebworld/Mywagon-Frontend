import type { Shipment } from '../../../context/AppContext';
import { utcToLocalParts } from '../../../utils/timezone';

/* ── Types ── */

export type CalendarRange = 'day' | '3day' | 'workweek' | 'week' | 'month';
export type CalendarLayout = 'grid' | 'list';

export type CalendarVisualStatus =
  | 'pending'
  | 'bids'
  | 'scheduled'
  | 'ready'
  | 'ontrip'
  | 'pastdue'
  | 'fulfilled'
  | 'partial'
  | 'unfulfilled'
  | 'canceled'
  | 'draft';

export interface CalendarEvent {
  id: string;
  shipmentId: number;
  sid: string;
  type: 'pickup' | 'delivery';
  dateYmd: string;
  timeStart: string;
  timeEnd: string;
  /** Minutes from midnight for time-grid placement (0 when all-day / missing). */
  startMinutes: number;
  /** Duration in minutes for the time-grid block (default 60). */
  durationMinutes: number;
  allDay: boolean;
  orderId?: string | null;
  productName?: string | null;
  qty?: string | number | null;
  qtyUnit?: string | null;
  weight?: string | number | null;
  weightUnit?: string | null;
  companyName?: string | null;
  locationName?: string | null;
  address?: string | null;
  city?: string | null;
  status: string;
  visualStatus: CalendarVisualStatus;
  carrierName?: string | null;
  bids: number;
  invited: number;
  channel?: 'private' | 'public' | null;
  priceType?: 'spot' | 'contract' | 'bidding' | null;
  quotedPrice?: number | null;
  agreedPrice?: number | null;
  atRisk: boolean;
  isOverdue: boolean;
  stopCount: number;
  shipment: Shipment;
  stopIndex?: number;
}

export interface CalendarDayCell {
  date: Date;
  dateYmd: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface CalendarRailFilters {
  pickup: boolean;
  delivery: boolean;
}

export const DEFAULT_RAIL_FILTERS: CalendarRailFilters = {
  pickup: true,
  delivery: true,
};

export const CALENDAR_RANGES: Array<[CalendarRange, string]> = [
  ['day', 'Day'],
  ['3day', 'Three Day'],
  ['workweek', 'Working Week'],
  ['week', 'Week'],
  ['month', 'Month'],
];

export const LEGEND_ORDER: CalendarVisualStatus[] = [
  'pending',
  'bids',
  'scheduled',
  'ready',
  'ontrip',
  'pastdue',
  'fulfilled',
  'partial',
  'unfulfilled',
  'canceled',
  'draft',
];

export const STATUS_LABELS: Record<CalendarVisualStatus, string> = {
  pending: 'Pending',
  bids: 'Pending · bids',
  scheduled: 'Scheduled',
  ready: 'Ready',
  ontrip: 'On Trip',
  pastdue: 'Past Due',
  fulfilled: 'Fulfilled',
  partial: 'Partially Fulfilled',
  unfulfilled: 'Unfulfilled',
  canceled: 'Canceled',
  draft: 'Draft',
};

export const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const HOUR_HEIGHT_PX = 72;
export const DEFAULT_EVENT_DURATION_MIN = 60;
export const CAL_PREFS_KEY = 'mv-cal-prefs-v1';

/* ── Date helpers ── */

export function padZero(num: number): string {
  return String(num).padStart(2, '0');
}

export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

export function parseYmdDate(ymd: string): Date {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function getTodayYmd(): string {
  return toYmd(new Date());
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -weekdayIndex(d));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseTimeToMinutes(time?: string | null): number | null {
  const t = (time || '').trim();
  if (!t || !/^\d{1,2}:\d{2}/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return Math.max(0, Math.min(24 * 60 - 1, h * 60 + m));
}

export function minutesOfDayFromParts(timeStart?: string | null): number {
  return parseTimeToMinutes(timeStart) ?? 0;
}

export interface ScheduleSpan {
  dateYmd: string;
  timeStart: string;
  timeEnd: string;
  startMinutes: number;
  durationMinutes: number;
}

/**
 * Time-grid slices for one stop.
 * - No end (or end equal to start): 1 hour from the start.
 * - Same-day range: one slot covering the full window.
 * - Range that crosses midnight: first slot runs to 24:00, second slot continues the next day until the end time.
 */
export function scheduleSpans(dateYmd: string, timeStart: string, timeEnd: string): ScheduleSpan[] {
  const start = parseTimeToMinutes(timeStart);
  if (start == null) {
    return [
      {
        dateYmd,
        timeStart: '',
        timeEnd: '',
        startMinutes: 0,
        durationMinutes: DEFAULT_EVENT_DURATION_MIN,
      },
    ];
  }

  const end = parseTimeToMinutes(timeEnd);
  const hasRange = end != null && end !== start;
  if (!hasRange) {
    return [
      {
        dateYmd,
        timeStart,
        timeEnd: '',
        startMinutes: start,
        durationMinutes: DEFAULT_EVENT_DURATION_MIN,
      },
    ];
  }

  if (end! > start) {
    return [
      {
        dateYmd,
        timeStart,
        timeEnd,
        startMinutes: start,
        durationMinutes: end! - start,
      },
    ];
  }

  // 00:00 end means "until midnight" on the start day, not an empty next-day slot.
  if (end === 0) {
    return [
      {
        dateYmd,
        timeStart,
        timeEnd: '24:00',
        startMinutes: start,
        durationMinutes: 1440 - start,
      },
    ];
  }

  return [
    {
      dateYmd,
      timeStart,
      timeEnd: '24:00',
      startMinutes: start,
      durationMinutes: 1440 - start,
    },
    {
      dateYmd: getAdjacentDay(dateYmd, 1),
      timeStart: '00:00',
      timeEnd,
      startMinutes: 0,
      durationMinutes: end!,
    },
  ];
}

/* ── Range maths ── */

export function visibleDays(range: CalendarRange, cursor: Date): Date[] {
  const c = startOfDay(cursor);
  const seq = (s: Date, n: number) => Array.from({ length: n }, (_, i) => addDays(s, i));
  if (range === 'day') return [c];
  if (range === '3day') return seq(c, 3);
  if (range === 'workweek') return seq(startOfWeek(c), 5);
  if (range === 'week') return seq(startOfWeek(c), 7);
  const m = startOfMonth(c);
  return seq(m, daysInMonth(m));
}

export function stepCursor(range: CalendarRange, cursor: Date, dir: number): Date {
  if (range === 'day') return addDays(cursor, dir);
  if (range === '3day') return addDays(cursor, 3 * dir);
  if (range === 'month') return new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
  return addDays(cursor, 7 * dir);
}

export function rangeLabel(range: CalendarRange, days: Date[], locale = 'en-GB'): string {
  if (!days.length) return '';
  const a = days[0];
  const b = days[days.length - 1];
  if (range === 'month') {
    return a.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  if (days.length === 1) {
    return a.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return `${a.getDate()} – ${b.getDate()} ${a.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    })}`;
  }
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const right = b.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${left} – ${right}`;
}

/** API from/to covering the visible window, plus one day each side.
 *  Overnight ranges are drawn on the next day, and local time can sit on the previous UTC date. */
export function getRangeDateRange(
  range: CalendarRange,
  cursor: Date
): { from: string; to: string } {
  if (range === 'month') {
    const month = getMonthDateRange(cursor.getFullYear(), cursor.getMonth());
    return { from: getAdjacentDay(month.from, -1), to: getAdjacentDay(month.to, 1) };
  }
  const days = visibleDays(range, cursor);
  return {
    from: getAdjacentDay(toYmd(days[0]), -1),
    to: getAdjacentDay(toYmd(days[days.length - 1]), 1),
  };
}

export function parseCalendarRange(raw: string | null): CalendarRange {
  if (raw === 'day' || raw === '3day' || raw === 'workweek' || raw === 'week' || raw === 'month') {
    return raw;
  }
  // Legacy URL values
  if (raw === 'day') return 'day';
  return 'week';
}

export function parseCalendarLayout(raw: string | null): CalendarLayout {
  return raw === 'list' ? 'list' : 'grid';
}

export interface CalPrefs {
  range?: CalendarRange;
  layout?: CalendarLayout;
  railOpen?: boolean;
}

export function loadCalPrefs(): CalPrefs {
  try {
    return JSON.parse(localStorage.getItem(CAL_PREFS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveCalPrefs(p: CalPrefs): void {
  try {
    localStorage.setItem(CAL_PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/* ── Month grid ── */

/**
 * Generate a 35 or 42-day calendar matrix for a given month/year.
 * Starts on Monday (European / ISO week).
 */
export function getCalendarMonthGrid(year: number, monthIndex: number): CalendarDayCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);

  const jsDay = firstOfMonth.getDay();
  const startOffset = (jsDay + 6) % 7;

  const todayStr = getTodayYmd();
  const cells: CalendarDayCell[] = [];

  for (let i = startOffset; i > 0; i--) {
    const d = new Date(year, monthIndex, 1 - i);
    const dateYmd = toYmd(d);
    const dayOfWeek = d.getDay();
    cells.push({
      date: d,
      dateYmd,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateYmd === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  const totalDays = lastOfMonth.getDate();
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, monthIndex, i);
    const dateYmd = toYmd(d);
    const dayOfWeek = d.getDay();
    cells.push({
      date: d,
      dateYmd,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateYmd === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, monthIndex + 1, i);
    const dateYmd = toYmd(d);
    const dayOfWeek = d.getDay();
    cells.push({
      date: d,
      dateYmd,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateYmd === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return cells;
}

export function getMonthDateRange(year: number, monthIndex: number): { from: string; to: string } {
  const grid = getCalendarMonthGrid(year, monthIndex);
  if (grid.length === 0) {
    const from = `${year}-${padZero(monthIndex + 1)}-01`;
    const to = `${year}-${padZero(monthIndex + 1)}-28`;
    return { from, to };
  }
  return {
    from: grid[0].dateYmd,
    to: grid[grid.length - 1].dateYmd,
  };
}

export function getAdjacentMonth(
  year: number,
  monthIndex: number,
  offset: number
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + offset, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function getAdjacentDay(ymd: string, offset: number): string {
  const d = parseYmdDate(ymd);
  d.setDate(d.getDate() + offset);
  return toYmd(d);
}

/* ── Status / risk ── */

export function normalizeVisualStatus(
  status: string,
  bids = 0,
  bidsReceived?: number,
  interestedCount?: number
): CalendarVisualStatus {
  const bidCount = Math.max(bids, bidsReceived ?? 0, interestedCount ?? 0);
  const s = String(status || '').toLowerCase();

  if (s === 'pending' && bidCount > 0) return 'bids';
  if (s === 'pending') return 'pending';
  if (s === 'scheduled' || s === 'upcoming') return 'scheduled';
  if (s === 'ready') return 'ready';
  if (s === 'on_trip' || s === 'in_progress' || s === 'ontrip') return 'ontrip';
  if (s === 'past_due' || s === 'pastdue' || s === 'past-due') return 'pastdue';
  if (s === 'fullfilled' || s === 'fulfilled' || s === 'delivered' || s === 'awarded') {
    return 'fulfilled';
  }
  if (s === 'partially_fullfilled' || s === 'partial') return 'partial';
  if (s === 'not_fullfilled' || s === 'unfulfilled') return 'unfulfilled';
  if (s === 'canceled' || s === 'cancelled') return 'canceled';
  if (s === 'draft') return 'draft';
  return 'draft';
}

export function isEventAtRisk(ev: Pick<CalendarEvent, 'status' | 'carrierName' | 'dateYmd' | 'type'>): boolean {
  const s = String(ev.status || '').toLowerCase();
  if (s !== 'pending') return false;
  if (ev.carrierName) return false;
  if (ev.type !== 'pickup') return false;
  const pickup = parseYmdDate(ev.dateYmd);
  const now = startOfDay(new Date());
  const diffMs = pickup.getTime() - now.getTime();
  return diffMs >= 0 && diffMs < 48 * 3600000;
}

export function isEventOverdue(ev: Pick<CalendarEvent, 'status' | 'dateYmd' | 'type' | 'carrierName'>): boolean {
  const s = String(ev.status || '').toLowerCase();
  if (s === 'past_due' || s === 'pastdue' || s === 'past-due') return true;
  if (s === 'pending' && ev.type === 'pickup') {
    const pickup = parseYmdDate(ev.dateYmd);
    return pickup.getTime() < startOfDay(new Date()).getTime();
  }
  return false;
}

/* ── Event extraction (UTC → browser/saved TZ via shared helpers) ── */

function isInvalidScheduleToken(val: string): boolean {
  return (
    !val ||
    val === '0' ||
    val === '—' ||
    val === '-' ||
    val === 'null' ||
    val === 'undefined' ||
    val.startsWith('0000-00-00') ||
    val.startsWith('1970-01-01') ||
    val.startsWith('31/12/1969') ||
    val.startsWith('01/01/1970')
  );
}

/**
 * Resolve any schedule field to local calendar date + time.
 * - Mapped stop fields are already local (YYYY-MM-DD / HH:mm / dd/MM/yyyy HH:mm).
 * - Raw UTC/ISO strings are converted with `utcToLocalParts` (browser TZ).
 */
function toLocalSchedule(val?: string | null): { date: string; time: string } {
  if (val == null) return { date: '', time: '' };
  const trimmed = String(val).trim();
  if (isInvalidScheduleToken(trimmed)) return { date: '', time: '' };

  // Already-local panel label from shipmentsMapper.scheduleLabel: dd/MM/yyyy[ HH:mm]
  const dmy = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s·]+(\d{1,2}):(\d{2})(?::\d{2})?)?$/
  );
  if (dmy) {
    const [, d, m, y, hh, mm] = dmy;
    if (Number(y) <= 1970) return { date: '', time: '' };
    return {
      date: `${y}-${padZero(Number(m))}-${padZero(Number(d))}`,
      time: hh != null && mm != null ? `${padZero(Number(hh))}:${padZero(Number(mm))}` : '',
    };
  }

  // Pure local date from mapped stop.date
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { date: trimmed, time: '' };
  }

  // Pure local time from mapped stop.timeStart
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return { date: '', time: trimmed.slice(0, 5) };
  }

  // UTC/ISO (or ambiguous datetime) → convert with shared helper
  const local = utcToLocalParts(trimmed);
  if (local.date && !local.date.startsWith('1970-01-01')) {
    return local;
  }
  return { date: '', time: '' };
}

/** Prefer ISO UTC when present so conversion is explicit; else use already-local fallback. */
function resolveLocalParts(
  iso?: string | null,
  fallback?: string | null
): { date: string; time: string } {
  if (iso) {
    const fromIso = toLocalSchedule(iso);
    if (fromIso.date) return fromIso;
  }
  return toLocalSchedule(fallback);
}

function shipmentBids(s: any): number {
  return Math.max(
    Number(s.bidsReceived) || 0,
    Number(s.bids) || 0,
    Number(s.interestedCount) || 0
  );
}

function shipmentInvited(s: any): number {
  return Number(s.bidsSent ?? s.invited ?? s.invite_count ?? 0) || 0;
}

/**
 * Extracts and maps all scheduled pickup and dropoff events from shipments.
 */
export function extractCalendarEvents(shipments: Shipment[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  (shipments || []).forEach((s) => {
    const sAny = s as any;
    const rawStops: any[] = Array.isArray(sAny.stops) ? sAny.stops : [];
    const sid = sAny.autoId || sAny.auto_id || sAny.ref || `MYV-${s.id}`;
    const carrierName =
      typeof s.carrier === 'string' ? s.carrier : sAny.carrier?.name || null;
    const bids = shipmentBids(sAny);
    const invited = shipmentInvited(sAny);
    const visualStatus = normalizeVisualStatus(
      s.status,
      bids,
      sAny.bidsReceived,
      sAny.interestedCount
    );
    const channel = sAny.channel || null;
    const priceType = sAny.price_type || sAny.priceType || null;
    const quotedPrice = sAny.quotedPrice ?? sAny.quoted_price ?? null;
    const agreedPrice = sAny.agreedPrice ?? sAny.agreed_price ?? null;
    const stopCount = rawStops.length > 0 ? rawStops.length : 2;

    const pushEvent = (partial: Omit<CalendarEvent, 'visualStatus' | 'atRisk' | 'isOverdue' | 'bids' | 'invited' | 'stopCount' | 'channel' | 'priceType' | 'quotedPrice' | 'agreedPrice'> & {
      visualStatus?: CalendarVisualStatus;
    }) => {
      const ev: CalendarEvent = {
        ...partial,
        visualStatus: partial.visualStatus || visualStatus,
        bids,
        invited,
        channel,
        priceType,
        quotedPrice,
        agreedPrice,
        stopCount,
        atRisk: false,
        isOverdue: false,
      };
      ev.atRisk = isEventAtRisk(ev);
      ev.isOverdue = isEventOverdue(ev);
      events.push(ev);
    };

    if (rawStops.length > 0) {
      rawStops.forEach((stop, idx) => {
        const stopAny = stop as any;
        const isPickup =
          stopAny.type === 'pickup' || String(stopAny.type).toLowerCase() === 'pickup';
        const type: 'pickup' | 'delivery' = isPickup ? 'pickup' : 'delivery';

        // Mapped stops already have local date/time (via mapStop → utcToLocalParts).
        // ISO fields are converted explicitly; display fallbacks are treated as local.
        const fromStopDate = toLocalSchedule(stopAny.date);
        const fromStopStart = toLocalSchedule(stopAny.timeStart || stopAny.time_start);
        const fromStopEnd = toLocalSchedule(stopAny.timeEnd || stopAny.time_end);
        const fromIso = isPickup
          ? resolveLocalParts(sAny.pickDtIso || sAny.pickup_at_iso, sAny.pickDt || sAny.pickup_at)
          : resolveLocalParts(sAny.delDtIso || sAny.delivery_at_iso, sAny.delDt || sAny.delivery_at);

        const dateYmd = fromStopDate.date || fromIso.date || null;
        if (!dateYmd) return;

        const timeStart = fromStopStart.time || fromIso.time || '';
        const timeEnd = fromStopEnd.time || '';
        const allDay = !timeStart || !!stopAny.allDay || !!stopAny.all_day;
        const spans = allDay
          ? [
              {
                dateYmd,
                timeStart: '',
                timeEnd: '',
                startMinutes: 0,
                durationMinutes: DEFAULT_EVENT_DURATION_MIN,
              },
            ]
          : scheduleSpans(dateYmd, timeStart, timeEnd);

        const orderId =
          stopAny.order_id ||
          stopAny.orderId ||
          stopAny.customers?.[0]?.orders?.[0]?.id ||
          (sAny.orderIds && sAny.orderIds[0]) ||
          (sAny.order_ids && sAny.order_ids[0]) ||
          sAny.ref ||
          sAny.customer_reference ||
          null;

        const productName =
          stopAny.product_name ||
          stopAny.productName ||
          stopAny.customers?.[0]?.orders?.[0]?.products ||
          (typeof sAny.product_type === 'string' ? sAny.product_type : null) ||
          (typeof sAny.productType === 'string' ? sAny.productType : null) ||
          null;

        const qty =
          stopAny.qty ??
          stopAny.customers?.[0]?.orders?.[0]?.qty ??
          sAny.totalQty ??
          sAny.total_qty ??
          null;

        const qtyUnit =
          stopAny.qty_unit ||
          stopAny.qtyUnit ||
          stopAny.customers?.[0]?.orders?.[0]?.qtyUnit ||
          sAny.qtyUnit ||
          sAny.qty_unit ||
          null;

        const weight =
          stopAny.weight ??
          stopAny.customers?.[0]?.orders?.[0]?.weight ??
          sAny.totalWeight ??
          sAny.total_weight ??
          null;

        const weightUnit =
          stopAny.weight_unit ||
          stopAny.weightUnit ||
          stopAny.customers?.[0]?.orders?.[0]?.weightUnit ||
          sAny.weightUnit ||
          sAny.weight_unit ||
          null;

        const companyName =
          stopAny.company_name ||
          stopAny.companyName ||
          stopAny.customers?.[0]?.name ||
          sAny.customer?.[0]?.name ||
          (sAny.customers && sAny.customers[0]) ||
          null;

        spans.forEach((span, spanIdx) => {
          pushEvent({
            id:
              spanIdx === 0
                ? `${s.id}-${stopAny.id || idx}-${type}`
                : `${s.id}-${stopAny.id || idx}-${type}-next`,
            shipmentId: Number(s.id),
            sid,
            type,
            dateYmd: span.dateYmd,
            timeStart: span.timeStart,
            timeEnd: span.timeEnd,
            startMinutes: span.startMinutes,
            durationMinutes: span.durationMinutes,
            allDay,
          orderId,
          productName,
          qty,
          qtyUnit,
          weight,
          weightUnit,
          companyName,
          locationName: stopAny.location || null,
          address: stopAny.address || null,
          city: stopAny.city || null,
          status: s.status,
          carrierName,
          shipment: s,
          stopIndex: idx,
        });
        });
      });
    } else {
      const pickupLocal = resolveLocalParts(
        sAny.pickDtIso || sAny.pickup_at_iso,
        sAny.pickDt || sAny.pickup_at
      );
      const pickupEndLocal = resolveLocalParts(
        sAny.pickDtToIso || sAny.pickup_to_iso,
        sAny.pickDtTo || sAny.pickup_to
      );
      if (pickupLocal.date) {
        const timeStart = pickupLocal.time;
        const timeEnd = pickupEndLocal.time;
        const allDay = !timeStart;
        const spans = allDay
          ? [
              {
                dateYmd: pickupLocal.date,
                timeStart: '',
                timeEnd: '',
                startMinutes: 0,
                durationMinutes: DEFAULT_EVENT_DURATION_MIN,
              },
            ]
          : scheduleSpans(pickupLocal.date, timeStart, timeEnd);
        spans.forEach((span, spanIdx) => {
          pushEvent({
            id: spanIdx === 0 ? `${s.id}-pickup` : `${s.id}-pickup-next`,
            shipmentId: Number(s.id),
            sid,
            type: 'pickup',
            dateYmd: span.dateYmd,
            timeStart: span.timeStart,
            timeEnd: span.timeEnd,
            startMinutes: span.startMinutes,
            durationMinutes: span.durationMinutes,
            allDay,
          orderId:
            (sAny.orderIds && sAny.orderIds[0]) ||
            (sAny.order_ids && sAny.order_ids[0]) ||
            sAny.ref ||
            sAny.customer_reference ||
            null,
          productName:
            (typeof sAny.product_type === 'string' ? sAny.product_type : null) ||
            (typeof sAny.productType === 'string' ? sAny.productType : null) ||
            null,
          qty: sAny.totalQty ?? sAny.total_qty ?? null,
          qtyUnit: sAny.qtyUnit || sAny.qty_unit || null,
          weight: sAny.totalWeight ?? sAny.total_weight ?? null,
          weightUnit: sAny.weightUnit || sAny.weight_unit || null,
          companyName: sAny.customer?.[0]?.name || (sAny.customers && sAny.customers[0]) || null,
          locationName: s.origin || null,
          city: s.origin || null,
          status: s.status,
          carrierName,
          shipment: s,
          stopIndex: 0,
        });
        });
      }

      const deliveryLocal = resolveLocalParts(
        sAny.delDtIso || sAny.delivery_at_iso,
        sAny.delDt || sAny.delivery_at
      );
      const deliveryEndLocal = resolveLocalParts(
        sAny.delDtToIso || sAny.delivery_to_iso,
        sAny.delDtTo || sAny.delivery_to
      );
      if (deliveryLocal.date) {
        const timeStart = deliveryLocal.time;
        const timeEnd = deliveryEndLocal.time;
        const allDay = !timeStart;
        const spans = allDay
          ? [
              {
                dateYmd: deliveryLocal.date,
                timeStart: '',
                timeEnd: '',
                startMinutes: 0,
                durationMinutes: DEFAULT_EVENT_DURATION_MIN,
              },
            ]
          : scheduleSpans(deliveryLocal.date, timeStart, timeEnd);
        spans.forEach((span, spanIdx) => {
          pushEvent({
            id: spanIdx === 0 ? `${s.id}-delivery` : `${s.id}-delivery-next`,
            shipmentId: Number(s.id),
            sid,
            type: 'delivery',
            dateYmd: span.dateYmd,
            timeStart: span.timeStart,
            timeEnd: span.timeEnd,
            startMinutes: span.startMinutes,
            durationMinutes: span.durationMinutes,
            allDay,
          orderId:
            (sAny.orderIds && sAny.orderIds[0]) ||
            (sAny.order_ids && sAny.order_ids[0]) ||
            sAny.ref ||
            sAny.customer_reference ||
            null,
          productName:
            (typeof sAny.product_type === 'string' ? sAny.product_type : null) ||
            (typeof sAny.productType === 'string' ? sAny.productType : null) ||
            null,
          qty: sAny.totalQty ?? sAny.total_qty ?? null,
          qtyUnit: sAny.qtyUnit || sAny.qty_unit || null,
          weight: sAny.totalWeight ?? sAny.total_weight ?? null,
          weightUnit: sAny.weightUnit || sAny.weight_unit || null,
          companyName: sAny.customer?.[0]?.name || (sAny.customers && sAny.customers[0]) || null,
          locationName: s.dest || null,
          city: s.dest || null,
          status: s.status,
          carrierName,
          shipment: s,
          stopIndex: 1,
        });
        });
      }
    }
  });

  return events;
}

export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};

  events.forEach((ev) => {
    if (!map[ev.dateYmd]) map[ev.dateYmd] = [];
    map[ev.dateYmd].push(ev);
  });

  Object.keys(map).forEach((dateKey) => {
    map[dateKey].sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      if (a.timeStart && b.timeStart) {
        const timeDiff = a.timeStart.localeCompare(b.timeStart);
        if (timeDiff !== 0) return timeDiff;
      } else if (a.timeStart && !b.timeStart) {
        return -1;
      } else if (!a.timeStart && b.timeStart) {
        return 1;
      }
      if (a.type !== b.type) return a.type === 'pickup' ? -1 : 1;
      return a.sid.localeCompare(b.sid);
    });
  });

  return map;
}

/** Apply calendar rail filters on top of already page-filtered events. */
export function applyRailFilters(
  events: CalendarEvent[],
  f: CalendarRailFilters
): CalendarEvent[] {
  return events.filter((ev) => {
    if (ev.type === 'pickup' && !f.pickup) return false;
    if (ev.type === 'delivery' && !f.delivery) return false;
    return true;
  });
}

/**
 * Unique overdue loads from the given event set (typically the visible day/range).
 * Prefer the pickup stop when both pickup and dropoff are present.
 */
export function collectOverdueEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<number>();
  const out: CalendarEvent[] = [];
  events
    .filter((e) => e.isOverdue)
    .sort((a, b) => {
      const byDate = a.dateYmd.localeCompare(b.dateYmd);
      if (byDate !== 0) return byDate;
      if (a.type !== b.type) return a.type === 'pickup' ? -1 : 1;
      return a.sid.localeCompare(b.sid);
    })
    .forEach((e) => {
      if (seen.has(e.shipmentId)) return;
      seen.add(e.shipmentId);
      out.push(e);
    });
  return out;
}

/* ── Time-grid overlap layout (Outlook-style) ── */

export interface LaidOutEvent {
  ev: CalendarEvent;
  col: number;
  cols: number;
  s: number;
  e: number;
}

function clusterTimedEvents(evs: CalendarEvent[]) {
  const items = evs
    .filter((e) => !e.allDay)
    .map((ev) => {
      const s = ev.startMinutes;
      const e = Math.min(1440, s + Math.max(1, ev.durationMinutes));
      return { ev, s, e, col: 0, cols: 1 };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);

  const clusters: Array<typeof items> = [];
  let cluster: typeof items = [];
  let cEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const colEnds: number[] = [];
    for (const it of cluster) {
      let c = colEnds.findIndex((end) => end <= it.s);
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(it.e);
      } else {
        colEnds[c] = it.e;
      }
      it.col = c;
      it.cols = colEnds.length;
    }
    for (const it of cluster) it.cols = colEnds.length;
    clusters.push(cluster);
    cluster = [];
    cEnd = -1;
  };

  for (const it of items) {
    if (cluster.length && it.s >= cEnd) flush();
    cluster.push(it);
    cEnd = Math.max(cEnd, it.e);
  }
  flush();
  return clusters;
}

export function layoutDayEvents(evs: CalendarEvent[]): LaidOutEvent[] {
  const out: LaidOutEvent[] = [];
  for (const cluster of clusterTimedEvents(evs)) {
    for (const it of cluster) {
      out.push({ ev: it.ev, col: it.col, cols: it.cols, s: it.s, e: it.e });
    }
  }
  return out;
}

export type TimeGridPiece =
  | {
      type: 'event';
      key: string;
      ev: CalendarEvent;
      s: number;
      e: number;
      left: string;
      width: string;
    }
  | {
      type: 'more';
      key: string;
      events: CalendarEvent[];
      extra: number;
      s: number;
      e: number;
      left: string;
      width: string;
    };

/**
 * Time-grid placement.
 * - At most `maxColumns` side by side (1 outside Day view, 5 on Day view).
 * - Week and other grids: a busier overlap is one slot (3/4) plus a +n rail (1/4).
 * - Day view past 5: five slots, then +n in the same day column for the rest.
 */
export function presentTimeGrid(evs: CalendarEvent[], maxColumns: number): TimeGridPiece[] {
  const cap = Math.max(1, maxColumns);
  const pieces: TimeGridPiece[] = [];

  for (const cluster of clusterTimedEvents(evs)) {
    const colCount = cluster[0]?.cols ?? 1;
    if (colCount <= cap) {
      for (const it of cluster) {
        pieces.push({
          type: 'event',
          key: it.ev.id,
          ev: it.ev,
          s: it.s,
          e: it.e,
          left: `calc(${(it.col / colCount) * 100}% + 2px)`,
          width: `calc(${100 / colCount}% - 4px)`,
        });
      }
      continue;
    }

    const spanS = Math.min(...cluster.map((it) => it.s));
    const spanE = Math.max(...cluster.map((it) => it.e));

    if (cap === 1) {
      const shown = cluster[0];
      pieces.push({
        type: 'event',
        key: shown.ev.id,
        ev: shown.ev,
        s: shown.s,
        e: shown.e,
        left: '2px',
        width: 'calc(75% - 4px)',
      });
      pieces.push({
        type: 'more',
        key: `more-${shown.ev.id}`,
        events: cluster.map((it) => it.ev),
        extra: cluster.length - 1,
        s: spanS,
        e: spanE,
        left: 'calc(75% + 2px)',
        width: 'calc(25% - 4px)',
      });
      continue;
    }

    const slots = cap + 1;
    const shown = cluster.filter((it) => it.col < cap);
    const hidden = cluster.filter((it) => it.col >= cap);
    for (const it of shown) {
      pieces.push({
        type: 'event',
        key: it.ev.id,
        ev: it.ev,
        s: it.s,
        e: it.e,
        left: `calc(${(it.col / slots) * 100}% + 2px)`,
        width: `calc(${100 / slots}% - 4px)`,
      });
    }
    pieces.push({
      type: 'more',
      key: `more-${cluster[0].ev.id}`,
      events: hidden.map((it) => it.ev),
      extra: hidden.length,
      s: spanS,
      e: spanE,
      left: `calc(${(cap / slots) * 100}% + 2px)`,
      width: `calc(${100 / slots}% - 4px)`,
    });
  }

  return pieces;
}

/* ── Formatting ── */

export function toDateLocale(lang?: string | null): string {
  const code = String(lang || 'en')
    .toLowerCase()
    .split(/[-_]/)[0];
  return code === 'el' ? 'el-GR' : 'en-GB';
}

export function getWeekdayLabels(
  locale = 'en-GB',
  uppercase = true,
  style: 'narrow' | 'short' | 'long' = 'short'
): string[] {
  const baseDate = new Date(2026, 5, 1); // Monday
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const label = d.toLocaleDateString(locale, { weekday: style });
    labels.push(uppercase ? label.toLocaleUpperCase(locale) : label);
  }
  return labels;
}

export function formatEventTimeRange(
  timeStart?: string | null,
  timeEnd?: string | null
): string {
  const start = (timeStart || '').trim();
  if (!start) return '';
  const end = (timeEnd || '').trim();
  if (!end || end === start) return start;
  return `${start} – ${end}`;
}

export function formatMonthYear(year: number, monthIndex: number, locale = 'en-GB'): string {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function formatDayHeader(ymd: string, locale = 'en-GB'): string {
  const d = parseYmdDate(ymd);
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDmy(ymd: string): string {
  const d = parseYmdDate(ymd);
  return `${padZero(d.getDate())}/${padZero(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function moneyEur(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `€ ${Number(n).toLocaleString('en-US')}`;
}

export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
