import type { Category, ProductType, SKU } from '../../context/AppContext';
import type {
  ApiReferenceCategory,
  ApiSkuDetail,
  ApiSkuListItem,
  ApiTypeGridItem,
  ListSkusParams,
  StoreSkuPayload,
} from '../types/productMaster';
import type { NewSkuForm, ProductMasterSortField } from '../../pages/ProductMaster/types';

function normalizeTemperature(value?: string | null): string {
  if (!value) return 'Ambient';
  const v = value.toLowerCase().replace(/\s+/g, '');
  if (v.includes('2-8') || v.includes('2–8')) return '2–8°C';
  if (v.includes('15-25') || v.includes('15–25')) return '15–25°C';
  if (v.includes('-18')) return '-18°C';
  return 'Ambient';
}

function normalizePalletType(value?: string | null): string {
  if (!value) return 'EUR';
  const v = value.toLowerCase();
  if (v.includes('industrial')) return 'Industrial';
  if (v.includes('chemical')) return 'Chemical';
  if (v.includes('pharma')) return 'Pharma';
  return 'EUR';
}

export function mapApiSkuToSku(item: ApiSkuListItem | ApiSkuDetail): SKU {
  return {
    id: item.id,
    name: item.name,
    number: item.number,
    barcode: item.barcode ?? '',
    catId: item.category_id ?? '',
    typeId: item.type_id ?? '',
    source: item.source === 'erp' ? 'erp' : 'manual',
    active: item.active,
    erp: {
      system: '',
      extId: '',
      lastSync: '',
      status: item.sync_status === 'error' ? 'error' : item.sync_status === 'conflict' ? 'conflict' : '',
      error: '',
    },
    weight: item.weight ?? '',
    uom: item.unit ?? '',
    tags: item.tags ? item.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    temperature: normalizeTemperature(item.temperature),
    palletType: normalizePalletType(item.pallet_type),
    hazardous: item.hazardous,
    stackable: item.stackable,
    shipments30: item.shipments_30 ?? 0,
    shipments90: item.shipments_90 ?? 0,
    shipmentsTotal: item.shipments_total ?? 0,
    updatedAt: item.updated_at ? item.updated_at.replace('T', ' ').substring(0, 16) : '',
  };
}

export function skuToNewSkuForm(sku: SKU): NewSkuForm {
  return {
    catId: sku.catId,
    typeId: sku.typeId,
    name: sku.name,
    number: sku.number,
    barcode: sku.barcode,
    uom: sku.uom || 'Case',
    weight: sku.weight,
    active: sku.active,
    tags: sku.tags.join(', '),
    temperature: sku.temperature ?? 'Ambient',
    palletType: sku.palletType ?? 'EUR',
    hazardous: sku.hazardous ?? false,
    stackable: sku.stackable ?? true,
  };
}

export function mapReferenceToCategories(items: ApiReferenceCategory[], lang: 'en' | 'el'): Category[] {
  return items.map((c) => ({
    id: c.id,
    name: { en: c.name, el: c.name },
    icon: '📦',
  }));
}

export function mapReferenceToProductTypes(items: ApiReferenceCategory[]): ProductType[] {
  const types: ProductType[] = [];
  for (const cat of items) {
    for (const t of cat.types) {
      types.push({
        id: t.id,
        catId: cat.id,
        name: t.name,
        active: true,
        defaults: { temp: 'Ambient', hazard: false, stackable: true, palletType: 'EUR' },
        s30: 0,
        s90: 0,
      });
    }
  }
  return types;
}

export function mapTypeGridToProductTypes(items: ApiTypeGridItem[], reference: ApiReferenceCategory[]): ProductType[] {
  const refTypes = mapReferenceToProductTypes(reference);
  return items.map((row) => {
    const match = refTypes.find((t) => t.name === row.type_name);
    return {
      id: match?.id ?? row.type_name,
      catId: match?.catId ?? '',
      name: row.type_name,
      active: true,
      defaults: match?.defaults ?? { temp: 'Ambient', hazard: false, stackable: true, palletType: 'EUR' },
      s30: row.shipment_count_30,
      s90: row.shipment_count_90,
      skuCount: row.sku_count,
      shipmentTotal: row.shipment_count,
    };
  });
}

export function facetToListParams(
  activeCat: string,
  activeType: string,
  filterActive: string,
  filterUnmapped: boolean,
  search: string,
  page: number,
  perPage: number,
  sortField: ProductMasterSortField,
  sortDir: 'asc' | 'desc',
  filterCat = ''
): ListSkusParams {
  const params: ListSkusParams = {
    page,
    per_page: perPage,
    sort: sortField,
    sort_dir: sortDir,
  };

  if (search.trim()) params.search = search.trim();
  if (filterActive === 'active') params.status = 'active';
  if (filterActive === 'inactive') params.status = 'inactive';
  if (filterUnmapped || activeCat === 'unmapped') params.unmapped = true;
  else {
    const categoryId =
      activeCat !== 'all' && activeCat !== 'unmapped'
        ? activeCat
        : filterCat || undefined;
    if (categoryId) {
      params.category_id = categoryId;
      if (activeType !== 'all') {
        if (activeType === 'unmapped') params.type_id = 'unmapped';
        else if (activeType === 'mismatched') params.type_id = 'mismatched';
        else params.type_id = activeType;
      }
    }
  }

  return params;
}

export function newSkuFormToPayload(form: NewSkuForm): StoreSkuPayload {
  return {
    category_id: parseInt(form.catId, 10),
    type_id: parseInt(form.typeId, 10),
    sku_name: form.name.trim(),
    sku_number: form.number.trim(),
    barcode: form.barcode || undefined,
    unit: form.uom || undefined,
    weight: form.weight || undefined,
    temperature: form.temperature || 'Ambient',
    pallet_type: form.palletType || 'EUR',
    hazardous: form.hazardous,
    stackable: form.stackable,
    tags: form.tags || undefined,
  };
}
