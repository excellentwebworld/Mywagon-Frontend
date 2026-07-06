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
    { pickupCity?: string; dropoffCity?: string; dropoffLocation?: string }
  >();

  stops.forEach((stop, stopIndex) => {
    const city = enriched[stopIndex]?.resolvedCity || stop.locationCity || '';
    const locLabel = [enriched[stopIndex]?.resolvedName, city].filter(Boolean).join(', ');
    (stop.lines || []).forEach((line) => {
      const key = orderKey(line);
      if (!key) return;
      if (!orderRouteMap.has(key)) {
        orderRouteMap.set(key, {});
      }
      const entry = orderRouteMap.get(key)!;
      if (line.action === 'pickup' && !entry.pickupCity) {
        entry.pickupCity = city;
      }
      if (line.action === 'dropoff') {
        entry.dropoffCity = city;
        entry.dropoffLocation = locLabel || city;
      }
    });
  });

  const resolveDefaultEmail = (line: NonNullable<ApiStop['lines']>[number], orderIdKey: string): string | undefined => {
    if (line.customerId && emailLookup.byCustomerId?.[String(line.customerId)]) {
      return emailLookup.byCustomerId[String(line.customerId)];
    }
    if (line.orderId && emailLookup.byOrderId?.[String(line.orderId)]) {
      return emailLookup.byOrderId[String(line.orderId)];
    }
    if (emailLookup.byOrderId?.[orderIdKey]) {
      return emailLookup.byOrderId[orderIdKey];
    }
    return undefined;
  };

  const groups: Record<string, TrackingOrderItem[]> = {};
  const ungrouped: TrackingOrderItem[] = [];

  stops.forEach((stop, stopIndex) => {
    const enrichedStop = enriched[stopIndex];
    const locLabel = [enrichedStop.resolvedName, enrichedStop.resolvedCity].filter(Boolean).join(', ');

    (stop.lines || []).forEach((line) => {
      if (!line.productId) return;
      const key = orderKey(line);
      if (!key) return;

      const routeEntry = orderRouteMap.get(key) || {};
      const route =
        routeEntry.pickupCity && routeEntry.dropoffCity
          ? `${routeEntry.pickupCity} → ${routeEntry.dropoffCity}`
          : routeEntry.pickupCity || routeEntry.dropoffCity || '—';

      const item: TrackingOrderItem = {
        orderId: line.orderId ? String(line.orderId) : key,
        orderRef: line.orderRef || key,
        route,
        location: routeEntry.dropoffLocation || locLabel || '—',
        customerName: line.customerName || '',
        defaultEmail: resolveDefaultEmail(line, line.orderId ? String(line.orderId) : key),
      };

      const customerKey = line.customerName?.trim() || '__none__';
      if (customerKey === '__none__') {
        if (!ungrouped.some((x) => x.orderId === item.orderId)) {
          ungrouped.push(item);
        }
      } else if (!groups[customerKey]?.some((x) => x.orderId === item.orderId)) {
        if (!groups[customerKey]) {
          groups[customerKey] = [];
        }
        groups[customerKey].push(item);
      }
    });
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
