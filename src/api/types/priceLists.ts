export type PriceLaneMetric = 'weight' | 'unit_transport' | 'ftl_truck_type' | 'load_any_size';

export interface ApiPriceLanePricingRow {
  price_eur: number;
  metric: PriceLaneMetric;
  metric_value?: Record<string, unknown>;
}

export interface ApiPriceLaneStop {
  city?: string;
  label?: string;
  type?: string;
  value?: string;
  countryCode?: string;
  location_id?: string | number | null;
  address?: string;
  lat?: string | number | null;
  lng?: string | number | null;
}

export interface ApiPriceLane {
  id: number;
  origin_city: string;
  destination_city: string;
  stops: ApiPriceLaneStop[];
  trip_type: 'direct' | 'roundtrip';
  total_km_direct?: number | null;
  total_km_effective?: number | null;
  pricing_rows: ApiPriceLanePricingRow[];
  price: number;
  unit: 'load' | 'pallet';
  status: 'active' | 'inactive' | 'archived';
  scope: 'default' | 'specific';
  scope_partner_ids?: string[];
  scope_direction?: 'buy' | 'sell' | null;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StorePriceLanePayload {
  origin_city: string;
  destination_city: string;
  stops: ApiPriceLaneStop[];
  trip_type: 'direct' | 'roundtrip';
  total_km_direct?: number;
  total_km_effective?: number;
  pricing_rows: ApiPriceLanePricingRow[];
  effective_from?: string;
  effective_to?: string | null;
  scope?: 'default' | 'specific';
  scope_partner_ids?: string[];
  scope_direction?: 'buy' | 'sell' | null;
  notes?: string;
  status?: 'active' | 'inactive' | 'archived';
  duplicate_source_id?: number;
}
