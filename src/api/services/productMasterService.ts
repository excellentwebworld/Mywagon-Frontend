import { apiGet, apiPost, apiPut, ApiError, AUTH_TOKEN_KEY } from '../client';
import {
  facetToListParams,
  mapApiSkuToSku,
  mapReferenceToCategories,
  mapReferenceToProductTypes,
  mapTypeGridToProductTypes,
  newSkuFormToPayload,
} from '../mappers/productMasterMapper';
import type { SKU } from '../../context/AppContext';
import type { NewSkuForm } from '../../pages/ProductMaster/types';
import type { ApiListMeta as AddressBookListMeta } from '../types/addressBook';
import type {
  ApiImportResult,
  ApiProductSummary,
  AiMappedProduct,
  AiTransformErrorData,
  AiTransformResult,
  ApiReferenceCategory,
  ApiSkuDetail,
  ApiTypeGridItem,
  ListSkusParams,
} from '../types/productMaster';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export interface PaginatedSkusResult {
  items: SKU[];
  meta: AddressBookListMeta;
}

function csvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const productMasterService = {
  async getSummary(): Promise<ApiProductSummary> {
    const res = await apiGet<ApiProductSummary>('/product-master/summary');
    return res.data;
  },

  async listSkus(params: ListSkusParams): Promise<PaginatedSkusResult> {
    const res = await apiGet<ApiSkuDetail[]>('/product-master/skus', params as Record<string, string | number | boolean>);
    return {
      items: (res.data ?? []).map(mapApiSkuToSku),
      meta: res.meta ?? { current_page: 1, per_page: 12, total: 0, last_page: 1 },
    };
  },

  async listAllSkus(params: Omit<ListSkusParams, 'page'>): Promise<SKU[]> {
    const first = await this.listSkus({ ...params, page: 1, per_page: 100 });
    const all = [...first.items];
    const lastPage = first.meta.last_page ?? 1;
    for (let page = 2; page <= lastPage; page += 1) {
      const next = await this.listSkus({ ...params, page, per_page: 100 });
      all.push(...next.items);
    }
    return all;
  },

  async getSku(id: string): Promise<SKU> {
    const res = await apiGet<ApiSkuDetail>(`/product-master/skus/${id}`);
    return mapApiSkuToSku(res.data);
  },

  async createSku(form: NewSkuForm): Promise<SKU> {
    const res = await apiPost<ApiSkuDetail>('/product-master/skus', newSkuFormToPayload(form));
    return mapApiSkuToSku(res.data);
  },

  async updateSku(id: string, form: NewSkuForm): Promise<SKU> {
    const res = await apiPut<ApiSkuDetail>(`/product-master/skus/${id}`, newSkuFormToPayload(form));
    return mapApiSkuToSku(res.data);
  },

  async toggleSkuStatus(id: string): Promise<SKU> {
    const res = await apiPost<ApiSkuDetail>(`/product-master/skus/${id}/toggle-status`);
    return mapApiSkuToSku(res.data);
  },

  async bulkArchive(ids: string[]): Promise<number> {
    const res = await apiPost<{ archived_count: number }>('/product-master/skus/bulk-archive', {
      ids: ids.map((id) => parseInt(id, 10)),
    });
    return res.data?.archived_count ?? 0;
  },

  async getReferenceCategories(): Promise<ApiReferenceCategory[]> {
    const res = await apiGet<ApiReferenceCategory[]>('/product-master/reference/categories');
    return res.data ?? [];
  },

  async getAllReferenceCategories(): Promise<ApiReferenceCategory[]> {
    const res = await apiGet<ApiReferenceCategory[]>('/product-master/reference/categories/get/all');
    return res.data ?? [];
  },

  async getTypesGrid(): Promise<ApiTypeGridItem[]> {
    const res = await apiGet<ApiTypeGridItem[]>('/product-master/types');
    return res.data ?? [];
  },

  async importFile(file: File): Promise<ApiImportResult> {
    const formData = new FormData();
    formData.append('import_file', file);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/product-master/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
      throw new ApiError(json.message ?? 'Import failed', response.status, json.data);
    }
    return json.data as ApiImportResult;
  },

  async downloadExport(): Promise<void> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/product-master/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError('Export failed', response.status);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shipper_products.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },

  async downloadImportTemplate(kind: 'sku' | 'index' = 'sku'): Promise<void> {
    let filename = 'sku-bulk-upload-template.csv';
    let content = [
      'SKU Name,SKU Number,Barcode,Unit,Weight,Category,Product Type,Hazardous,Pallet Type,Stackable,Temperature,Status',
      'Example SKU,5200000000000,5200000000000,Case,12.5 kg,Food & Beverages,Frozen Foods,No,EUR,Yes,Ambient,Active'
    ].join('\n');

    if (kind === 'index') {
      filename = 'category-product-type-index.csv';
      const rows = ['Category,Product Type'];
      ((window as any).dbCategories || []).forEach((category: any) => {
        (category.types || []).forEach((type: any) => {
          rows.push([
            csvCell(category.name),
            csvCell(type.name)
          ].join(','));
        });
      });
      content = rows.join('\n');
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  async aiTransform(file: File, signal?: AbortSignal): Promise<AiTransformResult> {
    const formData = new FormData();
    formData.append('import_file', file);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/product-master/ai/transform`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      signal,
    });
    const json = await response.json();
    if (!response.ok) {
      throw new ApiError(json.message ?? 'AI transform failed', response.status, undefined, json.data as AiTransformErrorData);
    }
    return json.data as AiTransformResult;
  },

  async aiConfirmImport(products: AiMappedProduct[]): Promise<ApiImportResult> {
    const res = await apiPost<ApiImportResult>('/product-master/ai/confirm-import', { products });
    return res.data;
  },

  buildListParams: facetToListParams,
  mapReferenceToCategories,
  mapReferenceToProductTypes,
  mapTypeGridToProductTypes,
};

export { ApiError };
