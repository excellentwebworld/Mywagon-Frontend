/**
 * Submits the guided flow's finished draft to the gateway.
 *
 * The one network call the card sequence makes, and it is deliberately not a
 * chat turn: every value in the draft was chosen by the shipper off cards built
 * from their own records, so there is nothing for the model to work out. Sending
 * it as a message would spend a completion re-deriving decisions already made.
 *
 * This one EXECUTES. The flow's preview card is the confirmation surface — a
 * full recap of a load the shipper assembled by tapping, which they pressed
 * Publish on — so a second card restating it would ask the same question twice.
 * The gate still runs server-side and still refuses; only the extra tap is gone.
 *
 * A publish is two core-API calls behind one request: `publish_shipment` needs a
 * `draft_id` that only exists once a draft has been created. `routeSummary` is
 * measured by the browser first, because nothing server-side can compute it and
 * MYVAGON refuses to publish a load without a road distance.
 *
 * A refusal is a 200 with `ok: false`, not an error status, because the request
 * was understood and it is the load that is not ready — and because a non-2xx
 * would be thrown by `gatewayFetch` with `missing[]` discarded, which is the one
 * field that can route the shipper back to the right card.
 */
import { getStoredToken } from '../../../api/client';
import { GatewayError, gatewayFetch } from '../../../api/chatGatewayUrl';
import { userFacingError } from '../../../utils/userFacingError';
import type { ShipmentDraft } from '../createShipmentDraft';

export interface DraftAccepted {
  ok: true;
  /** 'draft' stopped after creating it; 'published' went all the way to the market. */
  outcome: 'draft' | 'published';
  draft_id: number;
  /** The SID the shipper sees, e.g. "SID-4821". */
  auto_id: string;
  /** Where to send them next — an in-app path resolved server-side. */
  url: string;
  status?: string;
  channel?: 'private' | 'public';
  warnings: string[];
  /** Values the shipper set that MYVAGON cannot accept yet — show these. */
  unsupported: string[];
}

export interface DraftBlocked {
  ok: false;
  /** Draft field paths, ordered the way the cards ask — `missing[0]` is the earliest gap. */
  missing: string[];
  reason: string;
  warnings: string[];
}

/**
 * BL-17 — the publish timed out and the gateway could not confirm what happened.
 *
 * Neither a success nor a plain failure: the load may be live. `message` tells the
 * shipper to check Manage Shipments before trying again, so the card shows it and
 * offers no one-click republish (that is how a live load gets posted twice).
 */
export interface DraftUnknown {
  ok: boolean;
  outcome: 'unknown';
  message?: string;
  reason?: string;
  draft_id?: number | null;
  auto_id?: string | null;
  url?: string | null;
  warnings?: string[];
}

export type DraftSubmitResponse = DraftAccepted | DraftBlocked | DraftUnknown;

export function isUnknownOutcome(result: DraftSubmitResponse): result is DraftUnknown {
  return (result as { outcome?: unknown }).outcome === 'unknown';
}

/**
 * BL-04 — one id per card submission lifecycle, sent as `run_id`.
 *
 * The gateway reserves per (user, run_id, kind), so the card makes this once on
 * its first submit and reuses it for every retry of the same card - a double
 * click, a network retry, or save-then-publish - and a duplicate is replayed or
 * refused (409) instead of creating a second load.
 */
export function newDraftRunId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Non-secure context (plain-http LAN host): randomUUID is absent there.
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The sentence for a thrown draft-submit failure (all four draft endpoints).
 *
 * A 409 is the gateway saying the same `run_id` is already in progress - the
 * first tap is still being worked on. Its message is shown as written, never
 * re-worded as a network/timeout "try again", and nothing retries it: a retry
 * is exactly the duplicate the run id exists to stop.
 */
export function draftSubmitErrorReason(
  err: unknown,
  t: (key: string, fallback?: string) => string,
): string {
  if (err instanceof GatewayError && err.status === 409) {
    return err.message?.trim() || t('vagonai.live.alreadyInProgress', 'This is already being saved. Wait a moment, then check before trying again.');
  }
  return userFacingError(err, t, t('vagonai.live.error'));
}

/** Lazily mints the card's run id on first use and returns the same one after. */
export function ensureDraftRunId(ref: { current: string | null }): string {
  if (!ref.current) ref.current = newDraftRunId();
  return ref.current;
}

export async function submitShipmentDraft(input: {
  conversationId: string;
  intent: 'save_draft' | 'publish';
  draft: ShipmentDraft;
  routeSummary?: { total_dist_km: number; total_drive_min?: number };
  locale?: string;
  /** BL-04: the card's run id, reused on every retry of the same card. */
  runId?: string;
}): Promise<DraftSubmitResponse> {
  const response = await gatewayFetch('/chat/shipment-draft', {
    method: 'POST',
    token: getStoredToken(),
    locale: input.locale,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: input.conversationId,
      intent: input.intent,
      draft: input.draft,
      ...(input.routeSummary ? { route_summary: input.routeSummary } : {}),
      ...(input.runId ? { run_id: input.runId } : {}),
    }),
  });

  return (await response.json()) as DraftSubmitResponse;
}
