import { describe, expect, it } from 'vitest';
import type { ApiStop } from '../../../api/types/createShipment';
import { computeCargoLineQtyWeight, syncDropoffMirrorLinks } from './cargoUtils';

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
