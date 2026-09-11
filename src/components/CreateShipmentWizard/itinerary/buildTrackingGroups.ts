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
}

export interface TrackingGroupsResult {
  groups: Record<string, TrackingOrderItem[]>;
  ungrouped: TrackingOrderItem[];
  isEmpty: boolean;
}

export function buildTrackingGroups(
  stops: ApiStop[],
  locations: LocationItem[]
): TrackingGroupsResult {
  const enriched = enrichStops(stops, locations);
  const orderRouteMap = new Map<
    string,
    {
      orderId?: string;
      orderRef?: string;
      customerName?: string;
      pickupCity?: string;
      dropoffCity?: string;
      dropoffLocation?: string;
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
        });
      }
      const entry = orderRouteMap.get(key)!;
      if (line.customerName && !entry.customerName) {
        entry.customerName = line.customerName;
      }
      if (line.orderRef && !entry.orderRef) {
        entry.orderRef = line.orderRef;
      }
      if (line.action === 'pickup') {
        if (!entry.pickupCity) entry.pickupCity = city;
      }
      if (line.action === 'dropoff') {
        if (!entry.dropoffCity) entry.dropoffCity = city;
        if (!entry.dropoffLocation) entry.dropoffLocation = locLabel || city;
      }
    });
  });

  const groups: Record<string, TrackingOrderItem[]> = {};
  const ungrouped: TrackingOrderItem[] = [];

  orderRouteMap.forEach((entry, key) => {
    const route =
      entry.pickupCity && entry.dropoffCity
        ? `${entry.pickupCity} → ${entry.dropoffCity}`
        : entry.pickupCity || entry.dropoffCity || '—';

    const item: TrackingOrderItem = {
      orderId: entry.orderId || key,
      orderRef: entry.orderRef || key,
      route,
      location: entry.dropoffLocation || '—',
      customerName: entry.customerName || '',
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
