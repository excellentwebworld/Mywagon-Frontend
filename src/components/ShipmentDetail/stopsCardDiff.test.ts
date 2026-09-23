import { describe, it, expect } from 'vitest';
import { computeStopsDiff, type PhysicalStop } from './StopsCard';

function createMockPhysicalStop(overrides: Partial<PhysicalStop> = {}): PhysicalStop {
  const rawStop: any = {
    id: overrides.id ?? 1,
    type: overrides.type ?? 'pickup',
    location: overrides.location ?? 'Kalivia location',
    address: overrides.address ?? 'MAYPIKEZAΣ 17, Kalivia Thorikou 190 10, Greece',
    date: overrides.date ?? '2026-09-22',
    timeStart: overrides.timeStart ?? '10:00',
    timeEnd: overrides.timeEnd ?? '12:00',
    customers: [],
    ...(overrides.rawStop || {}),
  };

  return {
    key: `key-${overrides.id ?? 1}`,
    rawStop,
    id: overrides.id ?? 1,
    locationIds: [overrides.id ?? 1],
    type: overrides.type ?? 'pickup',
    location: overrides.location ?? 'Kalivia location',
    address: overrides.address ?? 'MAYPIKEZAΣ 17, Kalivia Thorikou 190 10, Greece',
    date: overrides.date ?? '2026-09-22',
    timeStart: overrides.timeStart ?? '10:00',
    timeEnd: overrides.timeEnd ?? '12:00',
    orders: overrides.orders ?? [
      {
        orderId: 'ORD-23432',
        customerName: 'Company One',
        products: [
          {
            name: 'SK-1234',
            qty: 15,
            qtyUnit: 'Boxes',
            weight: 10,
            weightUnit: 'Kgs',
          },
        ],
      },
    ],
    totalProductCount: 1,
    totalOrderCount: 1,
    ...overrides,
  };
}

