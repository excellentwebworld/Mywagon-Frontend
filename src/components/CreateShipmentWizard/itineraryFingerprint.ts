import type { ApiStop } from '../../api/types/createShipment';

export function computeItineraryFingerprint(stops: ApiStop[] | undefined): string {
  const payload = (stops || []).map((stop, index) => ({
    i: index,
    locationId: stop.locationId || '',
    dateFrom: stop.dateFrom || '',
    timeFrom: stop.timeFrom || '',
    dateTo: stop.dateTo || '',
    timeTo: stop.timeTo || '',
    appointmentMode: stop.appointmentMode || 'fixed',
    windowStart: stop.windowStart || '',
    windowEnd: stop.windowEnd || '',
    lines: (stop.lines || []).map((line) => ({
      action: line.action || 'pickup',
      productId: line.productId || '',
      customerId: line.customerId || '',
      orderId: line.orderId || '',
      qty: String(line.qty ?? ''),
      unit: line.unit || '',
      weight: String(line.weight ?? ''),
      wtUnit: line.wtUnit || '',
    })),
  }));

  return JSON.stringify(payload);
}

export function itineraryMatchesSnapshot(
  stops: ApiStop[] | undefined,
  snapshot: string | undefined
): boolean {
  if (!snapshot) return false;
  return computeItineraryFingerprint(stops) === snapshot;
}
