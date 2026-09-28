/**
 * Submits the guided add-address form to the gateway.
 *
 * Executes rather than proposing, like the product form: nothing on it was authored
 * by the model — the coordinates came from a map pick and the VAT from the shipper's
 * own Address Book — so a confirmation card would restate a form they are looking at.
 *
 * The duplicate check (site name + company) and the VAT resolution both still run
 * server-side. A rejection from either arrives as a **502** thrown by
 * `gatewayFetch`, whose message is the sentence to show; an incomplete form is a
 * **200** with `ok: false` and a `missing[]` that names the input to focus.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';

export interface LocationAccepted {
  ok: true;
  /** The id a shipment stop needs. Use it directly — do not look the site up again. */
  location_id: string;
  name: string;
  company: string | null;
  city: string | null;
  address: string | null;
  /** 'pickup', 'delivery' or 'both'. */
  usable_for: string;
  /** Values the API demands that were filled in permissively — show these. */
  defaults_applied: string[];
  defaults_message?: string;
}

export interface LocationBlocked {
  ok: false;
  missing: string[];
  reason: string;
}

export type LocationSubmitResponse = LocationAccepted | LocationBlocked;

export async function submitLocationDraft(input: {
  conversationId: string;
  draft: Record<string, unknown>;
  locale?: string;
}): Promise<LocationSubmitResponse> {
  const response = await gatewayFetch('/chat/location-draft', {
    method: 'POST',
    token: getStoredToken(),
    locale: input.locale,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: input.conversationId, draft: input.draft }),
  });

  return (await response.json()) as LocationSubmitResponse;
}
