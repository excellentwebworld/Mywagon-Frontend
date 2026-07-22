import type { ApiListMeta } from './addressBook';
import type { QuickFilterKey, SortKey, VisibilityFilter } from '../../pages/SearchTrucks/types';

export interface ApiAvailabilityProvider {
  type: 'carrier' | 'freelancer';
  id?: number | null;
  /** Shipper↔provider partners.id when a relationship exists */
  partner_id?: number | null;
  name: string;
  initials: string;
  rating: number;
  preferred: boolean;
  /** Detail only — null when unknown / no history */
  on_time_delivery_pct?: number | null;
  cancellation_rate_pct?: number | null;
}

export interface ApiAvailabilityListItem {
  id: number;
  visibility: 'public' | 'private';
  start_date_time: string | null;
  end_date_time: string | null;
  posted_at: string | null;
  pickup_city: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_radius: number | null;
  dropoff_city: string | null;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_radius: number | null;
  truck_type: string | null;
  cargo_categories: string[];
  capacity_qty: number | null;
  capacity_unit: string | null;
  trip_type: 'direct' | 'multi_stop';
  provider: ApiAvailabilityProvider;
  price: number | null;
  price_blurred: boolean;
  currency: string;
  has_bids: boolean | null;
  bids_count: number | null;
  best_bid: number | null;
  load_match_score: number | null;
  recurring: boolean;
}

export interface ApiAvailabilityDetail extends ApiAvailabilityListItem {
  bids_summary?: {
    count: number | null;
    best_bid: number | null;
  };
}

export interface ApiPendingMatch {
  id: number;
  load_id: string | null;
  status: string;
  total: number | null;
  price_type: number | null;
  pickup_city: string | null;
  dropoff_city: string | null;
  lane: string;
  stops_count: number;
  from_date: string | null;
  truck_types: string[];
  exact_match?: boolean;
}

export interface ApiAvailabilityPrefill {
  pickup_city: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_city: string | null;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  start_date_time: string | null;
  end_date_time: string | null;
  truck_type: string | null;
  truck_type_id?: number | null;
  provider_name: string | null;
  availability_reach: string | null;
  price: number | null;
}

export interface ApiProceedResult {
  next: 'create_shipment' | 'pending_matches';
  availability_id: number;
  permissions: {
    can_create_shipment: boolean;
    can_view_exact_matches: boolean;
    can_place_bid: boolean;
  };
  prefill: ApiAvailabilityPrefill;
}

export interface ApiPlaceBidResult {
  bid_id: number;
  shipment_id: number;
  availability_id: number;
  status: string;
  is_availability_bid: boolean;
  price: number | string | null;
}

export interface ListAvailabilitiesParams {
  page?: number;
  per_page?: number;
  visibility?: VisibilityFilter;
  search?: string;
  sort?: SortKey;
  pickup_city?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_radius?: number;
  pickup_ne_lat?: number;
  pickup_ne_lng?: number;
  pickup_sw_lat?: number;
  pickup_sw_lng?: number;
  dropoff_city?: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_radius?: number;
  pickup_date?: string;
  dropoff_date?: string;
  truck_type_ids?: number[];
  truck_category_ids?: number[];
  available_today?: boolean;
  starting_within_hours?: number;
  has_bids?: boolean;
  load_match?: boolean;
  trip_type?: 'multi_stop' | 'direct';
  available_from_start?: string;
  available_from_end?: string;
  provider_names?: string[];
  min_price?: number;
  max_price?: number;
}

export interface PaginatedAvailabilitiesResult {
  items: ApiAvailabilityListItem[];
  meta: ApiListMeta;
}

export type { QuickFilterKey };
