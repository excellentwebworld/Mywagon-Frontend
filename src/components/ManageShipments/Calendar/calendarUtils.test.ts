import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RAIL_FILTERS,
  applyRailFilters,
  collectOverdueEvents,
  extractCalendarEvents,
  formatDmy,
  formatEventTimeRange,
  getAdjacentDay,
  getAdjacentMonth,
  getCalendarMonthGrid,
  getMonthDateRange,
  getRangeDateRange,
  groupEventsByDate,
  layoutDayEvents,
  presentTimeGrid,
  normalizeVisualStatus,
  parseCalendarRange,
  stepCursor,
  visibleDays,
} from './calendarUtils';
import type { Shipment } from '../../../context/AppContext';
import { utcToLocalParts } from '../../../utils/timezone';

describe('calendarUtils', () => {
  describe('getCalendarMonthGrid', () => {
    it('generates a grid that starts on Monday and contains all days of the month', () => {
      // October 2026: starts on Thursday Oct 1 (so Mon Sep 28, Tue Sep 29, Wed Sep 30 are padding)
      const grid = getCalendarMonthGrid(2026, 9); // Month index 9 is October
      expect(grid.length % 7).toBe(0);
      expect(grid.length).toBeGreaterThanOrEqual(35);

      // First cell should be Monday
      expect(grid[0].date.getDay()).toBe(1);

      // Should contain 31 days marked as isCurrentMonth = true
      const currentMonthDays = grid.filter((c) => c.isCurrentMonth);
      expect(currentMonthDays).toHaveLength(31);
      expect(currentMonthDays[0].dayNumber).toBe(1);
      expect(currentMonthDays[30].dayNumber).toBe(31);
    });

    it('correctly flags weekend days', () => {
      const grid = getCalendarMonthGrid(2026, 9);
      grid.forEach((cell) => {
        const jsDay = cell.date.getDay();
        if (jsDay === 0 || jsDay === 6) {
          expect(cell.isWeekend).toBe(true);
        } else {
          expect(cell.isWeekend).toBe(false);
        }
      });
    });
  });

  describe('getMonthDateRange', () => {
    it('returns the first and last dates of the visible grid', () => {
      const range = getMonthDateRange(2026, 9);
      expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.from < range.to).toBe(true);
    });
  });

  describe('navigation helpers', () => {
    it('navigates adjacent months correctly across year boundaries', () => {
      expect(getAdjacentMonth(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 });
      expect(getAdjacentMonth(2026, 0, -1)).toEqual({ year: 2025, monthIndex: 11 });
      expect(getAdjacentMonth(2026, 5, 1)).toEqual({ year: 2026, monthIndex: 6 });
    });

    it('navigates adjacent days correctly', () => {
      expect(getAdjacentDay('2026-10-08', 1)).toBe('2026-10-09');
      expect(getAdjacentDay('2026-10-08', -1)).toBe('2026-10-07');
      expect(getAdjacentDay('2026-10-31', 1)).toBe('2026-11-01');
    });
  });

  describe('extractCalendarEvents & groupEventsByDate', () => {
    const mockShipment1: Partial<Shipment> = {
      id: '101',
      auto_id: 'MYV-101',
      status: 'scheduled',
      total_qty: 15,
      qty_unit: 'Pallets',
      total_weight: 4500,
      weight_unit: 'kg',
      product_type: 'General Cargo',
      stops: [
        {
          id: 1,
          type: 'pickup',
          location: 'Warehouse Alpha',
          address: '123 Main St',
          city: 'Athens',
          date: '2026-10-12',
          time_start: '08:30',
          time_end: '10:00',
          order_id: 'ORD-5001',
          product_name: 'Olive Oil',
          qty: 10,
          qty_unit: 'Pallets',
          weight: 3000,
          weight_unit: 'kg',
          company_name: 'Acme Oils',
        },
        {
          id: 2,
          type: 'delivery',
          location: 'Depot Beta',
          address: '456 Port Ave',
          city: 'Patras',
          date: '2026-10-13',
          time_start: '14:00',
          time_end: '16:00',
          order_id: 'ORD-5001',
          product_name: 'Olive Oil',
          qty: 10,
          qty_unit: 'Pallets',
          weight: 3000,
          weight_unit: 'kg',
          company_name: 'Supermarket Hellas',
        },
      ],
    };

    const mockShipment2: Partial<Shipment> = {
      id: '102',
      auto_id: 'MYV-102',
      status: 'ontrip',
      stops: [
        {
          id: 3,
          type: 'pickup',
          city: 'Larissa',
          date: '2026-10-12',
          time_start: '09:00',
          order_id: 'ORD-5002',
          product_name: 'Cotton Bales',
        },
      ],
    };

    it('extracts all stops with SID, order, product, and scheduled times', () => {
      const events = extractCalendarEvents([mockShipment1 as Shipment, mockShipment2 as Shipment]);
      expect(events).toHaveLength(3);

      const pickup1 = events.find((e) => e.sid === 'MYV-101' && e.type === 'pickup');
      expect(pickup1).toBeDefined();
      expect(pickup1?.dateYmd).toBe('2026-10-12');
      expect(pickup1?.timeStart).toBe('08:30');
      expect(pickup1?.timeEnd).toBe('10:00');
      expect(pickup1?.orderId).toBe('ORD-5001');
      expect(pickup1?.productName).toBe('Olive Oil');
      expect(pickup1?.companyName).toBe('Acme Oils');
      expect(pickup1?.city).toBe('Athens');

      const dropoff1 = events.find((e) => e.sid === 'MYV-101' && e.type === 'delivery');
      expect(dropoff1).toBeDefined();
      expect(dropoff1?.dateYmd).toBe('2026-10-13');
      expect(dropoff1?.timeStart).toBe('14:00');
    });

    it('groups and sorts events by date, time, and type', () => {
      const events = extractCalendarEvents([mockShipment1 as Shipment, mockShipment2 as Shipment]);
      const grouped = groupEventsByDate(events);

      expect(Object.keys(grouped)).toContain('2026-10-12');
      expect(Object.keys(grouped)).toContain('2026-10-13');

      // On 2026-10-12: 08:30 pickup should come before 09:00 pickup
      expect(grouped['2026-10-12']).toHaveLength(2);
      expect(grouped['2026-10-12'][0].sid).toBe('MYV-101');
      expect(grouped['2026-10-12'][1].sid).toBe('MYV-102');
    });

    it('falls back to top-level shipment schedule when stops array is empty', () => {
      const noStopsShipment: Partial<Shipment> = {
        id: '103',
        auto_id: 'MYV-103',
        status: 'pending',
        pickup_at_iso: '2026-10-15T09:00:00Z',
        pickup_at: '15/10/2026 09:00',
        delivery_at_iso: '2026-10-16T11:00:00Z',
        delivery_at: '16/10/2026 11:00',
        origin: 'Thessaloniki',
        dest: 'Athens',
      };

      const events = extractCalendarEvents([noStopsShipment as Shipment]);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('pickup');
      expect(events[0].dateYmd).toBe('2026-10-15');
      expect(events[1].type).toBe('delivery');
      expect(events[1].dateYmd).toBe('2026-10-16');
    });

    it('converts UTC ISO pickup/delivery to browser-local date and time', () => {
      // 09:00 UTC → local wall clock via utcToLocalParts (browser TZ)
      const utcShipment: Partial<Shipment> = {
        id: '104',
        auto_id: 'MYV-104',
        status: 'scheduled',
        pickup_at_iso: '2026-10-15T09:00:00Z',
        delivery_at_iso: '2026-10-16T14:30:00Z',
      };

      const events = extractCalendarEvents([utcShipment as Shipment]);
      expect(events).toHaveLength(2);

      const pickup = events.find((e) => e.type === 'pickup')!;
      const delivery = events.find((e) => e.type === 'delivery')!;

      const pickLocal = utcToLocalParts('2026-10-15T09:00:00Z');
      const delLocal = utcToLocalParts('2026-10-16T14:30:00Z');

      expect(pickup.dateYmd).toBe(pickLocal.date);
      expect(pickup.timeStart).toBe(pickLocal.time);
      expect(delivery.dateYmd).toBe(delLocal.date);
      expect(delivery.timeStart).toBe(delLocal.time);
    });
  });

  describe('formatEventTimeRange', () => {
    it('shows a single time when start equals end', () => {
      expect(formatEventTimeRange('12:31', '12:31')).toBe('12:31');
    });

    it('shows a range only when end differs from start', () => {
      expect(formatEventTimeRange('09:00', '10:30')).toBe('09:00 – 10:30');
    });

    it('shows start alone when end is missing', () => {
      expect(formatEventTimeRange('14:00', '')).toBe('14:00');
      expect(formatEventTimeRange('14:00', null)).toBe('14:00');
    });
  });

  describe('formatDmy', () => {
    it('formats as dd/MM/yyyy (platform standard, not US MM/DD/yyyy)', () => {
      expect(formatDmy('2026-10-13')).toBe('13/10/2026');
      expect(formatDmy('2026-01-05')).toBe('05/01/2026');
    });
  });

  describe('range helpers', () => {
    const monday = new Date(2026, 9, 12); // Mon 12 Oct 2026

    it('visibleDays returns correct lengths for each range', () => {
      expect(visibleDays('day', monday)).toHaveLength(1);
      expect(visibleDays('3day', monday)).toHaveLength(3);
      expect(visibleDays('workweek', monday)).toHaveLength(5);
      expect(visibleDays('week', monday)).toHaveLength(7);
      expect(visibleDays('month', monday)).toHaveLength(31);
    });

    it('stepCursor moves by range unit', () => {
      expect(stepCursor('day', monday, 1).getDate()).toBe(13);
      expect(stepCursor('3day', monday, 1).getDate()).toBe(15);
      expect(stepCursor('week', monday, 1).getDate()).toBe(19);
      expect(stepCursor('month', monday, 1).getMonth()).toBe(10);
    });

    it('getRangeDateRange covers week and month padding', () => {
      const week = getRangeDateRange('week', monday);
      expect(week.from).toBe('2026-10-12');
      expect(week.to).toBe('2026-10-18');

      const month = getRangeDateRange('month', monday);
      expect(month.from <= '2026-10-01').toBe(true);
      expect(month.to >= '2026-10-31').toBe(true);
    });

    it('parseCalendarRange accepts new and legacy values', () => {
      expect(parseCalendarRange('week')).toBe('week');
      expect(parseCalendarRange('3day')).toBe('3day');
      expect(parseCalendarRange('month')).toBe('month');
      expect(parseCalendarRange(null)).toBe('week');
    });
  });

  describe('status and filters', () => {
    it('normalizeVisualStatus maps pending+bids and aliases', () => {
      expect(normalizeVisualStatus('pending', 0)).toBe('pending');
      expect(normalizeVisualStatus('pending', 2)).toBe('bids');
      expect(normalizeVisualStatus('on_trip')).toBe('ontrip');
      expect(normalizeVisualStatus('past_due')).toBe('pastdue');
      expect(normalizeVisualStatus('fullfilled')).toBe('fulfilled');
    });

    it('applyRailFilters hides deliveries when toggled off', () => {
      const events = extractCalendarEvents([
        {
          id: '101',
          auto_id: 'MYV-101',
          status: 'scheduled',
          stops: [
            {
              id: 1,
              type: 'pickup',
              date: '2026-10-12',
              time_start: '08:00',
              company_name: 'Acme',
            },
            {
              id: 2,
              type: 'delivery',
              date: '2026-10-12',
              time_start: '14:00',
              company_name: 'Acme',
            },
          ],
        } as Shipment,
      ]);
      const filtered = applyRailFilters(events, { ...DEFAULT_RAIL_FILTERS, delivery: false });
      expect(filtered.every((e) => e.type === 'pickup')).toBe(true);
      expect(filtered).toHaveLength(1);
    });

    it('layoutDayEvents places overlapping events in columns', () => {
      const events = extractCalendarEvents([
        {
          id: '201',
          auto_id: 'A',
          status: 'scheduled',
          stops: [{ id: 1, type: 'pickup', date: '2026-10-12', time_start: '08:00', time_end: '10:00' }],
        } as Shipment,
        {
          id: '202',
          auto_id: 'B',
          status: 'ready',
          stops: [{ id: 1, type: 'pickup', date: '2026-10-12', time_start: '09:00', time_end: '11:00' }],
        } as Shipment,
      ]);
      const laid = layoutDayEvents(events);
      expect(laid).toHaveLength(2);
      expect(laid[0].cols).toBe(2);
      expect(laid[1].cols).toBe(2);
      expect(new Set(laid.map((x) => x.col)).size).toBe(2);
      expect(laid[0].e - laid[0].s).toBe(120);
      expect(laid[1].e - laid[1].s).toBe(120);
    });

    it('collapses overlapping slots to one event plus a +n rail outside day view', () => {
      const events = extractCalendarEvents([
        {
          id: '401',
          auto_id: 'A',
          status: 'scheduled',
          stops: [{ id: 1, type: 'pickup', date: '2026-10-12', time_start: '08:00', time_end: '10:00' }],
        } as Shipment,
        {
          id: '402',
          auto_id: 'B',
          status: 'ready',
          stops: [{ id: 1, type: 'pickup', date: '2026-10-12', time_start: '09:00', time_end: '11:00' }],
        } as Shipment,
      ]);
      const pieces = presentTimeGrid(events, 1);
      expect(pieces.map((p) => p.type)).toEqual(['event', 'more']);
      const more = pieces[1];
      expect(more.type).toBe('more');
      if (more.type === 'more') {
        expect(more.extra).toBe(1);
        expect(more.events).toHaveLength(2);
        expect(more.width).toContain('25%');
      }
      expect(pieces[0].width).toContain('75%');
    });

    it('keeps up to five side-by-side slots on day view and collapses past that', () => {
      const stops = Array.from({ length: 6 }, (_, i) => ({
        id: String(500 + i),
        auto_id: `S${i}`,
        status: 'scheduled',
        stops: [{ id: 1, type: 'pickup', date: '2026-10-12', time_start: '08:00', time_end: '09:00' }],
      }));
      const events = extractCalendarEvents(stops as Shipment[]);
      const five = presentTimeGrid(events.slice(0, 5), 5);
      expect(five.every((p) => p.type === 'event')).toBe(true);
      expect(five).toHaveLength(5);

      const six = presentTimeGrid(events, 5);
      expect(six.map((p) => p.type)).toEqual(['event', 'more']);
      const more = six[1];
      if (more.type === 'more') expect(more.extra).toBe(5);
    });

    it('sizes a ranged window to its full duration and keeps 1 hour when there is no end', () => {
      const events = extractCalendarEvents([
        {
          id: '301',
          auto_id: 'RANGE',
          status: 'scheduled',
          stops: [
            { id: 1, type: 'pickup', date: '2026-10-12', time_start: '08:30', time_end: '11:00' },
          ],
        } as Shipment,
        {
          id: '302',
          auto_id: 'OPEN',
          status: 'scheduled',
          stops: [{ id: 1, type: 'pickup', date: '2026-10-12', time_start: '09:00' }],
        } as Shipment,
      ]);
      const ranged = events.find((e) => e.sid === 'RANGE')!;
      const open = events.find((e) => e.sid === 'OPEN')!;
      expect(ranged.durationMinutes).toBe(150);
      expect(ranged.startMinutes).toBe(8 * 60 + 30);
      expect(open.durationMinutes).toBe(60);
      expect(open.timeEnd).toBe('');
    });

    it('splits an overnight range into a second slot on the following day', () => {
      const events = extractCalendarEvents([
        {
          id: '303',
          auto_id: 'NIGHT',
          status: 'scheduled',
          stops: [
            { id: 1, type: 'pickup', date: '2026-10-12', time_start: '22:00', time_end: '02:30' },
          ],
        } as Shipment,
      ]);
      expect(events).toHaveLength(2);
      expect(events[0].dateYmd).toBe('2026-10-12');
      expect(events[0].startMinutes).toBe(22 * 60);
      expect(events[0].durationMinutes).toBe(2 * 60);
      expect(events[0].timeEnd).toBe('24:00');
      expect(events[1].dateYmd).toBe('2026-10-13');
      expect(events[1].timeStart).toBe('00:00');
      expect(events[1].timeEnd).toBe('02:30');
      expect(events[1].startMinutes).toBe(0);
      expect(events[1].durationMinutes).toBe(150);
    });

    it('collectOverdueEvents counts only overdue loads in the given visible set', () => {
      const dayEvents = extractCalendarEvents([
        {
          id: '1',
          auto_id: 'SID-1',
          status: 'past_due',
          stops: [{ id: 1, type: 'delivery', date: '2026-10-07', time_start: '11:28' }],
        } as Shipment,
        {
          id: '2',
          auto_id: 'SID-2',
          status: 'pending',
          stops: [{ id: 1, type: 'delivery', date: '2026-10-07', time_start: '12:00' }],
        } as Shipment,
        {
          id: '3',
          auto_id: 'SID-3',
          status: 'past_due',
          stops: [{ id: 1, type: 'delivery', date: '2026-10-07', time_start: '16:42' }],
        } as Shipment,
      ]);
      // Only past_due rows on this day count (pending dropoffs are not overdue themselves)
      expect(collectOverdueEvents(dayEvents)).toHaveLength(2);
      expect(collectOverdueEvents(dayEvents).map((e) => e.sid).sort()).toEqual(['SID-1', 'SID-3']);
    });
  });
});
