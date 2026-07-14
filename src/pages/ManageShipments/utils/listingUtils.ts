import type { Shipment } from '../../../context/AppContext';
import type { ListShipmentsParams, ShipmentKpiKey, ShipmentSortKey } from '../../../api/types/shipments';

export type KpiKey = ShipmentKpiKey;

export type StatusTabKey =
  | 'active'
  | 'pending'
  | 'scheduled'
  | 'upcoming'
  | 'past_due'
  | 'in_progress'
  | 'drafts'
  | 'completed'
  | 'partially_paid'
  | 'cancelled';

export type SortKey = '' | ShipmentSortKey;

export const SORT_OPTIONS: { value: SortKey; labelKey: string }[] = [
  { value: 'carrier_asc', labelKey: 'sortCarrierAsc' },
  { value: 'carrier_desc', labelKey: 'sortCarrierDesc' },
  { value: 'pickup_city_asc', labelKey: 'sortPickupCityAsc' },
  { value: 'pickup_city_desc', labelKey: 'sortPickupCityDesc' },
  { value: 'delivery_city_asc', labelKey: 'sortDeliveryCityAsc' },
  { value: 'delivery_city_desc', labelKey: 'sortDeliveryCityDesc' },
  { value: 'earliest_first_pickup_time', labelKey: 'sortEarliestPickup' },
  { value: 'latest_first_pickup_time', labelKey: 'sortLatestPickup' },
  { value: 'earliest_posting_date', labelKey: 'sortEarliestPosted' },
  { value: 'latest_posting_date', labelKey: 'sortLatestPosted' },
  { value: 'price_asc', labelKey: 'sortPriceAsc' },
  { value: 'price_desc', labelKey: 'sortPriceDesc' },
];

export const EMPTY_KPI_COUNTS: Record<ShipmentKpiKey, number> = {
  needs_action: 0,
  awaiting_response: 0,
  at_risk: 0,
  pickup_today: 0,
  awaiting_pod: 0,
};

export interface ShipmentsFilterState {
  carrier_name: string;
  product_type: string[];
  channel: 'all' | 'private' | 'public';
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_radius: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_radius: number | null;
  trip_km_min: string;
  trip_km_max: string;
  price_min: string;
  price_max: string;
  pickup_from: string;
  pickup_to: string;
  dropoff_from: string;
  dropoff_to: string;
  posted_from: string;
  posted_to: string;
  bid_state: '' | 'has_interest' | 'no_interest';
  customer: string;
  trip_mode: '' | 'direct' | 'multiple';
}

export const DEFAULT_FILTERS: ShipmentsFilterState = {
  carrier_name: '',
  product_type: [],
  channel: 'all',
  pickup_address: '',
  pickup_lat: null,
  pickup_lng: null,
  pickup_radius: null,
  dropoff_address: '',
  dropoff_lat: null,
  dropoff_lng: null,
  dropoff_radius: null,
  trip_km_min: '',
  trip_km_max: '',
  price_min: '',
  price_max: '',
  pickup_from: '',
  pickup_to: '',
  dropoff_from: '',
  dropoff_to: '',
  posted_from: '',
  posted_to: '',
  bid_state: '',
  customer: '',
  trip_mode: '',
};

export function statusTabHasApiSupport(tab: StatusTabKey): boolean {
  return true;
}

export function statusTabToApiStatus(tab: StatusTabKey): string | string[] | undefined {
  switch (tab) {
    case 'active':
      return 'active';
    case 'pending':
      return 'pending';
    case 'scheduled':
      return 'scheduled';
    case 'upcoming':
      return ['scheduled', 'ready'];
    case 'past_due':
      return 'past_due';
    case 'in_progress':
      return 'on_trip';
    case 'completed':
      return ['fullfilled', 'partially_fullfilled'];
    case 'cancelled':
      return 'canceled';
    case 'drafts':
      return 'draft';
    case 'partially_paid':
      return 'partially_paid';
    default:
      return undefined;
  }
}

