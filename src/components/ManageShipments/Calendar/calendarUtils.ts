import type { Shipment } from '../../../context/AppContext';

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
  customers: string[];
  carriers: string[];
  channel: 'all' | 'private' | 'public';
  price: 'all' | 'spot' | 'contract';
  showCanceled: boolean;
  showDrafts: boolean;
}

export const DEFAULT_RAIL_FILTERS: CalendarRailFilters = {
  pickup: true,
  delivery: true,
  customers: [],
  carriers: [],
  channel: 'all',
  price: 'all',
  showCanceled: false,
  showDrafts: false,
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

export const HOUR_HEIGHT_PX = 56;
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

export function durationFromTimes(timeStart?: string | null, timeEnd?: string | null): number {
  const s = parseTimeToMinutes(timeStart);
  const e = parseTimeToMinutes(timeEnd);
  if (s == null) return DEFAULT_EVENT_DURATION_MIN;
  if (e == null || e <= s) return DEFAULT_EVENT_DURATION_MIN;
  return Math.max(30, e - s);
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

export function rangeLabel(range: CalendarRange, days: Date[], locale = 'en-US'): string {
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

/** API from/to covering the visible calendar window (month includes padding days). */
export function getRangeDateRange(
  range: CalendarRange,
  cursor: Date
): { from: string; to: string } {
  if (range === 'month') {
    return getMonthDateRange(cursor.getFullYear(), cursor.getMonth());
  }
  const days = visibleDays(range, cursor);
  return { from: toYmd(days[0]), to: toYmd(days[days.length - 1]) };
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

/* ── Event extraction ── */

function normalizeDatePart(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (
    trimmed === '0' ||
    trimmed === '—' ||
    trimmed === '-' ||
    trimmed.startsWith('0000-00-00') ||
    trimmed.startsWith('1970-01-01')
  ) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1970) {
    return toYmd(parsed);
  }
  return null;
}

function normalizeTimePart(val?: string | null): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (trimmed === '0' || trimmed === '—' || trimmed === '-' || trimmed.startsWith('00:00:00')) {
    return '';
  }
  if (/^\d{1,2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  if (trimmed.includes('T') || trimmed.includes(' ')) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return `${padZero(parsed.getHours())}:${padZero(parsed.getMinutes())}`;
    }
  }
  return '';
}

function shipmentBids(s: any): number {
  return Number(s.bidsReceived ?? s.bids ?? s.interestedCount ?? 0) || 0;
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

        const dateYmd =
          normalizeDatePart(stopAny.date) ||
          normalizeDatePart(stopAny.date_iso) ||
          (isPickup
            ? normalizeDatePart(sAny.pickDt || sAny.pickup_at_iso || sAny.pickup_at)
            : normalizeDatePart(sAny.delDt || sAny.delivery_at_iso || sAny.delivery_at));

        if (!dateYmd) return;

        const timeStart =
          normalizeTimePart(stopAny.timeStart || stopAny.time_start) ||
          (isPickup
            ? normalizeTimePart(sAny.pickDt || sAny.pickup_at)
            : normalizeTimePart(sAny.delDt || sAny.delivery_at));
        const timeEnd = normalizeTimePart(stopAny.timeEnd || stopAny.time_end);
        const allDay = !timeStart || !!stopAny.allDay || !!stopAny.all_day;
        const startMinutes = allDay ? 0 : minutesOfDayFromParts(timeStart);
        const durationMinutes = allDay
          ? DEFAULT_EVENT_DURATION_MIN
          : durationFromTimes(timeStart, timeEnd);

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

        pushEvent({
          id: `${s.id}-${stopAny.id || idx}-${type}`,
          shipmentId: Number(s.id),
          sid,
          type,
          dateYmd,
          timeStart: allDay ? '' : timeStart,
          timeEnd: allDay ? '' : timeEnd,
          startMinutes,
          durationMinutes,
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
    } else {
      const pickupDateYmd = normalizeDatePart(sAny.pickDt || sAny.pickup_at_iso || sAny.pickup_at);
      if (pickupDateYmd) {
        const timeStart = normalizeTimePart(sAny.pickDt || sAny.pickup_at);
        const timeEnd = normalizeTimePart(sAny.pickDtTo || sAny.pickup_to);
        const allDay = !timeStart;
        pushEvent({
          id: `${s.id}-pickup`,
          shipmentId: Number(s.id),
          sid,
          type: 'pickup',
          dateYmd: pickupDateYmd,
          timeStart: allDay ? '' : timeStart,
          timeEnd: allDay ? '' : timeEnd,
          startMinutes: allDay ? 0 : minutesOfDayFromParts(timeStart),
          durationMinutes: allDay
            ? DEFAULT_EVENT_DURATION_MIN
            : durationFromTimes(timeStart, timeEnd),
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
      }

      const deliveryDateYmd = normalizeDatePart(
        sAny.delDt || sAny.delivery_at_iso || sAny.delivery_at
      );
      if (deliveryDateYmd) {
        const timeStart = normalizeTimePart(sAny.delDt || sAny.delivery_at);
        const timeEnd = normalizeTimePart(sAny.delDtTo || sAny.delivery_to);
        const allDay = !timeStart;
        pushEvent({
          id: `${s.id}-delivery`,
          shipmentId: Number(s.id),
          sid,
          type: 'delivery',
          dateYmd: deliveryDateYmd,
          timeStart: allDay ? '' : timeStart,
          timeEnd: allDay ? '' : timeEnd,
          startMinutes: allDay ? 0 : minutesOfDayFromParts(timeStart),
          durationMinutes: allDay
            ? DEFAULT_EVENT_DURATION_MIN
            : durationFromTimes(timeStart, timeEnd),
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

    const status = String(ev.status || '').toLowerCase();
    if ((status === 'canceled' || status === 'cancelled') && !f.showCanceled) return false;
    if (status === 'draft' && !f.showDrafts) return false;

    if (f.customers.length && !f.customers.includes(ev.companyName || '')) return false;
    if (f.carriers.length) {
      const key = ev.carrierName || '__none';
      if (!f.carriers.includes(key)) return false;
    }
    if (f.channel !== 'all' && ev.channel && ev.channel !== f.channel) return false;
    if (f.price !== 'all') {
      const pt = ev.priceType === 'bidding' ? 'spot' : ev.priceType;
      if (pt && pt !== f.price) return false;
    }
    return true;
  });
}

export function collectOverdueEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<number>();
  const out: CalendarEvent[] = [];
  events
    .filter((e) => e.isOverdue && e.type === 'pickup')
    .sort((a, b) => a.dateYmd.localeCompare(b.dateYmd))
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

export function layoutDayEvents(evs: CalendarEvent[]): LaidOutEvent[] {
  const items = evs
    .filter((e) => !e.allDay)
    .map((ev) => {
      const s = ev.startMinutes;
      const e = Math.min(1440, s + Math.max(30, ev.durationMinutes));
      return { ev, s, e, col: 0, cols: 1 };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);

  const out: LaidOutEvent[] = [];
  let cluster: typeof items = [];
  let cEnd = -1;

  const flush = () => {
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
    }
    for (const it of cluster) {
      out.push({ ev: it.ev, col: it.col, cols: colEnds.length, s: it.s, e: it.e });
    }
    cluster = [];
    cEnd = -1;
  };

  for (const it of items) {
    if (cluster.length && it.s >= cEnd) flush();
    cluster.push(it);
    cEnd = Math.max(cEnd, it.e);
  }
  if (cluster.length) flush();
  return out;
}

/* ── Formatting ── */

export function toDateLocale(lang?: string | null): string {
  const code = String(lang || 'en')
    .toLowerCase()
    .split(/[-_]/)[0];
  return code === 'el' ? 'el-GR' : 'en-US';
}

export function getWeekdayLabels(locale = 'en-US', uppercase = true): string[] {
  const baseDate = new Date(2026, 5, 1); // Monday
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const label = d.toLocaleDateString(locale, { weekday: 'short' });
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

export function formatMonthYear(year: number, monthIndex: number, locale = 'en-US'): string {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function formatDayHeader(ymd: string, locale = 'en-US'): string {
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
