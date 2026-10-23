import { describe, expect, it } from 'vitest';
import { orderDisplayRef } from './orderDisplayRef';
import { mapApiListItemToOrder, formToPayload } from '../api/mappers/erpOrdersMapper';
import type { ApiErpOrderListItem } from '../api/types/erpOrders';

describe('MS3-403 orderDisplayRef', () => {
  it('shows the order number when there is one', () => {
    expect(orderDisplayRef({ id: 12, orderReference: ' ORD-1 ' })).toBe('ORD-1');
  });

  it('falls back to the API display reference, then "#<id>"', () => {
    expect(orderDisplayRef({ id: 12, orderReference: '', displayReference: '#12' })).toBe('#12');
    expect(orderDisplayRef({ id: '12', orderReference: null })).toBe('#12');
    expect(orderDisplayRef({ orderReference: '' })).toBe('');
    expect(orderDisplayRef(null)).toBe('');
  });
});

describe('MS3-403 ERP order mapper with optional order number / customer', () => {
  const item: ApiErpOrderListItem = {
    id: 12,
    order_reference: null,
    display_reference: '#12',
    customer_name: null,
    delivery_date: '2026-07-01',
    product_count: 0,
    status: 'unplanned',
    high_priority: false,
    can_edit: true,
  };

  it('maps null reference and customer to empty strings', () => {
    const order = mapApiListItemToOrder(item);
    expect(order.orderReference).toBe('');
    expect(order.customerName).toBe('');
    expect(orderDisplayRef(order)).toBe('#12');
  });

  it('sends blank order number / customer as empty strings (Laravel stores NULL)', () => {
    const payload = formToPayload({ order_reference: '  ', customer_name: '', delivery_date: '2026-07-01' });
    expect(payload.order_reference).toBe('');
    expect(payload.customer_name).toBe('');
  });
});
