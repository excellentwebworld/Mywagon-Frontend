export interface ApiShipmentListCarrier {
  name: string;
  initials: string;
}

export type ShipmentKpiKey =
  | 'needs_action'
  | 'awaiting_response'
  | 'at_risk'
  | 'pickup_today'
  | 'awaiting_pod';

export type ShipmentSortKey =
  | 'carrier_asc'
  | 'carrier_desc'
  | 'pickup_city_asc'
  | 'pickup_city_desc'
  | 'delivery_city_asc'
  | 'delivery_city_desc'
  | 'earliest_first_pickup_time'
  | 'latest_first_pickup_time'
  | 'earliest_posting_date'
  | 'latest_posting_date'
  | 'price_asc'
  | 'price_desc';

export interface ApiShipmentListFlags {
  needs_action: boolean;
  awaiting_response: boolean;
  at_risk: boolean;
  pickup_today: boolean;
  awaiting_pod: boolean;
}

export interface ApiShipmentListItem {
  id: number;
  auto_id: string;
  status: string;
  type: 'private' | 'public';
  channel?: 'private' | 'public';
  shipment_type?: 'direct' | 'multiple' | string | null;
  total: string | number | null;
  quoted_price?: number | null;
  agreed_price?: number | null;
  customer_reference?: string | null;
  origin?: string | null;
  dest?: string | null;
  via?: string | null;
  via_stops?: string[];
  stop_count?: number;
  intermediate_stops?: number;
  pickup_at?: string | null;
  delivery_at?: string | null;
  pickup_at_iso?: string | null;
  delivery_at_iso?: string | null;
  customers?: string[];
  order_ids?: string[];
  orders_count?: number;
  updated_at?: string | null;
  created_at?: string | null;
  bids_count?: number;
  bids_received?: number;
  bids_sent?: number;
  /** @deprecated Prefer bids_received for row display; kept for expansion. */
  best_bid?: number | null;
  invited_count?: number;
  carrier?: ApiShipmentListCarrier | null;
  negotiable?: boolean;
  payment_status?: 'paid' | 'payment_pending' | null;
  pod_status?: 'complete' | 'missing' | 'partial' | 'n_a' | string;
  at_risk?: boolean;
  risk_reason?: string | null;
  needs_action?: boolean;
  awaiting_response?: boolean;
  pickup_today?: boolean;
  awaiting_pod?: boolean;
  flags?: ApiShipmentListFlags;
}

export interface ApiShipmentStop {
  id: number;
  type: 'pickup' | 'delivery';
  location?: string | null;
  address?: string | null;
  city?: string | null;
  date?: string | null;
  time_start?: string | null;
  time_end?: string | null;
  order_id?: string | null;
  product_name?: string | null;
  qty?: string | number | null;
  weight?: string | number | null;
  sort_order?: number;
}

export interface ApiShipmentDetail extends ApiShipmentListItem {
  note?: string | null;
  journey_distance?: string | number | null;
  journey_time?: string | number | null;
  tracking_required_by_shipper?: boolean;
  stops?: ApiShipmentStop[];
  partners_count?: number;
}

export interface ListShipmentsParams {
  page?: number;
  per_page?: number;
  status?: string | string[];
  type?: 'private' | 'public' | 'all';
  channel?: 'private' | 'public' | 'all';
  search?: string;
  kpi?: ShipmentKpiKey;
  sort?: ShipmentSortKey;
  carrier_name?: string;
  product_type?: string | string[];
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_radius?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_radius?: number;
  trip_km_min?: number;
  trip_km_max?: number;
  price_min?: number;
  price_max?: number;
  pickup_from?: string;
  pickup_to?: string;
  dropoff_from?: string;
  dropoff_to?: string;
  posted_from?: string;
  posted_to?: string;
  bid_state?: 'has_interest' | 'no_interest';
  customer?: string;
  trip_mode?: 'direct' | 'multiple';
}

export interface ApiShipmentsSummary {
  kpis: Record<ShipmentKpiKey, number>;
  statuses: Record<string, number>;
}

export interface ApiCancelReason {
  id: number;
  reason: string;
  is_other: boolean;
}

export interface ApiCancelReasonsPayload {
  reasons: ApiCancelReason[];
  cancellation_charge: {
    charge: number;
    flag: boolean;
    message: string;
  };
  shipment: {
    id: number;
    auto_id: string;
    status: string;
  };
}

export interface PaginatedShipmentsResult {
  items: ApiShipmentListItem[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}
