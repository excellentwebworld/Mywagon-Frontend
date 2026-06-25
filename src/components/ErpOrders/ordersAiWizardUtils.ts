import type { AiMappedOrder, AiMappedOrderLine } from '../../api/types/erpOrders';
import type { ErpOrderLine } from '../../pages/ErpOrders/types';
import { EMPTY_ORDER_LINE } from '../../pages/ErpOrders/types';

export type OrderPreviewRowStatus = 'accepted' | 'rejected';

export interface OrderPreviewRow {
  id: string;
  order: AiMappedOrder;
  original: AiMappedOrder;
  status: OrderPreviewRowStatus;
  isEditing: boolean;
}

export type OrderPreviewFilter = 'all' | 'accepted' | 'rejected' | 'edited' | 'inferred';

const HEADER_FIELDS: (keyof AiMappedOrder)[] = [
  'order_reference',
  'erp_reference',
  'customer_name',
  'company_entity_id',
  'ship_date',
  'delivery_date',
  'origin_location_id',
  'dest_location_id',
  'ship_from',
  'ship_to',
  'notes',
  'high_priority',
];

function cloneOrder(order: AiMappedOrder): AiMappedOrder {
  return {
    ...order,
    lines: (order.lines ?? []).map((line) => ({ ...line, inferred: line.inferred ? { ...line.inferred } : undefined })),
    inferred: order.inferred ? { ...order.inferred } : undefined,
  };
}

export function initOrderPreviewRows(orders: AiMappedOrder[]): OrderPreviewRow[] {
  return orders.map((o, i) => {
    const cloned = cloneOrder(o);
    return {
      id: `order-ai-row-${i}-${o.order_reference || i}`,
      order: cloned,
      original: cloneOrder(o),
      status: 'accepted',
      isEditing: false,
    };
  });
}

function linesEqual(a: AiMappedOrderLine[] | undefined, b: AiMappedOrderLine[] | undefined): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every((line, i) => {
    const other = right[i];
    return (
      (line.product_sku_id ?? null) === (other.product_sku_id ?? null) &&
      (line.product_name ?? '') === (other.product_name ?? '') &&
      (line.quantity ?? null) === (other.quantity ?? null) &&
      (line.unit ?? '') === (other.unit ?? '') &&
      (line.weight ?? null) === (other.weight ?? null) &&
      (line.weight_unit ?? '') === (other.weight_unit ?? '')
    );
  });
}

export function isOrderRowEdited(row: OrderPreviewRow): boolean {
  const headerChanged = HEADER_FIELDS.some(
    (field) => String(row.original[field] ?? '') !== String(row.order[field] ?? '')
  );
  return headerChanged || !linesEqual(row.original.lines, row.order.lines);
}

export function orderRowHasInferred(row: OrderPreviewRow): boolean {
  if (row.order.inferred?.customer || row.order.inferred?.ship_from || row.order.inferred?.ship_to) {
    return true;
  }
  return (row.order.lines ?? []).some((line) => line.inferred?.product);
}

export function acceptedOrders(rows: OrderPreviewRow[]): AiMappedOrder[] {
  return rows.filter((r) => r.status === 'accepted').map((r) => r.order);
}

export function toConfirmImportOrders(rows: OrderPreviewRow[]): AiMappedOrder[] {
  return acceptedOrders(rows).map((order) => {
    const companyEntityId = order.company_entity_id ?? null;
    const normalizedCompanyEntityId =
      companyEntityId != null && Number(companyEntityId) < 0 ? null : companyEntityId;

    return {
      order_reference: order.order_reference,
      erp_reference: order.erp_reference ?? null,
      customer_name: order.customer_name?.trim() || null,
      company_entity_id: normalizedCompanyEntityId,
      origin_location_id: order.origin_location_id ?? null,
      dest_location_id: order.dest_location_id ?? null,
      ship_from: order.ship_from ?? null,
      ship_to: order.ship_to ?? null,
      ship_date: order.ship_date ?? null,
      delivery_date: order.delivery_date,
      notes: order.notes ?? null,
      high_priority: order.high_priority ?? false,
      lines: order.lines ?? [],
    };
  });
}

export function areOrderLinesEdited(row: OrderPreviewRow): boolean {
  return !linesEqual(row.original.lines, row.order.lines);
}

export function formatOrderLinesSummary(lines?: AiMappedOrderLine[]): string {
  if (!lines?.length) return '—';
  const names = lines.map((l) => l.product_name).filter(Boolean);
  if (!names.length) return '—';
  if (names.length === 1) return names[0];
  return `${lines.length} lines: ${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''}`;
}

export function toErpLines(lines: AiMappedOrderLine[] | undefined): ErpOrderLine[] {
  if (!lines?.length) return [{ ...EMPTY_ORDER_LINE }];
  return lines.map((line) => ({
    productSkuId: line.product_sku_id ?? null,
    productName: line.product_name ?? '',
    sku: undefined,
    quantity: line.quantity ?? null,
    unit: line.unit ?? 'Pallets',
    weight: line.weight ?? null,
    weightUnit: line.weight_unit ?? 'Kg',
  }));
}

export function fromErpLines(lines: ErpOrderLine[]): AiMappedOrderLine[] {
  return lines
    .filter((line) => line.productSkuId != null || line.productName.trim() !== '')
    .map((line) => ({
      product_sku_id: line.productSkuId,
      product_name: line.productName,
      quantity: line.quantity,
      unit: line.unit,
      weight: line.weight,
      weight_unit: line.weightUnit,
    }));
}
