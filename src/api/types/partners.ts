import type { ApiListMeta } from './addressBook';

export interface ApiPartnerSummary {
  total: number;
  active: number;
  carrier_companies: number;
  freelancer_drivers: number;
  shippers: number;
  invited: number;
  invitation_received: number;
  suspended: number;
  facet: Record<string, number>;
}

export interface ApiTruckCategory {
  id: number;
  name: string;
}

export interface ApiPartnerListItem {
  id: number;
  name: string;
  region: string;
  is_preferred: boolean;
  unique_id: string | null;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  is_sent: boolean;
  can_accept_decline: boolean;
  contact_email: string;
  contact_phone: string;
  rating: number | null;
  trips: number;
  capabilities: string[];
  capabilities_extra: number;
  created_at: string | null;
  created_at_formatted: string | null;
}

export interface ApiContractLane {
  id: number;
  origin_city: string;
  destination_city: string;
  price: number;
  price_formatted: string;
  unit: 'load' | 'pallet';
  unit_label: string;
  status: string;
  status_label: string;
}

export interface ApiPartnerPerformance {
  loads_30d: number;
  lifetime_loads: number;
  fulfilled_pct: number;
  partially_fulfilled_pct: number;
  canceled_pct: number;
  unfulfilled_pct: number;
}

export interface ApiFleetItem {
  label: string;
  driver: string | null;
}

export interface ApiPartnerCompanyProfile {
  company_name: string | null;
  vat_number: string | null;
  city: string | null;
  address: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  unique_id: string | null;
}

export interface ApiIncomingLoadsMonitoring {
  enabled: boolean;
}

export interface ApiPartnerDetail extends ApiPartnerListItem {
  location: string;
  phone: string;
  is_suspended: boolean;
  is_accepted: boolean;
  is_pending: boolean;
  relationship: string | null;
  notes: string | null;
  tags: string[];
  performance: ApiPartnerPerformance | null;
  fleet: ApiFleetItem[];
  company_profile: ApiPartnerCompanyProfile | null;
  incoming_loads_monitoring: ApiIncomingLoadsMonitoring;
  contract_lanes: ApiContractLane[];
}

export interface ListPartnersParams {
  page?: number;
  per_page?: number;
  search?: string;
  facet?: string;
  statuses?: string[];
  capabilities?: number[];
  sort?: 'name' | 'created_at';
  sort_dir?: 'asc' | 'desc';
}

export interface PaginatedPartnersResult {
  items: ApiPartnerListItem[];
  meta: ApiListMeta;
}
