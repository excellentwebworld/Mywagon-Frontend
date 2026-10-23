import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/client';
import {
  ORDER_REQUIRED_FOR_DISPATCH,
  apiErrorCode,
  buildLinkOrderRequest,
  classifyLinkOrderError,
  isOrderRequiredForDispatchError,
  normalizeNewOrderNumber,
  orderLabel,
  shipmentNeedsOrderBeforeDispatch,
} from './linkOrderToDispatch';

describe('MS3-406 link order to dispatch', () => {
  it('recognises the Laravel refusal by data.code', () => {
    const refusal = new ApiError('Link an order to dispatch this load.', 422, undefined, {
      code: ORDER_REQUIRED_FOR_DISPATCH,
      shipment_id: 42,
    });
    expect(isOrderRequiredForDispatchError(refusal)).toBe(true);
    expect(apiErrorCode(refusal)).toBe(ORDER_REQUIRED_FOR_DISPATCH);
  });

  it('does not treat other errors as the order refusal', () => {
    expect(isOrderRequiredForDispatchError(new ApiError('Offer not found.', 404))).toBe(false);
    expect(isOrderRequiredForDispatchError(new ApiError('x', 422, undefined, { code: 'other' }))).toBe(false);
    expect(isOrderRequiredForDispatchError(new Error('boom'))).toBe(false);
    expect(isOrderRequiredForDispatchError(null)).toBe(false);
  });

  it('pre-checks only when the payload says the order is required', () => {
    expect(shipmentNeedsOrderBeforeDispatch({ orderRequiredForDispatch: true })).toBe(true);
    expect(shipmentNeedsOrderBeforeDispatch({ orderRequiredForDispatch: false })).toBe(false);
    expect(shipmentNeedsOrderBeforeDispatch({})).toBe(false);
    expect(shipmentNeedsOrderBeforeDispatch(null)).toBe(false);
  });

  it('offers the existing order when the number is already in use', () => {
    const err = new ApiError('This order ID is already in use.', 422, { order_reference: ['x'] }, {
      code: 'order_reference_in_use',
      existing_order: { id: 7, order_reference: 'SO-7', customer_name: null, available: true },
    });
    expect(classifyLinkOrderError(err)).toEqual({
      kind: 'reference_in_use',
      existing: { id: 7, label: 'SO-7', available: true },
    });
  });

  it('classifies the other link-order refusals', () => {
    const coded = (code: string) => new ApiError('m', 422, undefined, { code });
    expect(classifyLinkOrderError(coded('order_not_available'))).toEqual({ kind: 'not_available' });
    expect(classifyLinkOrderError(coded('order_already_linked'))).toEqual({ kind: 'already_linked' });
    expect(classifyLinkOrderError(coded('shipment_not_linkable'))).toEqual({ kind: 'not_linkable' });
    expect(classifyLinkOrderError(new ApiError('Order not found.', 404))).toEqual({
      kind: 'other',
      message: 'Order not found.',
    });
  });

  it('labels orders without a number as #id', () => {
    expect(orderLabel({ id: 3, order_reference: 'SO-3' })).toBe('SO-3');
    expect(orderLabel({ id: 3, order_reference: null, display_reference: '#3' })).toBe('#3');
    expect(orderLabel({ id: 9, order_reference: '  ' })).toBe('#9');
  });

  it('builds exactly one of erp_order_id or order_reference', () => {
    expect(buildLinkOrderRequest({ mode: 'existing', orderId: 12 })).toEqual({ erp_order_id: 12 });
    expect(buildLinkOrderRequest({ mode: 'existing', orderId: null })).toBeNull();
    expect(buildLinkOrderRequest({ mode: 'new', orderNumber: '  SO-1 ' })).toEqual({ order_reference: 'SO-1' });
    expect(buildLinkOrderRequest({ mode: 'new', orderNumber: 'SO-1', customerName: ' Acme ' })).toEqual({
      order_reference: 'SO-1',
      customer_name: 'Acme',
    });
    expect(buildLinkOrderRequest({ mode: 'new', orderNumber: '   ' })).toBeNull();
    expect(normalizeNewOrderNumber('x'.repeat(101))).toBeNull();
  });
});
