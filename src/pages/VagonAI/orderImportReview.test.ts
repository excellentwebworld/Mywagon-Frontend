import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { OrderImportPreview, PreviewOrder } from './api/orderImportService';
import {
  applyCustomerToAccepted,
  existingBadge,
  importBlocker,
  importPayload,
  initImportRows,
  patchRow,
  requiredColumnStates,
  setAllRows,
  summarizeReview,
  toggleRow,
} from './orderImportReview';
import { findInvalidAcceptedRow } from '../../components/ErpOrders/ordersAiWizardUtils';

const order = (over: Partial<PreviewOrder> = {}): PreviewOrder => ({
  order_reference: 'QA-1',
  delivery_date: '2026-11-02',
  customer_name: null,
  company_entity_id: null,
  existing: null,
  ...over,
});

const preview = (orders: PreviewOrder[], over: Partial<OrderImportPreview> = {}): OrderImportPreview => ({
  conversationId: 'c-1',
  status: 'ready',
  message: null,
  filename: 'orders.xlsx',
  dataRowCount: null,
  orders,
  file_headers: ['Order ID', 'Delivery Date'],
  missing_columns: [],
  found_columns: [],
  existingChecked: true,
  orders_url: '/erp-orders',
  ...over,
});

const ACME = { id: 11, name: 'Acme SA' };

describe('the review step', () => {
  it('starts with every mapped order selected and importable: the customer is optional (MS3-403)', () => {
    const rows = initImportRows(preview([order(), order({ order_reference: 'QA-2' })]));
    const summary = summarizeReview(rows, true);
    expect(summary.accepted).toBe(2);
    expect(summary.ready).toBe(2);
    expect(importBlocker(summary)).toBeNull();
  });

  it('a customer typed but not picked from the list still blocks (it would not be linked)', () => {
    const rows = initImportRows(preview([order({ customer_name: 'Typed Name', company_entity_id: null })]));
    expect(importBlocker(summarizeReview(rows, true))).toBe('customer');
  });

  it('"customer for all" fills every selected row and unblocks the import', () => {
    const rows = applyCustomerToAccepted(initImportRows(preview([order(), order({ order_reference: 'QA-2' })])), ACME);
    expect(rows.every((r) => r.order.company_entity_id === 11 && r.order.customer_name === 'Acme SA')).toBe(true);
    expect(importBlocker(summarizeReview(rows, true))).toBeNull();
  });

  it('"customer for all" leaves rejected rows alone', () => {
    let rows = initImportRows(preview([order(), order({ order_reference: 'QA-2' })]));
    rows = toggleRow(rows, rows[1]!.id);
    rows = applyCustomerToAccepted(rows, ACME);
    expect(rows[0]!.order.company_entity_id).toBe(11);
    expect(rows[1]!.order.company_entity_id).toBeNull();
  });

  it('a rejected row with problems does not block the import; a selected one does', () => {
    let rows = applyCustomerToAccepted(initImportRows(preview([order(), order({ order_reference: 'QA-2' })])), ACME);
    rows = patchRow(rows, rows[1]!.id, { delivery_date: '' });
    expect(importBlocker(summarizeReview(rows, true))).toBe('delivery_date');
    rows = toggleRow(rows, rows[1]!.id);
    expect(importBlocker(summarizeReview(rows, true))).toBeNull();
  });

  it('nothing selected is its own blocker', () => {
    const rows = setAllRows(initImportRows(preview([order()])), 'rejected');
    expect(importBlocker(summarizeReview(rows, true))).toBe('none_accepted');
  });

  it('a picked customer needs its id as well as its name, as the ERP wizard requires', () => {
    const [row] = initImportRows(preview([order({ customer_name: 'Typed Name', company_entity_id: null })]));
    expect(findInvalidAcceptedRow([row!])).toBe(row);
  });
});

