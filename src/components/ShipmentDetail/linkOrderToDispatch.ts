/**
 * MS3-406 — "Order required before dispatch".
 *
 * A load can be published and receive bids without an order, but Laravel refuses
 * to dispatch it (accept an offer / counter / book a truck) until an order is
 * linked: HTTP 422 with `data.code = "order_required_for_dispatch"`. The shipper
 * then links an existing order or types a new order number
 * (POST shipments/{id}/link-order) and the dispatch is retried in place.
 */

export const ORDER_REQUIRED_FOR_DISPATCH = 'order_required_for_dispatch';
export const ORDER_REFERENCE_IN_USE = 'order_reference_in_use';
export const ORDER_NOT_AVAILABLE = 'order_not_available';
export const ORDER_ALREADY_LINKED = 'order_already_linked';
export const SHIPMENT_NOT_LINKABLE = 'shipment_not_linkable';

export const ORDER_NUMBER_MAX_LENGTH = 100;

type ErrorLike = { status?: unknown; data?: unknown; message?: unknown } | null | undefined;

/** `data.code` of an ApiError (the Laravel envelope puts machine codes there). */
export function apiErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const data = (err as ErrorLike)?.data;
  if (data && typeof data === 'object') {
    const code = (data as { code?: unknown }).code;
    if (typeof code === 'string' && code) return code;
  }
  return null;
}

/** True when a dispatch attempt was refused because the load has no order. */
export function isOrderRequiredForDispatchError(err: unknown): boolean {
  return apiErrorCode(err) === ORDER_REQUIRED_FOR_DISPATCH;
}

/** Pre-check from the list/detail payload (`order_required_for_dispatch`). */
export function shipmentNeedsOrderBeforeDispatch(
  shipment: { orderRequiredForDispatch?: boolean | null } | null | undefined
): boolean {
  return shipment?.orderRequiredForDispatch === true;
}

export interface ExistingOrderHint {
  id: number;
  label: string;
  available: boolean;
}

export type LinkOrderFailure =
  | { kind: 'reference_in_use'; existing: ExistingOrderHint | null }
  | { kind: 'not_available' }
  | { kind: 'already_linked' }
  | { kind: 'not_linkable' }
  | { kind: 'other'; message: string | null };

/** Classify a failed POST shipments/{id}/link-order. */
export function classifyLinkOrderError(err: unknown): LinkOrderFailure {
  const code = apiErrorCode(err);
  if (code === ORDER_REFERENCE_IN_USE) {
    const data = (err as { data?: { existing_order?: unknown } }).data;
    const raw = data?.existing_order as
      | { id?: unknown; order_reference?: unknown; available?: unknown }
      | undefined;
    const id = Number(raw?.id);
    const existing =
      raw && Number.isFinite(id) && id > 0
        ? {
            id,
            label: orderLabel({ id, order_reference: raw.order_reference as string | null }),
            available: raw.available === true,
          }
        : null;
    return { kind: 'reference_in_use', existing };
  }
  if (code === ORDER_NOT_AVAILABLE) return { kind: 'not_available' };
  if (code === ORDER_ALREADY_LINKED) return { kind: 'already_linked' };
  if (code === SHIPMENT_NOT_LINKABLE) return { kind: 'not_linkable' };
  const message =
    err && typeof err === 'object' && typeof (err as ErrorLike)?.message === 'string'
      ? ((err as { message: string }).message || null)
      : null;
  return { kind: 'other', message };
}

/** Order number, or "#<id>" for an order created without one (MS3-403). */
export function orderLabel(order: {
  id: number | string;
  order_reference?: string | null;
  display_reference?: string | null;
}): string {
  const ref = String(order.order_reference ?? '').trim();
  if (ref) return ref;
  const display = String(order.display_reference ?? '').trim();
  if (display) return display;
  return `#${order.id}`;
}

/** Normalised new order number, or null when it cannot be submitted. */
export function normalizeNewOrderNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > ORDER_NUMBER_MAX_LENGTH) return null;
  return trimmed;
}

export type LinkOrderRequest =
  | { erp_order_id: number }
  | { order_reference: string; customer_name?: string };

export function buildLinkOrderRequest(
  input:
    | { mode: 'existing'; orderId: number | null }
    | { mode: 'new'; orderNumber: string; customerName?: string }
): LinkOrderRequest | null {
  if (input.mode === 'existing') {
    return input.orderId && input.orderId > 0 ? { erp_order_id: input.orderId } : null;
  }
  const reference = normalizeNewOrderNumber(input.orderNumber);
  if (!reference) return null;
  const customer = (input.customerName ?? '').trim();
  return customer ? { order_reference: reference, customer_name: customer } : { order_reference: reference };
}
