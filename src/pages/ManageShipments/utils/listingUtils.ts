import type { Shipment } from '../../../context/AppContext';
import type { ListShipmentsParams, ShipmentKpiKey, ShipmentSortKey } from '../../../api/types/shipments';
import {
  formatUtcToDisplayDate,
  formatUtcToDisplayDateTime,
  formatUtcToDisplayTime,
  localDateTimeLocalToUtcIso,
  parseUtcInstant,
} from '../../../utils/timezone';

/** Convert datetime-local filter values to UTC ISO for the API. */
function toUtcFilterParam(value: string): string | undefined {
  const trimmed = (value || '').trim();
  if (!trimmed) return undefined;
  const iso = localDateTimeLocalToUtcIso(trimmed);
  return iso || undefined;
}

/** Display datetime-local filter values as DD/MM/YYYY HH:mm. */
function formatFilterChipDateTime(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '…';
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return trimmed;
  const [, year, month, day, hour, minute] = match;
  const date = `${day}/${month}/${year}`;
  return hour != null && minute != null ? `${date} ${hour}:${minute}` : date;
}
export type KpiKey = ShipmentKpiKey;

export type StatusTabKey =
  | 'active'
  | 'pending'
  | 'scheduled'
  | 'ready'
  | 'past_due'
  | 'on_trip'
  | 'drafts'
  | 'fullfilled'
  | 'partially_fullfilled'
  | 'unfulfilled'
  | 'cancelled';

const STATUS_TAB_KEYS = new Set<StatusTabKey>([
  'active',
  'pending',
  'scheduled',
  'ready',
  'past_due',
  'on_trip',
  'drafts',
  'fullfilled',
  'partially_fullfilled',
  'unfulfilled',
  'cancelled',
]);

/** URL aliases → canonical StatusTabKey (reload / share-friendly). */
const STATUS_TAB_URL_ALIASES: Record<string, StatusTabKey> = {
  active: 'active',
  pending: 'pending',
  scheduled: 'scheduled',
  ready: 'ready',
  past_due: 'past_due',
  'past-due': 'past_due',
  on_trip: 'on_trip',
  'on-trip': 'on_trip',
  drafts: 'drafts',
  draft: 'drafts',
  fullfilled: 'fullfilled',
  fulfilled: 'fullfilled',
  partially_fullfilled: 'partially_fullfilled',
  'partially-fullfilled': 'partially_fullfilled',
  unfulfilled: 'unfulfilled',
  not_fullfilled: 'unfulfilled',
  'not-fullfilled': 'unfulfilled',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

export function parseStatusTabParam(raw: string | null | undefined): StatusTabKey {
  if (!raw) return 'active';
  const key = STATUS_TAB_URL_ALIASES[raw.trim().toLowerCase()];
  return key && STATUS_TAB_KEYS.has(key) ? key : 'active';
}

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

const KPI_LABEL_KEYS: Record<ShipmentKpiKey, string> = {
  needs_action: 'needsActionLabel',
  awaiting_response: 'awaitingResponse',
  at_risk: 'atRiskLate',
  pickup_today: 'pickupToday',
  awaiting_pod: 'awaitingPod',
};

export function kpiLabelKey(kpi: KpiKey): string {
  return KPI_LABEL_KEYS[kpi];
}

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
    case 'ready':
      return 'ready';
    case 'past_due':
      return 'past_due';
    case 'on_trip':
      return 'on_trip';
    case 'fullfilled':
      return 'fullfilled';
    case 'partially_fullfilled':
      return 'partially_fullfilled';
    case 'unfulfilled':
      return 'not_fullfilled';
    case 'cancelled':
      return ['canceled', 'rejected', 'expired'];
    case 'drafts':
      return 'draft';
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
    case 'ready':
      return statuses.ready ?? 0;
    case 'past_due':
      return statuses.past_due ?? 0;
    case 'on_trip':
      return statuses.on_trip ?? 0;
    case 'fullfilled':
      return statuses.fullfilled ?? 0;
    case 'partially_fullfilled':
      return statuses.partially_fullfilled ?? 0;
    case 'unfulfilled':
      return statuses.unfulfilled ?? statuses.not_fullfilled ?? 0;
    case 'cancelled':
      return (statuses.canceled ?? 0) + (statuses.rejected ?? 0) + (statuses.expired ?? 0);
    case 'drafts':
      return statuses.drafts ?? statuses.draft ?? 0;
    default:
      return 0;
  }
}

