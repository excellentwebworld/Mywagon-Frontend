import { describe, expect, it } from 'vitest';
import { buildOrderDetailFromStops } from './useCreateShipmentOrders';

describe('buildOrderDetailFromStops', () => {
  it('rebuilds order lines from pickup totals when API order is unavailable', () => {
    const detail = buildOrderDetailFromStops('ord-12345', [
      {
        lines: [
          {
            orderId: 'ord-12345',
            orderRef: 'ord-12345',
            productId: '101',
            productName: 'Water',
            customerName: 'Iraklio',
            action: 'pickup',
            qty: '5',
            unit: 'Boxes',
            weight: '10',
            wtUnit: 'kg',
          },
        ],
      },
      {
        lines: [
          {
            orderId: 'ord-12345',
            orderRef: 'ord-12345',
            productId: '101',
            productName: 'Water',
            customerName: 'Iraklio',
            action: 'dropoff',
            qty: '2',
            unit: 'Boxes',
            weight: '3',
            wtUnit: 'kg',
          },
        ],
      },
    ]);

    expect(detail).not.toBeNull();
    expect(detail?.id).toBe('ord-12345');
    expect(detail?.orderReference).toBe('ord-12345');
    expect(detail?.customerName).toBe('Iraklio');
    expect(detail?.lines).toHaveLength(1);
    expect(detail?.lines[0]).toMatchObject({
      productSkuId: 101,
      productName: 'Water',
      quantity: 5,
      weight: 10,
      unit: 'Boxes',
    });
  });
});
