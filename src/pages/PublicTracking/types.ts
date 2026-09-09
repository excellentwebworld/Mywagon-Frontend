export type TrackingTimelineItem = {
  key: string;
  label: string;
  at: string | null;
  state: 'done' | 'cur' | 'pending' | 'skip';
};

export type TrackingProductLine = {
  location_id: number;
  order_id: string;
  product_name: string;
  qty: number | null;
  qty_unit: string;
  weight: number | null;
  weight_unit: string;
};

export type TrackingStop = {
  id: number;
  seq: number;
  type: 'pickup' | 'dropoff';
  company_name: string;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  from_date: string | null;
  to_date: string | null;
  schedule_label: string | null;
  completed: boolean;
  phone: string | null;
  email: string | null;
  lines: TrackingProductLine[];
  supplier_name: string;
};

export type TrackingOrderGroup = {
  order_id: string;
  products: TrackingProductLine[];
};

export type TrackingTransporter = {
  kind: 'freelancer' | 'carrier' | null;
  name: string;
  avatar: string | null;
  rating: number | null;
  trips_count: number | null;
  phone: string | null;
  plates: string[];
  vehicle: string | null;
  rateable_type: 'carrier' | 'driver' | null;
  rateable_id: number | null;
  driver_name: string | null;
};

export type TrackingReceiptItem = {
  location_id: number;
  order_id: string;
  product_name: string;
  ordered_qty: number | null;
  qty_unit: string;
  received_qty: number | null;
};

export type PublicTrackingPayload = {
  shipment: {
    id: number;
    auto_id: string;
    status: string;
    status_label: string;
    started_by: string | null;
    lane: string;
  };
  header: {
    transporter_kind: 'freelancer' | 'carrier' | null;
    transporter_name: string | null;
    shipper_name: string;
    eta_at: string | null;
    eta_label: string | null;
    on_time: boolean;
    delivered_at: string | null;
  };
  timeline: TrackingTimelineItem[];
  stops: TrackingStop[];
  orders: TrackingOrderGroup[];
  vehicle_type: string | null;
  map: {
    mode: string;
    points: Array<{
      label: string;
      lat: number | null;
      lng: number | null;
      type: string;
      seq: number;
      id: number;
    }>;
    actual_route: Array<{ lat: number; lng: number }>;
    permissions: {
      gps: boolean;
      actual_route: boolean;
      show_route_toggle: boolean;
    };
  };
  transporter: TrackingTransporter;
  receipt: {
    can_confirm: boolean;
    already_confirmed: boolean;
    confirmation: {
      confirmation_type: string;
      confirmed_at: string | null;
      notes: string | null;
    } | null;
    items: TrackingReceiptItem[];
  };
  rating: {
    can_rate: boolean;
    already_rated: boolean;
    rateable_type: string | null;
    rateable_id: number | null;
    transporter_name: string | null;
    plates: string[];
    avatar: string | null;
  };
};