export function countForStatusTab(statuses: Record<string, number>, tab: StatusTabKey): number {
  switch (tab) {
    case 'active':
      return statuses.active ?? 0;
    case 'pending':
      return statuses.pending ?? 0;
    case 'scheduled':
      return statuses.scheduled ?? 0;
    case 'upcoming':
      return (statuses.scheduled ?? 0) + (statuses.ready ?? 0);
    case 'past_due':
      return statuses.past_due ?? 0;
    case 'in_progress':
      return statuses.on_trip ?? 0;
    case 'completed':
      return (statuses.fullfilled ?? 0) + (statuses.partially_fullfilled ?? 0);
    case 'cancelled':
      return statuses.canceled ?? 0;
    case 'drafts':
      return statuses.drafts ?? 0;
    case 'partially_paid':
      return statuses.partially_paid ?? 0;
    default:
      return 0;
  }
}

function toOptionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Filters used for both list and summary (excludes status, kpi, sort, page). */
export function filtersToApiParams(filters: ShipmentsFilterState): Omit<ListShipmentsParams, 'page' | 'per_page' | 'status' | 'kpi' | 'sort' | 'search'> {
  const params: Omit<ListShipmentsParams, 'page' | 'per_page' | 'status' | 'kpi' | 'sort' | 'search'> = {};

  if (filters.carrier_name.trim()) params.carrier_name = filters.carrier_name.trim();
  if (filters.product_type.length) params.product_type = filters.product_type;
  if (filters.channel !== 'all') params.channel = filters.channel;

  if (filters.pickup_lat != null && filters.pickup_lng != null) {
    params.pickup_lat = filters.pickup_lat;
    params.pickup_lng = filters.pickup_lng;
    params.pickup_radius = filters.pickup_radius ?? 50;
  }
  if (filters.dropoff_lat != null && filters.dropoff_lng != null) {
    params.dropoff_lat = filters.dropoff_lat;
    params.dropoff_lng = filters.dropoff_lng;
    params.dropoff_radius = filters.dropoff_radius ?? 50;
  }

  const tripMin = toOptionalNumber(filters.trip_km_min);
  const tripMax = toOptionalNumber(filters.trip_km_max);
  if (tripMin !== undefined) params.trip_km_min = tripMin;
  if (tripMax !== undefined) params.trip_km_max = tripMax;

  const priceMin = toOptionalNumber(filters.price_min);
  const priceMax = toOptionalNumber(filters.price_max);
  if (priceMin !== undefined) params.price_min = priceMin;
  if (priceMax !== undefined) params.price_max = priceMax;

  if (filters.pickup_from) params.pickup_from = filters.pickup_from;
  if (filters.pickup_to) params.pickup_to = filters.pickup_to;
  if (filters.dropoff_from) params.dropoff_from = filters.dropoff_from;
  if (filters.dropoff_to) params.dropoff_to = filters.dropoff_to;
  if (filters.posted_from) params.posted_from = filters.posted_from;
  if (filters.posted_to) params.posted_to = filters.posted_to;

  if (filters.bid_state) params.bid_state = filters.bid_state;
  if (filters.customer.trim()) params.customer = filters.customer.trim();
  if (filters.trip_mode) params.trip_mode = filters.trip_mode;

  return params;
}

export function validateFilterRanges(filters: ShipmentsFilterState): string | null {
  const tripMin = toOptionalNumber(filters.trip_km_min);
  const tripMax = toOptionalNumber(filters.trip_km_max);
  if (tripMin !== undefined && tripMax !== undefined && tripMin > tripMax) {
    return 'filterTripKmRangeError';
  }
  const priceMin = toOptionalNumber(filters.price_min);
  const priceMax = toOptionalNumber(filters.price_max);
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    return 'filterPriceRangeError';
  }
  return null;
}

export function hasActiveFilters(filters: ShipmentsFilterState): boolean {
  return Object.keys(filtersToApiParams(filters)).length > 0;
}

