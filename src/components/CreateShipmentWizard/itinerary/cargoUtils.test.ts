import { describe, expect, it } from 'vitest';
import type { ApiStop } from '../../../api/types/createShipment';
import { computeCargoLineQtyWeight } from './cargoUtils';

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
