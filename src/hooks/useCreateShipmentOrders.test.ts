import { describe, expect, it } from 'vitest';
import {
  buildOrderDetailFromStops,
  findOrderLineForProduct,
  getProductOptionsForOrder,
  resolveOrderDetailForWizard,
} from './useCreateShipmentOrders';
import type { ErpOrder } from '../pages/ErpOrders/types';

describe('getProductOptionsForOrder', () => {
  it('returns all products for multi-item order including unmapped SKU lines', () => {
    const order: ErpOrder = {
      id: 'ord-100',
      orderReference: 'ORD-MULTI-100',
      erpReference: 'ERP-100',
      customerName: 'Acme Corp',
      shipFrom: 'Athens',
      shipTo: 'Thessaloniki',
      shipDate: '2026-09-20',
      deliveryDate: '2026-09-22',
      productsPreview: 'Apples, Bananas, Oranges',
      productCount: 3,
      status: 'unplanned',
      highPriority: false,
      orderValue: 500,
      linkedLoadSid: '',
      linkedLoadId: '',
      updatedAt: '',
      canEdit: true,
      notes: '',
      lines: [
        {
          id: 1,
          productSkuId: 501,
          productName: 'Apples 1kg',
          sku: 'SKU-APPLES',
          quantity: 100,
          unit: 'Boxes',
          weight: 200,
          weightUnit: 'kg',
        },
        {
          id: 2,
          productSkuId: null,
          productName: 'Bananas Bulk',
          sku: 'SKU-BANANAS',
          quantity: 50,
          unit: 'Boxes',
          weight: 150,
          weightUnit: 'kg',
        },
        {
          id: 3,
          productSkuId: null,
          productName: 'Oranges Premium',
          quantity: 75,
          unit: 'EUR Pallets',
          weight: 300,
          weightUnit: 'kg',
        },
      ],
    };

    const options = getProductOptionsForOrder(order);
    expect(options).toHaveLength(3);
    expect(options[0]).toEqual({
      value: '501',
      label: 'Apples 1kg',
      sublabel: 'SKU-APPLES',
      lineIndex: 0,
    });
    expect(options[1]).toEqual({
      value: '2',
      label: 'Bananas Bulk',
      sublabel: 'SKU-BANANAS',
      lineIndex: 1,
    });
    expect(options[2]).toEqual({
      value: '3',
      label: 'Oranges Premium',
      sublabel: undefined,
      lineIndex: 2,
    });
  });

  it('hides products with no remaining quantity from prior shipments', () => {
    const order = {
      id: 'ord-11',
      orderReference: 'Order-11',
      lines: [
        {
          id: 1,
          productSkuId: 10,
          productName: 'Product A',
          quantity: 5,
          remainingQuantity: 0,
          shippedQuantity: 5,
          unit: 'Units',
          weight: 1,
          weightUnit: 'Kgs',
        },
        {
          id: 2,
          productSkuId: 20,
          productName: 'Product B',
          quantity: 7,
          remainingQuantity: 7,
          shippedQuantity: 0,
          unit: 'Units',
          weight: 2,
          weightUnit: 'Kgs',
        },
      ],
    } as ErpOrder;

    const options = getProductOptionsForOrder(order);
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('20');
    expect(options[0].label).toBe('Product B');
  });

  it('hides deactivated products from options', () => {
    const order = {
      id: 'ord-12',
      orderReference: 'Order-12',
      lines: [
        {
          id: 1,
          productSkuId: 10,
          productName: 'Deactivated Product',
          productActive: false,
          quantity: 5,
          unit: 'Units',
          weight: 1,
          weightUnit: 'Kgs',
        },
        {
          id: 2,
          productSkuId: 20,
          productName: 'Active Product',
          productActive: true,
          quantity: 7,
          unit: 'Units',
          weight: 2,
          weightUnit: 'Kgs',
        },
      ],
    } as ErpOrder;

    const options = getProductOptionsForOrder(order);
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('20');
    expect(options[0].label).toBe('Active Product');
  });

  it('returns empty array when order has no lines', () => {
    expect(getProductOptionsForOrder(null)).toEqual([]);
    expect(getProductOptionsForOrder(undefined)).toEqual([]);
    expect(getProductOptionsForOrder({ lines: [] } as any)).toEqual([]);
  });
});

