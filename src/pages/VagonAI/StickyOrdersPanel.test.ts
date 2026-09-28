import { describe, expect, it } from 'vitest';
import {
  buildDraftPrompt,
  buildStickyCreateForceTool,
  describeDue,
  sortByUrgency,
  type StickyOrderRow,
} from './StickyOrdersPanel';

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
    expect(text.toLowerCase()).toMatch(/never merge|exactly one draft/);
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
