import type { AiMappedOrder, AiMappedOrderLine } from '../../api/types/erpOrders';
import type { ErpOrderLine } from '../../pages/ErpOrders/types';
import { EMPTY_ORDER_LINE } from '../../pages/ErpOrders/types';

export type OrderPreviewRowStatus = 'accepted' | 'rejected';

export type OrderHeaderField =
  | 'order_reference'
  | 'erp_reference'
  | 'customer_name'
  | 'company_entity_id'
  | 'ship_date'
  | 'delivery_date'
  | 'origin_location_id'
  | 'dest_location_id'
  | 'ship_from'
  | 'ship_to'
  | 'notes'
  | 'high_priority';

const HEADER_FIELDS: OrderHeaderField[] = [
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

export interface OrderPreviewRow {
  id: string;
  order: AiMappedOrder;
  original: AiMappedOrder;
  status: OrderPreviewRowStatus;
  isEditing: boolean;
  sourceEmptyFields: string[];
}

export type OrderPreviewFilter = 'all' | 'accepted' | 'rejected' | 'edited' | 'inferred';

function cloneLine(line: AiMappedOrderLine): AiMappedOrderLine {
  return {
    ...line,
    inferred: line.inferred ? { ...line.inferred } : undefined,
    source_empty_fields: line.source_empty_fields ? [...line.source_empty_fields] : undefined,
  };
}

function cloneOrder(order: AiMappedOrder): AiMappedOrder {
  return {
    ...order,
    lines: (order.lines ?? []).map(cloneLine),
    inferred: order.inferred ? { ...order.inferred } : undefined,
    source_empty_fields: order.source_empty_fields ? [...order.source_empty_fields] : undefined,
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
      sourceEmptyFields: [...(o.source_empty_fields ?? [])],
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

export function effectiveOrderFieldValue(row: OrderPreviewRow, field: string): string {
  if (row.sourceEmptyFields.includes(field)) return '';
  const val = row.order[field as keyof AiMappedOrder];
  if (val == null) return '';
  return String(val).trim();
}

export function effectiveLineFieldValue(line: AiMappedOrderLine, field: keyof AiMappedOrderLine): string {
  if (line.source_empty_fields?.includes(field)) return '';
  const val = line[field];
  if (val == null) return '';
  return String(val).trim();
}

export function isOrderHeaderFieldInferred(row: OrderPreviewRow, field: 'ship_from' | 'ship_to'): boolean {
  if (row.sourceEmptyFields.includes(field)) return false;
  const val = effectiveOrderFieldValue(row, field);
  if (!val) return false;
  return Boolean(row.order.inferred?.[field]);
}

export function orderRowHasInferred(row: OrderPreviewRow): boolean {
  if (row.order.inferred?.customer) {
    return true;
  }
  if (isOrderHeaderFieldInferred(row, 'ship_from') || isOrderHeaderFieldInferred(row, 'ship_to')) {
    return true;
  }
  return (row.order.lines ?? []).some((line) => line.inferred?.product && Boolean(line.product_name?.trim()));
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
      lines: (order.lines ?? []).map((line) => ({
        product_sku_id: line.product_sku_id ?? null,
        product_name: line.product_name,
        quantity: line.quantity ?? null,
        unit: line.source_empty_fields?.includes('unit') ? null : (line.unit ?? null),
        weight: line.source_empty_fields?.includes('weight') ? null : (line.weight ?? null),
        weight_unit: line.source_empty_fields?.includes('weight_unit') ? null : (line.weight_unit ?? null),
      })),
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
  if (!lines?.length) return [{ ...EMPTY_ORDER_LINE, unit: '', weightUnit: '' }];
  return lines.map((line) => ({
    productSkuId: line.product_sku_id ?? null,
    productName: line.product_name ?? '',
    sku: undefined,
    quantity: line.quantity ?? null,
    unit: line.source_empty_fields?.includes('unit') ? '' : (line.unit ?? ''),
    weight: line.source_empty_fields?.includes('weight') ? null : (line.weight ?? null),
    weightUnit: line.source_empty_fields?.includes('weight_unit') ? '' : (line.weight_unit ?? ''),
    sourceEmptyFields: line.source_empty_fields ? [...line.source_empty_fields] : [],
  }));
}

export function fromErpLines(lines: ErpOrderLine[]): AiMappedOrderLine[] {
  return lines
    .filter((line) => line.productSkuId != null || line.productName.trim() !== '')
    .map((line) => {
      const sourceEmpty = line.sourceEmptyFields ?? [];
      return {
        product_sku_id: line.productSkuId,
        product_name: line.productName,
        quantity: line.quantity,
        unit: sourceEmpty.includes('unit') ? null : (line.unit || null),
        weight: sourceEmpty.includes('weight') ? null : line.weight,
        weight_unit: sourceEmpty.includes('weight_unit') ? null : (line.weightUnit || null),
        source_empty_fields: [...sourceEmpty],
        inferred: { product: line.productSkuId == null },
      };
    });
}

export type ValidatableOrderField =
  | 'order_reference'
  | 'erp_reference'
  | 'ship_from'
  | 'ship_to'
  | 'ship_date'
  | 'delivery_date'
  | 'notes'
  | 'high_priority'
  | 'product_name'
  | 'quantity'
  | 'unit'
  | 'weight'
  | 'weight_unit';

export const MV_ORDER_FIELD_KEYWORDS: Record<
  ValidatableOrderField,
  { label: string; keywords: string[] }
> = {
  order_reference: {
    label: 'Order ID',
    keywords: ['order id', 'order_id', 'orderid', 'order ref', 'order reference', 'order_reference', 'orderno', 'order no'],
  },
  erp_reference: {
    label: 'ERP Reference',
    keywords: ['erp reference', 'erp_reference', 'erp ref', 'erp id', 'erp_id'],
  },
  ship_from: {
    label: 'Ship From',
    keywords: ['ship from', 'ship_from', 'origin', 'from location', 'pickup', 'pick up location', 'source'],
  },
  ship_to: {
    label: 'Ship To',
    keywords: ['ship to', 'ship_to', 'destination', 'to location', 'delivery location', 'dest', 'drop off'],
  },
  ship_date: {
    label: 'Ship Date',
    keywords: ['ship date', 'ship_date', 'shipping date', 'dispatch date', 'load date'],
  },
  delivery_date: {
    label: 'Delivery Date',
    keywords: ['delivery date', 'delivery_date', 'del date', 'due date', 'required date'],
  },
  notes: {
    label: 'Notes',
    keywords: ['notes', 'note', 'comments', 'comment', 'remarks'],
  },
  high_priority: {
    label: 'High Priority',
    keywords: ['high priority', 'high_priority', 'priority', 'urgent', 'rush'],
  },
  product_name: {
    label: 'Product Name',
    keywords: ['product', 'product name', 'product_name', 'item', 'item name', 'sku name', 'sku', 'material', 'description'],
  },
  quantity: {
    label: 'Quantity',
    keywords: ['quantity', 'qty', 'amount', 'order qty', 'order quantity'],
  },
  unit: {
    label: 'Unit',
    keywords: ['unit', 'uom', 'unit of measure', 'qty unit', 'pack'],
  },
  weight: {
    label: 'Weight',
    keywords: ['weight', 'net weight', 'gross weight', 'weight kg', 'weight_kg'],
  },
  weight_unit: {
    label: 'Weight Unit',
    keywords: ['weight unit', 'weight_unit', 'wt unit', 'weight uom'],
  },
};

export interface MappedSourceOrderColumn {
  header: string;
  field: ValidatableOrderField;
  label: string;
}

export interface OrderColumnMappingSummary {
  mapped: MappedSourceOrderColumn[];
  unmapped: string[];
}

function normalizeHeader(header: string): string {
  return String(header).toLowerCase().trim().replace(/["']+/g, '');
}

function headerMatchesField(header: string, keywords: string[]): boolean {
  const h = normalizeHeader(header);
  return keywords.some((kw) => h === kw || h.includes(kw));
}

export function computeOrderColumnMapping(fileHeaders: string[]): OrderColumnMappingSummary {
  const mapped: MappedSourceOrderColumn[] = [];
  const unmapped: string[] = [];

  for (const header of fileHeaders) {
    if (!header?.trim()) continue;
    let matchedField: ValidatableOrderField | null = null;
    for (const [field, { label, keywords }] of Object.entries(MV_ORDER_FIELD_KEYWORDS) as [
      ValidatableOrderField,
      { label: string; keywords: string[] },
    ][]) {
      if (headerMatchesField(header, keywords)) {
        matchedField = field;
        mapped.push({ header, field: matchedField, label });
        break;
      }
    }
    if (!matchedField) {
      unmapped.push(header);
    }
  }
  return { mapped, unmapped };
}

