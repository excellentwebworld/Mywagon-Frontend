/** Fired after a draft is published so lists and detail re-read carrier state. */
export const SHIPMENT_PUBLISHED_EVENT = 'shipper:shipment-published';

export interface ShipmentPublishedDetail {
  shipmentId?: string | number | null;
}

export function notifyShipmentPublished(detail: ShipmentPublishedDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SHIPMENT_PUBLISHED_EVENT, { detail }));
}

/**
 * Private loads just posted often come back before invitees are visible.
 * A few refetches cover that lag; a public load or one that already lists
 * carriers is left alone.
 */
export function privateLoadMissingCarriers(shipment: {
  status?: string | null;
  vis?: string | null;
  channel?: string | null;
  invitees?: unknown[] | null;
  offers?: unknown[] | null;
  invited?: number | null;
}): boolean {
  const status = shipment.status || '';
  const open =
    status === 'pending' || status === 'scheduled' || status === 'ready' || status === 'upcoming';
  const isPrivate = shipment.vis === 'private' || shipment.channel === 'private';
  const carriers =
    (shipment.invitees?.length ?? 0) +
    (shipment.offers?.length ?? 0) +
    (Number(shipment.invited) || 0);
  return open && isPrivate && carriers === 0;
}