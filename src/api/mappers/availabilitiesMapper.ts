import type {
  ApiAvailabilityListItem,
  ApiPendingMatch,
  ApiPendingMatchDetail,
  ListAvailabilitiesParams,
} from '../types/availabilities';
import type {
  AvailableTruck,
  PendingMatchDetail,
  PendingMatchSnapshot,
  PendingShipment,
  ProviderType,
  SearchCriteria,
  SortKey,
  TripType,
  VisibilityFilter,
  QuickFilterKey,
} from '../../pages/SearchTrucks/types';
import { formatMoney } from '../../pages/SearchTrucks/utils/money';
import { formatUtcToDisplayDate, formatUtcToDisplayDateTime, formatUtcToDisplayTime, parseUtcInstant } from '../../utils/timezone';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function scheduleLabel(iso?: string | null, fallback?: string | null): string | null {
  if (iso) {
    const formatted = formatUtcToDisplayDateTime(iso);
    if (formatted) return formatted;
  }
  const raw = (fallback || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (match) {
    const [, d, m, y, hh, mm] = match;
    const date = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    return hh != null && mm != null ? `${date} ${hh.padStart(2, '0')}:${mm}` : date;
  }
  return raw;
}

function splitDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '—', time: '' };
  const parsed = parseUtcInstant(iso);
  if (parsed) {
    return {
      date: formatUtcToDisplayDate(iso),
      time: formatUtcToDisplayTime(iso),
    };
  }
  const [datePart, timePart = ''] = iso.split(/[T ]/);
  const [y, m, day] = datePart.split('-');
  if (y && m && day) {
    return {
      date: `${day}/${m}/${y}`,
      time: timePart.slice(0, 5),
    };
  }
  return { date: iso, time: '' };
}

