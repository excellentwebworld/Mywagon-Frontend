import type {
  ApiErpOrderDetail,
  ApiErpOrderListItem,
  ErpOrderFormPayload,
  ErpOrderKpiFilter,
  ErpOrderStatus,
  ListErpOrdersParams,
} from '../types/erpOrders';
import type { ErpOrder, ErpOrderLine, ErpOrderSortField } from '../../pages/ErpOrders/types';
import { getBrowserTimezone } from '../../pages/ErpOrders/erpDateTimeUtils';

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
    sku: line.sku ?? undefined,
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
    revenueValue: item.revenue_value ? Number(item.revenue_value) : undefined,
    lines: Array.isArray(item.lines) ? item.lines.map(mapApiLineToLine) : [],
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
    shipFromAddress: detail.ship_from_address ?? '',
    shipToAddress: detail.ship_to_address ?? '',
    linkedLoadStatus: detail.linked_load_status ?? '',
    notes: detail.notes ?? '',
    lines: Array.isArray(detail.lines) ? detail.lines.map(mapApiLineToLine) : [],
  };
}

export function formToPayload(form: any): any {
  return {
    order_reference: form.orderReference.trim(),
    erp_reference: form.erpReference?.trim() || null,
    company_entity_id: form.companyEntityId ?? null,
    customer_name: form.customerName.trim(),
    origin_location_id: form.originLocationId ?? null,
    dest_location_id: form.destLocationId ?? null,
    ship_date: form.shipDate || null,
    delivery_date: form.deliveryDate,
    notes: form.notes?.trim() || null,
    high_priority: !!form.highPriority,
    revenue_value: form.revenueValue || null,
    lines: (form.lines ?? []).map((line: any) => ({
      product_sku_id: line.productSkuId ?? null,
      product_name: line.productName,
      quantity: line.quantity ?? null,
      unit: line.unit || null,
      weight: line.weight ?? null,
      weight_unit: line.weightUnit || null,
    })),
  };
}

export function kpiToStatusFilter(kpi: ErpOrderKpiFilter): string {
  if (!kpi) return 'all';
  return kpi;
}

export function sortFieldToApi(field: ErpOrderSortField): string {
  if (!field) return '';
  const map: Record<Exclude<ErpOrderSortField, ''>, string> = {
    orderReference: 'order_reference',
    customer: 'customer',
    shipDate: 'ship_date',
    deliveryDate: 'delivery_date',
    status: 'status',
    updatedAt: 'updated_at',
  };
  return map[field] ?? '';
}

export function buildListParams(
  kpiFilter: ErpOrderKpiFilter,
  highPriority: boolean,
  search: string,
  sortField: ErpOrderSortField,
  sortDir: 'asc' | 'desc' | '',
  page: number,
  perPage: number
): ListErpOrdersParams {
  const params: ListErpOrdersParams = {
    status: kpiToStatusFilter(kpiFilter),
    high_priority: highPriority || undefined,
    search: search || undefined,
    page,
    per_page: perPage,
  };
  const apiSort = sortFieldToApi(sortField);
  if (apiSort) params.sort = apiSort;
  if (sortDir) params.sort_dir = sortDir;
  return params;
}

export function buildExportParams(
  kpiFilter: ErpOrderKpiFilter,
  highPriority: boolean,
  search: string,
  sortField: ErpOrderSortField,
  sortDir: 'asc' | 'desc' | ''
): Omit<ListErpOrdersParams, 'page' | 'per_page'> {
  const { page: _page, per_page: _perPage, ...params } = buildListParams(
    kpiFilter,
    highPriority,
    search,
    sortField,
    sortDir,
    1,
    20
  );
  return {
    ...params,
    timezone: getBrowserTimezone(),
  };
}

export { STATUS_LABELS };
