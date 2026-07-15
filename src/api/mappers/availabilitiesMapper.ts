import type {
  ApiAvailabilityListItem,
  ApiPendingMatch,
  ListAvailabilitiesParams,
} from '../types/availabilities';
import type {
  AvailableTruck,
  PendingShipment,
  ProviderType,
  SearchCriteria,
  SortKey,
  TripType,
  VisibilityFilter,
  QuickFilterKey,
} from '../../pages/SearchTrucks/types';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function splitDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) {
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
  return {
    date: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function relativePosted(postedAt: string | null): string {
  if (!postedAt) return '—';
  const d = new Date(postedAt.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
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
  const pickup = item.pickup_city || item.pickup_address || '—';
  const dest = item.dropoff_city || item.dropoff_address || 'Any';
  const specs = (item.cargo_categories ?? []).join(' · ');
  const capVal = item.capacity_qty ?? 0;
  const capUnit = item.capacity_unit ?? '';
  const capacity = capVal ? `${capVal}${capUnit ? ` ${capUnit}` : ''}` : '—';

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
    radius: item.pickup_radius ?? 0,
    dest,
    truckType: item.truck_type || '—',
    specs,
    capacity,
    capVal,
    capUnit,
    trip: mapTrip(item.trip_type),
    carrier: item.provider?.name || '—',
    initials: item.provider?.initials || '?',
    rating: item.provider?.rating ?? 0,
    type: mapProviderType(item.provider?.type || 'freelancer'),
    preferred: Boolean(item.provider?.preferred),
    price: item.price_blurred ? null : item.price,
    priceBlurred: Boolean(item.price_blurred),
    currency: item.currency || 'EUR',
    posted: relativePosted(item.posted_at),
    recurring: Boolean(item.recurring),
    occurrences: [],
    recurrenceLabel: '',
    pickupLat: item.pickup_lat ?? 0,
    pickupLng: item.pickup_lng ?? 0,
    destLat: item.dropoff_lat,
    destLng: item.dropoff_lng,
    hasBids: item.has_bids ?? undefined,
    bidsCount: item.bids_count,
    bestBid: item.best_bid,
    loadMatchScore: item.load_match_score ?? undefined,
  };
}

export function mapPendingMatch(item: ApiPendingMatch): PendingShipment {
  return {
    id: item.id,
    sid: item.load_id || `SHP-${item.id}`,
    lane: item.lane,
    pickup: item.pickup_city || '—',
    weight: item.total != null ? `€ ${item.total}` : '—',
    stops: item.stops_count ?? 0,
    exactMatch: item.exact_match,
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
  if (criteria.pickupCity.trim()) params.pickup_city = criteria.pickupCity.trim();
  if (criteria.dropoffCity.trim()) params.dropoff_city = criteria.dropoffCity.trim();

  const pickupDate = toApiPickupDate(criteria.pickupDate);
  if (pickupDate) params.pickup_date = pickupDate;

  const bounds = criteria.mapBounds;
  if (
    bounds &&
    Number.isFinite(bounds.neLat) &&
    Number.isFinite(bounds.neLng) &&
    Number.isFinite(bounds.swLat) &&
    Number.isFinite(bounds.swLng)
  ) {
    params.pickup_ne_lat = bounds.neLat;
    params.pickup_ne_lng = bounds.neLng;
    params.pickup_sw_lat = bounds.swLat;
    params.pickup_sw_lng = bounds.swLng;
  } else if (criteria.pickupLat != null && criteria.pickupLng != null) {
    params.pickup_lat = criteria.pickupLat;
    params.pickup_lng = criteria.pickupLng;
    params.pickup_radius = criteria.pickupRadius ?? 50;
  }
  if (criteria.dropoffLat != null && criteria.dropoffLng != null) {
    params.dropoff_lat = criteria.dropoffLat;
    params.dropoff_lng = criteria.dropoffLng;
    params.dropoff_radius = criteria.dropoffRadius ?? 50;
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

  return params;
}
