export interface ApiListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface ApiProductSummaryCategoryType {
  type_id: number;
  count: number;
}

export interface ApiProductSummaryCategory {
  id: number;
  count: number;
  types: ApiProductSummaryCategoryType[];
  mismatched: number;
  null_type: number;
}

export interface ApiProductSummary {
  total: number;
  active: number;
  inactive: number;
  unmapped: number;
  categories: ApiProductSummaryCategory[];
}

export interface ApiSkuListItem {
  id: string;
  name: string;
  number: string;
  barcode?: string | null;
  unit?: string | null;
  weight?: string | null;
  temperature?: string | null;
  pallet_type?: string | null;
  hazardous: boolean;
  stackable: boolean;
  tags?: string | null;
  category_id?: string | null;
  type_id?: string | null;
  category_name?: string | null;
  type_name?: string | null;
  is_unmapped: boolean;
  source: string;
  sync_status: string;
  active: boolean;
  updated_at?: string | null;
  shipments_30: number;
  shipments_90: number;
  shipments_total: number;
  linked_order_line?: ApiLinkedOrderLine | null;
}

export interface ApiLinkedOrderLine {
  id: number;
  erp_order_id: number;
  product_sku_id: number;
  product_name: string;
  quantity?: number | null;
  unit?: string | null;
  weight?: number | null;
  weight_unit?: string | null;
}

export interface ApiSkuDetail extends ApiSkuListItem {}

export interface ApiReferenceCategory {
  id: string;
  name: string;
  types: { id: string; name: string }[];
}

export interface ApiTypeGridItem {
  category_name: string;
  type_name: string;
  sku_count: number;
  shipment_count: number;
  shipment_count_30: number;
  shipment_count_90: number;
}

export interface ApiImportResult {
  total: number;
  success: number;
  created: number;
  updated: number;
  failed: number;
  failures: string[];
  success_logs: string[];
}

export interface ListSkusParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
  type_id?: string;
  status?: 'active' | 'inactive';
  unmapped?: boolean;
  sort?: 'name' | 'number' | 'type' | 'category' | 'status' | 'updated_at';
  sort_dir?: 'asc' | 'desc';
}

export interface StoreSkuPayload {
  category_id: number;
  type_id: number;
  sku_name: string;
  sku_number: string;
  barcode?: string;
  unit?: string;
  weight?: string;
  temperature?: string;
  pallet_type?: string;
  hazardous?: boolean;
  stackable?: boolean;
  tags?: string;
  erp_order_id?: number;
  order_line_id?: number;
}

export interface CreateSkuOrderContext {
  erpOrderId?: string;
  orderLineId?: string;
}

export interface LinkedOrderLine {
  id: string;
  erpOrderId: string;
  productSkuId: string;
  productName: string;
  quantity: number | null;
  unit: string | null;
  weight: number | null;
  weightUnit: string | null;
}

export interface AiMappedProduct {
  sku_name: string;
  sku_number: string;
  barcode?: string;
  unit?: string;
  weight?: string;
  category: string;
  product_type: string;
  hazardous?: string;
  pallet_type?: string;
  stackable?: string;
  temperature?: string;
  status?: string;
  /** Fields with no value in the uploaded source row/column (from API). */
  source_empty_fields?: string[];
}

export interface AiTransformResult {
  products: AiMappedProduct[];
  file_headers: string[];
  categories?: ApiReferenceCategory[];
}

export interface AiTransformErrorData {
  error_type: 'missing_columns' | 'generic';
  missing_columns?: string[];
  found_columns?: string[];
  file_headers?: string[];
}