/**
 * Status-tab order for KPI auto-navigation (matches StatusTabs UI).
 * When the current tab has 0 matches under a KPI filter, pick the first tab
 * in this list with count > 0; if none, fall back to `active`.
 */
export const STATUS_TAB_PRIORITY: StatusTabKey[] = [
  'active',
  'pending',
  'scheduled',
  'ready',
  'past_due',
  'on_trip',
  'drafts',
  'fullfilled',
  'partially_fullfilled',
  'unfulfilled',
  'cancelled',
];

export function resolvePreferredStatusTab(
  statuses: Record<string, number>,
  fallback: StatusTabKey = 'active'
): StatusTabKey {
  for (const tab of STATUS_TAB_PRIORITY) {
    if (countForStatusTab(statuses, tab) > 0) {
      return tab;
    }
  }
  return fallback;
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

  const pickupFrom = toUtcFilterParam(filters.pickup_from);
  const pickupTo = toUtcFilterParam(filters.pickup_to);
  const dropoffFrom = toUtcFilterParam(filters.dropoff_from);
  const dropoffTo = toUtcFilterParam(filters.dropoff_to);
  const postedFrom = toUtcFilterParam(filters.posted_from);
  const postedTo = toUtcFilterParam(filters.posted_to);
  if (pickupFrom) params.pickup_from = pickupFrom;
  if (pickupTo) params.pickup_to = pickupTo;
  if (dropoffFrom) params.dropoff_from = dropoffFrom;
  if (dropoffTo) params.dropoff_to = dropoffTo;
  if (postedFrom) params.posted_from = postedFrom;
  if (postedTo) params.posted_to = postedTo;

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

function uniqueSortedNames(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Unique assigned transporters from the shipments currently in view. */
export function transportersFromShipments(shipments: { carrier?: string | null }[]): string[] {
  return uniqueSortedNames(shipments.map((s) => s.carrier || ''));
}

/** Unique customers from the shipments currently in view. */
export function customersFromShipments(
  shipments: { customer?: { name: string }[] }[]
): string[] {
  return uniqueSortedNames(shipments.flatMap((s) => (s.customer ?? []).map((c) => c.name || '')));
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
      label: `${t('filterPickupDate')}: ${formatFilterChipDateTime(filters.pickup_from)} → ${formatFilterChipDateTime(filters.pickup_to)}`,
    });
  }
  if (filters.dropoff_from || filters.dropoff_to) {
    chips.push({
      key: 'dropoff_dates',
      label: `${t('filterDropoffDate')}: ${formatFilterChipDateTime(filters.dropoff_from)} → ${formatFilterChipDateTime(filters.dropoff_to)}`,
    });
  }
  if (filters.posted_from || filters.posted_to) {
    chips.push({
      key: 'posted_dates',
      label: `${t('filterPostedDate')}: ${formatFilterChipDateTime(filters.posted_from)} → ${formatFilterChipDateTime(filters.posted_to)}`,
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

/** PDS SID secondary line: single order ID, or order count when multiple. */
export function shipmentIdSublabel(s: Shipment, t: (key: string) => string): string {
  const ids = s.orderIds?.filter(Boolean) ?? [];
  const orderCount = s.ordersCount ?? ids.length;
  if (orderCount === 1) {
    if (ids.length === 1) return ids[0];
    if (s.ref) return s.ref;
  }
  if (orderCount > 1) {
    return `${orderCount} ${t('orders').toLowerCase()}`;
  }
  return s.ref || '';
}

export function laneMidLabel(
  s: Shipment,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  // Always derive from physical itinerary stops — ignore stale shipment_type on the row.
  const physicalStops = itineraryStopCount(s);
  const intermediate = Math.max(physicalStops - 2, 0);
  if (intermediate <= 0) return t('directTrip');
  return t('intermediateStopsCount', { count: intermediate });
}

/** Physical itinerary stops (grouped), falling back to API counts. */
export function itineraryStopCount(s: Shipment): number {
  if (s.stops && s.stops.length > 0) {
    return groupItineraryStops(s.stops, {
      origin: s.origin,
      dest: s.dest,
      pickDt: s.pickDt,
      delDt: s.delDt,
    }).length;
  }
  if (s.intermediateStops != null && s.intermediateStops > 0) {
    return s.intermediateStops + 2;
  }
  if (s.viaStops && s.viaStops.length > 0) {
    return s.viaStops.length + 2;
  }
  if (s.stopCount != null && s.stopCount > 0) return s.stopCount;
  return 2;
}

/** Laravel detail/list: Edit & Cancel only for these statuses (not fulfilled / canceled). */
const SHIPMENT_EDIT_CANCEL_STATUSES = new Set<Shipment['status']>([
  'pending',
  'scheduled',
  'ready',
  'upcoming',
  'past_due',
  'on_trip',
  'in_progress',
  'draft',
  'awarded',
]);

export function isShipmentEditable(status: Shipment['status']): boolean {
  return SHIPMENT_EDIT_CANCEL_STATUSES.has(status);
}

/** Same allow-list as Laravel cancel-shipment-button. */
export function isShipmentCancellable(status: Shipment['status']): boolean {
  return SHIPMENT_EDIT_CANCEL_STATUSES.has(status);
}

export function statusBadgeClass(
  status: Shipment['status'],
  _atRisk?: boolean,
  opts?: {
    bidsReceived?: number;
    bidsSent?: number;
    interestedCount?: number;
    awaitingResponse?: boolean;
    needsAction?: boolean;
  }
): string {
  // Match Laravel ManageShipmentMasterDataTable + style.css status-box colors.
  // Do NOT paint pending as past-due when at_risk — Laravel keeps pending variants.
  if (status === 'past_due') return 'status-box status-box--past-due';

  switch (status) {
    case 'pending': {
      // Green = awaiting transporter (counter / posted-truck bid).
      // Yellow = shipper needs to act on inbound bid/interest.
      // Both = green→yellow gradient.
      const awaiting =
        Boolean(opts?.awaitingResponse) || (opts?.bidsSent ?? 0) > 0;
      const needs =
        Boolean(opts?.needsAction) ||
        (opts?.bidsReceived ?? 0) > 0 ||
        (opts?.interestedCount ?? 0) > 0;
      if (awaiting && needs) return 'status-box status-box--pending-more';
      if (awaiting) return 'status-box status-box--pending-request';
      if (needs) return 'status-box status-box--pending';
      return 'status-box status-box--pending-request';
    }
    case 'scheduled':
    case 'upcoming':
      return 'status-box status-box--scheduled';
    case 'ready':
      return 'status-box status-box--ready';
    case 'on_trip':
    case 'in_progress':
      return 'status-box status-box--on-trip';
    case 'fullfilled':
    case 'delivered':
    case 'awarded':
      return 'status-box status-box--fulfilled';
    case 'partially_fullfilled':
      return 'status-box status-box--partial';
    case 'not_fullfilled':
      return 'status-box status-box--not-fulfilled';
    case 'draft':
      return 'status-box status-box--draft';
    case 'canceled':
    case 'cancelled':
      return 'status-box status-box--canceled';
    default:
      return 'status-box status-box--draft';
  }
}

/** Extra lines inside the status pill — mirrors Laravel ManageShipmentMasterDataTable. */
export function statusBadgeDetails(
  shipment: Pick<
    Shipment,
    'status' | 'bidsReceived' | 'bidsSent' | 'bids' | 'interestedCount'
  >,
  t: (key: string, opts?: Record<string, unknown>) => string
): string[] {
  const lines: string[] = [];
  if (shipment.status === 'not_fullfilled') {
    lines.push(t('shipmentPendingSublabel'));
    return lines;
  }
  if (shipment.status !== 'pending') return lines;

  const interested = shipment.interestedCount ?? 0;
  const received = shipment.bidsReceived ?? 0;
  const sent = shipment.bidsSent ?? 0;

  if (interested > 0) {
    lines.push(t('statusInterestedCount', { count: interested }));
  }
  if (received > 0) {
    lines.push(t('statusBidRequestsCount', { count: received }));
  }
  if (sent > 0) {
    lines.push(t('statusCarrierPendingCount', { count: sent }));
  }
  return lines;
}

export type LaravelProgressState = 'done' | 'cur' | 'pending' | 'success' | 'skip';

export type LaravelProgressStep = {
  id: string;
  label: string;
  state: LaravelProgressState;
  /** Optional secondary line (date / time), like Laravel Load Details. */
  sub?: string;
  /** Laravel-style date line under the action (e.g. 01/07/2026). */
  dateLine?: string;
  /** Laravel-style time line under the date (e.g. 18:49). */
  timeLine?: string;
};

export type ItineraryStopGroup = {
  key: string;
  type: 'pickup' | 'delivery';
  location: string;
  address: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  customers: string[];
  /** First line / location[0] status — same as driver itinerary group. */
  locationStatus?: string;
  pod?: string;
  podImages?: Array<{ id?: number | null; url: string }>;
  /** Event logs from first (merged) location row — Laravel timeline source. */
  logs?: Array<{ status: string; createdAt: string }>;
  unableStatus?: number;
  lines: Array<{
    customerName: string;
    orderId: string;
    products: string;
    qty: number;
    qtyUnit: string;
    weight: number;
    weightUnit: string;
    locationStatus?: string;
    pod?: string;
    podImages?: Array<{ id?: number | null; url: string }>;
    unableStatus?: number;
  }>;
};

/** Driver ShipmentLocationStatus codes (ConstantUtil). */
const LOC_PENDING = 0;
const LOC_UNABLE_START = 2;
const LOC_ARRIVED = 3;
const LOC_UNABLE_REACH = 4;
const LOC_COMPLETE_STOP = 5;
const LOC_UNABLE_STOP = 6;
const LOC_COMPLETE_SHIPMENT = 7;
const LOC_UNABLE_SHIPMENT = 8;

function locationStatusCode(status?: string | number | null): number {
  const n = Number(status);
  return Number.isFinite(n) ? n : LOC_PENDING;
}

/**
 * Whether a product/location line is fully past for progress (driver continues past it).
 * Delivery with status 5 but POD not uploaded stays current.
 */
export function isLocationLinePast(
  type: 'pickup' | 'delivery',
  status?: string | number | null,
  pod?: string | number | null,
  unableStatus?: number | null
): boolean {
  if (Number(unableStatus) === 1) return true;
  const code = locationStatusCode(status);
  if (code === LOC_COMPLETE_SHIPMENT) return true;
  if (code === LOC_UNABLE_START || code === LOC_UNABLE_REACH || code === LOC_UNABLE_STOP) {
    return true;
  }
  if (code === LOC_COMPLETE_STOP) {
    if (type === 'delivery') {
      const podCode = String(pod ?? '0');
      // Not uploaded → still current (driver shows Upload POD)
      if (podCode === '0') return false;
    }
    return true;
  }
  return false;
}

function isItineraryGroupPast(group: ItineraryStopGroup): boolean {
  if (group.lines.length > 0) {
    return group.lines.every((line) =>
      isLocationLinePast(group.type, line.locationStatus, line.pod, line.unableStatus)
    );
  }
  return isLocationLinePast(group.type, group.locationStatus, group.pod, group.unableStatus);
}

/**
 * Driver currentLocationIndex: first itinerary stop that still needs action.
 * When trip just started (status 1 / 0 on first stop), index is 0.
 */
export function findCurrentItineraryIndex(groups: ItineraryStopGroup[]): number {
  for (let i = 0; i < groups.length; i++) {
    if (!isItineraryGroupPast(groups[i])) return i;
  }
  return Math.max(0, groups.length - 1);
}

/** Driver ProductListAdapter visual state for a product/location line. */
export type ProductLineVisual = 'default' | 'done' | 'done-pod' | 'failed';

export function productLineVisual(
  type: 'pickup' | 'delivery',
  status?: string | number | null,
  pod?: string | number | null,
  unableStatus?: number | null
): ProductLineVisual {
  const code = locationStatusCode(status);
  const podCode = String(pod ?? '0');
  if (
    Number(unableStatus) === 1 ||
    code === LOC_UNABLE_START ||
    code === LOC_UNABLE_REACH ||
    code === LOC_UNABLE_STOP ||
    code === LOC_UNABLE_SHIPMENT
  ) {
    return 'failed';
  }
  if (code === LOC_COMPLETE_STOP || code === LOC_COMPLETE_SHIPMENT) {
    if (type === 'delivery') {
      if (podCode === '1') return 'done-pod';
      if (podCode === '3') return 'failed';
    }
    return 'done';
  }
  return 'default';
}

/** Driver ItineraryListAdapter stop card / rail state. */
export type ItineraryStopVisual = 'pending' | 'current' | 'arrived' | 'done' | 'failed';

function primaryStopStatus(group: ItineraryStopGroup): {
  code: number;
  pod: string;
  unable: number;
} {
  const active = group.lines.find(
    (line) => !isLocationLinePast(group.type, line.locationStatus, line.pod, line.unableStatus)
  );
  const line = active || group.lines[0];
  return {
    code: locationStatusCode(line?.locationStatus ?? group.locationStatus),
    pod: String(line?.pod ?? group.pod ?? '0'),
    unable: Number(line?.unableStatus ?? group.unableStatus ?? 0) || 0,
  };
}

export function itineraryStopVisual(
  group: ItineraryStopGroup,
  index: number,
  currentIndex: number,
  shipmentStatus?: Shipment['status'] | string
): ItineraryStopVisual {
  const onTrip =
    shipmentStatus === 'on_trip' ||
    shipmentStatus === 'in_progress';
  const fulfilledLike =
    shipmentStatus === 'fullfilled' ||
    shipmentStatus === 'partially_fullfilled' ||
    shipmentStatus === 'delivered' ||
    shipmentStatus === 'not_fullfilled';

  const { code, pod, unable } = primaryStopStatus(group);
  const lineFailed = group.lines.some(
    (line) => productLineVisual(group.type, line.locationStatus, line.pod, line.unableStatus) === 'failed'
  );

  if (
    lineFailed ||
    unable === 1 ||
    code === LOC_UNABLE_START ||
    code === LOC_UNABLE_REACH ||
    code === LOC_UNABLE_STOP ||
    code === LOC_UNABLE_SHIPMENT ||
    (code === LOC_COMPLETE_STOP && group.type === 'delivery' && pod === '3')
  ) {
    return 'failed';
  }

  if (code === LOC_COMPLETE_STOP || code === LOC_COMPLETE_SHIPMENT) {
    return 'done';
  }

  if (code === LOC_ARRIVED) {
    return 'arrived';
  }

  if (fulfilledLike) {
    return isItineraryGroupPast(group) ? 'done' : 'pending';
  }

  if (onTrip) {
    if (index < currentIndex) return 'done';
    if (index === currentIndex) {
      return code === LOC_ARRIVED ? 'arrived' : 'current';
    }
    return 'pending';
  }

  return 'pending';
}

/** Rail segment below a stop: solid when stop is past (driver filled purple). */
export function itineraryRailFilled(
  stopVisual: ItineraryStopVisual,
  index: number,
  currentIndex: number,
  shipmentStatus?: Shipment['status'] | string
): boolean {
  const onTrip = shipmentStatus === 'on_trip' || shipmentStatus === 'in_progress';
  const fulfilledLike =
    shipmentStatus === 'fullfilled' ||
    shipmentStatus === 'partially_fullfilled' ||
    shipmentStatus === 'delivered';
  if (fulfilledLike) return stopVisual === 'done' || stopVisual === 'failed';
  if (!onTrip) return false;
  if (stopVisual === 'done' || stopVisual === 'failed') return true;
  return index < currentIndex;
}

/** Group consecutive same location+type+schedule rows into physical itinerary stops. */
export function groupItineraryStops(
  stops: Shipment['stops'],
  fallback?: { origin?: string; dest?: string; pickDt?: string | null; delDt?: string | null }
): ItineraryStopGroup[] {
  if (!stops || stops.length === 0) {
    return [
      {
        key: 'origin',
        type: 'pickup',
        location: fallback?.origin || '—',
        address: '',
        date: fallback?.pickDt || '',
        timeStart: '',
        timeEnd: '',
        customers: [],
        locationStatus: '0',
        pod: '0',
        podImages: [],
        logs: [],
        unableStatus: 0,
        lines: [],
      },
      {
        key: 'dest',
        type: 'delivery',
        location: fallback?.dest || '—',
        address: '',
        date: fallback?.delDt || '',
        timeStart: '',
        timeEnd: '',
        customers: [],
        locationStatus: '0',
        pod: '0',
        podImages: [],
        logs: [],
        unableStatus: 0,
        lines: [],
      },
    ];
  }

  const groups: ItineraryStopGroup[] = [];

  stops.forEach((stop) => {
    const key = [stop.type, stop.location, stop.date, stop.timeStart].join('|');
    const last = groups[groups.length - 1];
    const lines: ItineraryStopGroup['lines'] = [];
    (stop.customers || []).forEach((customer) => {
      (customer.orders || []).forEach((order) => {
        if (!order.products && !order.qty && !order.weight && !order.id) return;
        lines.push({
          customerName: customer.name || '',
          orderId: order.id || '',
          products: order.products || '—',
          qty: order.qty || 0,
          qtyUnit: order.qtyUnit || '',
          weight: order.weight || 0,
          weightUnit: order.weightUnit || '',
          locationStatus: stop.locationStatus ?? '0',
          pod: stop.pod ?? '0',
          podImages: stop.podImages ?? [],
          unableStatus: stop.unableStatus ?? 0,
        });
      });
    });
    const customers = (stop.customers || [])
      .map((c) => c.name)
      .filter((name) => name && name !== '—');

    if (last && last.key === key) {
      lines.forEach((line) => last.lines.push(line));
      customers.forEach((name) => {
        if (!last.customers.includes(name)) last.customers.push(name);
      });
      const existingUrls = new Set((last.podImages || []).map((img) => img.url));
      (stop.podImages || []).forEach((img) => {
        if (!img.url || existingUrls.has(img.url)) return;
        existingUrls.add(img.url);
        last.podImages = [...(last.podImages || []), img];
      });
      return;
    }

    groups.push({
      key,
      type: stop.type,
      location: stop.location || '—',
      address: stop.address || '',
      date: stop.date || '',
      timeStart: stop.timeStart || '',
      timeEnd: stop.timeEnd || '',
      customers: [...customers],
      // location[0] — keep first row's status when merging products
      locationStatus: stop.locationStatus ?? '0',
      pod: stop.pod ?? '0',
      podImages: stop.podImages ?? [],
      logs: stop.logs ?? [],
      unableStatus: stop.unableStatus ?? 0,
      lines,
    });
  });

  return groups;
}

/** Build Laravel-style date/time caption parts for a progress step. */
function progressDateTimeParts(
  isoOrDisplay?: string | null,
  dateOnly?: string | null,
  timeOnly?: string | null
): { dateLine?: string; timeLine?: string; sub?: string } {
  if (isoOrDisplay && parseUtcInstant(isoOrDisplay)) {
    const dateLine = formatUtcToDisplayDate(isoOrDisplay);
    const timeLine = formatUtcToDisplayTime(isoOrDisplay);
    return {
      dateLine: dateLine || undefined,
      timeLine: timeLine || undefined,
      sub: [dateLine, timeLine].filter(Boolean).join(' ') || undefined,
    };
  }

  // Already-local display strings from stop schedule (YYYY-MM-DD / HH:mm or display).
  let dateLine = (dateOnly || '').trim() || undefined;
  let timeLine = (timeOnly || '').trim() || undefined;

  if (dateLine && /^\d{4}-\d{2}-\d{2}$/.test(dateLine)) {
    const [y, m, d] = dateLine.split('-');
    dateLine = `${d}/${m}/${y}`;
  }

  // Combined display like "15/06/2026 18:30"
  if (!dateLine && isoOrDisplay) {
    const raw = isoOrDisplay.trim();
    const parts = raw.split(/\s*[·,]\s*|\s+/).filter(Boolean);
    if (parts.length >= 2) {
      dateLine = parts[0];
      timeLine = parts.slice(1).join(' ');
    } else if (raw) {
      dateLine = raw;
    }
  }

  return {
    dateLine,
    timeLine,
    sub: [dateLine, timeLine].filter(Boolean).join(' ') || undefined,
  };
}

/** ShipmentLocationLog status codes used by Laravel detail timeline. */
const LOG_START_TRIP = '1';
const LOG_ARRIVAL = '3';
const LOG_COMPLETE_STOP = '5';
const LOG_POD = '9';
const LOG_PAID = '10';
const LOG_ACCEPTED = '11';

function findLogCreatedAt(
  logs: Array<{ status: string; createdAt: string }> | undefined,
  status: string
): string | null {
  const hit = (logs || []).find((log) => String(log.status) === status);
  return hit?.createdAt || null;
}

function findAnyStopLogCreatedAt(
  stops: Shipment['stops'] | undefined,
  status: string
): string | null {
  for (const stop of stops || []) {
    const at = findLogCreatedAt(stop.logs, status);
    if (at) return at;
  }
  return null;
}

/** Progress dots aligned to Laravel detail timeline (location log event times). */
export function buildLaravelProgressSteps(
  shipment: Shipment,
  t: (key: string, opts?: Record<string, unknown>) => string
): LaravelProgressStep[] {
  const isPrivate = (shipment.channel || shipment.vis) !== 'public';
  const status = shipment.status;

  const hasOffers =
    (shipment.offers?.length ?? 0) > 0 ||
    (shipment.bidsReceived ?? 0) > 0 ||
    (shipment.bids ?? 0) > 0;
  const hasInvitees =
    (shipment.invitees?.length ?? 0) > 0 || (shipment.invited ?? 0) > 0;

  let waitingLabel = t('waitingForBid');
  if (hasOffers) {
    waitingLabel = t('pendingOnShipperAcceptance');
  } else if (isPrivate || hasInvitees) {
    waitingLabel = t('pendingOnCarrierAcceptance');
  }

  const acceptedLabel = isPrivate
    ? t('privateShipmentAccepted')
    : t('publicShipmentAccepted');

  const carrierLabel = shipment.carrier
    ? `${t('carrierLabel')}: ${shipment.carrier}`
    : t('carrierAssigned');

  const itineraryStops = groupItineraryStops(shipment.stops, {
    origin: shipment.origin,
    dest: shipment.dest,
    pickDt: shipment.pickDt,
    delDt: shipment.delDt,
  });

  const isPending = status === 'pending' || status === 'draft';
  const isCanceled = status === 'canceled' || status === 'cancelled';
  const beforeTrip =
    status === 'scheduled' ||
    status === 'ready' ||
    status === 'upcoming' ||
    status === 'past_due' ||
    status === 'awarded';
  const onTrip = status === 'on_trip' || status === 'in_progress';
  const fulfilledLike =
    status === 'fullfilled' ||
    status === 'partially_fullfilled' ||
    status === 'delivered' ||
    status === 'not_fullfilled';
  const pastAcceptance = !isPending && !isCanceled;

  // Never fall back to pickup schedule (`shipment.date`) — that is not created_at.
  const createdParts = progressDateTimeParts(shipment.createdAt || null);
  const acceptedAt = findAnyStopLogCreatedAt(shipment.stops, LOG_ACCEPTED);
  const acceptedParts = progressDateTimeParts(acceptedAt);
  const startTripAt =
    findLogCreatedAt(itineraryStops[0]?.logs, LOG_START_TRIP) ||
    findAnyStopLogCreatedAt(shipment.stops, LOG_START_TRIP);
  const startTripParts = progressDateTimeParts(startTripAt);
  const podAt = findAnyStopLogCreatedAt(shipment.stops, LOG_POD);
  const paidAt = findAnyStopLogCreatedAt(shipment.stops, LOG_PAID);

  const steps: LaravelProgressStep[] = [
    {
      id: 'created',
      label: t('tlCreated'),
      state: 'done',
      dateLine: createdParts.dateLine,
      timeLine: createdParts.timeLine,
      sub: createdParts.sub,
    },
  ];

  const pushItinerarySteps = (stateForIndex: (idx: number) => LaravelProgressState) => {
    itineraryStops.forEach((stop, idx) => {
      const state = stateForIndex(idx);
      const arrivalAt = findLogCreatedAt(stop.logs, LOG_ARRIVAL);
      const completeAt = findLogCreatedAt(stop.logs, LOG_COMPLETE_STOP);
      const action = stop.type === 'pickup' ? t('pickup') : t('delivery');

      // Laravel detail: Arrival step only when arrival log (status 3) exists.
      if (arrivalAt) {
        const arrivalParts = progressDateTimeParts(arrivalAt);
        steps.push({
          id: `arrival-${idx}`,
          label: `${t('arrival')} · ${stop.location}`,
          state: 'done',
          dateLine: arrivalParts.dateLine,
          timeLine: arrivalParts.timeLine,
          sub: arrivalParts.sub,
        });
      }

      const completeParts = progressDateTimeParts(completeAt);
      steps.push({
        id: `itin-${idx}`,
        label: `${action} · ${stop.location}`,
        state,
        dateLine: completeParts.dateLine,
        timeLine: completeParts.timeLine,
        sub: completeParts.sub,
      });
    });
  };

  if (isCanceled) {
    steps.push({
      id: 'canceled',
      label: t(status === 'cancelled' ? 'cancelled' : 'canceled'),
      state: 'pending',
    });
    pushItinerarySteps(() => 'skip');
    return steps;
  }

  if (isPending) {
    steps.push({ id: 'waiting', label: waitingLabel, state: 'cur' });
    pushItinerarySteps(() => 'skip');
    return steps;
  }

  steps.push({
    id: 'accepted',
    label: acceptedLabel,
    state: 'done',
    dateLine: acceptedParts.dateLine,
    timeLine: acceptedParts.timeLine,
    sub: acceptedParts.sub,
  });

  let carrierState: LaravelProgressState = 'skip';
  if (pastAcceptance) {
    carrierState = beforeTrip ? 'cur' : 'done';
  }
  steps.push({
    id: 'carrier',
    label: carrierLabel,
    state: carrierState,
    // Laravel shows "Bid accepted {time}" under carrier when available.
    dateLine: acceptedParts.dateLine,
    timeLine: acceptedParts.timeLine,
    sub: acceptedParts.sub,
  });

  let startState: LaravelProgressState = 'skip';
  if (onTrip || fulfilledLike) startState = 'done';
  else if (beforeTrip) startState = 'skip';
  else if (pastAcceptance) startState = 'cur';
  steps.push({
    id: 'start_trip',
    label: t('startTrip'),
    state: startState,
    dateLine: startTripParts.dateLine,
    timeLine: startTripParts.timeLine,
    sub: startTripParts.sub,
  });

  const currentItinIndex = onTrip ? findCurrentItineraryIndex(itineraryStops) : -1;

  pushItinerarySteps((idx) => {
    if (fulfilledLike && status !== 'not_fullfilled') return 'done';
    if (status === 'not_fullfilled') return 'pending';
    if (onTrip) {
      if (idx < currentItinIndex) return 'done';
      if (idx === currentItinIndex) return 'cur';
      return 'skip';
    }
    return 'skip';
  });

  if (fulfilledLike) {
    const podParts = progressDateTimeParts(podAt);
    const allPodsUploaded =
      Boolean(podAt) ||
      (shipment.stops || [])
        .filter((s) => s.type === 'delivery')
        .every((s) => String(s.pod ?? '0') === '1');
    steps.push({
      id: 'pod',
      label: allPodsUploaded ? t('podUploaded') : t('awaitingPod'),
      state: allPodsUploaded ? 'done' : status === 'not_fullfilled' ? 'pending' : 'cur',
      dateLine: podParts.dateLine,
      timeLine: podParts.timeLine,
      sub: podParts.sub,
    });
  }

  let paymentState: LaravelProgressState = 'skip';
  let paymentLabel = t('paymentPending');
  const paidParts = progressDateTimeParts(paidAt);
  if (fulfilledLike) {
    if (shipment.paymentStatus === 'paid' || paidAt) {
      paymentState = 'success';
      paymentLabel = t('paymentSuccessful');
    } else {
      paymentState = status === 'not_fullfilled' ? 'pending' : 'cur';
    }
  }
  steps.push({
    id: 'payment',
    label: paymentLabel,
    state: paymentState,
    dateLine: paidParts.dateLine,
    timeLine: paidParts.timeLine,
    sub: paidParts.sub,
  });

  return steps;
}

export function formatStatValue(
  value: number | string | null | undefined,
  suffix?: string | null
): string {
  if (value === null || value === undefined || value === '') return '—';
  const text = typeof value === 'number' ? value.toLocaleString() : String(value);
  return suffix ? `${text} ${suffix}` : text;
}

/** Compact relative time for list/expansion (i18n via `t`). */
export function formatRelativeAgo(
  isoOrDate: string | Date | null | undefined,
  t?: (key: string, opts?: Record<string, unknown>) => string
): string {
  if (!isoOrDate) return '';
  const ts =
    typeof isoOrDate === 'string'
      ? (parseUtcInstant(isoOrDate)?.getTime() ?? Date.parse(isoOrDate))
      : isoOrDate.getTime();
  if (!Number.isFinite(ts)) return typeof isoOrDate === 'string' ? isoOrDate : '';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  const tr = t ?? ((key: string, opts?: Record<string, unknown>) => {
    if (key === 'justNow') return 'Just now';
    if (key === 'relativeSeconds') return `${opts?.count ?? 0}s ago`;
    if (key === 'relativeMinutes') return `${opts?.count ?? 0}m ago`;
    if (key === 'relativeHours') return `${opts?.count ?? 0}h ago`;
    if (key === 'relativeDays') return `${opts?.count ?? 0}d ago`;
    return key;
  });
  if (sec < 60) return tr('justNow');
  const min = Math.floor(sec / 60);
  if (min < 60) return tr('relativeMinutes', { count: min });
  const hrs = Math.floor(min / 60);
  if (hrs < 48) return tr('relativeHours', { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 14) return tr('relativeDays', { count: days });
  return formatUtcToDisplayDateTime(new Date(ts).toISOString());
}