export type FilterChipKey =
  | 'carrier_name'
  | 'product_type'
  | 'channel'
  | 'pickup'
  | 'dropoff'
  | 'trip_km'
  | 'price'
  | 'pickup_dates'
  | 'dropoff_dates'
  | 'posted_dates'
  | 'bid_state'
  | 'customer'
  | 'trip_mode';

export interface FilterChip {
  key: FilterChipKey;
  label: string;
}

export function buildFilterChips(
  filters: ShipmentsFilterState,
  t: (key: string) => string,
  productTypeNames: Record<string, string> = {}
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.carrier_name.trim()) {
    chips.push({ key: 'carrier_name', label: `${t('filterCarrierName')}: ${filters.carrier_name.trim()}` });
  }
  if (filters.product_type.length) {
    const names = filters.product_type.map((id) => productTypeNames[id] || id).join(', ');
    chips.push({ key: 'product_type', label: `${t('filterProductType')}: ${names}` });
  }
  if (filters.channel !== 'all') {
    chips.push({
      key: 'channel',
      label: `${t('filterChannel')}: ${filters.channel === 'private' ? t('filterChannelPrivate') : t('filterChannelPublic')}`,
    });
  }
  if (filters.pickup_lat != null && filters.pickup_lng != null) {
    const place = filters.pickup_address || `${filters.pickup_lat}, ${filters.pickup_lng}`;
    chips.push({
      key: 'pickup',
      label: `${t('filterPickupLocation')}: ${place} (${filters.pickup_radius ?? 50} km)`,
    });
  }
  if (filters.dropoff_lat != null && filters.dropoff_lng != null) {
    const place = filters.dropoff_address || `${filters.dropoff_lat}, ${filters.dropoff_lng}`;
    chips.push({
      key: 'dropoff',
      label: `${t('filterDropoffLocation')}: ${place} (${filters.dropoff_radius ?? 50} km)`,
    });
  }
  if (filters.trip_km_min || filters.trip_km_max) {
    chips.push({
      key: 'trip_km',
      label: `${t('filterTripLength')}: ${filters.trip_km_min || '…'}–${filters.trip_km_max || '…'} km`,
    });
  }
  if (filters.price_min || filters.price_max) {
    chips.push({
      key: 'price',
      label: `${t('filterPrice')}: €${filters.price_min || '…'}–€${filters.price_max || '…'}`,
    });
  }
  if (filters.pickup_from || filters.pickup_to) {
    chips.push({
      key: 'pickup_dates',
      label: `${t('filterPickupDate')}: ${filters.pickup_from || '…'} → ${filters.pickup_to || '…'}`,
    });
  }
  if (filters.dropoff_from || filters.dropoff_to) {
    chips.push({
      key: 'dropoff_dates',
      label: `${t('filterDropoffDate')}: ${filters.dropoff_from || '…'} → ${filters.dropoff_to || '…'}`,
    });
  }
  if (filters.posted_from || filters.posted_to) {
    chips.push({
      key: 'posted_dates',
      label: `${t('filterPostedDate')}: ${filters.posted_from || '…'} → ${filters.posted_to || '…'}`,
    });
  }
  if (filters.bid_state) {
    chips.push({
      key: 'bid_state',
      label: `${t('filterBidInterestState')}: ${
        filters.bid_state === 'has_interest' ? t('filterHasInterest') : t('filterNoInterest')
      }`,
    });
  }
  if (filters.customer.trim()) {
    chips.push({ key: 'customer', label: `${t('filterCustomer')}: ${filters.customer.trim()}` });
  }
  if (filters.trip_mode) {
    chips.push({
      key: 'trip_mode',
      label: `${t('filterTripMode')}: ${
        filters.trip_mode === 'direct' ? t('filterTripDirect') : t('filterTripMultiple')
      }`,
    });
  }

  return chips;
}

