/**
 * MS3-349 — progress + completion digest for a background batch draft job.
 * Links into existing Manage Shipments drafts tab (/shipments?status=drafts).
 *
 * Everything the shipper reads is built here from the job's counts, in their
 * language. The gateway's own `detail` / `digest` strings are English and carry
 * run diagnostics ("saved in 12917ms (concurrency=1)") that are not for a
 * shipper's eyes — the same class of leak as the internal prompt text MS3-347
 * took out of the chat bubble.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import {
  batchDraftJobsService,
  type BatchDraftJob,
} from '../../api/services/batchDraftJobsService';
import { useTranslation } from '../../hooks/useTranslation';
import {
  batchJobHeadingKey, batchJobHintKey, batchJobRows, batchJobTone, type BatchRowTone,
} from './batchJobRows';

const POLL_MS = 1500;
/** A blip is retried more slowly, so a gateway that is down is not hammered. */
const RETRY_MS = POLL_MS * 2;

/** Translucent fills so the pills read on both the light and dark surface. */
const TONE: Record<BatchRowTone, { fg: string; bg: string }> = {
  success: { fg: '#059669', bg: 'rgba(16,185,129,0.14)' },
  warning: { fg: '#D97706', bg: 'rgba(245,158,11,0.16)' },
  danger: { fg: '#DC2626', bg: 'rgba(239,68,68,0.14)' },
};

export type BatchDraftJobCardProps = {
  jobId: string;
  locale?: string;
  /** Theme tokens from VagonAIPage (minimal ThemeTokens slice). */
  T: { sf: string; bd: string; t1: string; t2: string; ac: string };
  /**
   * Called once when the job reaches `completed` or `failed`, so the page can
   * refresh what the drafts changed - the orders panel's unplanned count
   * stayed at "9 unplanned" after the drafts were made (QA 2026-10-08).
   */
  onFinished?: (job: BatchDraftJob) => void;
};

export default function BatchDraftJobCard({ jobId, locale, T, onFinished }: BatchDraftJobCardProps) {
  const { t } = useTranslation();
  const [job, setJob] = useState<BatchDraftJob | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [lost, setLost] = useState(false);
  // Read through a ref so a new callback identity does not restart the polling.
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const poll = await batchDraftJobsService.get(jobId, locale);
      if (cancelled) return;
      if (poll.kind === 'missing') {
        // Final: the gateway no longer knows this job. Stop polling.
        setLost(true);
        return;
      }
      if (poll.kind === 'retry') {
        setWaiting(true);
        timer = setTimeout(tick, RETRY_MS);
        return;
      }
      setWaiting(false);
      setJob(poll.job);
      if (poll.job.status === 'queued' || poll.job.status === 'running') {
        timer = setTimeout(tick, POLL_MS);
      } else if (poll.job.status === 'completed' || poll.job.status === 'failed') {
        onFinishedRef.current?.(poll.job);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, locale]);

  const status = job?.status ?? 'queued';
  const done = job?.done ?? 0;
  const total = job?.total ?? job?.requested ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : status === 'completed' ? 100 : 0;
  const draftsPath = job?.drafts_path || '/shipments?status=drafts';
  const failCount = job?.failed?.length ?? 0;
  const finished = lost || status === 'completed' || status === 'failed';
  const rows = finished && job ? batchJobRows(job, t) : [];
  // A job with no rows that still failed did so as a whole (job.error).
  const tone: BatchRowTone = status === 'failed' && rows.length === 0 ? 'danger' : batchJobTone(rows);
  const needsAction = rows.some((r) => r.tone === 'warning');

  const heading = t(batchJobHeadingKey({ lost, status, rows, tone }));
  const hintKey = batchJobHintKey(rows);

  return (
    <div
      className="vai-batch-job-card"
      data-testid="batch-draft-job-card"
      data-job-id={jobId}
      data-status={lost ? 'lost' : status}
      role="status"
      aria-live="polite"
      style={{
        marginTop: 10,
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${T.bd}`,
        background: T.sf,
        color: T.t1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 13 }}>{heading}</strong>
        {!lost && (
          <span style={{ fontSize: 12, color: T.t2 }}>
            {total > 0 ? t('vagonai.batchJob.progress', { done, total }) : '…'}
          </span>
        )}
      </div>

      {!lost && (
        <div
          style={{
            marginTop: 8,
            height: 6,
            borderRadius: 999,
            background: T.bd,
            overflow: 'hidden',
          }}
          aria-hidden
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: finished && tone !== 'success' ? TONE[tone].fg : T.ac,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {lost && <p style={{ margin: '8px 0 0', fontSize: 12, color: T.t2 }}>{t('vagonai.batchJob.lost')}</p>}
      {waiting && !job && !lost && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: T.t2 }}>{t('vagonai.batchJob.waiting')}</p>
      )}
      {/* A whole-job failure has no per-order rows to show, so its reason is the only explanation there is. */}
      {status === 'failed' && failCount === 0 && job?.error && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: TONE.danger.fg }}>{job.error}</p>
      )}

      {finished && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {rows.length > 0 && (
            <div
              style={{
                maxHeight: 280,
                overflowY: 'auto',
                border: `1px solid ${T.bd}`,
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <table
                data-testid="batch-job-table"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, lineHeight: 1.4 }}
              >
                <thead>
                  <tr style={{ color: T.t2, textAlign: 'left' }}>
                    {(['order', 'status', 'details'] as const).map((col) => (
                      <th
                        key={col}
                        scope="col"
                        style={{
                          position: 'sticky',
                          top: 0,
                          background: T.sf,
                          padding: '6px 10px',
                          fontWeight: 600,
                          borderBottom: `1px solid ${T.bd}`,
                        }}
                      >
                        {t(`vagonai.batchJob.columns.${col}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.key}
                      data-tone={row.tone}
                      style={{ borderTop: i === 0 ? undefined : `1px solid ${T.bd}`, verticalAlign: 'top' }}
                    >
                      {/* Not nowrap: a reference like MS342-SBX-ORD-HIST-01 pushed past the
                          card's edge, into a sideways scroll nobody noticed. It wraps at its hyphens. */}
                      <td style={{ padding: '6px 10px', fontWeight: 600, minWidth: 96 }} title={row.order}>
                        {row.order}
                        {row.editOrderId && (
                          // A new tab, so the table stays here to work down the list.
                          <Link
                            to={`/erp-orders?edit=${encodeURIComponent(row.editOrderId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="batch-job-edit-order"
                            aria-label={t('vagonai.batchJob.editOrder', { ref: row.order })}
                            title={t('vagonai.batchJob.editOrder', { ref: row.order })}
                            style={{
                              display: 'inline-flex',
                              verticalAlign: 'middle',
                              marginLeft: 6,
                              padding: 2,
                              borderRadius: 4,
                              color: T.ac,
                            }}
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </Link>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 8px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            color: TONE[row.tone].fg,
                            background: TONE[row.tone].bg,
                          }}
                        >
                          {t(`vagonai.batchJob.rowStatus.${row.tone}`)}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: T.t2 }}>{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {needsAction && hintKey && (
            <p style={{ margin: '0 0 8px', color: T.t2 }}>{t(hintKey)}</p>
          )}
          <Link
            to={draftsPath}
            data-testid="batch-drafts-link"
            style={{ color: T.ac, fontWeight: 600, textDecoration: 'underline' }}
          >
            {t('vagonai.batchJob.openDrafts')}
          </Link>
        </div>
      )}
    </div>
  );
}
