/**
 * One table row per order in a finished batch draft job, in the shipper's words.
 *
 * A failure's `reason` is written for the MODEL: it names tool arguments
 * ("Call this again with stop_schedule…") and runs to a paragraph per order.
 * Printed as-is, nine orders with passed dates became a wall of red text. The
 * gateway also sends `code`, `past_stops` and `missing`, and those are what the
 * row is built from; `reason` is only the last resort for a failure nothing
 * structured describes.
 */
import type { BatchDraftJob, BatchDraftJobFailed } from '../../api/services/batchDraftJobsService';

/** `warning` is something the shipper can fix on the order; `danger` is not. */
export type BatchRowTone = 'success' | 'warning' | 'danger';

export type BatchJobRow = {
  key: string;
  order: string;
  tone: BatchRowTone;
  detail: string;
  /** Order to open for editing (failed rows, or created-but-incomplete). */
  editOrderId?: string;
  /** A draft exists for this order (it was saved, even if it still needs details). */
  saved?: boolean;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** The fields the gateway sends on a failure beyond the ones the service types. */
type FailureFacts = BatchDraftJobFailed & {
  code?: string;
  past_stops?: string[];
  missing?: string[];
};

/** `stops[1].from` → the label key for what that path means to a shipper. */
function missingLabelKey(field: string): string | null {
  if (/\.from$/.test(field)) return 'dates';
  if (/\.locationId$/.test(field)) return 'address';
  if (/\.productId$/.test(field)) return 'product';
  if (/\.qty$/.test(field)) return 'quantity';
  if (/\.weight$/.test(field)) return 'weight';
  if (field === 'stops') return 'stops';
  return null;
}

function describeFailure(f: FailureFacts, t: Translate): { tone: BatchRowTone; detail: string } {
  if (f.code === 'stops_in_past') {
    const dates = (f.past_stops ?? []).map((d) => d.replace('T', ' '));
    return {
      tone: 'warning',
      detail: dates.length > 0
        ? t('vagonai.batchJob.reasons.datesPassedOn', { dates: dates.join(', ') })
        : t('vagonai.batchJob.reasons.datesPassed'),
    };
  }

  const labels = Array.from(
    new Set((f.missing ?? []).map(missingLabelKey).filter((k): k is string => k !== null)),
  ).map((k) => t(`vagonai.batchJob.missingField.${k}`));
  if (labels.length > 0) {
    return { tone: 'warning', detail: t('vagonai.batchJob.reasons.missing', { fields: labels.join(', ') }) };
  }

  if (f.reason && /timed out|timeout/i.test(f.reason)) {
    return { tone: 'danger', detail: t('vagonai.batchJob.reasons.timeout') };
  }
  return { tone: 'danger', detail: f.reason || t('vagonai.batchJob.reasons.unknown') };
}

/** Failures first: they are the rows that ask something of the shipper. */
export function batchJobRows(job: Pick<BatchDraftJob, 'created' | 'failed'>, t: Translate): BatchJobRow[] {
  const failed = (job.failed ?? []).map((f, i): BatchJobRow => ({
    key: `f-${f.order_id ?? i}`,
    order: f.order_reference || f.order_id || '?',
    ...describeFailure(f as FailureFacts, t),
    ...(f.order_id ? { editOrderId: f.order_id } : {}),
  }));
  const created = (job.created ?? []).map((c, i): BatchJobRow => {
    const labels = Array.from(
      new Set((c.missing ?? []).map(missingLabelKey).filter((k): k is string => k !== null)),
    ).map((k) => t(`vagonai.batchJob.missingField.${k}`));
    const saved = c.sid ? t('vagonai.batchJob.savedAs', { sid: c.sid }) : '';
    if (labels.length > 0) {
      // MS3-351 success digest parity: incomplete drafts stay in the table with
      // What's missing + pencil, same shape as failure rows.
      return {
        key: `c-${c.order_id ?? i}`,
        order: c.order_reference || c.order_id || '?',
        tone: 'warning',
        detail: [saved, t('vagonai.batchJob.reasons.missing', { fields: labels.join(', ') })]
          .filter(Boolean)
          .join(' '),
        ...(c.order_id ? { editOrderId: c.order_id } : {}),
        saved: true,
      };
    }
    return {
      key: `c-${c.order_id ?? i}`,
      order: c.order_reference || c.order_id || '?',
      tone: 'success',
      detail: saved,
      saved: true,
    };
  });
  // Incomplete created rows first (need attention), then clean successes, then
  // hard failures already listed above — actually failures stay first.
  return [...failed, ...created];
}

/** The tone of the job as a whole: the worst of its rows. */
export function batchJobTone(rows: readonly BatchJobRow[]): BatchRowTone {
  if (rows.some((r) => r.tone === 'danger')) return 'danger';
  if (rows.some((r) => r.tone === 'warning')) return 'warning';
  return 'success';
}

/** Where a job stands, as far as its heading is concerned. */
export interface BatchHeadingInput {
  lost: boolean;
  status: string;
  rows: readonly BatchJobRow[];
  tone: BatchRowTone;
}

/**
 * The locale key for the card's heading.
 *
 * "Drafts not created - orders need updating" used to head any finished job
 * with a warning row, including one whose every row read "Saved as SID-..."
 * (QA 2026-10-10): the drafts WERE created, they only need details. A saved
 * draft that needs details and an order that got no draft are different news,
 * and the heading now says which.
 */
export function batchJobHeadingKey({ lost, status, rows, tone }: BatchHeadingInput): string {
  if (lost) return 'vagonai.batchJob.lostTitle';
  if (status === 'queued') return 'vagonai.batchJob.queued';
  if (status === 'running') return 'vagonai.batchJob.running';
  const saved = rows.filter((r) => r.saved);
  const notSaved = rows.filter((r) => !r.saved);
  const savedNeedDetails = saved.some((r) => r.tone === 'warning');
  if (status === 'completed' && rows.length > 0 && notSaved.length === 0) {
    return savedNeedDetails ? 'vagonai.batchJob.savedNeedDetails' : 'vagonai.batchJob.completed';
  }
  if (saved.length > 0) return 'vagonai.batchJob.partial';
  if (status === 'completed' && rows.length === 0) return 'vagonai.batchJob.completed';
  return tone === 'warning' ? 'vagonai.batchJob.needsAttention' : 'vagonai.batchJob.failed';
}

/**
 * The hint under the table, or null for none. An order with no draft is fixed on
 * the order (the pencil) and created again; a saved draft is finished in Drafts.
 */
export function batchJobHintKey(rows: readonly BatchJobRow[]): string | null {
  if (rows.some((r) => !r.saved && r.tone === 'warning')) return 'vagonai.batchJob.fixHint';
  if (rows.some((r) => r.saved && r.tone === 'warning')) return 'vagonai.batchJob.fixHintSaved';
  return null;
}
