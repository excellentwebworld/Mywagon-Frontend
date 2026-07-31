export interface ApiShipmentListCarrier {
  name: string;
  initials: string;
  avatar?: string | null;
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
  /** Interested partners only — yellow Pending badge (Laravel list parity). */
  interested_count?: number;
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
  qty_unit?: string | number | null;
  weight?: string | number | null;
  weight_unit?: string | number | null;
  company_name?: string | null;
  /** Driver location status code: 0 pending … 5 complete pickup/drop … 7 complete shipment */
  status?: string | number | null;
  /** POD: 0 not uploaded, 1 uploaded, 2 later, 3 skip */
  pod?: string | number | null;
  /** Uploaded POD media (Spatie), when pod = 1. */
  pod_images?: Array<{ id?: number | null; url: string }> | null;
  /** Location event logs (ShipmentLocationLog status + created_at). */
  logs?: Array<{ status?: string | number | null; created_at?: string | null }> | null;
  unable_status?: string | number | null;
  sort_order?: number;
}

export interface ApiShipmentOffer {
  id: string;
  type: 'bid' | 'interest';
  /** received = transporter bid/interest; sent = shipper bid on posted truck */
  kind?: 'received' | 'sent' | string | null;
  availability_id?: string | null;
  last_action_by?: string | null;
  name: string;
  initials?: string;
  avatar?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  vat?: string | null;
  is_partner?: boolean;
  has_history?: boolean;
  role?: 'company' | 'freelancer' | string;
  price?: number | null;
  responded_at?: string | null;
  status?: string | null;
  /** shipment_partners.status for this bidder (0 pending … 4 rejected). */
  partner_status?: string | null;
  counter?: {
    yours: number;
    theirs: number;
    /** Previous offer (strikethrough). */
    from?: number;
    /** Latest offer in the negotiation step. */
    to?: number;
    pct: number;
    dir: 'up' | 'down';
  } | null;
}

export interface ApiNegotiationHistoryItem {
  id: number;
  type: string;
  price?: number | null;
  notes?: string | null;
  initiated_by_type?: string | null;
  initiated_by_id?: number | null;
  initiated_by_name?: string | null;
  bid_id?: number | null;
  shipment_partner_id?: number | null;
  created_at?: string | null;
}

export interface ApiShipmentInvitee {
  id: number;
  name: string;
  initials?: string;
  avatar?: string | null;
  invited_at?: string | null;
  status?: string;
  role?: 'company' | 'freelancer' | string;
}

export interface ApiShipmentDetail extends ApiShipmentListItem {
  note?: string | null;
  journey_distance?: string | number | null;
  journey_time?: string | number | null;
  tracking_required_by_shipper?: boolean;
  stops?: ApiShipmentStop[];
  partners_count?: number;
  cargo_value?: number | null;
  truck_types?: string[];
  total_weight?: number | null;
  total_qty?: number | null;
  weight_unit?: string | null;
  qty_unit?: string | null;
  offers?: ApiShipmentOffer[];
  invitees?: ApiShipmentInvitee[];
  bid_window_ends_at?: string | null;
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
  pickup_location_name?: string;
  dropoff_location_name?: string;
  trip_mode?: 'direct' | 'multiple';
  direction?: 'outbound' | 'inbound';
  ids?: number[];
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
