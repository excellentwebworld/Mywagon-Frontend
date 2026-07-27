import type { ApiStop } from '../../../api/types/createShipment';
import { weightToKg } from '../../../constants/cargoUnits';
import { formatDisplayDate, formatDisplayTime } from '../../../utils/dateDisplay';
import type { EnrichedStop } from './types';

export interface CustomerOrderGroup {
  orderId: string;
  orderRef: string;
  lines: NonNullable<ApiStop['lines']>;
}

export interface CustomerGroup {
  name: string;
  orders: CustomerOrderGroup[];
}

export interface OrderCardItem {
  orderId: string;
  orderRef: string;
  customerName: string;
  routeLabel: string;
  weightKg: number;
}

export interface OrderCardCustomerGroup {
  customerName: string;
  totalWeightKg: number;
  orders: OrderCardItem[];
}

const UNGROUPED = '__ungrouped__';

export function groupStopLinesByCustomer(stop: ApiStop): CustomerGroup[] {
  const customerMap = new Map<string, Map<string, CustomerOrderGroup>>();

  (stop.lines || []).forEach((line) => {
    if (!line.productId && !line.orderId) return;
    const customerKey = line.customerName?.trim() || UNGROUPED;
    const orderKey = line.orderId ? String(line.orderId) : line.orderRef || 'unknown';

    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, new Map());
    }
    const orderMap = customerMap.get(customerKey)!;
    if (!orderMap.has(orderKey)) {
      orderMap.set(orderKey, {
        orderId: line.orderId ? String(line.orderId) : '',
        orderRef: line.orderRef || line.orderId || '—',
        lines: [],
      });
    }
    orderMap.get(orderKey)!.lines.push(line);
  });

  return [...customerMap.entries()].map(([name, orderMap]) => ({
    name: name === UNGROUPED ? '' : name,
    orders: [...orderMap.values()],
  }));
}

export function buildOrdersCardData(stops: ApiStop[], enrichedStops: EnrichedStop[]): OrderCardCustomerGroup[] {
  const orderMap = new Map<
    string,
    {
      orderId: string;
      orderRef: string;
      customerName: string;
      weightKg: number;
      pickupIdx: number | null;
      dropoffIdx: number | null;
    }
  >();

  stops.forEach((stop, stopIndex) => {
    (stop.lines || []).forEach((line) => {
      if (!line.orderId) return;
      const key = String(line.orderId);
      if (!orderMap.has(key)) {
        orderMap.set(key, {
          orderId: key,
          orderRef: line.orderRef || key,
          customerName: line.customerName || '',
          weightKg: 0,
          pickupIdx: null,
          dropoffIdx: null,
        });
      }
      const entry = orderMap.get(key)!;
      if (line.action === 'pickup' && entry.pickupIdx === null) {
        entry.pickupIdx = stopIndex;
      }
      if (line.action === 'dropoff') {
        entry.dropoffIdx = stopIndex;
      }
      if (line.action === 'pickup') {
        entry.weightKg += weightToKg(line.weight, line.wtUnit);
      }
    });
  });

  const cityAt = (idx: number | null) => {
    if (idx === null || !enrichedStops[idx]) return '—';
    return enrichedStops[idx].resolvedCity || enrichedStops[idx].resolvedName.split(' ')[0] || `#${idx + 1}`;
  };

  const customerGroups = new Map<string, OrderCardItem[]>();

  orderMap.forEach((entry) => {
    const customerKey = entry.customerName.trim() || UNGROUPED;
    const item: OrderCardItem = {
      orderId: entry.orderId,
      orderRef: entry.orderRef,
      customerName: entry.customerName,
      routeLabel: `${cityAt(entry.pickupIdx)} → ${cityAt(entry.dropoffIdx)}`,
      weightKg: entry.weightKg,
    };
    if (!customerGroups.has(customerKey)) {
      customerGroups.set(customerKey, []);
    }
    customerGroups.get(customerKey)!.push(item);
  });

  return [...customerGroups.entries()].map(([customerName, orders]) => ({
    customerName: customerName === UNGROUPED ? '' : customerName,
    totalWeightKg: orders.reduce((sum, o) => sum + o.weightKg, 0),
    orders,
  }));
}

export function getStopBadgeType(stop: EnrichedStop): 'pickup' | 'delivery' {
  if (stop.hasPickup && !stop.hasDropoff) return 'pickup';
  if (stop.hasDropoff && !stop.hasPickup) return 'delivery';
  return stop.hasPickup ? 'pickup' : 'delivery';
}

export function formatStopDateTime(stop: ApiStop): string {
  if (!stop.dateFrom) return '—';
  if (stop.timeFrom && stop.timeTo) {
    return `${formatDisplayDate(stop.dateFrom)} ${formatDisplayTime(stop.timeFrom)}–${formatDisplayTime(stop.timeTo)}`;
  }
  if (stop.timeFrom) {
    return `${formatDisplayDate(stop.dateFrom)} ${formatDisplayTime(stop.timeFrom)}`;
  }
  return formatDisplayDate(stop.dateFrom);
}
