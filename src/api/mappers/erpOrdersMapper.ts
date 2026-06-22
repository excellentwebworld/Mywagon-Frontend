import type {
  ApiErpOrderDetail,
  ApiErpOrderListItem,
  ErpOrderFormPayload,
  ErpOrderKpiFilter,
  ErpOrderStatus,
  ListErpOrdersParams,
} from '../types/erpOrders';
import type { ErpOrder, ErpOrderLine, ErpOrderSortField } from '../../pages/ErpOrders/types';

const STATUS_LABELS: Record<ErpOrderStatus, string> = {
  unplanned: 'Unplanned',
  planned: 'Planned',
  on_trip: 'On Trip',
  completed: 'Completed',
  canceled: 'Canceled',
};

export function mapApiStatus(status: string): ErpOrderStatus {
  const normalized = status as ErpOrderStatus;
  return STATUS_LABELS[normalized] ? normalized : 'unplanned';
}

export function statusLabel(status: ErpOrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function mapApiLineToLine(line: ApiErpOrderDetail['lines'][number]): ErpOrderLine {
  return {
    id: line.id,
    productSkuId: line.product_sku_id ?? null,
    productName: line.product_name,
    quantity: line.quantity ?? null,
    unit: line.unit ?? '',
    weight: line.weight ?? null,
    weightUnit: line.weight_unit ?? 'Kg',
  };
}

export function mapApiListItemToOrder(item: ApiErpOrderListItem): ErpOrder {
  return {
    id: String(item.id),
    orderReference: item.order_reference,
    erpReference: item.erp_reference ?? '',
    customerName: item.customer_name,
    shipFrom: item.ship_from ?? '',
    shipTo: item.ship_to ?? '',
    shipDate: item.ship_date ?? '',
    deliveryDate: item.delivery_date,
    productsPreview: item.products_preview ?? '',
    productCount: item.product_count,
    status: mapApiStatus(item.status),
    highPriority: item.high_priority,
    linkedLoadSid: item.linked_load_sid ?? '',
    linkedLoadId: item.linked_load_id ? String(item.linked_load_id) : '',
    updatedAt: item.updated_at ?? '',
    canEdit: item.can_edit,
    lines: [],
    notes: '',
    companyEntityId: null,
    originLocationId: null,
    destLocationId: null,
  };
}

export function mapApiDetailToOrder(detail: ApiErpOrderDetail): ErpOrder {
  return {
    ...mapApiListItemToOrder(detail),
    companyEntityId: detail.company_entity_id ?? null,
    originLocationId: detail.origin_location_id ?? null,
    destLocationId: detail.dest_location_id ?? null,
    notes: detail.notes ?? '',
    lines: (detail.lines ?? []).map(mapApiLineToLine),
  };
}

export function formToPayload(form: ErpOrderFormPayload): ErpOrderFormPayload {
  return {
    order_reference: form.order_reference.trim(),
    erp_reference: form.erp_reference?.trim() || null,
    company_entity_id: form.company_entity_id ?? null,
    customer_name: form.customer_name.trim(),
    origin_location_id: form.origin_location_id ?? null,
    dest_location_id: form.dest_location_id ?? null,
    ship_date: form.ship_date || null,
    delivery_date: form.delivery_date,
    notes: form.notes?.trim() || null,
    high_priority: !!form.high_priority,
    lines: (form.lines ?? []).map((line) => ({
      product_sku_id: line.product_sku_id ?? null,
      product_name: line.product_name,
      quantity: line.quantity ?? null,
      unit: line.unit || null,
      weight: line.weight ?? null,
      weight_unit: line.weight_unit || null,
    })),
  };
}

export function kpiToStatusFilter(kpi: ErpOrderKpiFilter): string {
  return kpi || 'all';
}

export function sortFieldToApi(field: ErpOrderSortField): string {
  const map: Record<ErpOrderSortField, string> = {
    orderReference: 'order_reference',
    customer: 'customer',
    deliveryDate: 'delivery_date',
    status: 'status',
    updatedAt: 'updated_at',
  };
  return map[field] ?? 'updated_at';
}

export function buildListParams(
  kpiFilter: ErpOrderKpiFilter,
  highPriority: boolean,
  search: string,
  sortField: ErpOrderSortField,
  sortDir: 'asc' | 'desc',
  page: number,
  perPage: number
): ListErpOrdersParams {
  return {
    status: kpiToStatusFilter(kpiFilter),
    high_priority: highPriority || undefined,
    search: search || undefined,
    sort: sortFieldToApi(sortField),
    sort_dir: sortDir,
    page,
    per_page: perPage,
  };
}

export { STATUS_LABELS };
