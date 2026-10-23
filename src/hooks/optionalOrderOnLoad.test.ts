import { describe, expect, it } from 'vitest';
import { computeConflicts } from './useConflicts';
import { getProductMasterOptionsForCargoLine } from './useCreateShipmentOrders';
import { findInvalidAcceptedRow, orderRowProblems, type OrderPreviewRow } from '../components/ErpOrders/ordersAiWizardUtils';

/** MS3-403: a load (and an imported order) does not need an order number. */
describe('MS3-403 load without an order', () => {
  const stops = [
    {
      id: 'stop-1',
      locationId: 'loc-1',
      locationName: 'Athens Hub',
      dateFrom: '2026-10-01',
      timeFrom: '09:00',
      appointmentMode: 'fixed',
      lines: [
        { id: 'line-1', orderId: '', orderRef: '', productId: '50', productName: 'Pallets', action: 'pickup', qty: '10', weight: '500' },
      ],
    },
    {
      id: 'stop-2',
      locationId: 'loc-2',
      locationName: 'Thessaloniki',
      dateFrom: '2026-10-02',
      timeFrom: '09:00',
      appointmentMode: 'fixed',
      lines: [
        { id: 'line-2', orderId: '', orderRef: '', productId: '50', productName: 'Pallets', action: 'dropoff', qty: '10', weight: '500', mirrorOf: 'line-1' },
      ],
    },
  ];

  it('raises no order blocker (former O4) for lines without an order', () => {
    const result = computeConflicts(stops, {});
    expect(result.blockers.some((c: { code: string }) => c.code === 'O4')).toBe(false);
  });

  it('keeps the non-blocking O2 hint on product lines without an order', () => {
    const result = computeConflicts(stops, {});
    expect(result.warnings.some((c: { code: string }) => c.code === 'O2')).toBe(true);
    expect(result.blockers.some((c: { code: string }) => c.code === 'O2')).toBe(false);
  });
});

describe('MS3-403 getProductMasterOptionsForCargoLine', () => {
  it('offers active, non-archived Product Master entries without duplicates', () => {
    const options = getProductMasterOptionsForCargoLine([
      { id: '1', name: 'Olive Oil', number: 'SKU-1', active: true },
      { id: '2', name: 'Old', number: 'SKU-2', active: false },
      { id: '3', name: 'Archived', number: 'SKU-3', active: true, archived: true },
      { id: '1', name: 'Olive Oil dup', number: 'SKU-1', active: true },
      { id: 4, name: '', number: 'SKU-4', active: true },
    ]);
    expect(options).toEqual([
      { value: '1', label: 'Olive Oil', sublabel: 'SKU-1' },
      { value: '4', label: 'SKU-4', sublabel: 'SKU-4' },
    ]);
  });

  it('is empty without a Product Master', () => {
    expect(getProductMasterOptionsForCargoLine(undefined)).toEqual([]);
  });
});

describe('MS3-403 import rows without order number / customer', () => {
  const row = (order: Partial<OrderPreviewRow['order']>): OrderPreviewRow =>
    ({
      id: 'r1',
      status: 'accepted',
      isEditing: false,
      sourceEmptyFields: [],
      order: { order_reference: null, customer_name: null, company_entity_id: null, delivery_date: '2026-07-01', lines: [], ...order },
      original: { order_reference: null, delivery_date: '2026-07-01', lines: [] },
    }) as unknown as OrderPreviewRow;

  it('never flags a missing order number', () => {
    expect(orderRowProblems(row({}))).not.toContain('order_reference');
    expect(orderRowProblems(row({}), { customerRequired: false })).toEqual([]);
  });

  it('ERP wizard (customerRequired: false) only flags a typed, unpicked customer', () => {
    expect(orderRowProblems(row({ customer_name: 'Typed' }), { customerRequired: false })).toEqual(['customer']);
    expect(
      orderRowProblems(row({ customer_name: 'Acme', company_entity_id: 5 }), { customerRequired: false })
    ).toEqual([]);
    expect(findInvalidAcceptedRow([row({})], { customerRequired: false })).toBeUndefined();
  });

  it('default rule (Vagon AI card) still requires a picked customer', () => {
    expect(orderRowProblems(row({}))).toEqual(['customer']);
  });

  it('still requires a delivery date', () => {
    expect(orderRowProblems(row({ delivery_date: '' }), { customerRequired: false })).toEqual(['delivery_date']);
  });
});
