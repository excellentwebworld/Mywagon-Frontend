import { apiDelete, apiGet, apiPost, apiPut, ApiError, AUTH_TOKEN_KEY } from '../client';
import {
  buildListParams,
  mapApiDetailToOrder,
  mapApiListItemToOrder,
  formToPayload,
} from '../mappers/erpOrdersMapper';
import type {
  AiMappedOrder,
  AiOrdersTransformErrorData,
  AiOrdersTransformResult,
  ApiErpOrderDetail,
  ApiErpOrderListItem,
  ApiErpOrderCustomer,
  ApiErpOrderSummary,
  ApiErpOrdersImportResult,
  ErpOrderFormPayload,
  ListErpOrdersParams,
  PaginatedErpOrdersResult,
} from '../types/erpOrders';
import type { ErpOrder, ErpOrderKpiFilter, ErpOrderSortField } from '../../pages/ErpOrders/types';
import type { ApiListMeta } from '../types/addressBook';

import { getBrowserTimezone } from '../../utils/timezone';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

function exportParamsToQuery(params: Omit<ListErpOrdersParams, 'page' | 'per_page'>): URLSearchParams {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.high_priority) query.set('high_priority', '1');
  if (params.unlinked) query.set('unlinked', '1');
  if (params.sort) query.set('sort', params.sort);
  if (params.sort_dir) query.set('sort_dir', params.sort_dir);
  if (params.timezone) query.set('timezone', params.timezone);
  return query;
}

export const erpOrdersService = {
  async getSummary(): Promise<ApiErpOrderSummary> {
    const res = await apiGet<ApiErpOrderSummary>('/erp-orders/summary');
    return res.data;
  },

  async listCustomers(search?: string): Promise<ApiErpOrderCustomer[]> {
    const res = await apiGet<ApiErpOrderCustomer[]>(
      '/erp-orders/customers',
      search ? { search } : undefined
    );
    return res.data ?? [];
  },

  async listOrders(params: ListErpOrdersParams): Promise<PaginatedErpOrdersResult> {
    const query: Record<string, string | number | boolean> = {};
    if (params.page) query.page = params.page;
    if (params.per_page) query.per_page = params.per_page;
    if (params.search) query.search = params.search;
    if (params.status && params.status !== 'all') query.status = params.status;
    if (params.high_priority) query.high_priority = 1;
    if (params.unlinked) query.unlinked = 1;
    if (params.sort) query.sort = params.sort;
    if (params.sort_dir) query.sort_dir = params.sort_dir;

    const res = await apiGet<ApiErpOrderListItem[]>('/erp-orders', query);
    return {
      items: res.data ?? [],
      meta: res.meta ?? { current_page: 1, per_page: 20, total: 0, last_page: 1 },
    };
  },

  async listOrdersMapped(
    kpiFilter: ErpOrderKpiFilter,
    highPriority: boolean,
    search: string,
    sortField: ErpOrderSortField,
    sortDir: 'asc' | 'desc' | '',
    page: number,
    perPage: number
  ): Promise<{ orders: ErpOrder[]; meta: ApiListMeta }> {
    const params = buildListParams(
      kpiFilter,
      highPriority,
      search,
      sortField,
      sortDir,
      page,
      perPage
    );
    const result = await this.listOrders(params);
    return {
      orders: result.items.map(mapApiListItemToOrder),
      meta: result.meta,
    };
  },

  async getOrder(id: string): Promise<ErpOrder> {
    const res = await apiGet<ApiErpOrderDetail>(`/erp-orders/${id}`);
    return mapApiDetailToOrder(res.data);
  },

  async createOrder(form: ErpOrderFormPayload): Promise<ErpOrder> {
    const res = await apiPost<ApiErpOrderDetail>('/erp-orders', formToPayload(form));
    return mapApiDetailToOrder(res.data);
  },

  async updateOrder(id: string, form: ErpOrderFormPayload): Promise<ErpOrder> {
    const res = await apiPut<ApiErpOrderDetail>(`/erp-orders/${id}`, formToPayload(form));
    return mapApiDetailToOrder(res.data);
  },

  async deleteOrder(id: string): Promise<void> {
    await apiDelete(`/erp-orders/${id}`);
  },

  async downloadImportTemplate(): Promise<void> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/erp-orders/import/template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError('Template download failed', response.status);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erp-orders-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  async exportOrders(params: Omit<ListErpOrdersParams, 'page' | 'per_page'>): Promise<void> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const clientTimezone = params.timezone ?? getBrowserTimezone();
    const exportQuery = exportParamsToQuery({
      ...params,
      timezone: clientTimezone,
    });
    const response = await fetch(`${API_BASE}/erp-orders/export?${exportQuery.toString()}`, {
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Client-Timezone': clientTimezone,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new ApiError('Export failed', response.status);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erp_orders.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },

  async aiTransform(file: File): Promise<AiOrdersTransformResult> {
    const formData = new FormData();
    formData.append('import_file', file);
    const res = await apiPost<AiOrdersTransformResult>('/erp-orders/ai/transform', formData);
    return res.data;
  },

  async aiConfirmImport(orders: AiMappedOrder[]): Promise<ApiErpOrdersImportResult> {
    const res = await apiPost<ApiErpOrdersImportResult>('/erp-orders/ai/confirm-import', { orders });
    return res.data;
  },
};

export { ApiError };
