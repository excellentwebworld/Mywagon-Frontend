import { describe, expect, it } from 'vitest';
import type { ImportPreviewOrder, ImportView } from './api/orderImportService';
import {
  analysisFailed,
  analysisSteps,
  columnChoices,
  confidenceLevel,
  createdOrderIds,
  describeIncomplete,
  formatOrderValue,
  importTasks,
  importVerdict,
  isBlockingTask,
  orderRowStatus,
  ordersByAttention,
  ordersPlanned,
  ordersToWrite,
  importBlocker,
  mappingNeedsAttention,
  perUnitWeightHeader,
  sectionsNeedingInput,
  productsToCheck,
  rowFlags,
  searchOrders,
  sharedFailure,
  sortedFlags,
  visibleMappingRows,
} from './erpImport';

const row = (field: string, header: string | null, source: 'dictionary' | 'ai' | 'user' | null = 'dictionary', confidence = 1) => ({
  field, label: field, column: header ? 0 : null, header, confidence: header ? confidence : null, source: header ? source : null,
});

const view = (over: Partial<ImportView> = {}): ImportView => ({
  importId: 'x', status: 'ready', filename: 'f.xlsx', sheets: [], sheet: 'S', headers: [],
  mapping: [row('order_number', 'DocNum'), row('volume', null), row('quantity', null), row('notes', 'Comments', 'ai', 0.7)],
  weightBasis: 'line_total', weightBasisConfidence: 1, gaps: [],
  counts: {
    orders: 10, toCreate: 10, duplicates: 0, failed: 0, incomplete: 1, lines: 21, newCompanies: 8, newAddresses: 10,
    newProducts: 9, matchedCompanies: 0, matchedAddresses: 0, matchedProducts: 0, flags: {},
  },
  questions: [], sites: [], orders: [], lineIssues: [], truncated: false,
  links: { orders: '/erp-orders', addressBook: '/address-book', products: '/products' },
  progress: { done: 0, total: 0 }, summary: null, message: null,
  ...over,
});

describe('direct ERP import card rules', () => {
  it('shows every mapped field and the unmapped key fields, never an unmapped extra', () => {
    const fields = visibleMappingRows(view()).map((r) => r.field);
    expect(fields).toEqual(['order_number', 'quantity', 'notes']);
  });

  it('asks the shipper to check a model guess, never a dictionary match', () => {
    expect(confidenceLevel(row('order_number', 'DocNum'))).toBe('high');
    expect(confidenceLevel(row('notes', 'Comments', 'ai', 0.9))).toBe('check');
    expect(confidenceLevel(row('volume', null))).toBe('none');
  });

  it('blocks Import while a column is missing or nothing is new', () => {
    expect(importBlocker(view())).toBeNull();
    expect(importBlocker(view({ status: 'mapping', gaps: [{ field: 'quantity', message: 'x' }] }))).toBe('mapping');
    expect(importBlocker(view({ counts: { ...view().counts!, toCreate: 0, duplicates: 10 } }))).toBe('all_duplicates');
  });

  it('MS3-368: updating unplanned orders is something to import; only an all-planned file is blocked', () => {
    const counts = { ...view().counts!, toCreate: 0, toUpdate: 4, plannedSkipped: 6, duplicates: 6 };
    expect(ordersToWrite(counts)).toBe(4);
    expect(ordersPlanned(counts)).toBe(6);
    expect(importBlocker(view({ counts }))).toBeNull();
    expect(importBlocker(view({ counts: { ...counts, toUpdate: 0, plannedSkipped: 10, duplicates: 10 } }))).toBe('all_duplicates');
    // An older gateway: no toUpdate, and every existing order was a skipped duplicate.
    expect(ordersToWrite({ ...view().counts!, toCreate: 3, duplicates: 2 })).toBe(3);
    expect(ordersPlanned({ ...view().counts!, duplicates: 2 })).toBe(2);
  });

  it('says why nothing can be imported instead of calling failed orders "already imported" (QA B2)', () => {
    const failed = (orderNumber: string, errors: string[]): ImportPreviewOrder => ({
      orderNumber, status: 'failed', company: 'c', companyIsNew: false, dropoffIsNew: false, pickup: 'none', lines: 1,
      weightKg: null, deliveryDate: null, flags: [], errors, warnings: [],
    });
    const noDate = 'No delivery or ship date - the order cannot be saved without one.';
    const v = view({
      counts: { ...view().counts!, toCreate: 0, failed: 3 },
      orders: [failed('1', [noDate]), failed('2', ['No receiver company name.', noDate]), failed('3', [noDate])],
    });
    expect(importBlocker(v)).toBe('all_failed');
    expect(sharedFailure(v)).toBe(noDate);
    expect(mappingNeedsAttention(v)).toBe(true);
    expect(sharedFailure(view({ orders: [failed('1', ['a']), failed('2', ['b'])] }))).toBeNull();
    expect(mappingNeedsAttention(view({ gaps: [{ field: 'delivery_date', message: 'x' }] }))).toBe(true);
    expect(mappingNeedsAttention(view())).toBe(false);
  });

  it('names what an incomplete order is missing (QA B5)', () => {
    const t = (key: string, o?: Record<string, unknown>) => `${key.split('.').pop()}${o ? JSON.stringify(o) : ''}`;
    expect(describeIncomplete([{ kind: 'weight', lines: 2, of: 2 }, { kind: 'delivery_date' }], t)).toBe('weight; deliveryDate');
    expect(describeIncomplete([{ kind: 'weight', lines: 1, of: 3 }], t)).toBe('weightSome{"count":1,"of":3}');
    expect(describeIncomplete([{ kind: 'weight_unit', unit: 'cwt' }], t)).toBe('weightUnit{"unit":"cwt"}');
    expect(describeIncomplete(undefined, t)).toBe('');
  });

  it('lists what stops a load first and keeps the pickup question off the rows', () => {
    expect(sortedFlags({ incomplete: 1, blocked: 2, adr: 1 }).map(([f]) => f)).toEqual(['blocked', 'adr', 'incomplete']);
    expect(rowFlags(['no_pickup', 'own_fleet'])).toEqual(['own_fleet']);
  });
});

