import { describe, expect, it } from 'vitest';
import { batchJobHeadingKey, batchJobHintKey, batchJobRows, batchJobTone } from './batchJobRows';

/** Echoes the key and its options, so a test can see what was asked for. */
const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key} ${JSON.stringify(options)}` : key;

// The failure the shipper saw as a paragraph of red text, as the gateway sends it.
const pastDates = {
  order_id: '41',
  order_reference: 'GR-ORD-005',
  reason:
    'Draft still missing required fields for save (Phase A batch does not interview per order): Set the collection date and time. ' +
    'Call this again with stop_schedule carrying a future window for each leg.',
  missing: ['stops[0].from', 'stops[1].from'],
  code: 'stops_in_past',
  past_stops: ['2026-09-25T08:00'],
};

describe('batchJobRows', () => {
  it('turns passed dates into a warning without the model-facing reason', () => {
    const [row] = batchJobRows({ created: [], failed: [pastDates] }, t);
    expect(row.order).toBe('GR-ORD-005');
    expect(row.tone).toBe('warning');
    expect(row.detail).toContain('datesPassedOn');
    expect(row.detail).toContain('2026-09-25 08:00');
    expect(row.detail).not.toMatch(/stop_schedule|Phase A/);
  });

  it('names missing fields once each, in plain words', () => {
    const [row] = batchJobRows(
      {
        created: [],
        failed: [{ order_id: '7', reason: 'x', missing: ['stops[0].from', 'stops[1].from', 'stops[0].lines[0].qty'] } as never],
      },
      t,
    );
    expect(row.tone).toBe('warning');
    expect(row.detail).toContain('missingField.dates, vagonai.batchJob.missingField.quantity');
  });

  it('keeps an unstructured failure as a danger row', () => {
    const rows = batchJobRows({ created: [], failed: [{ order_id: '9', reason: 'MYVAGON core API timed out' }] }, t);
    expect(rows[0]).toMatchObject({ tone: 'danger', detail: 'vagonai.batchJob.reasons.timeout' });
    expect(batchJobTone(rows)).toBe('danger');
  });

  it('lists failures before created drafts and takes the worst tone', () => {
    const rows = batchJobRows(
      { created: [{ order_id: '1', order_reference: 'GR-ORD-001', sid: 'SID-1' }], failed: [pastDates] },
      t,
    );
    expect(rows.map((r) => r.tone)).toEqual(['warning', 'success']);
    expect(rows[1].detail).toContain('SID-1');
    // Only a failed row is offered for editing - a created one is already a draft.
    expect(rows[0].editOrderId).toBe('41');
    expect(rows[1].editOrderId).toBeUndefined();
    expect(batchJobTone(rows)).toBe('warning');
  });

  it('MS3-351: created-but-incomplete rows match failure digest shape', () => {
    const rows = batchJobRows(
      {
        created: [
          {
            order_id: '55',
            order_reference: 'GR-ORD-INCOMPLETE',
            sid: 'SID-999',
            missing: ['stops[0].locationId', 'stops[1].from'],
          } as never,
        ],
        failed: [],
      },
      t,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tone).toBe('warning');
    expect(rows[0].detail).toContain('SID-999');
    expect(rows[0].detail).toContain('missingField.address');
    expect(rows[0].detail).toContain('missingField.dates');
    expect(rows[0].editOrderId).toBe('55');
    expect(batchJobTone(rows)).toBe('warning');
  });

  it('MS3-351: clean success rows stay success without pencil', () => {
    const rows = batchJobRows(
      { created: [{ order_id: '1', order_reference: 'OK-1', sid: 'SID-1' }], failed: [] },
      t,
    );
    expect(rows[0].tone).toBe('success');
    expect(rows[0].editOrderId).toBeUndefined();
    expect(rows[0].detail).toContain('SID-1');
  });

});

describe('batchJobHeadingKey — the header agrees with the rows (QA 2026-10-10)', () => {
  const savedIncomplete = (n: string) => ({
    order_id: n, order_reference: `QARET-1010-ORD${n}`, sid: `SID-${n}`, missing: ['stops[0].locationId'],
  });
  const heading = (job: Parameters<typeof batchJobRows>[0], status = 'completed') => {
    const rows = batchJobRows(job, t);
    return { key: batchJobHeadingKey({ lost: false, status, rows, tone: batchJobTone(rows) }), hint: batchJobHintKey(rows), rows };
  };

  it('never says "not created" when every row was saved as a draft', () => {
    const { key, hint, rows } = heading({ created: [savedIncomplete('1'), savedIncomplete('2')], failed: [] });
    expect(rows.every((r) => r.detail.includes('savedAs'))).toBe(true);
    expect(key).toBe('vagonai.batchJob.savedNeedDetails');
    expect(key).not.toBe('vagonai.batchJob.needsAttention');
    expect(hint).toBe('vagonai.batchJob.fixHintSaved');
  });

  it('says ready when every draft is complete, with no hint', () => {
    const { key, hint } = heading({ created: [{ order_id: '1', order_reference: 'A', sid: 'SID-1' }], failed: [] });
    expect(key).toBe('vagonai.batchJob.completed');
    expect(hint).toBeNull();
  });

  it('says partial when some drafts saved and some orders got none', () => {
    const { key, hint } = heading({ created: [savedIncomplete('1')], failed: [pastDates] });
    expect(key).toBe('vagonai.batchJob.partial');
    expect(hint).toBe('vagonai.batchJob.fixHint');
  });

  it('keeps "not created - orders need updating" for orders that really got no draft', () => {
    expect(heading({ created: [], failed: [pastDates] }).key).toBe('vagonai.batchJob.needsAttention');
    expect(heading({ created: [], failed: [{ order_id: '9', reason: 'boom' }] }).key).toBe('vagonai.batchJob.failed');
  });

  it('still reports queued, running and lost', () => {
    expect(batchJobHeadingKey({ lost: false, status: 'running', rows: [], tone: 'success' })).toBe('vagonai.batchJob.running');
    expect(batchJobHeadingKey({ lost: true, status: 'running', rows: [], tone: 'success' })).toBe('vagonai.batchJob.lostTitle');
  });
});
