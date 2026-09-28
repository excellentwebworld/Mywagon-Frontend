/**
 * Fetches an add-product or add-address bundle on demand.
 *
 * This is what makes **Add new** work inside the create-shipment wizard. A product
 * the shipper cannot find, or a stop that is not in their Address Book, is a dead
 * end on those pickers — and the forms that fix it need a category catalog and a
 * company list that the shipment bundle does not carry.
 *
 * The tempting alternative is to send a chat message so the assistant calls the
 * context tool. That is the one thing that must not happen: it spends a completion
 * to fetch a list, drops a stray turn into the transcript, and breaks the rule the
 * guided flows exist for — no `/chat` call while a flow is open. It would also put
 * the model's commentary about products underneath a wizard the shipper is still
 * using.
 *
 * So this is a plain authenticated read against `GET /chat/flow-context/:flow`.
 * The response carries exactly the shape the `flow_context` SSE event delivers, so
 * the same form component renders either way.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';
import type { LocationFlowBundle, ProductFlowBundle } from '../../../hooks/useChat';

export type SubFlowBundle =
  | { flow: 'create_product'; bundle: ProductFlowBundle }
  | { flow: 'create_location'; bundle: LocationFlowBundle };

export async function fetchFlowContext(
  kind: 'product' | 'location',
  locale?: string,
): Promise<SubFlowBundle> {
  const response = await gatewayFetch(`/chat/flow-context/${kind}`, {
    method: 'GET',
    token: getStoredToken(),
    locale,
  });

  return (await response.json()) as SubFlowBundle;
}
