import type { ApiShipmentDetail, ApiShipmentListItem, ApiShipmentStop } from '../types/shipments';
import type { Shipment, ShipmentStop } from '../../context/AppContext';

function mapApiStatus(status: string): Shipment['status'] {
  switch (status) {
    case 'scheduled':
    case 'ready':
      return 'upcoming';
    case 'on_trip':
      return 'in_progress';
    case 'past_due':
      return 'in_progress';
    case 'fullfilled':
    case 'partially_fullfilled':
      return 'delivered';
    case 'canceled':
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return 'cancelled';
    case 'awarded':
      return 'awarded';
    default:
      return 'pending';
  }
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDisplayDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function parsePrice(total: string | number | null | undefined): number | null {
  if (total === null || total === undefined || total === '') return null;
  const parsed = parseFloat(String(total));
  return Number.isNaN(parsed) ? null : parsed;
}

function splitViaStops(via?: string | null, viaStops?: string[]): string[] {
  if (Array.isArray(viaStops) && viaStops.length > 0) {
    return viaStops.filter(Boolean);
  }
  if (!via) return [];
  return via
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function mapCustomers(item: ApiShipmentListItem): Shipment['customer'] {
  if (Array.isArray(item.customers) && item.customers.length > 0) {
    return item.customers.map((name) => ({ name, orders: [] }));
  }
  return [];
}

function mapStop(stop: ApiShipmentStop, index: number, customerName?: string | null): ShipmentStop {
  return {
    id: stop.id || index + 1,
    type: stop.type === 'pickup' ? 'pickup' : 'delivery',
    location: stop.location || stop.city || 'Location',
    address: stop.address || stop.city || '',
    date: stop.date || '',
    timeStart: stop.time_start || '08:00',
    timeEnd: stop.time_end || '18:00',
    customers: stop.order_id
      ? [
          {
            name: customerName || 'Customer',
            orders: [
              {
                id: stop.order_id,
                products: stop.product_name || 'General Cargo',
                qty: parseFloat(String(stop.qty ?? 0)) || 0,
                qtyUnit: 'Units',
                weight: parseFloat(String(stop.weight ?? 0)) || 0,
                weightUnit: 'kg',
              },
            ],
          },
        ]
      : [],
  };
}

export function mapApiListItemToShipment(item: ApiShipmentListItem): Shipment {
  const price = parsePrice(item.total);
  const viaStops = splitViaStops(item.via, item.via_stops);
  const status = mapApiStatus(item.status);
  const atRisk = Boolean(item.at_risk) || item.status === 'past_due';

  return {
    id: String(item.id),
    autoId: item.auto_id,
    date: item.pickup_at || formatDisplayDate(item.created_at),
    pickDt: item.pickup_at ?? null,
    delDt: item.delivery_at ?? null,
    ref: item.customer_reference || undefined,
    status,
    vis: item.type === 'public' ? 'public' : 'private',
    origin: item.origin || '—',
    dest: item.dest || '—',
    via: viaStops.length ? viaStops.join(', ') : item.via ?? null,
    viaStops,
    stopCount: item.stop_count ?? (viaStops.length > 0 ? viaStops.length + 2 : 2),
    ordersCount: item.orders_count ?? (item.customer_reference ? 1 : 0),
    invited: item.invited_count ?? 0,
    customer: mapCustomers(item),
    bids: item.bids_count ?? 0,
    best_bid: item.best_bid ?? null,
    bid_exp: null,
    carrier: item.carrier?.name ?? null,
    carrier_init: item.carrier?.initials,
    price,
    price_type: item.negotiable ? 'spot' : 'contract',
    updated: formatRelativeTime(item.updated_at),
    timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
    tl_cur: status === 'pending' ? 2 : status === 'upcoming' ? 4 : status === 'in_progress' ? 6 : 2,
    at_risk: atRisk,
    riskReason: item.risk_reason ?? (atRisk ? 'Delayed' : null),
    negotiable: item.negotiable ?? true,
  };
}

export function mapApiDetailToShipment(detail: ApiShipmentDetail): Shipment {
  const base = mapApiListItemToShipment(detail);
  const customers =
    base.customer.length > 0
      ? base.customer
      : detail.customer_reference
        ? [{ name: detail.customer_reference, orders: [] }]
        : [];

  return {
    ...base,
    invited: detail.partners_count ?? base.invited,
    customer: customers,
    driverNotes: detail.note || undefined,
    stops: (detail.stops || []).map((stop, idx) => mapStop(stop, idx, detail.customer_reference)),
  };
}
