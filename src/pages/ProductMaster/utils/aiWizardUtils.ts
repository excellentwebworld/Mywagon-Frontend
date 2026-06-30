import type { AiMappedProduct, ApiReferenceCategory } from '../../../api/types/productMaster';
import {
  PALLET_OPTIONS,
  TEMP_OPTIONS,
  UOM_OPTIONS,
} from '../constants';

const REQUIRED_COLUMNS = [
  { label: 'SKU Name', icon: '📦', desc: 'Product / item name', keywords: ['sku name', 'sku_name', 'product name', 'item name', 'productname', 'itemname', 'sku nm', 'product nm'] },
  { label: 'SKU Number', icon: '#️⃣', desc: 'Unique SKU code or product code', keywords: ['sku number', 'sku_number', 'sku no', 'sku#', 'skuno', 'sku id', 'skuid', 'item code', 'product code', 'product_code', 'item_code', 'sku code', 'sku_code'] },
  { label: 'Category', icon: '🗂️', desc: 'Product category / group', keywords: ['category', 'product category', 'item category', 'product group', 'sku category'] },
  { label: 'Product Type', icon: '🏷️', desc: 'Type of product (e.g. physical, digital)', keywords: ['product type', 'producttype', 'product_type', 'item type', 'sku type', 'sku_type'] },
];

/** MV table fields and source-file header keywords used for column mapping. */
export const MV_FIELD_KEYWORDS: Record<
  keyof AiMappedProduct,
  { label: string; keywords: string[] }
> = {
  sku_name: { label: 'SKU Name', keywords: ['sku name', 'sku_name', 'product name', 'item name', 'productname', 'itemname', 'sku nm', 'product nm'] },
  sku_number: { label: 'SKU Number', keywords: ['sku number', 'sku_number', 'sku no', 'sku#', 'skuno', 'sku id', 'skuid', 'item code', 'product code', 'product_code', 'item_code', 'sku code', 'sku_code'] },
  barcode: { label: 'Barcode', keywords: ['barcode', 'bar_code', 'bar code', 'upc', 'ean', 'sku barcode'] },
  category: { label: 'Category', keywords: ['category', 'product category', 'item category', 'product group', 'sku category'] },
  product_type: { label: 'Product Type', keywords: ['product type', 'producttype', 'product_type', 'item type', 'sku type', 'sku_type'] },
  unit: { label: 'Unit of Measure', keywords: ['unit', 'unit of measure', 'uom', 'measure', 'sku unit', 'pack'] },
  weight: { label: 'Weight', keywords: ['weight', 'net weight', 'gross weight', 'weight kg', 'weight_kg', 'kg'] },
  hazardous: { label: 'Hazardous', keywords: ['hazardous', 'hazard', 'hazmat', 'is hazardous', 'dangerous goods'] },
  pallet_type: { label: 'Pallet Type', keywords: ['pallet type', 'pallet_type', 'pallet', 'skids'] },
  stackable: { label: 'Stackable', keywords: ['stackable', 'is stackable', 'stack'] },
  temperature: { label: 'Temperature', keywords: ['temperature', 'temp', 'temp requirement', 'storage temp'] },
  status: { label: 'Status', keywords: ['status', 'state', 'active'] },
};

export type ValidatableProductField = keyof AiMappedProduct;

export interface MappedSourceColumn {
  header: string;
  field: ValidatableProductField;
  label: string;
}

export interface ColumnMappingSummary {
  mapped: MappedSourceColumn[];
  unmapped: string[];
}

export function parseCsvHeaderLine(line: string): string[] {
  if (!line?.trim()) return [];
  return line.split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, '').toLowerCase()).filter(Boolean);
}

export function validateRequiredCsvColumns(columns: string[]): {
  valid: boolean;
  results: { label: string; icon: string; desc: string; found: boolean }[];
  missing: string[];
} {
  const results = REQUIRED_COLUMNS.map(({ label, icon, desc, keywords }) => {
    const found = keywords.some((kw) => columns.some((col) => col === kw || col.includes(kw)));
    return { label, icon, desc, found };
  });
  const missing = results.filter((r) => !r.found).map((r) => r.label);
  return { valid: missing.length === 0, results, missing };
}

export async function readCsvFirstLine(file: File): Promise<string> {
  const text = await file.slice(0, 8192).text();
  return text.split(/\r\n|\r|\n/)[0] ?? '';
}

