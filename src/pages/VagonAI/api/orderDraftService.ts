/**
 * Submits the guided create-order form to the gateway.
 *
 * The one network call the form makes, and deliberately not a chat turn: every
 * value on it was typed or tapped by the shipper, the customer id came from their
 * own records and each product id from their own catalog, so there is nothing for
 * the model to work out. Sending it as a message would spend a completion
 * re-deriving decisions already made.
 *
 * This one EXECUTES. The form is the confirmation surface — nothing on it was
 * authored by the model — so a card restating it would ask the same question
 * twice. The duplicate-reference check and every `exists:` rule still run
 * server-side and still refuse.
 *
 * ## What is saved, and what is not
 *
 * An ORDER, in the shipper's Orders Master, with an unplanned status. No load is
 * built, nothing reaches a carrier and no price is committed. `order_id` and
 * `lines[].order_line_id` are what a load built from it later carries, which is
 * why they come back rather than only a success flag.
 *
 * ## Three outcomes, and two of them are not errors
 *
 * A refusal for an incomplete form is a 200 with `ok: false`, not an error
 * status, because the request was understood and it is the FORM that is not
 * ready — and because a non-2xx is thrown by `gatewayFetch` with `missing[]`
 * discarded, which is the one field that can put the cursor back in the right
 * input.
 *
 * A rejection the core API itself raises — the order ID is already in use — is a
 * 502, and it arrives here as a thrown `GatewayError` whose message is the
 * sentence to show them. That is not a bug and not a `missing` entry: the field
 * is filled in, it just collides with a record the bundle could not see.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';

export interface OrderAccepted {
  ok: true;
  /** MYVAGON's own id. This is what a cargo line carries as `order_id`. */
  order_id: string;
  /** The reference the shipper typed, echoed back from the saved record. */
  reference: string | null;
  customer_name: string | null;
  delivery_date: string | null;
  status: string | null;
  line_count: number;
  /** The other half of the ERP linkage — a load's cargo lines carry `order_line_id`. */
  lines: { order_line_id: string | null; product_id: string | null; product_name: string }[];
  /** A PATH — route it with navigate(), never treat it as an external URL. */
  order_url: string;
  /** Always false, and stated rather than implied. An order is not a load. */
  planned: false;
}

export interface OrderBlocked {
  ok: false;
  /** Draft field paths — `missing[0]` is the input to focus. */
  missing: string[];
  reason: string;
}

export type OrderSubmitResponse = OrderAccepted | OrderBlocked;

export async function submitOrderDraft(input: {
  conversationId: string;
  draft: Record<string, unknown>;
  locale?: string;
}): Promise<OrderSubmitResponse> {
  const response = await gatewayFetch('/chat/order-draft', {
    method: 'POST',
    token: getStoredToken(),
    locale: input.locale,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: input.conversationId, draft: input.draft }),
  });

  return (await response.json()) as OrderSubmitResponse;
}
