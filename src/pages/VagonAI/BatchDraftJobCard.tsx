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
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  batchDraftJobsService,
  type BatchDraftJob,
} from '../../api/services/batchDraftJobsService';
import { useTranslation } from '../../hooks/useTranslation';

const POLL_MS = 1500;
/** A blip is retried more slowly, so a gateway that is down is not hammered. */
const RETRY_MS = POLL_MS * 2;

export type BatchDraftJobCardProps = {
  jobId: string;
  locale?: string;
  /** Theme tokens from VagonAIPage (minimal ThemeTokens slice). */
  T: { sf: string; bd: string; t1: string; t2: string; ac: string };
};

export default function BatchDraftJobCard({ jobId, locale, T }: BatchDraftJobCardProps) {
  const { t } = useTranslation();
  const [job, setJob] = useState<BatchDraftJob | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [lost, setLost] = useState(false);

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
  const sids = (job?.created ?? []).map((c) => c.sid).filter(Boolean) as string[];
  const failCount = job?.failed?.length ?? 0;
  const finished = lost || status === 'completed' || status === 'failed';

  const heading = lost
    ? t('vagonai.batchJob.lostTitle')
    : status === 'queued'
      ? t('vagonai.batchJob.queued')
      : status === 'running'
        ? t('vagonai.batchJob.running')
        : status === 'completed'
          ? (failCount > 0 ? t('vagonai.batchJob.partial') : t('vagonai.batchJob.completed'))
          : t('vagonai.batchJob.failed');

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
              background: status === 'failed' ? '#c44' : T.ac,
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
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c44' }}>{job.error}</p>
      )}

      {finished && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {sids.length > 0 && (
            <p style={{ margin: '0 0 8px', color: T.t2 }}>{t('vagonai.batchJob.created', { sids: sids.join(', ') })}</p>
          )}
          {failCount > 0 && (
            <p style={{ margin: '0 0 8px', color: '#c44' }}>
              {t('vagonai.batchJob.notCreated', {
                list: (job?.failed ?? [])
                  .map((f) => `${f.order_reference || f.order_id || '?'}${f.reason ? ` (${f.reason})` : ''}`)
                  .join('; '),
              })}
            </p>
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
