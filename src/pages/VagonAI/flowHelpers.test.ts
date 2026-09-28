/**
 * The rules behind a guided form's errors.
 *
 * Only the pure halves are covered here — `useFormErrors` is a thin wrapper that
 * adds `attempted` and `touched` on top of these, and the part that gets a rule
 * wrong is which message wins, not the useState around it.
 */
import { describe, it, expect } from 'vitest';
import { fieldId, messageFor, refusedMessage, summaryRows, type FieldIssue } from './flowHelpers';

const LABELS: Record<string, string> = {
  orderReference: 'the order ID',
  customerName: 'the customer',
};

describe('fieldId', () => {
  it('flattens a gateway draft path into something a fragment link can hold', () => {
    expect(fieldId('order', 'lines[0].qty')).toBe('vai-order-lines-0-qty');
    expect(fieldId('product', 'weight.value')).toBe('vai-product-weight-value');
  });

  it('leaves a plain field alone', () => {
    expect(fieldId('address', 'city')).toBe('vai-address-city');
  });

  it('does not leave a trailing dash when the path ends in punctuation', () => {
    expect(fieldId('order', 'lines[0]')).toBe('vai-order-lines-0');
  });

  it('separates two forms that use the same field name', () => {
    expect(fieldId('order', 'name')).not.toBe(fieldId('product', 'name'));
  });
});

describe('refusedMessage', () => {
  it('names the field in the shipper\'s words when a label exists', () => {
    expect(refusedMessage('orderReference', LABELS)).toBe('Check the order id.');
  });

  it('falls back to the raw path rather than saying nothing useful', () => {
    expect(refusedMessage('erp_reference', LABELS)).toBe('Check erp_reference.');
  });
});

describe('messageFor', () => {
  const issues: FieldIssue[] = [{ field: 'customerName', message: 'Choose the customer, or type their name.' }];

  it('returns null for a field with nothing wrong', () => {
    expect(messageFor('orderReference', issues, null, LABELS)).toBeNull();
  });

  it('returns the client issue for a field that has one', () => {
    expect(messageFor('customerName', issues, null, LABELS))
      .toBe('Choose the customer, or type their name.');
  });

  // The client issue is the specific one — it says what to do. The refusal is one
  // sentence about the whole write, so it must not shout over a real instruction.
  it('prefers the client issue over a server refusal naming the same field', () => {
    const refusal = { reason: 'The order was refused.', missing: ['customerName'] };
    expect(messageFor('customerName', issues, refusal, LABELS))
      .toBe('Choose the customer, or type their name.');
  });

  it('marks a field the server named that the client thought was fine', () => {
    const refusal = { reason: 'The order was refused.', missing: ['orderReference'] };
    expect(messageFor('orderReference', issues, refusal, LABELS)).toBe('Check the order id.');
  });
});

describe('summaryRows', () => {
  const issues: FieldIssue[] = [
    { field: 'orderReference', message: 'Give this order your own order ID.' },
    { field: 'lines[0].qty', message: 'Line 1 needs a quantity.' },
  ];

  it('keeps the draft module\'s own order', () => {
    expect(summaryRows(issues, null, LABELS).map((row) => row.field))
      .toEqual(['orderReference', 'lines[0].qty']);
  });

  it('appends fields only the server objected to', () => {
    const refusal = { reason: 'Refused.', missing: ['customerName'] };
    expect(summaryRows(issues, refusal, LABELS).map((row) => row.field))
      .toEqual(['orderReference', 'lines[0].qty', 'customerName']);
  });

  // A field named twice reads to the shipper as two separate problems, and the
  // count in the summary's own heading is drawn from this list.
  it('does not list a field twice when both the client and the server object', () => {
    const refusal = { reason: 'Refused.', missing: ['orderReference', 'customerName'] };
    const rows = summaryRows(issues, refusal, LABELS);
    expect(rows.filter((row) => row.field === 'orderReference')).toHaveLength(1);
    expect(rows).toHaveLength(3);
  });

  it('does not list a repeated server field twice either', () => {
    const refusal = { reason: 'Refused.', missing: ['customerName', 'customerName'] };
    expect(summaryRows([], refusal, LABELS)).toHaveLength(1);
  });

  it('is empty when nothing is wrong', () => {
    expect(summaryRows([], null, LABELS)).toEqual([]);
  });
});
