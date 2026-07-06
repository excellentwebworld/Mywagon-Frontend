import type { ApiShipmentDetail, ApiShipmentListItem, ApiShipmentStop } from '../types/shipments';
import type { Shipment, ShipmentStop } from '../../context/AppContext';

function mapApiStatus(status: string): Shipment['status'] {
  switch (status) {
    case 'scheduled':
      return 'upcoming';
    case 'on_trip':
      return 'in_progress';
    case 'fullfilled':
    case 'partially_fullfilled':
      return 'delivered';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'awarded':
      return 'awarded';
    default:
      return 'pending';
  }
}

function formatUpdatedAt(value?: string | null): string {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
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

function mapStop(stop: ApiShipmentStop, index: number): ShipmentStop {
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
            name: 'Customer',
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

  return {
    id: String(item.id),
    autoId: item.auto_id,
    date: formatDisplayDate(item.created_at),
    status: mapApiStatus(item.status),
    vis: item.type === 'public' ? 'public' : 'private',
    origin: item.origin || '—',
    dest: item.dest || '—',
    via: item.via ?? null,
    customer: [],
    bids: item.bids_count ?? 0,
    best_bid: null,
    bid_exp: item.type === 'public' ? '12h' : null,
    carrier: null,
    price,
    price_type: item.negotiable ? 'contract' : item.type === 'public' ? 'spot' : 'contract',
    updated: formatUpdatedAt(item.updated_at),
    timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
    tl_cur: item.status === 'pending' ? 1 : 2,
    negotiable: item.negotiable ?? true,
  };
}

export function mapApiDetailToShipment(detail: ApiShipmentDetail): Shipment {
  const base = mapApiListItemToShipment(detail);

  return {
    ...base,
    driverNotes: detail.note || undefined,
    stops: (detail.stops || []).map(mapStop),
  };
}
