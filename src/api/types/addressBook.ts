export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiListMeta;
}

export interface ApiListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page?: number;
}

export interface ApiLocationListItem {
  id: number;
  location_name: string;
  company_name: string;
  company_vat: string;
  type: 'my_locations' | 'customers';
  location: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  latitude: string;
  longitude: string;
  location_subtype: string | null;
  location_role: 'pickup' | 'delivery' | 'both' | 'dropoff' | null;
  location_code: string | null;
  appointment_required?: boolean;
  receiving_hours?: string | null;
  dock_type?: string | null;
  load_time_minutes?: number | null;
  max_truck_length?: string | null;
  max_weight?: string | null;
  usage_history_count?: number;
  region?: string | null;
  created_at: string | null;
  deleted_at?: string | null;
}

export interface ApiTimeRange {
  id: number;
  start_time: string;
  end_time: string;
}

export interface ApiContact {
  id?: number;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
}

export interface ApiAmenity {
  id: number;
  name: string;
}

export interface ApiLocationDetail extends ApiLocationListItem {
  customer_code: string | null;
  region: string | null;
  tags: string[];
  internal_note: string | null;
  carrier_note: string | null;
  appointment_required: boolean;
  receiving_hours: string | null;
  dock_type: string | null;
  equipment: string[];
  max_truck_length: string | null;
  max_weight: string | null;
  adr_allowed: boolean;
  pallet_exchange: boolean;
  load_time_minutes: number | null;
  geo_verified: boolean;
  amenities: ApiAmenity[];
  time_ranges: ApiTimeRange[];
  contacts: ApiContact[];
  updated_at: string | null;
}

export interface ApiAddressBookSummary {
  all: number;
  my_locations: number;
  customers: number;
  archived: number;
}

export interface ApiLocationStats {
  shipments_30d: number;
  shipments_90d: number;
  last_used_at: string | null;
  otd_percent: number;
}

export interface ApiCompanyEntity {
  id: number;
  name: string;
  vat_number: string;
  country?: string;
  address?: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  industry?: string | null;
  primary_contact?: string | null;
}

export interface ApiCompanyEntityPayload {
  name: string;
  vat_number: string;
  address: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  primary_contact?: string;
}

export interface ApiCompanyLookup {
  company_name: string;
  company_vat: string;
}

export interface ApiDuplicateCheckResult {
  duplicate: boolean;
  existing_id: number | null;
}

export interface ApiLocationPayload {
  location_type: 'my_locations' | 'customers';
  company_entity_id?: number | null;
  quick_template?: string | null;
  location_name: string;
  company_name: string;
  company_vat: string;
  location: string;
  lat: string;
  lng: string;
  city: string;
  postal_code: string;
  phone?: string;
  email?: string;
  amenities?: number[];
  time_ranges?: { id?: number | null; start_time: string; end_time: string }[];
  contacts?: { id?: number | null; name: string; role?: string; phone?: string; email?: string }[];
  location_subtype?: string | null;
  location_role?: 'pickup' | 'delivery' | 'dropoff' | 'both' | null;
  location_code?: string | null;
  customer_code?: string | null;
  region?: string | null;
  tags?: string[];
  internal_note?: string | null;
  carrier_note?: string | null;
  appointment_required?: boolean;
  receiving_hours?: string | null;
  dock_type?: string | null;
  equipment?: string[];
  max_truck_length?: string | null;
  max_weight?: string | null;
  adr_allowed?: boolean;
  pallet_exchange?: boolean;
  load_time_minutes?: number | null;
}

export interface ListLocationsParams {
  type?: 'my_locations' | 'customers' | 'all';
  search?: string;
  sort?: 'name' | 'city' | 'created' | 'last_used';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  status?: 'active' | 'archived';
  location_role?: 'pickup' | 'delivery' | 'both';
  location_subtype?: string;
  city?: string;
  appointment_required?: boolean | 1 | 0;
  has_receiving_hours?: boolean | 1 | 0;
}
