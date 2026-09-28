import { describe, expect, it } from 'vitest';
import { isOrderIntakeFile, looksLikeOrderTable } from './orderIntakeDetect';

describe('looksLikeOrderTable', () => {
  it('detects TSV order paste', () => {
    const text = [
      'Order Ref\tCustomer\tProduct\tQty\tDelivery Date',
      'ORD-1\tAlphavita SA\tFrozen Peas\t20\t2026-10-01',
    ].join('\n');
    expect(looksLikeOrderTable(text)).toBe(true);
  });

  it('rejects ordinary chat', () => {
    expect(looksLikeOrderTable('create a shipment from order ORD-88')).toBe(false);
    expect(looksLikeOrderTable('hello')).toBe(false);
  });

  it('detects CSV with customer + product headers', () => {
    const text = 'Customer,Product,Qty,Weight,Delivery Date\nAcme,Peas,10,100,2026-10-01';
    expect(looksLikeOrderTable(text)).toBe(true);
  });
});

describe('isOrderIntakeFile', () => {
  const f = (name: string, type = '') => new File(['x'], name, { type });

  it('accepts the spreadsheet formats intake can parse', () => {
    expect(isOrderIntakeFile(f('orders.xlsx'))).toBe(true);
    expect(isOrderIntakeFile(f('orders.csv'))).toBe(true);
    expect(isOrderIntakeFile(f('orders.tsv'))).toBe(true);
    expect(isOrderIntakeFile(f('orders.xls'))).toBe(true);
  });

  it('matches on MIME type when the extension is missing', () => {
    expect(isOrderIntakeFile(f('export', 'text/csv'))).toBe(true);
  });

  it('rejects what the gateway would refuse anyway', () => {
    // PDF/image intake is explicitly deferred server-side, so accepting a drop
    // here would promise something the backend answers with a refusal.
    expect(isOrderIntakeFile(f('scan.pdf', 'application/pdf'))).toBe(false);
    expect(isOrderIntakeFile(f('photo.png', 'image/png'))).toBe(false);
  });
});
