import type { LocationItem } from '../../../context/AppContext';
import type { ApiStop } from '../../../api/types/createShipment';
import type { EnrichedStop } from './types';

export function enrichStop(stop: ApiStop, location?: LocationItem): EnrichedStop {
  const lines = stop.lines || [];
  const hasPickup = lines.some((l) => l.action === 'pickup');
  const hasDropoff = lines.some((l) => l.action === 'dropoff');

  const customerMap = new Map<string, { name: string; orderId?: string; orderRef?: string }>();
  lines.forEach((ln) => {
    if (!ln.customerName) return;
    const key = ln.customerName;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: ln.customerName,
        orderId: ln.orderId ? String(ln.orderId) : undefined,
        orderRef: ln.orderRef ? String(ln.orderRef) : undefined,
      });
    }
  });

  return {
    ...stop,
    id: stop.id || '',
    lines,
    resolvedName: location?.name || stop.locationName || 'Unknown Location',
    resolvedCity: location?.city || stop.locationCity || '',
    resolvedCompany: location?.company || stop.locationCompany || '',
    resolvedAddress: location?.address || stop.locationName || '',
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    hasPickup,
    hasDropoff,
    customers: [...customerMap.values()],
  };
}

export function enrichStops(stops: ApiStop[], locations: LocationItem[]): EnrichedStop[] {
  return stops.map((stop) => {
    const loc = locations.find((l) => String(l.id) === String(stop.locationId));
    return enrichStop(stop, loc);
  });
}
