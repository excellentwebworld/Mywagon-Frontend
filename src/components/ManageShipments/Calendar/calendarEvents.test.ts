import { describe, expect, it } from 'vitest';
import {
  extractCalendarEvents,
  formatDayHeader,
  formatMonthYear,
  getAdjacentDay,
  getAdjacentMonth,
  getCalendarMonthGrid,
  getMonthDateRange,
  groupEventsByDate,
} from './calendarUtils';
import type { Shipment } from '../../../context/AppContext';

describe('Calendar Event Logic & Data Mapping', () => {
  it('correctly maps multi-stop shipment with different dates into individual events', () => {
    const multiStopShipment: Partial<Shipment> = {
      id: '501',
      auto_id: 'MYV-501',
      status: 'scheduled',
      stops: [
        {
          id: 1,
          type: 'pickup',
          location: 'Athens Central Depot',
          address: 'Peiraios 100',
          city: 'Athens',
          date: '2026-10-10',
          time_start: '09:00',
          time_end: '10:30',
          order_id: 'ORD-1001',
          product_name: 'Feta Cheese',
          qty: 50,
          qty_unit: 'Tins',
          weight: 750,
          weight_unit: 'kg',
          company_name: 'Dairy Hellas',
        },
        {
          id: 2,
          type: 'pickup',
          location: 'Larissa Warehouse',
          address: 'Farsalon 25',
          city: 'Larissa',
          date: '2026-10-10',
          time_start: '14:00',
          time_end: '15:00',
          order_id: 'ORD-1002',
          product_name: 'Greek Yogurt',
          qty: 100,
          qty_unit: 'Boxes',
          weight: 500,
          weight_unit: 'kg',
          company_name: 'Thessaly Foods',
        },
        {
          id: 3,
          type: 'delivery',
          location: 'Thessaloniki Port',
          address: 'Navarchou Kountouriotou 5',
          city: 'Thessaloniki',
          date: '2026-10-11',
          time_start: '11:00',
          time_end: '13:00',
          order_id: 'ORD-1001',
          product_name: 'Feta Cheese & Yogurt',
          qty: 150,
          qty_unit: 'Units',
          weight: 1250,
          weight_unit: 'kg',
          company_name: 'Aegean Supermarkets',
        },
      ],
    };

    const events = extractCalendarEvents([multiStopShipment as Shipment]);
    expect(events).toHaveLength(3);

    // Grouping
    const grouped = groupEventsByDate(events);
    expect(Object.keys(grouped)).toEqual(['2026-10-10', '2026-10-11']);

    // 2 pickups on 2026-10-10, ordered by time
    expect(grouped['2026-10-10']).toHaveLength(2);
    expect(grouped['2026-10-10'][0].orderId).toBe('ORD-1001');
    expect(grouped['2026-10-10'][0].productName).toBe('Feta Cheese');
    expect(grouped['2026-10-10'][0].timeStart).toBe('09:00');
    expect(grouped['2026-10-10'][1].orderId).toBe('ORD-1002');
    expect(grouped['2026-10-10'][1].productName).toBe('Greek Yogurt');
    expect(grouped['2026-10-10'][1].timeStart).toBe('14:00');

    // 1 dropoff on 2026-10-11
    expect(grouped['2026-10-11']).toHaveLength(1);
    expect(grouped['2026-10-11'][0].type).toBe('delivery');
    expect(grouped['2026-10-11'][0].city).toBe('Thessaloniki');
    expect(grouped['2026-10-11'][0].companyName).toBe('Aegean Supermarkets');
  });

  it('orders pickups before deliveries when times are identical', () => {
    const shipmentA: Partial<Shipment> = {
      id: '1',
      auto_id: 'MYV-1',
      status: 'scheduled',
      stops: [
        {
          id: 1,
          type: 'delivery',
          date: '2026-10-15',
          time_start: '10:00',
        },
        {
          id: 2,
          type: 'pickup',
          date: '2026-10-15',
          time_start: '10:00',
        },
      ],
    };

    const events = extractCalendarEvents([shipmentA as Shipment]);
    const grouped = groupEventsByDate(events);

    expect(grouped['2026-10-15'][0].type).toBe('pickup');
    expect(grouped['2026-10-15'][1].type).toBe('delivery');
  });

  it('handles leap years and February boundary calculations correctly', () => {
    // 2024 is a leap year (29 days in Feb)
    const gridLeap = getCalendarMonthGrid(2024, 1);
    const febDays2024 = gridLeap.filter((c) => c.isCurrentMonth);
    expect(febDays2024).toHaveLength(29);

    // 2025 is not a leap year (28 days in Feb)
    const gridCommon = getCalendarMonthGrid(2025, 1);
    const febDays2025 = gridCommon.filter((c) => c.isCurrentMonth);
    expect(febDays2025).toHaveLength(28);
  });

  it('formats month headers in standard localized formats', () => {
    const enLabel = formatMonthYear(2026, 9, 'en-US');
    expect(enLabel).toBe('October 2026');
  });

  it('formats day headers with day of week, day number, and month', () => {
    const dayLabel = formatDayHeader('2026-10-08', 'en-US');
    expect(dayLabel).toContain('October');
    expect(dayLabel).toContain('8');
    expect(dayLabel).toContain('2026');
  });
});
