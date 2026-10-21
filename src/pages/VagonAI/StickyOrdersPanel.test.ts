import { describe, expect, it } from 'vitest';
import {
  buildDraftPrompt,
  buildStickyCreateForceTool,
  buildStickyOrderStatusForceTool,
  describeDue,
  sortByUrgency,
  withoutCompleted,
  matchesOrderSearch,
  filterOrdersBySearch,
  matchesCompletedOrderSearch,
  type StickyOrderRow,
} from './StickyOrdersPanel';
import { focusFirst, readPanelOpen } from './stickyPanelState';

const sample = (id: string, ref: string): StickyOrderRow => ({
  id,
  orderReference: ref,
  customerName: 'Acme',
  shipFrom: 'Athens',
  shipTo: 'Patras',
  deliveryDate: '2026-10-01',
  status: 'unplanned',
  linkedLoadId: '',
  linkedLoadSid: '',
  updatedAt: '2026-09-21T00:00:00Z',
  originLocationId: null,
  destLocationId: null,
});

describe('buildDraftPrompt', () => {
  it('names a single order for one-shot draft', () => {
    const text = buildDraftPrompt([sample('1', 'ORD-A')]);
    expect(text).toContain('ORD-A');
    expect(text).toContain('order id 1');
    expect(text.toLowerCase()).toContain('one-shot');
  });

  it('lists multiple orders for batch create drafts', () => {
    const text = buildDraftPrompt([sample('1', 'ORD-A'), sample('2', 'ORD-B')]);
    expect(text).toContain('ORD-A');
    expect(text).toContain('ORD-B');
    expect(text.toLowerCase()).toContain('drafts');
    expect(text.toLowerCase()).toContain('create_homogeneous_batch_drafts');
    expect(text.toLowerCase()).toContain('one draft per lane');
  });
});


describe('order status from the toolbar', () => {
  it('forces the confirmed write for exactly the tapped order', () => {
    expect(buildStickyOrderStatusForceTool('42', 'complete')).toEqual({
      forceTool: { name: 'mark_order_complete', arguments: { order_id: '42' } },
    });
    expect(buildStickyOrderStatusForceTool('42', 'reopen')).toEqual({
      forceTool: { name: 'reopen_order', arguments: { order_id: '42' } },
    });
  });

  // Laravel still lists a hand-closed order as unplanned; the toolbar must not.
  it('drops orders the gateway reports as completed', () => {
    const rows = [sample('1', 'ORD-A'), sample('2', 'ORD-B')];
    expect(withoutCompleted(rows, [{ order_id: '2' }]).map((r) => r.id)).toEqual(['1']);
    expect(withoutCompleted(rows, [])).toBe(rows);
  });
});

describe('describeDue', () => {
  // The delivery date carries no clock, so the deadline is the END of that day
  // in local time. Every case below is built from a fixed local "now".
  const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);

  it('counts a same-day order down in hours, not days', () => {
    const due = describeDue('2026-10-01', at(2026, 10, 1, 16, 0));
    expect(due.tone).toBe('urgent');
    expect(due.label).toBe('Due in 7h');
  });

  it('counts the last hour down in minutes', () => {
    const due = describeDue('2026-10-01', at(2026, 10, 1, 23, 14));
    expect(due.tone).toBe('urgent');
    expect(due.label).toBe('Due in 45m');
  });

  it('shows days and hours inside the three-day window', () => {
    const due = describeDue('2026-10-03', at(2026, 10, 1, 19, 0));
    expect(due.tone).toBe('soon');
    expect(due.label).toBe('Due in 2d 4h');
  });

  it('drops the hours once the order is more than three days out', () => {
    const due = describeDue('2026-10-09', at(2026, 10, 1, 9, 0));
    expect(due.tone).toBe('normal');
    expect(due.label).toBe('Due in 8d');
  });

  it('does not call an order due today overdue at one minute past midnight', () => {
    const due = describeDue('2026-10-01', at(2026, 10, 1, 0, 1));
    expect(due.tone).toBe('urgent');
    expect(due.remainingMs).toBeGreaterThan(0);
  });

  it('reports elapsed time once the day has passed', () => {
    const due = describeDue('2026-09-29', at(2026, 10, 1, 12, 0));
    expect(due.tone).toBe('overdue');
    expect(due.label).toBe('Overdue 1d 12h');
    expect(due.remainingMs).toBeLessThan(0);
  });

  it('says so rather than guessing when the order has no delivery date', () => {
    const due = describeDue('', at(2026, 10, 1));
    expect(due).toEqual({ label: 'No due date', tone: 'none', remainingMs: null });
  });
});

