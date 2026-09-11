import type { ApiStop } from '../../../api/types/createShipment';
import type { LocationItem } from '../../../context/AppContext';
import { enrichStops } from './stopEnrichment';
import { groupStopLinesByCustomer } from './stopGrouping';
import type { EnrichedStop } from './types';

export interface TrackingOrderItem {
  orderId: string;
  orderRef: string;
  route: string;
  location: string;
  customerName: string;
  defaultEmail?: string;
}

export interface TrackingGroupsResult {
  groups: Record<string, TrackingOrderItem[]>;
  ungrouped: TrackingOrderItem[];
  isEmpty: boolean;
}

export function buildTrackingGroups(
  stops: ApiStop[],
  locations: LocationItem[],
  emailLookup: {
    byCustomerId?: Record<string, string>;
    byOrderId?: Record<string, string>;
  } = {}
): TrackingGroupsResult {
  const enriched = enrichStops(stops, locations);
  const orderRouteMap = new Map<
    string,
    {
      orderId?: string;
      orderRef?: string;
      customerId?: string;
      customerName?: string;
      pickupCity?: string;
      dropoffCity?: string;
      dropoffLocation?: string;
      pickupStopIndex?: number;
      dropoffStopIndex?: number;
      fallbackStopIndex?: number;
    }
  >();

  stops.forEach((stop, stopIndex) => {
    const city = enriched[stopIndex]?.resolvedCity || stop.locationCity || '';
    const locLabel = [enriched[stopIndex]?.resolvedName, city].filter(Boolean).join(', ');
    (stop.lines || []).forEach((line) => {
      const key = orderKey(line);
      if (!key) return;
      if (!orderRouteMap.has(key)) {
        orderRouteMap.set(key, {
          orderId: line.orderId ? String(line.orderId) : key,
          orderRef: line.orderRef || key,
          fallbackStopIndex: stopIndex,
        });
      }
      const entry = orderRouteMap.get(key)!;
      if (line.customerId && !entry.customerId) {
        entry.customerId = String(line.customerId);
      }
      if (line.customerName && !entry.customerName) {
        entry.customerName = line.customerName;
      }
      if (line.orderRef && !entry.orderRef) {
        entry.orderRef = line.orderRef;
      }
      if (line.action === 'pickup') {
        if (!entry.pickupCity) entry.pickupCity = city;
        if (entry.pickupStopIndex === undefined) entry.pickupStopIndex = stopIndex;
      }
      if (line.action === 'dropoff') {
        if (!entry.dropoffCity) entry.dropoffCity = city;
        if (!entry.dropoffLocation) entry.dropoffLocation = locLabel || city;
        if (entry.dropoffStopIndex === undefined) entry.dropoffStopIndex = stopIndex;
      }
    });
  });

  const resolveDefaultEmail = (
    orderKey: string,
    entry: {
      customerId?: string;
      customerName?: string;
      orderId?: string;
      orderRef?: string;
      pickupStopIndex?: number;
      dropoffStopIndex?: number;
      fallbackStopIndex?: number;
    }
  ): string | undefined => {
    // 1. Direct match by customerId
    if (entry.customerId && emailLookup.byCustomerId?.[String(entry.customerId)]) {
      return emailLookup.byCustomerId[String(entry.customerId)];
    }

    // 2. Direct match by customerName (exact and lowercased)
    if (entry.customerName) {
      const trimmed = entry.customerName.trim();
      if (emailLookup.byCustomerId?.[trimmed]) {
        return emailLookup.byCustomerId[trimmed];
      }
      if (emailLookup.byCustomerId?.[trimmed.toLowerCase()]) {
        return emailLookup.byCustomerId[trimmed.toLowerCase()];
      }
    }

    // 3. Match by orderId / orderKey / orderRef
    if (entry.orderId && emailLookup.byOrderId?.[String(entry.orderId)]) {
      return emailLookup.byOrderId[String(entry.orderId)];
    }
    if (emailLookup.byOrderId?.[orderKey]) {
      return emailLookup.byOrderId[orderKey];
    }
    if (entry.orderRef && emailLookup.byOrderId?.[entry.orderRef]) {
      return emailLookup.byOrderId[entry.orderRef];
    }

    // 4. Dropoff location contact email from Address Book
    const targetStopIndex = entry.dropoffStopIndex ?? entry.fallbackStopIndex ?? entry.pickupStopIndex;
    if (targetStopIndex !== undefined && stops[targetStopIndex]) {
      const stopLocId = stops[targetStopIndex].locationId;
      const matchedLoc = locations.find((l) => String(l.id) === String(stopLocId));
      if (matchedLoc) {
        const contactEmail = matchedLoc.contacts?.find((c) => c.email?.trim())?.email;
        if (contactEmail?.trim()) return contactEmail.trim();
        if ((matchedLoc as any).email?.trim()) return (matchedLoc as any).email.trim();
      }
    }

    // 5. Pickup location contact email as fallback
    if (entry.pickupStopIndex !== undefined && entry.pickupStopIndex !== targetStopIndex && stops[entry.pickupStopIndex]) {
      const pickupLocId = stops[entry.pickupStopIndex].locationId;
      const matchedLoc = locations.find((l) => String(l.id) === String(pickupLocId));
      if (matchedLoc) {
        const contactEmail = matchedLoc.contacts?.find((c) => c.email?.trim())?.email;
        if (contactEmail?.trim()) return contactEmail.trim();
        if ((matchedLoc as any).email?.trim()) return (matchedLoc as any).email.trim();
      }
    }

    // 6. Name match in Address Book locations
    if (entry.customerName) {
      const custNorm = entry.customerName.trim().toLowerCase();
      const matchedLoc = locations.find(
        (l) =>
          (l.company && l.company.trim().toLowerCase() === custNorm) ||
          (l.name && l.name.trim().toLowerCase() === custNorm)
      );
      if (matchedLoc) {
        const contactEmail = matchedLoc.contacts?.find((c) => c.email?.trim())?.email;
        if (contactEmail?.trim()) return contactEmail.trim();
        if ((matchedLoc as any).email?.trim()) return (matchedLoc as any).email.trim();
      }
    }

    return undefined;
  };

  const groups: Record<string, TrackingOrderItem[]> = {};
  const ungrouped: TrackingOrderItem[] = [];

  orderRouteMap.forEach((entry, key) => {
    const route =
      entry.pickupCity && entry.dropoffCity
        ? `${entry.pickupCity} → ${entry.dropoffCity}`
        : entry.pickupCity || entry.dropoffCity || '—';

    const defaultEmail = resolveDefaultEmail(key, entry);

    const item: TrackingOrderItem = {
      orderId: entry.orderId || key,
      orderRef: entry.orderRef || key,
      route,
      location: entry.dropoffLocation || '—',
      customerName: entry.customerName || '',
      defaultEmail,
    };

    const customerKey = entry.customerName?.trim() || '__none__';
    if (customerKey === '__none__') {
      ungrouped.push(item);
    } else {
      if (!groups[customerKey]) {
        groups[customerKey] = [];
      }
      groups[customerKey].push(item);
    }
  });

  return {
    groups,
    ungrouped,
    isEmpty: Object.keys(groups).length === 0 && ungrouped.length === 0,
  };
}

export function buildStopSummaryLabels(
  stop: ApiStop,
  enrichedStop: EnrichedStop
): { orderRefs: string; customers: string[] } {
  const customerGroups = groupStopLinesByCustomer(stop);
  const orderRefs = new Set<string>();
  const customers: string[] = [];

  customerGroups.forEach((group) => {
    if (group.name) {
      customers.push(group.name);
    }
    group.orders.forEach((order) => {
      orderRefs.add(order.orderRef || order.orderId || '—');
    });
  });

  if (customers.length === 0 && enrichedStop.customers.length > 0) {
    enrichedStop.customers.forEach((c) => {
      if (c.name) customers.push(c.name);
    });
  }

  return {
    orderRefs: [...orderRefs].join(', ') || '—',
    customers,
  };
}

function orderKey(line: NonNullable<ApiStop['lines']>[number]): string | null {
  if (line.orderId) return String(line.orderId);
  if (line.orderRef) return line.orderRef;
  return null;
}
