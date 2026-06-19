import type { Category, ProductType, SKU } from '../../context/AppContext';
import type {
  ApiReferenceCategory,
  ApiSkuDetail,
  ApiSkuListItem,
  ApiTypeGridItem,
  ListSkusParams,
  StoreSkuPayload,
} from '../types/productMaster';
import type { NewSkuForm } from '../../pages/ProductMaster/types';

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
  sortBy: string
): ListSkusParams {
  const params: ListSkusParams = {
    page,
    per_page: perPage,
    sort: sortBy === 'name' ? 'name' : sortBy === 'number' ? 'number' : sortBy === 'type' ? 'type' : sortBy === 'status' ? 'status' : 'updated_at',
    sort_dir: sortBy === 'name' ? 'asc' : 'desc',
  };

  if (search.trim()) params.search = search.trim();
  if (filterActive === 'active') params.status = 'active';
  if (filterActive === 'inactive') params.status = 'inactive';
  if (filterUnmapped || activeCat === 'unmapped') params.unmapped = true;
  else if (activeCat !== 'all') {
    params.category_id = activeCat;
    if (activeType !== 'all') {
      if (activeType === 'unmapped') params.type_id = 'unmapped';
      else if (activeType === 'mismatched') params.type_id = 'mismatched';
      else params.type_id = activeType;
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
    temperature: 'Ambient',
    pallet_type: 'EUR',
    hazardous: false,
    stackable: true,
    tags: form.tags || undefined,
  };
}
