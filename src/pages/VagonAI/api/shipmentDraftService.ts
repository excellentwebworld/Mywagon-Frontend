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
import { gatewayFetch } from '../../../api/chatGatewayUrl';
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

export type DraftSubmitResponse = DraftAccepted | DraftBlocked;

export async function submitShipmentDraft(input: {
  conversationId: string;
  intent: 'save_draft' | 'publish';
  draft: ShipmentDraft;
  routeSummary?: { total_dist_km: number; total_drive_min?: number };
  locale?: string;
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
    }),
  });

  return (await response.json()) as DraftSubmitResponse;
}