function normalizeHeader(header: string): string {
  return String(header).toLowerCase().trim().replace(/["']+/g, '');
}

function headerMatchesField(header: string, keywords: string[]): boolean {
  const h = normalizeHeader(header);
  return keywords.some((kw) => h === kw || h.includes(kw));
}

export function computeColumnMapping(fileHeaders: string[]): ColumnMappingSummary {
  const mapped: MappedSourceColumn[] = [];
  const unmapped: string[] = [];

  for (const header of fileHeaders) {
    if (!header?.trim()) continue;
    let matchedField: ValidatableProductField | null = null;
    for (const [field, { label, keywords }] of Object.entries(MV_FIELD_KEYWORDS) as [
      ValidatableProductField,
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

export function computeMissingFields(headers: string[]): Record<string, boolean> {
  const normalized = headers.map(normalizeHeader);
  const out: Record<string, boolean> = {};
  for (const [field, { keywords }] of Object.entries(MV_FIELD_KEYWORDS)) {
    if (!normalized.length) {
      out[field] = false;
      continue;
    }
    const found = keywords.some((kw) => normalized.some((h) => h === kw || h.includes(kw)));
    out[field] = !found;
  }
  return out;
}

function effectiveFieldValue(product: AiMappedProduct, field: ValidatableProductField): string {
  const raw = String(product[field] ?? '').trim();
  switch (field) {
    case 'unit':
      return raw || 'Case';
    case 'pallet_type':
      return raw || 'EUR';
    case 'temperature':
      return raw || 'Ambient';
    case 'hazardous':
    case 'stackable':
      return raw || 'No';
    case 'status':
      return raw || 'Active';
    default:
      return raw;
  }
}

function categoryNames(referenceCategories: ApiReferenceCategory[]): string[] {
  return referenceCategories.map((c) => c.name.toLowerCase());
}

function typeNamesForCategory(referenceCategories: ApiReferenceCategory[], categoryName: string): string[] {
  const cat = referenceCategories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  return (cat?.types ?? []).map((t) => t.name.toLowerCase());
}

function isYesNo(val: string): boolean {
  const v = val.toLowerCase();
  return v === 'yes' || v === 'no';
}

function isValidWeight(val: string): boolean {
  if (!val.trim()) return true;
  const n = val.replace(/,/g, '.').replace(/\s*kg\s*/gi, '').trim();
  return /^\d+(\.\d+)?$/.test(n);
}

function isInList(val: string, options: readonly string[]): boolean {
  const lower = val.toLowerCase();
  return options.some((o) => o.toLowerCase() === lower);
}

export function getRowInvalidFields(
  product: AiMappedProduct,
  referenceCategories: ApiReferenceCategory[]
): ValidatableProductField[] {
  const invalid: ValidatableProductField[] = [];

  const category = effectiveFieldValue(product, 'category');
  const productType = effectiveFieldValue(product, 'product_type');
  const unit = effectiveFieldValue(product, 'unit');
  const palletType = effectiveFieldValue(product, 'pallet_type');
  const temperature = effectiveFieldValue(product, 'temperature');
  const hazardous = effectiveFieldValue(product, 'hazardous');
  const stackable = effectiveFieldValue(product, 'stackable');
  const status = effectiveFieldValue(product, 'status');
  const weight = String(product.weight ?? '').trim();

  if (!category || !categoryNames(referenceCategories).includes(category.toLowerCase())) {
    invalid.push('category');
  }

  if (!productType) {
    invalid.push('product_type');
  } else if (category && categoryNames(referenceCategories).includes(category.toLowerCase())) {
    const types = typeNamesForCategory(referenceCategories, category);
    if (!types.includes(productType.toLowerCase())) {
      invalid.push('product_type');
    }
  } else if (productType) {
    invalid.push('product_type');
  }

  if (unit && !isInList(unit, UOM_OPTIONS)) invalid.push('unit');
  if (palletType && !isInList(palletType, PALLET_OPTIONS)) invalid.push('pallet_type');
  if (temperature && !isInList(temperature, TEMP_OPTIONS)) invalid.push('temperature');
  if (hazardous && !isYesNo(hazardous)) invalid.push('hazardous');
  if (stackable && !isYesNo(stackable)) invalid.push('stackable');
  if (status && !isInList(status, ['Active', 'Inactive'])) invalid.push('status');
  if (weight && !isValidWeight(weight)) invalid.push('weight');

  return invalid;
}

export function rowHasBlockingIssues(
  product: AiMappedProduct,
  referenceCategories: ApiReferenceCategory[]
): boolean {
  if (!product.sku_name?.trim() || !product.sku_number?.trim() || !product.category?.trim() || !product.product_type?.trim()) {
    return true;
  }
  return getRowInvalidFields(product, referenceCategories).length > 0;
}

export function countAcceptedRowsWithIssues(
  rows: { status: string; product: AiMappedProduct }[],
  referenceCategories: ApiReferenceCategory[]
): number {
  return rows.filter((r) => r.status === 'accepted' && rowHasBlockingIssues(r.product, referenceCategories)).length;
}
