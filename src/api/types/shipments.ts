export interface ApiShipmentListCarrier {
  name: string;
  initials: string;
}

export interface ApiShipmentListItem {
  id: number;
  auto_id: string;
  status: string;
  type: 'private' | 'public';
  total: string | number | null;
  customer_reference?: string | null;
  origin?: string | null;
  dest?: string | null;
  via?: string | null;
  via_stops?: string[];
  stop_count?: number;
  pickup_at?: string | null;
  delivery_at?: string | null;
  customers?: string[];
  orders_count?: number;
  updated_at?: string | null;
  created_at?: string | null;
  bids_count?: number;
  best_bid?: number | null;
  invited_count?: number;
  carrier?: ApiShipmentListCarrier | null;
  negotiable?: boolean;
  at_risk?: boolean;
  risk_reason?: string | null;
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
  status?: string;
  type?: 'private' | 'public';
  search?: string;
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
