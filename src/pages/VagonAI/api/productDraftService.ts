/**
 * Submits the guided add-product form to the gateway.
 *
 * The one network call the form makes, and deliberately not a chat turn: every
 * value on it was typed or tapped by the shipper, and the type id came from their
 * own catalog, so there is nothing for the model to work out. Sending it as a
 * message would spend a completion re-deriving decisions already made.
 *
 * This one EXECUTES. The form is the confirmation surface - nothing on it was
 * authored by the model - so a card restating it would ask the same question
 * twice. The duplicate-name and SKU-collision checks still run server-side and
 * still refuse.
 *
 * ## Three outcomes, and two of them are not errors
 *
 * A refusal for an incomplete form is a 200 with `ok: false`, not an error
 * status, because the request was understood and it is the FORM that is not
 * ready - and because a non-2xx is thrown by `gatewayFetch` with `missing[]`
 * discarded, which is the one field that can put the cursor back in the right
 * input.
 *
 * A rejection the core API itself raises - the shipper already has this product,
 * or the SKU code they typed is taken - is a 502, and it arrives here as a thrown
 * `GatewayError` whose message is the sentence to show them. That is not a bug
 * and not a `missing` entry: the field is filled in, it just collides with a
 * record the bundle could not see.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';
import type { ProductDraft } from '../createProductDraft';

export interface ProductAccepted {
  ok: true;
  /** The id a cargo line needs. Use it directly — do not look the product up again. */
  product_id: string;
  name: string;
  /** Whether the shipper supplied it or it was derived from the name. */
  sku_number: string | null;
  category: string | null;
  type: string | null;
  /** Set when no code was supplied and one was derived — worth showing. */
  generated_sku_number?: string;
  /** True when the derived code collided and had to be suffixed. */
  sku_number_adjusted?: boolean;
  /** Shipping details the product type supplied because the shipper left them blank. */
  inherited: string[];
  /** One pre-written sentence covering `inherited`, absent when nothing was. */
  inherited_message?: string;
}

export interface ProductBlocked {
  ok: false;
  /** Draft field paths — `missing[0]` is the input to focus. */
  missing: string[];
  reason: string;
}

export type ProductSubmitResponse = ProductAccepted | ProductBlocked;

export async function submitProductDraft(input: {
  conversationId: string;
  draft: ProductDraft;
  locale?: string;
}): Promise<ProductSubmitResponse> {
  const response = await gatewayFetch('/chat/product-draft', {
    method: 'POST',
    token: getStoredToken(),
    locale: input.locale,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: input.conversationId, draft: input.draft }),
  });

  return (await response.json()) as ProductSubmitResponse;
}
