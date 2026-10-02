import { describe, expect, it } from 'vitest';
import { buildStopsFromErpOrders } from './erpOrdersPrefill';
import type { ErpOrder } from '../../ErpOrders/types';

function makeOrder(overrides: Partial<ErpOrder> = {}): ErpOrder {
  return {
    id: 'ord-1',
    orderReference: 'ORD-1',
    erpReference: 'ERP-1',
    customerName: 'Acme',
    companyEntityId: 10,
    originLocationId: 1,
    destLocationId: 2,
    shipFrom: 'Athens',
    shipTo: 'Ioannina',
    shipDate: '2026-10-01',
    deliveryDate: '2026-10-03',
    productsPreview: '',
    productCount: 2,
    status: 'partially_planned',
    highPriority: false,
    orderValue: null,
    linkedLoadSid: '',
    linkedLoadId: '',
    updatedAt: '',
    canEdit: true,
    notes: '',
    hasRemaining: true,
    lines: [],
    ...overrides,
  };
}

describe('buildStopsFromErpOrders', () => {
  it('prefills only remaining qty and skips fully planned lines', () => {
    const order = makeOrder({
      lines: [
        {
          id: 1,
          productSkuId: 101,
          productName: 'Apples',
          quantity: 10,
          remainingQuantity: 0,
          shippedQuantity: 10,
          unit: 'EUR Pallets',
          weight: 100,
          weightUnit: 'Kgs',
        },
        {
          id: 2,
          productSkuId: 102,
          productName: 'Bananas',
          quantity: 20,
          remainingQuantity: 7,
          shippedQuantity: 13,
          unit: 'EUR Pallets',
          weight: 200,
          weightUnit: 'Kgs',
        },
      ],
    });

    const stops = buildStopsFromErpOrders([order]);
    const pickupLines = stops[0].lines.filter((l) => l.productId);
    const dropoffLines = stops[1].lines.filter((l) => l.productId);

    expect(pickupLines).toHaveLength(1);
    expect(pickupLines[0].productName).toBe('Bananas');
    expect(pickupLines[0].qty).toBe('7');
    // Weight scaled: 200 * 7 / 20 = 70
    expect(pickupLines[0].weight).toBe('70');

    expect(dropoffLines).toHaveLength(1);
    expect(dropoffLines[0].qty).toBe('7');
    expect(dropoffLines[0].weight).toBe('70');
  });

  it('falls back to ordered qty when remaining_quantity is omitted', () => {
    const order = makeOrder({
      status: 'unplanned',
      lines: [
        {
          id: 1,
          productSkuId: 101,
          productName: 'Apples',
          quantity: 5,
          unit: 'EUR Pallets',
          weight: 50,
          weightUnit: 'Kgs',
        },
      ],
    });

    const stops = buildStopsFromErpOrders([order]);
    expect(stops[0].lines[0].qty).toBe('5');
    expect(stops[0].lines[0].weight).toBe('50');
  });
});
