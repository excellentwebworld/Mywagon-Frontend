import { describe, expect, it } from 'vitest';
import {
  extractCalendarEvents,
  getAdjacentDay,
  getAdjacentMonth,
  getCalendarMonthGrid,
  getMonthDateRange,
  groupEventsByDate,
  parseYmdDate,
  toYmd,
} from './calendarUtils';
import type { Shipment } from '../../../context/AppContext';

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
  });
});
