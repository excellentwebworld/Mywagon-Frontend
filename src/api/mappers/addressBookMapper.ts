import type { Contact, LocationItem } from '../../context/AppContext';
import type { CreateLocationData, AddressBookSortField } from '../../pages/AddressBook/types';
import { normalizeFacilityType } from '../../pages/AddressBook/constants';
import type {
  ApiLocationDetail,
  ApiLocationListItem,
  ApiLocationPayload,
  ApiLocationStats,
  ListLocationsParams,
} from '../types/addressBook';

function parseCoord(value: string | null | undefined, fallback = 0): number {
  const n = parseFloat(value ?? '');
  return Number.isFinite(n) ? n : fallback;
}

function formatLastUsed(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function mapGroup(type: ApiLocationListItem['type']): LocationItem['group'] {
  return type === 'customers' ? 'customer' : 'my';
}

function mapRole(role: string | null | undefined): LocationItem['role'] {
  if (role === 'pickup' || role === 'delivery' || role === 'both') return role;
  if (role === 'dropoff') return 'delivery';
  return 'both';
}

function formatFacilityType(subtype: string | null | undefined): string {
  return normalizeFacilityType(subtype);
}

export function mapListItemToLocation(item: ApiLocationListItem): LocationItem {
  return {
    id: String(item.id),
    name: item.location_name ?? '',
    company: item.company_name ?? '',
    companyVat: item.company_vat ?? '',
    group: mapGroup(item.type),
    city: item.city ?? '',
    region: item.region ?? '',
    address: item.location ?? '',
    lat: parseCoord(item.latitude),
    lng: parseCoord(item.longitude),
    geoVerified: Boolean(item.latitude && item.longitude),
    role: mapRole(item.location_role),
    type: formatFacilityType(item.location_subtype),
    appt: Boolean(item.appointment_required),
    hours: item.receiving_hours ?? (item.load_time_minutes ? String(item.load_time_minutes) : ''),
    dock: item.dock_type ?? '',
    equipment: [],
    maxTruck: item.max_truck_length ?? '',
    maxWeight: item.max_weight ?? '',
    adr: false,
    palletExchange: false,
    loadTime: item.load_time_minutes ?? 0,
    contacts: item.phone || item.email
      ? [{ name: item.company_name ?? 'Contact', role: 'Receiving', phone: item.phone ?? '', email: item.email ?? '' }]
      : [],
    tags: [],
    code: item.location_code ?? '',
    custCode: '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    lastUsed: 'Never',
    usageHistoryCount: item.usage_history_count ?? 0,
    shipments30: 0,
    shipments90: 0,
    otd: 100,
    noteInternal: '',
    noteCarrier: '',
    status: item.deleted_at ? 'archived' : 'active',
    created: item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
  };
}

export function mapDetailToLocation(detail: ApiLocationDetail, stats?: ApiLocationStats): LocationItem {
  const base = mapListItemToLocation(detail);

  return {
    ...base,
    region: detail.region ?? '',
    appt: detail.appointment_required,
    hours: detail.receiving_hours ?? '',
    dock: detail.dock_type ?? '',
    equipment: detail.equipment ?? [],
    maxTruck: detail.max_truck_length ?? '',
    maxWeight: detail.max_weight ?? '',
    adr: detail.adr_allowed,
    palletExchange: detail.pallet_exchange,
    loadTime: detail.load_time_minutes ?? 0,
    contacts: (detail.contacts ?? []).map(
      (c): Contact => ({
        name: c.name,
        role: c.role ?? '',
        phone: c.phone ?? '',
        email: c.email ?? '',
      })
    ),
    tags: detail.tags ?? [],
    code: detail.location_code ?? '',
    custCode: detail.customer_code ?? '',
    phone: detail.phone ?? '',
    email: detail.email ?? '',
    postalCode: detail.postal_code ?? '',
    noteInternal: detail.internal_note ?? '',
    noteCarrier: detail.carrier_note ?? '',
    geoVerified: detail.geo_verified,
    amenityIds: (detail.amenities ?? []).map((a) => a.id),
    timeRanges: (detail.time_ranges ?? []).map((tr) => ({
      id: tr.id,
      start_time: tr.start_time,
      end_time: tr.end_time,
    })),
    shipments30: stats?.shipments_30d ?? 0,
    shipments90: stats?.shipments_90d ?? 0,
    otd: stats?.otd_percent ?? 100,
    lastUsed: stats ? formatLastUsed(stats.last_used_at) : base.lastUsed,
  };
}

export function mapLocationToPayload(data: CreateLocationData): ApiLocationPayload {
  const tags = data.tags
    ? data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return {
    location_type: data.context === 'customer' ? 'customers' : 'my_locations',
    company_entity_id: data.companyEntityId,
    quick_template: data.template || null,
    location_name: data.name.trim(),
    company_name: data.company.trim(),
    company_vat: data.companyVat.trim(),
    location: data.address.trim(),
    lat: data.lat.trim(),
    lng: data.lng.trim(),
    city: data.city.trim(),
    postal_code: data.postal.trim(),
    phone: data.phone?.trim() ?? '',
    email: data.email?.trim() ?? '',
    amenities: data.amenityIds ?? [],
    time_ranges: (data.timeRanges ?? []).map((tr) => ({
      id: tr.id ?? null,
      start_time: tr.start_time,
      end_time: tr.end_time,
    })),
    contacts: (data.contacts ?? [])
      .filter((c) => c.name.trim())
      .map((c) => ({
        id: c.id ?? null,
        name: c.name.trim(),
        role: c.role,
        phone: c.phone,
        email: c.email,
      })),
    location_subtype: normalizeFacilityType(data.type),
    location_role: data.role,
    location_code: data.code || null,
    customer_code: data.custCode || null,
    region: data.region || null,
    tags,
    internal_note: data.noteInternal || null,
    carrier_note: data.noteCarrier || null,
    appointment_required: data.appt,
    receiving_hours: data.hours || null,
    dock_type: data.dock || null,
    equipment: data.equipment,
    max_truck_length: data.maxTruck || null,
    max_weight: data.maxWeight || null,
    adr_allowed: data.adr,
    pallet_exchange: data.palletExchange,
    load_time_minutes: parseInt(data.loadTime, 10) || null,
  };
}

export function mapLocationItemToPayload(loc: LocationItem): ApiLocationPayload {
  return {
    location_type: loc.group === 'customer' ? 'customers' : 'my_locations',
    location_name: loc.name.trim(),
    company_name: loc.company.trim(),
    company_vat: loc.companyVat.trim(),
    location: loc.address.trim(),
    lat: String(loc.lat),
    lng: String(loc.lng),
    city: loc.city.trim(),
    postal_code: loc.postalCode?.trim() ?? '',
    phone: loc.phone ?? '',
    email: loc.email ?? '',
    amenities: loc.amenityIds ?? [],
    time_ranges: (loc.timeRanges ?? []).map((tr) => ({
      id: tr.id ?? null,
      start_time: tr.start_time,
      end_time: tr.end_time,
    })),
    contacts: (loc.contacts ?? []).map((c) => ({
      id: c.id ?? null,
      name: c.name,
      role: c.role,
      phone: c.phone,
      email: c.email,
    })),
    location_subtype: normalizeFacilityType(loc.type),
    location_role: loc.role,
    location_code: loc.code || null,
    customer_code: loc.custCode || null,
    region: loc.region || null,
    tags: loc.tags,
    internal_note: loc.noteInternal || null,
    carrier_note: loc.noteCarrier || null,
    appointment_required: loc.appt,
    receiving_hours: loc.hours || null,
    dock_type: loc.dock?.trim() || '',
    equipment: loc.equipment,
    max_truck_length: loc.maxTruck?.trim() || '',
    max_weight: loc.maxWeight?.trim() || '',
    adr_allowed: loc.adr,
    pallet_exchange: loc.palletExchange,
    load_time_minutes: (() => {
      const minutes = typeof loc.loadTime === 'number' ? loc.loadTime : parseInt(String(loc.loadTime ?? ''), 10);
      return Number.isFinite(minutes) && minutes >= 1 ? minutes : 1;
    })(),
  };
}

export function directoryToListParams(
  activeNode: string,
  search: string,
  sortField: AddressBookSortField,
  sortDir: 'asc' | 'desc',
  page: number,
  perPage: number
): ListLocationsParams {
  const params: ListLocationsParams = {
    sort: sortField,
    sort_dir: sortDir,
    page,
    per_page: perPage,
  };

  if (search.trim()) {
    params.search = search.trim();
  }

  if (activeNode === 'archived') {
    params.status = 'archived';
    params.type = 'all';
  } else if (activeNode === 'my') {
    params.type = 'my_locations';
    params.status = 'active';
  } else if (activeNode === 'customer') {
    params.type = 'customers';
    params.status = 'active';
  } else {
    params.type = 'all';
    params.status = 'active';
  }

  return params;
}

export function listParamsToExportQuery(params: ListLocationsParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.type) query.type = params.type;
  if (params.search) query.search = params.search;
  if (params.status) query.status = params.status;
  return query;
}
