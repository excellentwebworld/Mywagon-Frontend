import { describe, expect, it } from 'vitest';
import {
  buildStopsFromErpOrders,
  countRemainingErpProductLines,
  getErpCreateLoadPermissionBlock,
} from './erpOrdersPrefill';
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

describe('getErpCreateLoadPermissionBlock', () => {
  it('allows a single one-product order without allow_multiple_stops', () => {
    const order = makeOrder({
      productCount: 1,
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

    expect(getErpCreateLoadPermissionBlock([order], false)).toBeNull();
  });

  it('blocks multiple selected orders without allow_multiple_stops', () => {
    const a = makeOrder({ id: 'ord-1', orderReference: 'ORD-1' });
    const b = makeOrder({
      id: 'ord-2',
      orderReference: 'ORD-2',
      originLocationId: 1,
      destLocationId: 2,
    });

    expect(getErpCreateLoadPermissionBlock([a, b], false)).toBe('multi_order');
    expect(getErpCreateLoadPermissionBlock([a, b], true)).toBeNull();
  });

  it('blocks one order with multiple remaining products without allow_multiple_stops', () => {
    const order = makeOrder({
      productCount: 2,
      lines: [
        {
          id: 1,
          productSkuId: 101,
          productName: 'Apples',
          quantity: 10,
          remainingQuantity: 10,
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
          unit: 'EUR Pallets',
          weight: 200,
          weightUnit: 'Kgs',
        },
      ],
    });

    expect(countRemainingErpProductLines(order)).toBe(2);
    expect(getErpCreateLoadPermissionBlock([order], false)).toBe('multi_product');
    expect(getErpCreateLoadPermissionBlock([order], true)).toBeNull();
  });

  it('ignores fully planned lines when counting products for the gate', () => {
    const order = makeOrder({
      productCount: 2,
      lines: [
        {
          id: 1,
          productSkuId: 101,
          productName: 'Apples',
          quantity: 10,
          remainingQuantity: 0,
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
          unit: 'EUR Pallets',
          weight: 200,
          weightUnit: 'Kgs',
        },
      ],
    });

    expect(countRemainingErpProductLines(order)).toBe(1);
    expect(getErpCreateLoadPermissionBlock([order], false)).toBeNull();
  });

  it('blocks multi-location projection without allow_multiple_stops', () => {
    // Same selection size (1) but would still be multi-stop if locations diverged;
    // with two orders of different O/D the multi_order reason wins first.
    const a = makeOrder({
      id: 'ord-1',
      originLocationId: 1,
      destLocationId: 2,
      shipFrom: 'Athens',
      shipTo: 'Ioannina',
      productCount: 1,
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
    const b = makeOrder({
      id: 'ord-2',
      orderReference: 'ORD-2',
      originLocationId: 3,
      destLocationId: 4,
      shipFrom: 'Patras',
      shipTo: 'Larissa',
      productCount: 1,
      lines: [
        {
          id: 1,
          productSkuId: 201,
          productName: 'Oranges',
          quantity: 3,
          unit: 'EUR Pallets',
          weight: 30,
          weightUnit: 'Kgs',
        },
      ],
    });

    expect(buildStopsFromErpOrders([a, b]).length).toBeGreaterThan(2);
    expect(getErpCreateLoadPermissionBlock([a, b], false)).toBe('multi_order');
  });
});