describe('the existing-order badge', () => {
  it('distinguishes new, updates-an-unplanned-order and already-planned', () => {
    const rows = initImportRows(
      preview([
        order({ order_reference: 'NEW' }),
        order({ order_reference: 'UPD', existing: { order_id: 7, status: 'unplanned', editable: true } }),
        order({ order_reference: 'PLN', existing: { order_id: 8, status: 'planned', editable: false } }),
      ]),
    );
    expect(rows.map((r) => existingBadge(r, true))).toEqual(['new', 'updates', 'will_fail']);
    const summary = summarizeReview(rows, true);
    expect(summary.updates).toBe(1);
    expect(summary.willFail).toBe(1);
  });

  it('never claims "new" when the lookup failed', () => {
    const [row] = initImportRows(preview([order()], { existingChecked: false }));
    expect(existingBadge(row!, false)).toBe('unknown');
  });

  it('keeps reporting the original match after the row is edited', () => {
    let rows = initImportRows(preview([order({ existing: { order_id: 7, status: 'unplanned', editable: true } })]));
    rows = patchRow(rows, rows[0]!.id, { notes: 'edited' });
    expect(existingBadge(rows[0]!, true)).toBe('updates');
  });
});

describe('the payload', () => {
  it('sends only selected rows, in the confirm-import shape, without the gateway-only annotation', () => {
    let rows = applyCustomerToAccepted(
      initImportRows(
        preview([
          order({ existing: { order_id: 7, status: 'unplanned', editable: true }, high_priority: true }),
          order({ order_reference: 'QA-2' }),
        ]),
      ),
      ACME,
    );
    rows = toggleRow(rows, rows[1]!.id);
    const payload = importPayload(rows);
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      order_reference: 'QA-1',
      customer_name: 'Acme SA',
      company_entity_id: 11,
      delivery_date: '2026-11-02',
      high_priority: true,
      lines: [],
    });
    expect(payload[0]).not.toHaveProperty('existing');
  });

  it('a location picked in the card carries both its id and its name', () => {
    let rows = initImportRows(preview([order({ ship_from: 'Rotterdam' })]));
    rows = patchRow(rows, rows[0]!.id, { origin_location_id: 42, ship_from: 'Rotterdam DC' });
    const [sent] = importPayload(rows);
    expect(sent!.origin_location_id).toBe(42);
    expect(sent!.ship_from).toBe('Rotterdam DC');
  });
});

describe('the required-column check', () => {
  it('reads Laravel\'s missing column labels', () => {
    expect(requiredColumnStates(['Delivery Date'])).toEqual({ order_id: 'found', delivery_date: 'missing' });
    expect(requiredColumnStates(['Order ID', 'Delivery Date'])).toEqual({ order_id: 'missing', delivery_date: 'missing' });
    expect(requiredColumnStates([])).toEqual({ order_id: 'found', delivery_date: 'found' });
  });
});

type Dict = Record<string, unknown>;
const load = (lang: 'en' | 'el'): Dict => JSON.parse(readFileSync(`src/locale/${lang}.json`, 'utf-8'));
const keys = (node: unknown, prefix = ''): string[] =>
  node && typeof node === 'object'
    ? Object.entries(node as Dict).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
    : [prefix.slice(0, -1)];

describe('vagonai.orderImport copy', () => {
  const en = (load('en').vagonai as Dict).orderImport;
  const el = (load('el').vagonai as Dict).orderImport;

  it('exists in both locales, key for key', () => {
    expect(en).toBeTruthy();
    expect(keys(el).sort()).toEqual(keys(en).sort());
  });

  it('has every badge and blocker the card can render', () => {
    for (const dict of [en, el] as Dict[]) {
      for (const badge of ['new', 'updates', 'will_fail', 'unknown']) {
        expect((dict.badge as Dict)[badge], badge).toEqual(expect.any(String));
      }
      const blocker = dict.blocker as Dict;
      expect(blocker.none_accepted).toEqual(expect.any(String));
      for (const p of ['customer', 'delivery_date', 'order_reference']) {
        expect(blocker[`${p}_one`], p).toEqual(expect.any(String));
        expect(blocker[`${p}_other`], p).toEqual(expect.any(String));
      }
    }
  });

  it('Greek copy is real Greek, not double-encoded', () => {
    const text = keys(el).map((k) => k.split('.').reduce<unknown>((n, p) => (n as Dict)[p], el)).join(' ');
    expect(text).toMatch(/[Ͱ-Ͽ]/);
    expect(text).not.toMatch(/[ÎÏ][\u0080-¿]/);
  });
});
