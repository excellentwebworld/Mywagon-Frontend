import type { Shipment, ShipmentStop } from '../../../context/AppContext';

export interface CalendarEvent {
  id: string;
  shipmentId: number;
  sid: string;
  type: 'pickup' | 'delivery';
  dateYmd: string;
  timeStart: string;
  timeEnd: string;
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
  carrierName?: string | null;
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

export const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export function padZero(num: number): string {
  return String(num).padStart(2, '0');
}

export function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}-${m}-${d}`;
}

export function parseYmdDate(ymd: string): Date {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  if (!y || !m || !d) {
    return new Date();
  }
  return new Date(y, m - 1, d);
}

export function getTodayYmd(): string {
  return toYmd(new Date());
}

/**
 * Generate a 35 or 42-day calendar matrix for a given month/year.
 * Starts on Monday (European / ISO week).
 */
export function getCalendarMonthGrid(year: number, monthIndex: number): CalendarDayCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);

  // JavaScript: 0 is Sunday, 1 is Monday ... 6 is Saturday.
  // European Monday start: Monday is 0, Sunday is 6.
  const jsDay = firstOfMonth.getDay();
  const startOffset = (jsDay + 6) % 7;

  const todayStr = getTodayYmd();
  const cells: CalendarDayCell[] = [];

  // Previous month trailing days
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

  // Current month days
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

  // Next month leading days to complete grid to multiple of 7 (at least 35, up to 42)
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

/**
 * Returns date range strings { from, to } covering the entire visible grid for a month,
 * including padding days from adjacent months.
 */
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

export function getAdjacentMonth(year: number, monthIndex: number, offset: number): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + offset, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function getAdjacentDay(ymd: string, offset: number): string {
  const d = parseYmdDate(ymd);
  d.setDate(d.getDate() + offset);
  return toYmd(d);
}

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
  if (
    trimmed === '0' ||
    trimmed === '—' ||
    trimmed === '-' ||
    trimmed.startsWith('00:00:00')
  ) {
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
      typeof s.carrier === 'string'
        ? s.carrier
        : (sAny.carrier?.name || null);

    if (rawStops.length > 0) {
      rawStops.forEach((stop, idx) => {
        const stopAny = stop as any;
        const isPickup =
          stopAny.type === 'pickup' ||
          String(stopAny.type).toLowerCase() === 'pickup';
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

        const orderId =
          stopAny.order_id ||
          stopAny.orderId ||
          (stopAny.customers?.[0]?.orders?.[0]?.id) ||
          (sAny.orderIds && sAny.orderIds[0]) ||
          (sAny.order_ids && sAny.order_ids[0]) ||
          sAny.ref ||
          sAny.customer_reference ||
          null;

        const productName =
          stopAny.product_name ||
          stopAny.productName ||
          (stopAny.customers?.[0]?.orders?.[0]?.products) ||
          (typeof sAny.product_type === 'string' ? sAny.product_type : null) ||
          (typeof sAny.productType === 'string' ? sAny.productType : null) ||
          null;

        const qty =
          stopAny.qty ??
          (stopAny.customers?.[0]?.orders?.[0]?.qty) ??
          sAny.totalQty ??
          sAny.total_qty ??
          null;

        const qtyUnit =
          stopAny.qty_unit ||
          stopAny.qtyUnit ||
          (stopAny.customers?.[0]?.orders?.[0]?.qtyUnit) ||
          sAny.qtyUnit ||
          sAny.qty_unit ||
          null;

        const weight =
          stopAny.weight ??
          (stopAny.customers?.[0]?.orders?.[0]?.weight) ??
          sAny.totalWeight ??
          sAny.total_weight ??
          null;

        const weightUnit =
          stopAny.weight_unit ||
          stopAny.weightUnit ||
          (stopAny.customers?.[0]?.orders?.[0]?.weightUnit) ||
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

        events.push({
          id: `${s.id}-${stopAny.id || idx}-${type}`,
          shipmentId: Number(s.id),
          sid,
          type,
          dateYmd,
          timeStart,
          timeEnd,
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
      // Fallback: derive pickup and delivery events from top-level shipment schedule
      const pickupDateYmd = normalizeDatePart(sAny.pickDt || sAny.pickup_at_iso || sAny.pickup_at);
      if (pickupDateYmd) {
        events.push({
          id: `${s.id}-pickup`,
          shipmentId: Number(s.id),
          sid,
          type: 'pickup',
          dateYmd: pickupDateYmd,
          timeStart: normalizeTimePart(sAny.pickDt || sAny.pickup_at),
          timeEnd: normalizeTimePart(sAny.pickDtTo || sAny.pickup_to),
          orderId: (sAny.orderIds && sAny.orderIds[0]) || (sAny.order_ids && sAny.order_ids[0]) || sAny.ref || sAny.customer_reference || null,
          productName: (typeof sAny.product_type === 'string' ? sAny.product_type : null) || (typeof sAny.productType === 'string' ? sAny.productType : null) || null,
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

      const deliveryDateYmd = normalizeDatePart(sAny.delDt || sAny.delivery_at_iso || sAny.delivery_at);
      if (deliveryDateYmd) {
        events.push({
          id: `${s.id}-delivery`,
          shipmentId: Number(s.id),
          sid,
          type: 'delivery',
          dateYmd: deliveryDateYmd,
          timeStart: normalizeTimePart(sAny.delDt || sAny.delivery_at),
          timeEnd: normalizeTimePart(sAny.delDtTo || sAny.delivery_to),
          orderId: (sAny.orderIds && sAny.orderIds[0]) || (sAny.order_ids && sAny.order_ids[0]) || sAny.ref || sAny.customer_reference || null,
          productName: (typeof sAny.product_type === 'string' ? sAny.product_type : null) || (typeof sAny.productType === 'string' ? sAny.productType : null) || null,
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

/**
 * Groups a list of calendar events by their YYYY-MM-DD date,
 * sorting each day's events by time, then type, then SID.
 */
export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};

  events.forEach((ev) => {
    if (!map[ev.dateYmd]) {
      map[ev.dateYmd] = [];
    }
    map[ev.dateYmd].push(ev);
  });

  Object.keys(map).forEach((dateKey) => {
    map[dateKey].sort((a, b) => {
      // 1. Time ascending
      if (a.timeStart && b.timeStart) {
        const timeDiff = a.timeStart.localeCompare(b.timeStart);
        if (timeDiff !== 0) return timeDiff;
      } else if (a.timeStart && !b.timeStart) {
        return -1;
      } else if (!a.timeStart && b.timeStart) {
        return 1;
      }
      // 2. Pickups before deliveries
      if (a.type !== b.type) {
        return a.type === 'pickup' ? -1 : 1;
      }
      // 3. SID
      return a.sid.localeCompare(b.sid);
    });
  });

  return map;
}

/** Map app language code to a BCP-47 locale for date formatting. */
export function toDateLocale(lang?: string | null): string {
  const code = String(lang || 'en')
    .toLowerCase()
    .split(/[-_]/)[0];
  return code === 'el' ? 'el-GR' : 'en-US';
}

/** Monday-first short weekday labels for the given locale (e.g. MON / Δευ). */
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
