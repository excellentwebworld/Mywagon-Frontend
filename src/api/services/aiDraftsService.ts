import { gatewayFetch } from '../chatGatewayUrl';
import { getStoredToken } from '../client';

/**
 * MS3-338 — which drafts Vagon AI created, read from the chat gateway.
 *
 * Deliberately not the Laravel API. The core API has no notion of who created a
 * shipment; the gateway records what it drafted in its own table and is the only
 * thing that can answer. Manage Shipments then asks Laravel for those specific
 * ids, which it has always supported.
 *
 * Best-effort: an unreachable gateway must leave the shipments list working
 * without its AI markers, never break it, so this returns null instead of
 * throwing.
 */

export interface AiDraftPage {
  draftIds: number[];
  total: number;
}

export const aiDraftsService = {
  /**
   * A page of AI-created draft ids, newest first.
   *
   * Returns `null` — not an empty page — when the gateway cannot be reached, so
   * the caller can tell "you have no AI drafts" from "we could not find out" and
   * avoid rendering an empty list as if it were the answer.
   */
  async list(params: { page?: number; perPage?: number } = {}, locale?: string): Promise<AiDraftPage | null> {
    try {
      const token = getStoredToken();
      if (!token) return null;
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', String(params.page));
      if (params.perPage) qs.set('per_page', String(params.perPage));
      const suffix = qs.toString() ? `?${qs}` : '';
      const res = await gatewayFetch(`/vagon-ai/ai-drafts${suffix}`, { token, locale });
      const body = (await res.json()) as { draft_ids?: number[]; total?: number };
      return { draftIds: (body?.draft_ids ?? []).map(Number), total: Number(body?.total ?? 0) };
    } catch {
      return null;
    }
  },
};