describe('computeStopsDiff', () => {
  it('detects schedule changes (date and time) on updated stops', () => {
    const oldStops = [
      createMockPhysicalStop({
        id: 1,
        type: 'pickup',
        location: 'Kalivia location',
        date: '2026-09-22',
        timeStart: '10:00',
        timeEnd: '',
      }),
      createMockPhysicalStop({
        id: 2,
        type: 'delivery',
        location: 'LIDL',
        date: '2026-09-22',
        timeStart: '14:00',
        timeEnd: '',
      }),
    ];

    const updatedStops = [
      createMockPhysicalStop({
        id: 101,
        type: 'pickup',
        location: 'Kalivia location',
        date: '2026-09-23',
        timeStart: '21:30',
        timeEnd: '',
        rawStop: { id: 101, locationReferenceId: 1 } as any,
      }),
      createMockPhysicalStop({
        id: 102,
        type: 'delivery',
        location: 'LIDL',
        date: '2026-09-23',
        timeStart: '22:40',
        timeEnd: '',
        rawStop: { id: 102, locationReferenceId: 2 } as any,
      }),
    ];

    const diff = computeStopsDiff(updatedStops, oldStops);

    expect(diff[0]?.schedule).toBe(true);
    expect(diff[0]?.date).toBe(true);
    expect(diff[0]?.time).toBe(true);
    expect(diff[0]?.location).toBe(false);
    expect(diff[0]?.address).toBe(false);

    expect(diff[1]?.schedule).toBe(true);
    expect(diff[1]?.date).toBe(true);
    expect(diff[1]?.time).toBe(true);
    expect(diff[1]?.location).toBe(false);
    expect(diff[1]?.address).toBe(false);
  });

  it('returns empty highlights when updated and old stops are identical', () => {
    const oldStops = [
      createMockPhysicalStop({ id: 1, date: '2026-09-23', timeStart: '21:30' }),
    ];
    const updatedStops = [
      createMockPhysicalStop({ id: 1, date: '2026-09-23', timeStart: '21:30' }),
    ];

    const diff = computeStopsDiff(updatedStops, oldStops);
    expect(Object.keys(diff)).toHaveLength(0);
  });

  it('detects location and address changes', () => {
    const oldStops = [
      createMockPhysicalStop({
        id: 1,
        location: 'Athens Warehouse',
        address: 'Old St 123',
        date: '2026-09-23',
        timeStart: '21:30',
      }),
    ];
    const updatedStops = [
      createMockPhysicalStop({
        id: 1,
        location: 'Piraeus Port',
        address: 'New Harbor Rd 456',
        date: '2026-09-23',
        timeStart: '21:30',
      }),
    ];

    const diff = computeStopsDiff(updatedStops, oldStops);
    expect(diff[0]?.location).toBe(true);
    expect(diff[0]?.address).toBe(true);
    expect(diff[0]?.schedule).toBe(false);
  });

  it('detects order and product changes (orderId, quantity, weight, SKU name)', () => {
    const oldStops = [
      createMockPhysicalStop({
        id: 1,
        orders: [
          {
            orderId: 'ORD-100',
            customerName: 'Customer A',
            products: [{ name: 'Apples', qty: 10, qtyUnit: 'Boxes', weight: 50, weightUnit: 'Kgs' }],
          },
        ],
      }),
    ];

    const updatedStops = [
      createMockPhysicalStop({
        id: 1,
        orders: [
          {
            orderId: 'ORD-100',
            customerName: 'Customer B', // Changed
            products: [{ name: 'Oranges', qty: 25, qtyUnit: 'Boxes', weight: 50, weightUnit: 'Kgs' }], // Name & qty changed
          },
        ],
      }),
    ];

    const diff = computeStopsDiff(updatedStops, oldStops);
    const order0Hl = diff[0]?.orders?.[0];
    expect(order0Hl?.customerName).toBe(true);
    expect(order0Hl?.orderId).toBe(false);
    expect(order0Hl?.products?.[0]?.name).toBe(true);
    expect(order0Hl?.products?.[0]?.qty).toBe(true);
    expect(order0Hl?.products?.[0]?.weight).toBe(false);
  });

  it('marks entirely new stops with NEW only (no red field highlights, matching Step2)', () => {
    const oldStops = [
      createMockPhysicalStop({ id: 1, type: 'pickup' }),
    ];
    const updatedStops = [
      createMockPhysicalStop({ id: 1, type: 'pickup' }),
      createMockPhysicalStop({ id: 2, type: 'delivery', location: 'New Stop' }),
    ];

    const diff = computeStopsDiff(updatedStops, oldStops);
    expect(diff[0]).toBeUndefined(); // First stop is identical
    expect(diff[1]?.isNew).toBe(true);
    expect(diff[1]?.schedule).toBeUndefined();
    expect(diff[1]?.date).toBeUndefined();
    expect(diff[1]?.location).toBeUndefined();
    expect(diff[1]?.address).toBeUndefined();
  });

  it('matches updated stops to old stops when ids are strings vs numbers', () => {
    const oldStops = [
      createMockPhysicalStop({
        id: '1' as unknown as number,
        type: 'pickup',
        location: 'Kalivia location',
        date: '2026-09-22',
        timeStart: '10:00',
        timeEnd: '',
        locationIds: ['1' as unknown as number],
      }),
    ];
    const updatedStops = [
      createMockPhysicalStop({
        id: 101,
        type: 'pickup',
        location: 'Kalivia location',
        date: '2026-09-23',
        timeStart: '21:30',
        timeEnd: '',
        rawStop: { id: 101, locationReferenceId: 1 } as any,
      }),
    ];

    const diff = computeStopsDiff(updatedStops, oldStops);
    expect(diff[0]?.isNew).toBeUndefined();
    expect(diff[0]?.schedule).toBe(true);
    expect(diff[0]?.date).toBe(true);
    expect(diff[0]?.time).toBe(true);
    expect(diff[0]?.location).toBe(false);
  });

  it('highlights only time when date is unchanged', () => {
    const oldStops = [
      createMockPhysicalStop({
        id: 1,
        date: '2026-09-23',
        timeStart: '10:00',
        timeEnd: '',
      }),
    ];
    const updatedStops = [
      createMockPhysicalStop({
        id: 101,
        date: '2026-09-23',
        timeStart: '21:30',
        timeEnd: '',
        rawStop: { id: 101, locationReferenceId: 1 } as any,
      }),
    ];

    const diff = computeStopsDiff(updatedStops, oldStops);
    expect(diff[0]?.date).toBe(false);
    expect(diff[0]?.time).toBe(true);
    expect(diff[0]?.schedule).toBe(true);
  });
});
