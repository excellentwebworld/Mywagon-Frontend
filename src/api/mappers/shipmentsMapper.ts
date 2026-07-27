import type { ApiShipmentDetail, ApiShipmentListItem, ApiShipmentStop } from '../types/shipments';
import type { Shipment, ShipmentStop } from '../../context/AppContext';
import {
  formatUtcToDisplayDate,
  formatUtcToDisplayDateTime,
  utcToLocalParts,
} from '../../utils/timezone';
import { groupItineraryStops } from '../../pages/ManageShipments/utils/listingUtils';

function mapApiStatus(status: string): Shipment['status'] {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'scheduled':
      return 'scheduled';
    case 'ready':
      return 'ready';
    case 'past_due':
      return 'past_due';
    case 'on_trip':
      return 'on_trip';
    case 'draft':
      return 'draft';
    case 'fullfilled':
      return 'fullfilled';
    case 'partially_fullfilled':
      return 'partially_fullfilled';
    case 'not_fullfilled':
      return 'not_fullfilled';
    case 'canceled':
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return 'canceled';
    case 'awarded':
      return 'awarded';
    default:
      return 'pending';
  }
}

function formatCreatedDisplay(value?: string | null): string {
  if (!value) return '';
  return formatUtcToDisplayDate(value);
}

function parsePrice(total: string | number | null | undefined): number | null {
  if (total === null || total === undefined || total === '') return null;
  const parsed = parseFloat(String(total));
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Drop "interest" rows when the same transporter already has a pending bid.
 * Backend can emit both after a private bid flips the partner to interested.
 */
function dedupeShipmentOffers(
  offers: NonNullable<Shipment['offers']>
): NonNullable<Shipment['offers']> {
  const bidderNames = new Set(
    offers
      .filter((o) => o.type === 'bid')
      .map((o) => o.name.trim().toLowerCase())
      .filter(Boolean)
  );
  return offers.filter((o) => {
    if (o.type !== 'interest') return true;
    const key = o.name.trim().toLowerCase();
    return !key || !bidderNames.has(key);
  });
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

/** Combine API UTC wall-clock date+time parts into an instant string for conversion. */
function stopUtcInstant(date?: string | null, time?: string | null): string | null {
  if (!date) return null;
  const t = (time || '00:00').trim() || '00:00';
  return `${date.trim()} ${t.length === 5 ? `${t}:00` : t}`;
}

function mapStop(stop: ApiShipmentStop, index: number, customerName?: string | null): ShipmentStop {
  const name = stop.company_name || customerName || '';
  const fromInstant = stopUtcInstant(stop.date, stop.time_start);
  const toInstant = stopUtcInstant(stop.date, stop.time_end || stop.time_start);
  const fromLocal = fromInstant
    ? utcToLocalParts(fromInstant)
    : { date: stop.date || '', time: stop.time_start || '' };
  const toLocal = toInstant ? utcToLocalParts(toInstant) : { date: '', time: stop.time_end || '' };

  return {
    id: stop.id || index + 1,
    type: stop.type === 'pickup' ? 'pickup' : 'delivery',
    location: stop.location || stop.city || '—',
    address: stop.address || stop.city || '',
    date: fromLocal.date || stop.date || '',
    timeStart: fromLocal.time || stop.time_start || '',
    timeEnd: toLocal.time || stop.time_end || '',
    locationStatus:
      stop.status !== null && stop.status !== undefined && String(stop.status) !== ''
        ? String(stop.status)
        : '0',
    pod:
      stop.pod !== null && stop.pod !== undefined && String(stop.pod) !== ''
        ? String(stop.pod)
        : '0',
    podImages: (stop.pod_images || [])
      .filter((img) => Boolean(img?.url))
      .map((img) => ({ id: img.id ?? null, url: String(img.url) })),
    logs: (stop.logs || [])
      .filter((log) => Boolean(log?.created_at))
      .map((log) => ({
        status: log.status !== null && log.status !== undefined && String(log.status) !== ''
          ? String(log.status)
          : '0',
        createdAt: String(log.created_at),
      })),
    unableStatus: Number(stop.unable_status ?? 0) || 0,
    customers:
      stop.order_id || stop.product_name || stop.qty || stop.weight || name
        ? [
            {
              name: name || '—',
              orders: [
                {
                  id: stop.order_id || '',
                  products: stop.product_name || '—',
                  qty: parseFloat(String(stop.qty ?? 0)) || 0,
                  qtyUnit: String(stop.qty_unit ?? ''),
                  weight: parseFloat(String(stop.weight ?? 0)) || 0,
                  weightUnit: String(stop.weight_unit ?? ''),
                },
              ],
            },
          ]
        : [],
  };
}

function customersFromStops(detail: ApiShipmentDetail): Shipment['customer'] {
  const stops = detail.stops || [];
  const byName = new Map<string, string[]>();
  stops.forEach((stop) => {
    if (!stop.order_id) return;
    const name = stop.company_name || detail.customer_reference || '—';
    const list = byName.get(name) || [];
    if (!list.includes(stop.order_id)) list.push(stop.order_id);
    byName.set(name, list);
  });
  if (byName.size === 0 && Array.isArray(detail.customers) && detail.customers.length > 0) {
    return detail.customers.map((name) => ({ name, orders: [] as string[] }));
  }
  return Array.from(byName.entries()).map(([name, orders]) => ({ name, orders }));
}

function scheduleLabel(iso?: string | null, fallback?: string | null): string | null {
  if (iso) {
    const formatted = formatUtcToDisplayDateTime(iso);
    if (formatted) return formatted;
  }
  return fallback ?? null;
}

export function mapApiListItemToShipment(item: ApiShipmentListItem): Shipment {
  const quoted = item.quoted_price ?? parsePrice(item.total);
  const viaStops = splitViaStops(item.via, item.via_stops);
  const status = mapApiStatus(item.status);
  const flags = item.flags;
  // Only set when API sends the field — missing detail at_risk must not become false and wipe list.
  const atRiskRaw = flags?.at_risk ?? item.at_risk;
  const atRisk = atRiskRaw == null ? undefined : Boolean(atRiskRaw);

  return {
    id: String(item.id),
    autoId: item.auto_id,
    date:
      scheduleLabel(item.pickup_at_iso, item.pickup_at) ||
      (status === 'draft' ? '' : formatCreatedDisplay(item.created_at)),
    pickDt: scheduleLabel(item.pickup_at_iso, item.pickup_at),
    delDt: scheduleLabel(item.delivery_at_iso, item.delivery_at),
    pickDtIso: item.pickup_at_iso ?? null,
    delDtIso: item.delivery_at_iso ?? null,
    createdAt: item.created_at ?? null,
    ref: item.customer_reference || undefined,
    status,
    vis: (item.channel || item.type) === 'public' ? 'public' : 'private',
    channel: (item.channel || item.type) === 'public' ? 'public' : 'private',
    shipmentType:
      (item.intermediate_stops ?? 0) > 0 || (item.stop_count ?? 0) > 2
        ? 'multiple'
        : item.shipment_type ?? null,
    origin: item.origin || '—',
    dest: item.dest || '—',
    via: viaStops.length ? viaStops.join(', ') : item.via ?? null,
    viaStops,
    stopCount: item.stop_count ?? (viaStops.length > 0 ? viaStops.length + 2 : 2),
    intermediateStops: item.intermediate_stops ?? Math.max((item.stop_count ?? 2) - 2, 0),
    ordersCount: item.orders_count ?? (item.customer_reference ? 1 : 0),
    orderIds: item.order_ids ?? [],
    invited: item.invited_count ?? 0,
    interestedCount: item.interested_count ?? 0,
    customer: mapCustomers(item),
    bids: item.bids_count ?? 0,
    bidsReceived: item.bids_received ?? 0,
    bidsSent: item.bids_sent ?? 0,
    best_bid: item.best_bid ?? null,
    bid_exp: null,
    carrier: item.carrier?.name ?? null,
    carrier_init: item.carrier?.initials,
    carrierAvatar: item.carrier?.avatar ?? null,
    price: quoted,
    quotedPrice: quoted,
    agreedPrice: item.agreed_price ?? null,
    price_type: item.negotiable ? 'spot' : 'contract',
    paymentStatus: item.payment_status ?? null,
    updated: item.updated_at ?? '',
    updatedAt: item.updated_at ?? null,
    timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
    tl_cur:
      status === 'pending' || status === 'draft'
        ? 2
        : status === 'scheduled' || status === 'ready' || status === 'upcoming'
          ? 4
          : status === 'past_due'
            ? 5
            : status === 'on_trip' || status === 'in_progress'
              ? 6
              : status === 'fullfilled' || status === 'partially_fullfilled' || status === 'delivered'
                ? 7
                : 2,
    at_risk: atRisk,
    riskReason: item.risk_reason ?? null,
    needsAction: Boolean(flags?.needs_action ?? item.needs_action),
    awaitingResponse: Boolean(flags?.awaiting_response ?? item.awaiting_response),
    pickupToday: Boolean(flags?.pickup_today ?? item.pickup_today),
    awaitingPod: Boolean(flags?.awaiting_pod ?? item.awaiting_pod),
    negotiable: item.negotiable ?? true,
  };
}

export function mapApiDetailToShipment(detail: ApiShipmentDetail): Shipment {
  const base = mapApiListItemToShipment(detail);
  const stopCustomers = customersFromStops(detail);
  const customers =
    stopCustomers.length > 0
      ? stopCustomers
      : base.customer.length > 0
        ? base.customer
        : detail.customer_reference
          ? [{ name: detail.customer_reference, orders: [] as string[] }]
          : [];

  const journeyKm = parsePrice(detail.journey_distance);
  const mappedStops = (detail.stops || []).map((stop, idx) =>
    mapStop(stop, idx, detail.customer_reference)
  );
  const physicalStopCount =
    mappedStops.length > 0
      ? groupItineraryStops(mappedStops, {
          origin: base.origin,
          dest: base.dest,
          pickDt: base.pickDt,
          delDt: base.delDt,
        }).length
      : detail.stop_count ?? base.stopCount ?? 2;

  return {
    ...base,
    invited: detail.invitees?.length ?? detail.partners_count ?? base.invited,
    interestedCount: detail.interested_count ?? base.interestedCount ?? 0,
    bidsReceived: detail.bids_received ?? base.bidsReceived ?? 0,
    bidsSent: detail.bids_sent ?? base.bidsSent ?? 0,
    customer: customers,
    orderIds: detail.order_ids?.length ? detail.order_ids : base.orderIds,
    ordersCount: detail.order_ids?.length || base.ordersCount,
    stopCount: physicalStopCount,
    intermediateStops: Math.max(physicalStopCount - 2, 0),
    at_risk: detail.at_risk ?? base.at_risk,
    riskReason: detail.risk_reason ?? base.riskReason,
    driverNotes: detail.note || undefined,
    stops: mappedStops,
    journeyDistanceKm: journeyKm,
    journeyTime: detail.journey_time ?? null,
    cargoValue: detail.cargo_value ?? null,
    truckTypes: detail.truck_types ?? [],
    totalWeight: detail.total_weight ?? null,
    totalQty: detail.total_qty ?? null,
    weightUnit: detail.weight_unit ?? null,
    qtyUnit: detail.qty_unit ?? null,
    offers: dedupeShipmentOffers(
      (detail.offers || []).map((o) => ({
        id: o.id,
        type: o.type,
        kind: o.kind ?? (o.availability_id ? 'sent' : 'received'),
        availabilityId: o.availability_id ?? null,
        lastActionBy: o.last_action_by ?? null,
        name: o.name,
        initials: o.initials,
        avatar: o.avatar ?? null,
        rating: o.rating,
        ratingCount: o.rating_count ?? 0,
        vat: o.vat ?? null,
        isPartner: Boolean(o.is_partner),
        hasHistory: o.has_history !== false,
        role: o.role,
        price: o.price,
        respondedAt: o.responded_at,
        status: o.status ?? 'pending',
        counter: o.counter ?? null,
      }))
    ),
    invitees: (detail.invitees || []).map((i) => ({
      id: i.id,
      name: i.name,
      initials: i.initials,
      avatar: i.avatar ?? null,
      invitedAt: i.invited_at,
      status: i.status,
    })),
  };
}