describe('what the import card asks the shipper', () => {
  const order = (orderNumber: string, status: ImportPreviewOrder['status'], flags: ImportPreviewOrder['flags'] = []): ImportPreviewOrder => ({
    orderNumber, status, company: 'c', companyIsNew: false, dropoffIsNew: false, pickup: 'none', lines: 1,
    weightKg: null, deliveryDate: null, flags, errors: [], warnings: [],
  });

  it('asks nothing about a clean file, so it goes straight to Import', () => {
    const clean = view({ mapping: [row('order_number', 'DocNum'), row('quantity', 'Qty')] });
    expect(importTasks(clean)).toEqual([]);
    expect(importVerdict(clean)).toBe('ready');
  });

  it('turns a missing column into a question naming every column that would close it', () => {
    const v = view({ status: 'mapping', gaps: [{ field: 'receiver_id', message: 'Map a VAT number or a customer code column.' }] });
    const [task] = importTasks(v);
    expect(task).toEqual({ kind: 'column', key: 'gap:receiver_id', gap: 'receiver_id', fields: ['vat', 'customer_code'] });
    expect(isBlockingTask(task!)).toBe(true);
    expect(importVerdict(v)).toBe('blocked');
  });

  it('offers the delivery date before the ship date for a missing date (QA B2)', () => {
    const v = view({ status: 'mapping', gaps: [{ field: 'delivery_date', message: 'x' }] });
    expect(importTasks(v)[0]).toMatchObject({ fields: ['delivery_date', 'ship_date'] });
  });

  it('asks to confirm a guessed key column but not a guessed note', () => {
    const v = view({
      mapping: [row('order_number', 'DocNum'), row('customer_name', 'Client', 'ai', 0.7), row('notes', 'Comments', 'ai', 0.7)],
    });
    expect(importTasks(v)).toEqual([{ kind: 'guess', key: 'guess:customer_name', field: 'customer_name', header: 'Client' }]);
    expect(importVerdict(v)).toBe('review');
  });

  it('walks the analysis stages in order (MS3-367)', () => {
    expect(analysisSteps(view({ status: 'analyzing', stage: 'products' })).map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo']);
    // An older gateway sends no stage: it is still reading.
    expect(analysisSteps(view({ status: 'analyzing' }))[0]).toEqual({ stage: 'reading', state: 'current' });
  });

  it('tells a failed analysis (upload again) from a failed run (retry)', () => {
    expect(analysisFailed(view({ status: 'failed', counts: null }))).toBe(true);
    expect(analysisFailed(view({ status: 'failed' }))).toBe(false);
    expect(analysisFailed(view({ status: 'ready', counts: null }))).toBe(false);
  });

  it('opens only the sections that wait on the shipper', () => {
    const clean = sectionsNeedingInput(view({ counts: { ...view().counts!, incomplete: 0 } }));
    expect(clean).toEqual({ orders: false, customers: false, products: false, locations: false, columns: false });
    expect(sectionsNeedingInput(view()).orders).toBe(true); // the fixture has an incomplete order
    const group = { total: 1, existing: 0, new: 0, input: 1, items: [], truncated: false };
    const review = { customers: { ...group, input: 0 }, products: { ...group, input: 0 }, locations: group };
    expect(sectionsNeedingInput(view({ review })).locations).toBe(true);
    // MS3-371: an undecided name-only customer match opens Customers; a decided one, or an older gateway, does not.
    expect(sectionsNeedingInput(view({ review: { ...review, customers: { ...group, input: 0, possible: 1 } } })).customers).toBe(true);
    expect(sectionsNeedingInput(view({ review: { ...review, customers: { ...group, input: 0, possible: 0 } } })).customers).toBe(false);
    expect(sectionsNeedingInput(view({ review })).customers).toBe(false);
    // MS3-370: Products opens when the file brings new products, so their proposed types are seen.
    expect(sectionsNeedingInput(view({ review: { ...review, products: { ...group, input: 0, new: 2 } } })).products).toBe(true);
    expect(sectionsNeedingInput(view({ review })).products).toBe(false);
    // Without a review (older gateway), an unanswered pickup question counts.
    const q = { key: 'wh', raw: 'WH', orderNumbers: ['1'] };
    expect(sectionsNeedingInput(view({ questions: [{ ...q, answeredWith: null }] })).locations).toBe(true);
    expect(sectionsNeedingInput(view({ questions: [{ ...q, answeredWith: 3 }] })).locations).toBe(false);
    expect(sectionsNeedingInput(view({ gaps: [{ field: 'order_number', message: 'x' }] })).columns).toBe(true);
  });

  it("MS3-370: counts new products whose type is only the catch-all, never an older gateway's untyped ones", () => {
    const item = (key: string, status: 'new' | 'existing', productType?: { source: 'ai' | 'fallback' | 'user' } | null) => ({
      key, status, name: key, detail: null, code: null, orders: 1,
      ...(productType === undefined ? {} : { productRef: `sku:${key}`, productType: productType && { id: 1, name: 't', category: 'c', confidence: 0, ...productType } }),
    });
    const products = {
      total: 5, existing: 1, new: 4, input: 0, truncated: false,
      items: [item('a', 'new', { source: 'fallback' }), item('b', 'new', { source: 'ai' }), item('c', 'new', null), item('d', 'new'), item('e', 'existing')],
    };
    const empty = { total: 0, existing: 0, new: 0, input: 0, items: [], truncated: false };
    expect(productsToCheck(view({ review: { customers: empty, products, locations: empty } }))).toBe(2);
    expect(productsToCheck(view())).toBe(0);
  });

  it('never asks about the weight basis, even from an older gateway that is unsure (MS3-372)', () => {
    const mapping = [row('order_number', 'DocNum'), row('weight', 'Gross Weight')];
    expect(importTasks(view({ mapping, weightBasisConfidence: 0.5 }))).toEqual([]);
  });

  it('names the weight column for the per-unit note only when weights are multiplied', () => {
    const mapping = [row('order_number', 'DocNum'), row('weight', 'Unit Weight')];
    expect(perUnitWeightHeader(view({ mapping, weightBasis: 'per_unit' }))).toBe('Unit Weight');
    expect(perUnitWeightHeader(view({ mapping, weightBasis: 'line_total' }))).toBeNull();
    expect(perUnitWeightHeader(view({ mapping: [row('order_number', 'DocNum')], weightBasis: 'per_unit' }))).toBeNull();
  });

  it('lists an unknown warehouse as optional, and drops it once answered', () => {
    const q = { key: 'wh01', raw: 'WH-01', orderNumbers: ['1', '2'] };
    const open = importTasks(view({ questions: [{ ...q, answeredWith: null }] }));
    expect(open).toEqual([{ kind: 'warehouse', key: 'wh:wh01', raw: 'WH-01', orderNumbers: ['1', '2'] }]);
    expect(isBlockingTask(open[0]!)).toBe(false);
    expect(importTasks(view({ questions: [{ ...q, answeredWith: 7 }] }))).toEqual([]);
  });

  it('asks nothing once the import is running or done', () => {
    expect(importTasks(view({ status: 'running', gaps: [{ field: 'quantity', message: 'x' }] }))).toEqual([]);
  });

  it('shows failed orders first and already-imported ones last', () => {
    const sorted = ordersByAttention([
      order('dup', 'duplicate'), order('ok', 'create'), order('flagged', 'create', ['adr']), order('bad', 'failed'),
    ]);
    expect(sorted.map((o) => o.orderNumber)).toEqual(['bad', 'flagged', 'ok', 'dup']);
    const again = ordersByAttention([order('planned', 'planned_skip'), order('upd', 'update'), order('new', 'create')]);
    expect(again.map((o) => o.orderNumber)).toEqual(['upd', 'new', 'planned']);
  });

  it('MS3-368: a row is New, Will be updated or Already planned - an older gateway\'s duplicate reads as planned', () => {
    expect(orderRowStatus(order('a', 'create'))).toBe('create');
    expect(orderRowStatus(order('a', 'update'))).toBe('update');
    expect(orderRowStatus(order('a', 'planned_skip'))).toBe('planned');
    expect(orderRowStatus(order('a', 'duplicate'))).toBe('planned');
    expect(orderRowStatus(order('a', 'failed'))).toBe('failed');
  });

  it('MS3-368: search finds an order number by any part of it, ignoring case and spaces', () => {
    const list = [order('SO-1001', 'create'), order('SO-1002', 'create'), order('PO 77', 'update')];
    expect(searchOrders(list, '').map((o) => o.orderNumber)).toEqual(['SO-1001', 'SO-1002', 'PO 77']);
    expect(searchOrders(list, 'so-100').map((o) => o.orderNumber)).toEqual(['SO-1001', 'SO-1002']);
    expect(searchOrders(list, ' 1002 ').map((o) => o.orderNumber)).toEqual(['SO-1002']);
    expect(searchOrders(list, 'po77').map((o) => o.orderNumber)).toEqual(['PO 77']);
    expect(searchOrders(list, 'zzz')).toEqual([]);
  });

  it('MS3-368: the order value is money in the file\'s currency, euros when it names none', () => {
    expect(formatOrderValue(null, null, 'en')).toBeNull();
    expect(formatOrderValue(undefined, undefined, 'en')).toBeNull();
    expect(formatOrderValue(1234.5, null, 'en')).toBe('€1,234.50');
    expect(formatOrderValue(1234.5, 'USD', 'en')).toBe('$1,234.50');
    expect(formatOrderValue(1234.5, 'EUR', 'el')).toMatch(/^1\.234,50\s€$/);
    expect(formatOrderValue(10, 'EURO', 'en')).toBe('10.00 EURO');
  });

  it('hands the Orders panel the orders the import created or updated, never a skipped one', () => {
    const item = (orderId: number | null, status: 'created' | 'updated' | 'planned_skip' | 'duplicate' | 'failed') => ({
      orderNumber: String(orderId), status, orderId, company: 'c', flags: [], reason: null,
    });
    const summary = {
      items: [item(11, 'created'), item(null, 'failed'), item(12, 'duplicate'), item(13, 'created'), item(14, 'updated'), item(15, 'planned_skip')],
    };
    expect(createdOrderIds(summary as never)).toEqual(['11', '13', '14']);
  });
});

describe('the column picker for a missing column', () => {
  it('offers the columns no field uses yet first, and names what the others feed', () => {
    const v = view({
      headers: ['Delivery No', 'Qty', 'Req. Delivery', ''],
      mapping: [row('order_number', 'Delivery No'), row('quantity', 'Qty'), row('delivery_date', null)],
    });
    expect(columnChoices(v)).toEqual({
      unused: ['Req. Delivery'],
      used: [{ header: 'Delivery No', field: 'order_number' }, { header: 'Qty', field: 'quantity' }],
    });
  });
});
