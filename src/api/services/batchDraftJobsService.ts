import { GatewayError, gatewayFetch } from '../chatGatewayUrl';
import { getStoredToken } from '../client';

/**
 * MS3-349 — poll ChatBot background batch draft jobs.
 * Jobs are started via chat forceTool async=true (sticky multi Create drafts).
 */

export type BatchDraftJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type BatchDraftJobCreated = {
  order_id?: string;
  order_reference?: string;
  draft_id?: number;
  sid?: string;
};

export type BatchDraftJobFailed = {
  order_id?: string;
  order_reference?: string;
  reason?: string;
};

export type BatchDraftJob = {
  job_id: string;
  status: BatchDraftJobStatus;
  requested: number;
  done: number;
  total: number;
  detail: string | null;
  created: BatchDraftJobCreated[];
  failed: BatchDraftJobFailed[];
  digest: string | null;
  message: string | null;
  drafts_path: string;
  elapsed_ms: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * One poll's outcome.
 *
 * `missing` is kept apart from `retry` on purpose. Jobs live in the gateway's
 * memory, so a restart forgets them and every later poll is a 404 — which is
 * final, and polling it forever would leave the card saying "waiting" for good.
 * A network blip or a 5xx is worth another try; a 404 is not.
 */
export type BatchDraftJobPoll =
  | { kind: 'ok'; job: BatchDraftJob }
  | { kind: 'missing' }
  | { kind: 'retry' };

export const batchDraftJobsService = {
  async get(jobId: string, locale?: string): Promise<BatchDraftJobPoll> {
    const token = getStoredToken();
    if (!token || !jobId) return { kind: 'retry' };
    try {
      const res = await gatewayFetch(`/vagon-ai/batch-draft-jobs/${encodeURIComponent(jobId)}`, {
        token,
        locale,
      });
      return { kind: 'ok', job: (await res.json()) as BatchDraftJob };
    } catch (err) {
      if (err instanceof GatewayError && err.status === 404) return { kind: 'missing' };
      return { kind: 'retry' };
    }
  },
};