export function clearFilterChip(filters: ShipmentsFilterState, key: FilterChipKey): ShipmentsFilterState {
  switch (key) {
    case 'carrier_name':
      return { ...filters, carrier_name: '' };
    case 'product_type':
      return { ...filters, product_type: [] };
    case 'channel':
      return { ...filters, channel: 'all' };
    case 'pickup':
      return {
        ...filters,
        pickup_address: '',
        pickup_lat: null,
        pickup_lng: null,
        pickup_radius: null,
      };
    case 'dropoff':
      return {
        ...filters,
        dropoff_address: '',
        dropoff_lat: null,
        dropoff_lng: null,
        dropoff_radius: null,
      };
    case 'trip_km':
      return { ...filters, trip_km_min: '', trip_km_max: '' };
    case 'price':
      return { ...filters, price_min: '', price_max: '' };
    case 'pickup_dates':
      return { ...filters, pickup_from: '', pickup_to: '' };
    case 'dropoff_dates':
      return { ...filters, dropoff_from: '', dropoff_to: '' };
    case 'posted_dates':
      return { ...filters, posted_from: '', posted_to: '' };
    case 'bid_state':
      return { ...filters, bid_state: '' };
    case 'customer':
      return { ...filters, customer: '' };
    case 'trip_mode':
      return { ...filters, trip_mode: '' };
    default:
      return filters;
  }
}

export function formatEuro(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `€ ${value.toLocaleString()}`;
}

export function shipmentOrderSublabel(s: Shipment, t: (key: string) => string): string {
  const ids = s.orderIds?.filter(Boolean) ?? [];
  if (ids.length === 1) return ids[0];
  const count = s.ordersCount ?? ids.length;
  if (count > 1) return `${t('orders')}: ${count}`;
  return '—';
}

export function laneMidLabel(
  s: Shipment,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const stops = s.intermediateStops ?? Math.max((s.stopCount ?? 2) - 2, 0);
  if (s.shipmentType === 'direct' || stops <= 0) return t('directTrip');
  return t('intermediateStopsCount', { count: stops });
}

export function isShipmentEditable(status: Shipment['status']): boolean {
  return status !== 'delivered' && status !== 'cancelled';
}

export function statusBadgeClass(status: Shipment['status'], atRisk?: boolean): string {
  if (atRisk || status === 'past_due') return 'badge-danger';
  switch (status) {
    case 'pending':
      return 'badge-warning';
    case 'upcoming':
      return 'badge-accent';
    case 'in_progress':
      return 'badge-info';
    case 'awarded':
    case 'delivered':
      return 'badge-success';
    case 'cancelled':
      return 'badge-gray';
    default:
      return 'badge-gray';
  }
}

/** Build load-specific progress steps from itinerary stops. */
export function buildStopTimelineSteps(
  shipment: Shipment,
  t: (key: string, opts?: Record<string, unknown>) => string
): string[] {
  const stops = shipment.stops;
  if (!stops || stops.length === 0) {
    return [t('pickup'), t('delivery')];
  }
  return stops.map((stop, idx) => {
    const label = stop.location || (stop.type === 'pickup' ? t('pickup') : t('delivery'));
    if (stop.type === 'pickup' && idx === 0) return `${t('pickup')}: ${label}`;
    if (stop.type === 'delivery' && idx === stops.length - 1) return `${t('delivery')}: ${label}`;
    return label;
  });
}

export function stopTimelineCurrentIndex(status: Shipment['status'], stepCount: number): number {
  if (stepCount <= 0) return 0;
  const last = stepCount - 1;
  switch (status) {
    case 'pending':
    case 'awarded':
      return 0;
    case 'upcoming':
      return Math.min(1, last);
    case 'past_due':
      return Math.min(1, last);
    case 'in_progress':
      return Math.max(0, Math.min(Math.floor(last / 2) + 1, last));
    case 'delivered':
      return last;
    case 'cancelled':
      return 0;
    default:
      return 0;
  }
}

export function formatStatValue(
  value: number | string | null | undefined,
  suffix?: string | null
): string {
  if (value === null || value === undefined || value === '') return '—';
  const text = typeof value === 'number' ? value.toLocaleString() : String(value);
  return suffix ? `${text} ${suffix}` : text;
}
