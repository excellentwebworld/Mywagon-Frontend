import type { ApiCompanyEntity, ApiListMeta } from './addressBook';

export type ErpOrderStatus = 'unplanned' | 'planned' | 'on_trip' | 'completed' | 'canceled';

export type ErpOrderKpiFilter = '' | ErpOrderStatus;

export interface ApiErpOrderSummary {
  total: number;
  unplanned: number;
  planned: number;
  on_trip: number;
  completed: number;
  canceled: number;
}

export interface ApiErpOrderCustomer extends ApiCompanyEntity {
  is_partner?: boolean;
  partner_company_name?: string | null;
}

export interface ApiErpOrderLine {
  id?: number;
  product_sku_id?: number | null;
  sku?: string | null;
  product_name: string;
  quantity?: number | null;
  unit?: string | null;
  weight?: number | null;
  weight_unit?: string | null;
}

export interface ApiErpOrderListItem {
  id: number;
  order_reference: string;
  erp_reference?: string | null;
  customer_name: string;
  ship_from?: string | null;
  ship_to?: string | null;
  ship_date?: string | null;
  delivery_date: string;
  products_preview?: string | null;
  product_count: number;
  status: ErpOrderStatus;
  high_priority: boolean;
  linked_load_sid?: string | null;
  linked_load_id?: number | null;
  updated_at?: string | null;
  can_edit: boolean;
}

export interface ApiErpOrderDetail extends ApiErpOrderListItem {
  company_entity_id?: number | null;
  origin_location_id?: number | null;
  dest_location_id?: number | null;
  ship_from_address?: string | null;
  ship_to_address?: string | null;
  notes?: string | null;
  linked_load_status?: string | null;
  created_at?: string | null;
  lines: ApiErpOrderLine[];
}

export interface ListErpOrdersParams {
  search?: string;
  status?: string;
  high_priority?: boolean;
  unlinked?: boolean;
  sort?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface PaginatedErpOrdersResult {
  items: ApiErpOrderListItem[];
  meta: ApiListMeta;
}

export interface ErpOrderFormPayload {
  order_reference: string;
  erp_reference?: string | null;
  company_entity_id?: number | null;
  customer_name: string;
  origin_location_id?: number | null;
  dest_location_id?: number | null;
  ship_date?: string | null;
  delivery_date: string;
  notes?: string | null;
  high_priority?: boolean;
  lines?: ApiErpOrderLine[];
}

export interface AiMappedOrderLine {
  product_sku_id?: number | null;
  product_name: string;
  quantity?: number | null;
  unit?: string | null;
  weight?: number | null;
  weight_unit?: string | null;
  inferred?: { product?: boolean };
}

export interface AiMappedOrder {
  order_reference: string;
  erp_reference?: string | null;
  customer_name: string;
  company_entity_id?: number | null;
  ship_from?: string | null;
  ship_to?: string | null;
  origin_location_id?: number | null;
  dest_location_id?: number | null;
  ship_date?: string | null;
  delivery_date: string;
  notes?: string | null;
  high_priority?: boolean;
  lines?: AiMappedOrderLine[];
  inferred?: {
    customer?: boolean;
    ship_from?: boolean;
    ship_to?: boolean;
  };
}

export interface AiOrdersTransformResult {
  orders: AiMappedOrder[];
  file_headers?: string[];
}

export interface AiOrdersTransformErrorData {
  error_type?: string;
  missing_columns?: string[];
  found_columns?: string[];
  file_headers?: string[];
}

export interface ApiErpOrdersImportResult {
  total: number;
  success: number;
  created: number;
  updated: number;
  failed: number;
  failures: string[];
}
