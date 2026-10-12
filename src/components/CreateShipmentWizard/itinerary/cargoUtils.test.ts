import { describe, expect, it } from 'vitest';
import type { ApiStop } from '../../../api/types/createShipment';
import {
  computeCargoLineQtyWeight,
  computeRunningWeights,
  computeStopRunningWeights,
  syncDropoffMirrorLinks,
} from './cargoUtils';

function stop(partial: Partial<ApiStop> & { id: string; lines: ApiStop['lines'] }): ApiStop {
  return {
    locationId: '',
    locationName: '',
    locationCompany: '',
    locationCity: '',
    locationCountry: '',
    dateFrom: '',
    timeFrom: '',
    dateTo: '',
    timeTo: '',
    notes: '',
    collapsed: false,
    ...partial,
  };
}

describe('computeCargoLineQtyWeight dropoff remaining', () => {
  it('prefills remaining qty/weight after another dropoff was reduced', () => {
    const stops: ApiStop[] = [
      stop({
        id: 's1',
        lines: [
          {
            id: 'pk1',
            productId: 'p1',
            productName: 'Boxes',
            customerId: '',
            customerName: '',
            orderId: 'ord1',
            orderRef: 'ORD-1',
            orderLineId: '',
            action: 'pickup',
            qty: '5',
            unit: 'Boxes',
            weight: '10',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
      stop({
        id: 's2',
        lines: [
          {
            id: 'do1',
            productId: 'p1',
            productName: 'Boxes',
            customerId: '',
            customerName: '',
            orderId: 'ord1',
            orderRef: 'ORD-1',
            orderLineId: '',
            action: 'dropoff',
            qty: '2',
            unit: 'Boxes',
            weight: '3',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
      stop({
        id: 's3',
        lines: [
          {
            id: 'do2',
            productId: '',
            productName: '',
            customerId: '',
            customerName: '',
            orderId: '',
            orderRef: '',
            orderLineId: '',
            action: 'dropoff',
            qty: '',
            unit: 'Boxes',
            weight: '',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
    ];

    const result = computeCargoLineQtyWeight({
      stops,
      lineId: 'do2',
      orderId: 'ord1',
      productId: 'p1',
      action: 'dropoff',
      orderLine: {
        quantity: 5,
        unit: 'Boxes',
        weight: 10,
        weightUnit: 'kg',
      },
      lineUnit: 'Boxes',
      lineWtUnit: 'kg',
    });

    expect(result.qty).toBe('3');
    expect(result.weight).toBe('7');
  });

  it('returns full pickup when no other dropoffs exist', () => {
    const stops: ApiStop[] = [
      stop({
        id: 's1',
        lines: [
          {
            id: 'pk1',
            productId: 'p1',
            productName: 'Boxes',
            customerId: '',
            customerName: '',
            orderId: 'ord1',
            orderRef: 'ORD-1',
            orderLineId: '',
            action: 'pickup',
            qty: '5',
            unit: 'Boxes',
            weight: '10',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
    ];

    const result = computeCargoLineQtyWeight({
      stops,
      lineId: 'do-new',
      orderId: 'ord1',
      productId: 'p1',
      action: 'dropoff',
      orderLine: {
        quantity: 5,
        unit: 'Boxes',
        weight: 10,
        weightUnit: 'kg',
      },
    });

    expect(result.qty).toBe('5');
    expect(result.weight).toBe('10');
  });
});

describe('syncDropoffMirrorLinks', () => {
  it('links split same-order products to matching pickup qty', () => {
    const stops: ApiStop[] = [
      stop({
        id: 's1',
        lines: [
          {
            id: 'pk-80',
            productId: 'p1',
            productName: 'Boats',
            customerId: '',
            customerName: '',
            orderId: 'AMUL0001',
            orderRef: 'AMUL0001',
            orderLineId: '',
            action: 'pickup',
            qty: '80',
            unit: 'Boxes',
            weight: '6',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
      stop({
        id: 's2',
        lines: [
          {
            id: 'pk-20',
            productId: 'p1',
            productName: 'Boats',
            customerId: '',
            customerName: '',
            orderId: 'AMUL0001',
            orderRef: 'AMUL0001',
            orderLineId: '',
            action: 'pickup',
            qty: '20',
            unit: 'Boxes',
            weight: '4',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
      stop({
        id: 's3',
        lines: [
          {
            id: 'dl-80',
            productId: 'p1',
            productName: 'Boats',
            customerId: '',
            customerName: '',
            orderId: 'AMUL0001',
            orderRef: 'AMUL0001',
            orderLineId: '',
            action: 'dropoff',
            qty: '80',
            unit: 'Boxes',
            weight: '6',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
      stop({
        id: 's4',
        lines: [
          {
            id: 'dl-20',
            productId: 'p1',
            productName: 'Boats',
            customerId: '',
            customerName: '',
            orderId: 'AMUL0001',
            orderRef: 'AMUL0001',
            orderLineId: '',
            action: 'dropoff',
            qty: '20',
            unit: 'Boxes',
            weight: '4',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
    ];

    const synced = syncDropoffMirrorLinks(stops);
    const drop80 = synced[2].lines[0];
    const drop20 = synced[3].lines[0];

    expect(drop80.mirrorOf).toBe('pk-80');
    expect(drop20.mirrorOf).toBe('pk-20');
  });

  it('allows multiple dropoffs to share one pickup when qty is split', () => {
    const stops: ApiStop[] = [
      stop({
        id: 's1',
        lines: [
          {
            id: 'pk-400',
            productId: 'p1',
            productName: 'milk',
            customerId: '',
            customerName: 'Beta Company',
            orderId: 'betacompanyorder',
            orderRef: 'betacompanyorder',
            orderLineId: '',
            action: 'pickup',
            qty: '400',
            unit: 'US Pallets',
            weight: '800',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
      stop({
        id: 's2',
        lines: [
          {
            id: 'dl-200a',
            productId: 'p1',
            productName: 'milk',
            customerId: '',
            customerName: 'Beta Company',
            orderId: 'betacompanyorder',
            orderRef: 'betacompanyorder',
            orderLineId: '',
            action: 'dropoff',
            qty: '200',
            unit: 'US Pallets',
            weight: '400',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
      stop({
        id: 's3',
        lines: [
          {
            id: 'dl-200b',
            productId: 'p1',
            productName: 'milk',
            customerId: '',
            customerName: 'Beta Company',
            orderId: 'betacompanyorder',
            orderRef: 'betacompanyorder',
            orderLineId: '',
            action: 'dropoff',
            qty: '200',
            unit: 'US Pallets',
            weight: '400',
            wtUnit: 'kg',
            mirrorOf: '',
          },
        ],
      }),
    ];

    const synced = syncDropoffMirrorLinks(stops);
    expect(synced[1].lines[0].mirrorOf).toBe('pk-400');
    expect(synced[2].lines[0].mirrorOf).toBe('pk-400');
  });
});

function line(
  partial: Partial<NonNullable<ApiStop['lines']>[number]> & {
    id: string;
    action: 'pickup' | 'dropoff';
  }
): NonNullable<ApiStop['lines']>[number] {
  return {
    productId: 'p1',
    productName: 'Cargo',
    customerId: '',
    customerName: '',
    orderId: 'ord1',
    orderRef: 'ORD-1',
    orderLineId: '',
    qty: '1',
    unit: 'Boxes',
    weight: '0',
    wtUnit: 'kg',
    mirrorOf: '',
    ...partial,
  };
}

describe('computeStopRunningWeights / computeRunningWeights', () => {
  it('split delivery: pickup 10 → drop 5 → drop 5 shows remaining (not peak, not 0 on last)', () => {
    const stops: ApiStop[] = [
      stop({ id: 's1', lines: [line({ id: 'pk', action: 'pickup', weight: '10' })] }),
      stop({ id: 's2', lines: [line({ id: 'do1', action: 'dropoff', weight: '5' })] }),
      stop({ id: 's3', lines: [line({ id: 'do2', action: 'dropoff', weight: '5' })] }),
    ];

    const detail = computeStopRunningWeights(stops);
    expect(detail.map((r) => r.arrivalKg)).toEqual([0, 10, 5]);
    expect(detail.map((r) => r.departureKg)).toEqual([10, 5, 0]);
    // Stop2 remaining 5 after partial drop; Stop3 emptied → show arrival 5 (not 0).
    expect(detail.map((r) => r.onTruckKg)).toEqual([10, 5, 5]);
    expect(computeRunningWeights(stops)).toEqual([10, 5, 5]);
  });

  it('simple pickup then full dropoff', () => {
    const stops: ApiStop[] = [
      stop({ id: 's1', lines: [line({ id: 'pk', action: 'pickup', weight: '10' })] }),
      stop({ id: 's2', lines: [line({ id: 'do', action: 'dropoff', weight: '10' })] }),
    ];
    expect(computeRunningWeights(stops)).toEqual([10, 10]);
    const detail = computeStopRunningWeights(stops);
    expect(detail[1].arrivalKg).toBe(10);
    expect(detail[1].departureKg).toBe(0);
  });

  it('unload-then-load at a mixed stop', () => {
    const stops: ApiStop[] = [
      stop({ id: 's1', lines: [line({ id: 'pk1', action: 'pickup', weight: '20' })] }),
      stop({
        id: 's2',
        lines: [
          line({ id: 'do', action: 'dropoff', weight: '20' }),
          line({ id: 'pk2', action: 'pickup', weight: '8' }),
        ],
      }),
      stop({ id: 's3', lines: [line({ id: 'do2', action: 'dropoff', weight: '8' })] }),
    ];

    const detail = computeStopRunningWeights(stops);
    expect(detail[1]).toMatchObject({
      arrivalKg: 20,
      dropoffKg: 20,
      pickupKg: 8,
      departureKg: 8,
      onTruckKg: 8,
    });
    expect(computeRunningWeights(stops)).toEqual([20, 8, 8]);
  });

  it('ignores empty placeholder lines and unknown actions', () => {
    const stops: ApiStop[] = [
      stop({
        id: 's1',
        lines: [
          line({ id: 'pk', action: 'pickup', weight: '10' }),
          {
            id: 'empty',
            productId: '',
            productName: '',
            customerId: '',
            customerName: '',
            orderId: '',
            orderRef: '',
            orderLineId: '',
            action: 'pickup',
            qty: '',
            unit: 'Boxes',
            weight: '',
            wtUnit: 'kg',
            mirrorOf: '',
          },
          {
            ...line({ id: 'weird', action: 'pickup', weight: '99' }),
            action: 'transfer' as 'pickup',
          },
        ],
      }),
      stop({ id: 's2', lines: [line({ id: 'do', action: 'dropoff', weight: '10' })] }),
    ];

    expect(computeRunningWeights(stops)).toEqual([10, 10]);
  });

  it('converts tonnes to kg for running totals', () => {
    const stops: ApiStop[] = [
      stop({
        id: 's1',
        lines: [line({ id: 'pk', action: 'pickup', weight: '1.5', wtUnit: 'Tonnes' })],
      }),
      stop({
        id: 's2',
        lines: [line({ id: 'do', action: 'dropoff', weight: '500', wtUnit: 'Kgs' })],
      }),
    ];

    const detail = computeStopRunningWeights(stops);
    expect(detail[0].departureKg).toBe(1500);
    expect(detail[1].arrivalKg).toBe(1500);
    expect(detail[1].departureKg).toBe(1000);
    expect(computeRunningWeights(stops)).toEqual([1500, 1000]);
  });

  it('new stop with empty lines keeps prior on-truck (does not force 0)', () => {
    const stops: ApiStop[] = [
      stop({ id: 's1', lines: [line({ id: 'pk', action: 'pickup', weight: '10' })] }),
      stop({ id: 's2', lines: [line({ id: 'do1', action: 'dropoff', weight: '5' })] }),
      stop({
        id: 's3',
        lines: [
          {
            id: 'placeholder',
            productId: '',
            productName: '',
            customerId: '',
            customerName: '',
            orderId: '',
            orderRef: '',
            orderLineId: '',
            action: 'pickup',
            qty: '',
            unit: 'EUR Pallets',
            weight: '',
            wtUnit: 'Kgs',
            mirrorOf: '',
          },
        ],
      }),
    ];

    // Empty new stop: departure stays 5 after stop2 partial drop.
    expect(computeRunningWeights(stops)).toEqual([10, 5, 5]);
  });

  it('over-dropoff yields negative departure but onTruck stays at arrival', () => {
    const stops: ApiStop[] = [
      stop({ id: 's1', lines: [line({ id: 'pk', action: 'pickup', weight: '5' })] }),
      stop({ id: 's2', lines: [line({ id: 'do', action: 'dropoff', weight: '8' })] }),
    ];
    const detail = computeStopRunningWeights(stops);
    expect(detail[1].departureKg).toBe(-3);
    expect(detail[1].onTruckKg).toBe(5);
  });
});