function relativePosted(postedAt: string | null): string {
  if (!postedAt) return '—';
  const d = parseUtcInstant(postedAt);
  if (!d) return '—';
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** Real map point (rejects null and 0,0 Null Island placeholders). */
function isRealMapCoord(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

function mapTrip(tripType: ApiAvailabilityListItem['trip_type']): TripType {
  return tripType === 'multi_stop' ? 'Multi-stop OK' : 'Direct only';
}

function mapProviderType(type: string): ProviderType {
  return type === 'carrier' ? 'Carrier' : 'Freelancer';
}

/** Convert UI date DD/MM/YYYY or YYYY-MM-DD to API YYYY-MM-DD */
export function toApiPickupDate(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return `${m[3]}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  }
  return undefined;
}

export function mapListItemToTruck(item: ApiAvailabilityListItem): AvailableTruck {
  const start = splitDateTime(item.start_date_time);
  const end = splitDateTime(item.end_date_time);
  const pickupCity = (item.pickup_city || '').trim();
  const pickupAddr = (item.pickup_address || '').trim();
  const dropoffCity = (item.dropoff_city || '').trim();
  const dropoffAddr = (item.dropoff_address || '').trim();
  // Prefer full street address (parity with Laravel SearchAvailabilityDataTable).
  const pickupAddress = pickupAddr || pickupCity || '—';
  const hasDropoffPlace = Boolean(dropoffAddr || dropoffCity);
  const destAddress = hasDropoffPlace ? dropoffAddr || dropoffCity : 'Any';
  const pickup = pickupAddress;
  const dest = destAddress;
  const specs = (item.cargo_categories ?? []).join(' · ');
  const capVal = item.capacity_qty ?? 0;
  const capUnit = item.capacity_unit ?? '';
  const capacity = capVal ? `${capVal}${capUnit ? ` ${capUnit}` : ''}` : '—';

  // Any-direction rows often store 0,0 (Null Island) — never treat as a real dropoff pin.
  const destLat = hasDropoffPlace && isRealMapCoord(item.dropoff_lat, item.dropoff_lng)
    ? item.dropoff_lat
    : null;
  const destLng = hasDropoffPlace && isRealMapCoord(item.dropoff_lat, item.dropoff_lng)
    ? item.dropoff_lng
    : null;
  const destRadius =
    hasDropoffPlace && item.dropoff_radius != null && Number(item.dropoff_radius) > 0
      ? Number(item.dropoff_radius)
      : null;

  return {
    id: String(item.id),
    vis: item.visibility,
    label: String(item.id),
    startDt: start.date,
    startTm: start.time || '00:00',
    endDt: end.date,
    endTm: end.time || '23:59',
    startAt: item.start_date_time,
    pickup,
    pickupAddress,
    radius: item.pickup_radius ?? 0,
    destRadius,
    dest,
    destAddress,
    truckType: item.truck_type || '—',
    specs,
    capacity,
    capVal,
    capUnit,
    trip: mapTrip(item.trip_type),
    multiStop: item.trip_type === 'multi_stop',
    carrier: item.provider?.name || '—',
    initials: item.provider?.initials || '?',
    rating: item.provider?.rating ?? 0,
    type: mapProviderType(item.provider?.type || 'freelancer'),
    preferred: Boolean(item.provider?.preferred),
    providerId: item.provider?.id ?? null,
    partnerId: item.provider?.partner_id ?? null,
    price: item.price_blurred ? null : item.price ?? null,
    priceBlurred: Boolean(item.price_blurred),
    currency: item.currency || 'EUR',
    posted: relativePosted(item.posted_at),
    recurring: Boolean(item.recurring),
    occurrences: [],
    recurrenceLabel: '',
    onTimeDeliveryPct: item.provider?.on_time_delivery_pct ?? null,
    cancellationRate: item.provider?.cancellation_rate_pct ?? null,
    pickupLat: item.pickup_lat ?? 0,
    pickupLng: item.pickup_lng ?? 0,
    destLat,
    destLng,
    hasBids: item.has_bids ?? undefined,
    bidsCount: item.bids_count,
    bestBid: item.best_bid,
    loadMatchScore: item.load_match_score ?? undefined,
  };
}

export function mapPendingMatch(item: ApiPendingMatch): PendingShipment {
  const quoted = item.quoted_price ?? item.total;
  return {
    id: item.id,
    sid: item.load_id || `SHP-${item.id}`,
    lane: item.lane,
    pickup: item.origin || item.pickup_city || '—',
    weight: quoted != null ? formatMoney(quoted, 'EUR') : '—',
    stops: item.stops_count ?? 0,
    exactMatch: item.exact_match,
    customers: item.customers ?? [],
    quotedPrice: quoted,
    channel: item.channel === 'private' ? 'private' : 'public',
    truckTypes: item.truck_types ?? [],
    origin: item.origin ?? item.pickup_city,
    dest: item.dest ?? item.dropoff_city,
    pickupAt: scheduleLabel(item.pickup_at_iso, item.pickup_at),
    deliveryAt: scheduleLabel(item.delivery_at_iso, item.delivery_at),
    intermediateStops: item.intermediate_stops ?? Math.max((item.stops_count ?? 2) - 2, 0),
    orderIds: item.order_ids ?? [],
    ordersCount: item.orders_count ?? (item.order_ids?.length ?? 0),
    negotiable: item.negotiable ?? item.price_type === 1,
  };
}

export function mapPendingMatchDetail(item: ApiPendingMatchDetail): PendingMatchDetail {
  const base = mapPendingMatch(item);
  const snap = item.snapshot;
  const snapshot: PendingMatchSnapshot | null = snap
    ? {
        sid: snap.load_id || base.sid,
        lane: snap.lane || base.lane,
        channel: snap.channel === 'private' ? 'private' : 'public',
        customers: snap.customers ?? base.customers ?? [],
        quotedPrice: snap.quoted_price ?? snap.total ?? base.quotedPrice ?? null,
        truckTypes: snap.truck_types ?? base.truckTypes ?? [],
        negotiable: Boolean(snap.negotiable),
        note: snap.note ?? null,
        stops: (snap.stops ?? []).map((s) => ({
          id: s.id ?? null,
          type: s.type,
          companyName: s.company_name,
          locationName: s.location_name,
          address: s.address,
          fromDate: scheduleLabel(s.from_date_iso, s.from_date),
          toDate: scheduleLabel(s.to_date_iso, s.to_date),
          fromDateIso: s.from_date_iso ?? null,
          toDateIso: s.to_date_iso ?? null,
          date: s.date ?? null,
          timeStart: s.time_start ?? null,
          timeEnd: s.time_end ?? null,
          orderId: s.order_id,
          productName: s.product_name ?? null,
          lat: s.lat,
          lng: s.lng,
          qty: s.qty,
          qtyUnit: s.qty_unit ?? null,
          weight: s.weight,
          weightUnit: s.weight_unit ?? null,
          products: (s.products ?? []).map((p) => ({
            name: p.name,
            qty: p.qty,
            qtyUnit: p.qty_unit,
            weight: p.weight,
            weightUnit: p.weight_unit,
          })),
        })),
        partners: (snap.partners ?? []).map((p) => ({
          id: p.id,
          partnerId: p.partner_id,
          name: p.name,
          status: p.status,
        })),
        offers: (snap.offers ?? []).map((o) => ({
          id: o.id,
          price: o.price,
          status: o.status,
          bidableType: o.bidable_type,
          carrierName: o.carrier_name ?? o.name ?? null,
          name: o.name ?? o.carrier_name ?? null,
          initials: o.initials ?? null,
          avatar: o.avatar ?? null,
          rating: o.rating ?? null,
          ratingCount: o.rating_count ?? 0,
          vat: o.vat ?? null,
          isPartner: Boolean(o.is_partner),
          role: o.role ?? null,
          respondedAt: o.responded_at ?? null,
          kind: o.kind ?? null,
          type: o.type ?? 'bid',
        })),
      }
    : null;

  return {
    ...base,
    matchScore: item.match_score
      ? {
          capacityFit: item.match_score.capacity_fit,
          itineraryFit: item.match_score.itinerary_fit,
          timingFit: item.match_score.timing_fit,
        }
      : null,
    canViewMatchScore: Boolean(item.can_view_match_score),
    snapshot,
  };
}

export function buildListParams(input: {
  page: number;
  perPage: number;
  visibility: VisibilityFilter;
  search: string;
  sort: SortKey;
  criteria: SearchCriteria;
  quickFilters: Set<QuickFilterKey>;
}): ListAvailabilitiesParams {
  const { page, perPage, visibility, search, sort, criteria, quickFilters } = input;
  const params: ListAvailabilitiesParams = {
    page,
    per_page: perPage,
    visibility,
    sort,
  };

  if (search.trim()) params.search = search.trim();

  const pickupDate = toApiPickupDate(criteria.pickupDate);
  if (pickupDate) params.pickup_date = pickupDate;

  const dropoffDate = toApiPickupDate(criteria.dropoffDate || '');
  if (dropoffDate) params.dropoff_date = dropoffDate;

  const bounds = criteria.mapBounds;
  const hasPickupBounds =
    Boolean(bounds) &&
    Number.isFinite(bounds!.neLat) &&
    Number.isFinite(bounds!.neLng) &&
    Number.isFinite(bounds!.swLat) &&
    Number.isFinite(bounds!.swLng);
  const hasPickupGeo =
    criteria.pickupLat != null &&
    criteria.pickupLng != null &&
    Number.isFinite(criteria.pickupLat) &&
    Number.isFinite(criteria.pickupLng);
  const hasDropoffGeo =
    criteria.dropoffLat != null &&
    criteria.dropoffLng != null &&
    Number.isFinite(criteria.dropoffLat) &&
    Number.isFinite(criteria.dropoffLng);

  // Bounds override radius. With center+radius, also send city text so BE can OR
  // radius with pickup_city/address LIKE (Places locality often ≠ DB strings).
  if (hasPickupBounds) {
    params.pickup_ne_lat = bounds!.neLat;
    params.pickup_ne_lng = bounds!.neLng;
    params.pickup_sw_lat = bounds!.swLat;
    params.pickup_sw_lng = bounds!.swLng;
  } else if (hasPickupGeo) {
    params.pickup_lat = criteria.pickupLat!;
    params.pickup_lng = criteria.pickupLng!;
    params.pickup_radius = criteria.pickupRadius ?? 100;
    if (criteria.pickupCity.trim()) {
      params.pickup_city = criteria.pickupCity.trim();
    }
  } else if (criteria.pickupCity.trim()) {
    params.pickup_city = criteria.pickupCity.trim();
  }

  if (hasDropoffGeo) {
    params.dropoff_lat = criteria.dropoffLat!;
    params.dropoff_lng = criteria.dropoffLng!;
    params.dropoff_radius = criteria.dropoffRadius ?? 100;
  } else if (criteria.dropoffCity.trim()) {
    params.dropoff_city = criteria.dropoffCity.trim();
  }

  const typeIdsFromSpecs = Object.keys(criteria.vehicleSpecs || {})
    .filter((k) => (criteria.vehicleSpecs[k]?.length ?? 0) > 0)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0);
  const truckTypeIds =
    typeIdsFromSpecs.length > 0
      ? Array.from(new Set([...criteria.truckTypeIds, ...typeIdsFromSpecs]))
      : criteria.truckTypeIds;
  if (truckTypeIds?.length) {
    params.truck_type_ids = truckTypeIds;
  }

  const categoryIds = Object.values(criteria.vehicleSpecs || {})
    .flat()
    .map((id) => Number(id))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (categoryIds.length) {
    params.truck_category_ids = Array.from(new Set(categoryIds));
  }

  if (quickFilters.has('today')) params.available_today = true;
  if (quickFilters.has('soon8h')) params.starting_within_hours = 8;
  if (quickFilters.has('has_bids')) params.has_bids = true;
  if (quickFilters.has('load_match')) params.load_match = true;

  if (criteria.tripType === 'multi_stop' || criteria.tripType === 'direct') {
    params.trip_type = criteria.tripType;
  }

  const availStart = toApiPickupDate(criteria.availableFromStart || '');
  if (availStart) params.available_from_start = availStart;
  const availEnd = toApiPickupDate(criteria.availableFromEnd || '');
  if (availEnd) params.available_from_end = availEnd;

  if (criteria.providerNames?.length) {
    params.provider_names = criteria.providerNames;
  }

  const minPrice = parseFloat(criteria.minPrice || '');
  if (Number.isFinite(minPrice)) params.min_price = minPrice;
  const maxPrice = parseFloat(criteria.maxPrice || '');
  if (Number.isFinite(maxPrice)) params.max_price = maxPrice;

  return params;
}
