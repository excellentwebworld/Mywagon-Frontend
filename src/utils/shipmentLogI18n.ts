/** Normalize and translate shipment / audit log action labels from API English. */

type TFn = (key: string, fallback?: string) => string;

function cleanActionText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHead(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Exact / head phrase → [localeKey, English fallback] */
const ACTION_MAP: Record<string, [string, string]> = {
  'shipment created': ['auditShipmentCreated', 'Shipment Created'],
  'create shipment': ['auditShipmentCreated', 'Shipment Created'],
  'mark as paid': ['auditMarkAsPaid', 'Mark As Paid'],
  'rating': ['auditRating', 'Rating'],
  'shipment completed': ['auditShipmentCompleted', 'Shipment Completed'],
  'status changed': ['auditStatusChanged', 'Status Changed'],
  'pod uploaded': ['auditPodUploaded', 'POD Uploaded'],
  'accept shipment': ['auditAcceptShipment', 'Accept Shipment'],
  'shipment edit requested': ['auditShipmentEditRequested', 'Shipment Edit Requested'],
  'shipment edit applied': ['auditShipmentEditApplied', 'Shipment Edit Applied'],
  'bid accepted': ['auditBidAccepted', 'Bid Accepted'],
  'create bid': ['auditCreateBid', 'Create Bid'],
  'bid received': ['auditBidReceived', 'Bid Received'],
  'bid placed': ['auditBidPlaced', 'Bid Placed'],
  'offer accepted': ['auditOfferAccepted', 'Offer Accepted'],
  'offer placed': ['auditOfferPlaced', 'Offer Placed'],
  'offer rejected': ['auditOfferRejected', 'Offer Rejected'],
  'counter offer': ['auditCounterOffer', 'Counter Offer'],
  'arrived at location': ['auditArrivedAtLocation', 'Arrived At Location'],
  'complete pickup': ['auditCompletePickup', 'Complete Pickup'],
  'complete dropoff': ['auditCompleteDropoff', 'Complete Dropoff'],
  'complete drop-off': ['auditCompleteDropoff', 'Complete Dropoff'],
  'start trip': ['auditStartTrip', 'Start Trip'],
  'cancel shipment': ['auditCancelShipment', 'Cancel Shipment'],
  'tracking links updated': ['auditTrackingLinksUpdated', 'Tracking Links Updated'],
};

export function translateShipmentLogAction(action: string | null | undefined, t: TFn): string {
  const raw = cleanActionText(action);
  if (!raw) return '';

  const colonIdx = raw.search(/[:：]/);
  const head = colonIdx >= 0 ? raw.slice(0, colonIdx).trim() : raw;
  const tail = colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : '';
  const mapped = ACTION_MAP[normalizeHead(head)];
  if (mapped) {
    const label = t(mapped[0], mapped[1]);
    return tail ? `${label}: ${tail}` : label;
  }

  // Fallback: try full string
  const full = ACTION_MAP[normalizeHead(raw)];
  if (full) return t(full[0], full[1]);

  return raw;
}

/** Map cargo qty/weight unit codes to localized labels. */
export function translateCargoUnit(unit: string | null | undefined, t: TFn): string {
  const raw = String(unit || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  const map: Record<string, [string, string]> = {
    'eur pallets': ['constants.eur_pallets', 'EUR Pallets'],
    'eur pallet': ['constants.eur_pallets', 'EUR Pallets'],
    'us pallets': ['constants.us_pallets', 'US Pallets'],
    'us pallet': ['constants.us_pallets', 'US Pallets'],
    'big bags': ['constants.big_bags', 'Big Bags'],
    'big bag': ['constants.big_bags', 'Big Bags'],
    tonnes: ['constants.tonnes', 'Tonnes'],
    tonne: ['constants.tonnes', 'Tonnes'],
    tons: ['constants.tonnes', 'Tonnes'],
    ton: ['constants.tonnes', 'Tonnes'],
    t: ['constants.tonnes', 'Tonnes'],
    kgs: ['constants.kgs', 'Kgs'],
    kg: ['constants.kgs', 'Kgs'],
    kilos: ['constants.kgs', 'Kgs'],
    κιλά: ['constants.kgs', 'Kgs'],
  };

  const hit = map[key];
  if (hit) return t(hit[0], hit[1]);
  return raw;
}