describe('findOrderLineForProduct', () => {
  const order: ErpOrder = {
    id: 'ord-200',
    orderReference: 'ORD-200',
    erpReference: '',
    customerName: 'Test Corp',
    shipFrom: '',
    shipTo: '',
    shipDate: '',
    deliveryDate: '',
    productsPreview: '',
    productCount: 2,
    status: 'unplanned',
    highPriority: false,
    orderValue: null,
    linkedLoadSid: '',
    linkedLoadId: '',
    updatedAt: '',
    canEdit: true,
    notes: '',
    lines: [
      {
        id: 11,
        productSkuId: 901,
        productName: 'Product Alpha',
        sku: 'SKU-ALPHA',
        quantity: 10,
        unit: 'Boxes',
        weight: 50,
        weightUnit: 'kg',
      },
      {
        id: 12,
        productSkuId: null,
        productName: 'Product Beta',
        sku: 'SKU-BETA',
        quantity: 20,
        unit: 'Boxes',
        weight: 100,
        weightUnit: 'kg',
      },
    ],
  };

  it('finds line by productSkuId string', () => {
    const match = findOrderLineForProduct(order, '901');
    expect(match?.productName).toBe('Product Alpha');
  });

  it('finds line by line id when productSkuId is null', () => {
    const match = findOrderLineForProduct(order, '12');
    expect(match?.productName).toBe('Product Beta');
  });

  it('finds line by product name or sku', () => {
    const matchByName = findOrderLineForProduct(order, 'Product Beta');
    expect(matchByName?.id).toBe(12);

    const matchBySku = findOrderLineForProduct(order, 'SKU-ALPHA');
    expect(matchBySku?.id).toBe(11);
  });

  it('returns null if product not found', () => {
    expect(findOrderLineForProduct(order, 'non-existent')).toBeNull();
    expect(findOrderLineForProduct(null, '901')).toBeNull();
  });
});

describe('buildOrderDetailFromStops', () => {
  it('rebuilds multi-product order lines when multiple products from same order are across stops', () => {
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
          {
            orderId: 'ord-12345',
            orderRef: 'ord-12345',
            productId: '102',
            productName: 'Juice',
            customerName: 'Iraklio',
            action: 'pickup',
            qty: '8',
            unit: 'Boxes',
            weight: '16',
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
    expect(detail?.lines).toHaveLength(2);
    expect(detail?.lines.find((l) => l.productSkuId === 101)).toMatchObject({
      productSkuId: 101,
      productName: 'Water',
      quantity: 5,
      weight: 10,
      unit: 'Boxes',
    });
    expect(detail?.lines.find((l) => l.productSkuId === 102)).toMatchObject({
      productSkuId: 102,
      productName: 'Juice',
      quantity: 8,
      weight: 16,
      unit: 'Boxes',
    });
  });
});

describe('resolveOrderDetailForWizard', () => {
  it('keeps API detail when it has lines', () => {
    const api = {
      id: '9',
      orderReference: 'ord-12345',
      lines: [{ productSkuId: 1, productName: 'A', quantity: 5, unit: 'Boxes', weight: 10, weightUnit: 'kg' }],
    } as any;
    expect(resolveOrderDetailForWizard('ord-12345', api, [])).toBe(api);
  });

  it('falls back to stops when API detail has no lines', () => {
    const api = { id: '9', orderReference: 'ord-12345', lines: [] } as any;
    const resolved = resolveOrderDetailForWizard('ord-12345', api, [
      {
        lines: [
          {
            orderId: 'ord-12345',
            orderRef: 'ord-12345',
            productId: '101',
            productName: 'Water',
            action: 'pickup',
            qty: '5',
            unit: 'Boxes',
            weight: '10',
            wtUnit: 'kg',
          },
        ],
      },
    ]);
    expect(resolved?.lines).toHaveLength(1);
    expect(resolved?.lines[0].quantity).toBe(5);
  });
});