describe('sortByUrgency', () => {
  const row = (id: string, deliveryDate: string, updatedAt = '2026-09-01T00:00:00Z'): StickyOrderRow => ({
    ...sample(id, `ORD-${id}`),
    deliveryDate,
    updatedAt,
  });

  it('puts the soonest deadline first and undated orders last', () => {
    const sorted = sortByUrgency([
      row('a', '2026-10-05'),
      row('b', ''),
      row('c', '2026-10-01'),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(['c', 'a', 'b']);
  });

  it('falls back to most recently touched when two share a deadline', () => {
    const sorted = sortByUrgency([
      row('old', '2026-10-01', '2026-09-01T00:00:00Z'),
      row('new', '2026-10-01', '2026-09-20T00:00:00Z'),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(['new', 'old']);
  });

  it('does not mutate the array it is given', () => {
    const input = [row('a', '2026-10-05'), row('c', '2026-10-01')];
    sortByUrgency(input);
    expect(input.map((o) => o.id)).toEqual(['a', 'c']);
  });
});


describe('buildStickyCreateForceTool (MS3-349)', () => {
  it('oneshot uses create_oneshot_draft_from_order without async', () => {
    const opts = buildStickyCreateForceTool([sample('94', 'ORD-94')]);
    expect(opts.run_kind).toBeUndefined();
    expect(opts.forceTool.name).toBe('create_oneshot_draft_from_order');
    expect(opts.forceTool.arguments).toEqual({ order_id: '94' });
  });

  it('multi uses create_homogeneous_batch_drafts with async true', () => {
    const opts = buildStickyCreateForceTool([
      sample('93', 'ORD-93'),
      sample('91', 'ORD-91'),
    ]);
    expect(opts.run_kind).toBe('batch');
    expect(opts.forceTool.name).toBe('create_homogeneous_batch_drafts');
    expect(opts.forceTool.arguments).toEqual({
      order_ids: ['93', '91'],
      async: true,
    });
  });
});


describe('mixed-lane selection', () => {
  it('sends every order in one batch whatever its lane - the gateway groups by lane', () => {
    const a = { ...sample('1', 'ORD-A'), shipFrom: 'Whitehouse 01', shipTo: 'Dimitris Ioannou' };
    const b = { ...sample('2', 'ORD-B'), shipFrom: 'Patras W01', shipTo: 'TERRA' };
    const opts = buildStickyCreateForceTool([a, b]);
    expect(opts.forceTool.name).toBe('create_homogeneous_batch_drafts');
    expect(opts.forceTool.arguments.order_ids).toEqual(['1', '2']);
  });
});

describe('matchesOrderSearch (MS3-353)', () => {
  it('matches order #, customer, and destination (case-insensitive)', () => {
    const row = { ...sample('7', 'ORD-334S'), customerName: 'Acme Hellas', shipFrom: 'Athens', shipTo: 'Thessaloniki' };
    expect(matchesOrderSearch(row, '334')).toBe(true);
    expect(matchesOrderSearch(row, 'acme')).toBe(true);
    expect(matchesOrderSearch(row, 'thessa')).toBe(true);
    expect(matchesOrderSearch(row, 'athens')).toBe(true);
    expect(matchesOrderSearch(row, 'nope')).toBe(false);
  });

  it('empty query keeps every row', () => {
    const rows = [sample('1', 'ORD-A'), sample('2', 'ORD-B')];
    expect(filterOrdersBySearch(rows, '  ')).toEqual(rows);
    expect(filterOrdersBySearch(rows, 'ORD-B').map((r) => r.id)).toEqual(['2']);
  });

  it('completed search matches reference and customer', () => {
    const row = { order_id: '9', order_reference: 'ORD-DONE', customer_name: 'Beta Co' };
    expect(matchesCompletedOrderSearch(row, 'done')).toBe(true);
    expect(matchesCompletedOrderSearch(row, 'beta')).toBe(true);
    expect(matchesCompletedOrderSearch(row, 'zzz')).toBe(false);
  });
});

describe('orders panel redesign helpers', () => {
  const now = new Date(2026, 9, 12, 10, 0);

  it('treats only a delivery day that is over as overdue - what the closed bar counts', () => {
    const tones = ['2026-10-11', '2026-10-12', '2026-10-20', ''].map((d) => describeDue(d, now).tone);
    expect(tones.filter((tone) => tone === 'overdue')).toHaveLength(1);
  });

  it('puts the orders an import just created first, so the urgency trim keeps them', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
    expect(focusFirst(rows, ['d', 'b']).map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(focusFirst(rows, [])).toBe(rows);
  });

  it('starts closed unless the shipper left it open, and survives blocked storage', () => {
    expect(readPanelOpen(null)).toBe(false);
    expect(readPanelOpen({ getItem: () => null })).toBe(false);
    expect(readPanelOpen({ getItem: () => '1' })).toBe(true);
    expect(readPanelOpen({ getItem: () => '0' })).toBe(false);
    expect(
      readPanelOpen({
        getItem: () => {
          throw new Error('SecurityError');
        },
      }),
    ).toBe(false);
  });
});
