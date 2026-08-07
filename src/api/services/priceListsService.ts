import { apiGet, apiPost, apiPut } from '../client';
import type { ApiListMeta } from '../types/addressBook';
import type { ApiPriceLane, StorePriceLanePayload } from '../types/priceLists';

export type ImportLaneRowPayload = {
  line: number;
  origin_city: string;
  destination_city: string;
  origin_location_id?: string | null;
  destination_location_id?: string | null;
  trip_type: 'direct' | 'roundtrip';
  metric: string;
  metric_value: string;
  price: number;
  currency?: string;
  effective_from?: string;
  effective_to?: string | null;
  status?: 'active' | 'inactive' | 'archived';
  scope?: string;
  scope_direction?: 'buy' | 'sell' | null;
  notes?: string;
};

export type ImportLanesResult = {
  created: number;
  skipped: number;
  errors: Array<{
    line: number;
    code: string;
    field: string;
    message: string;
    conflict_lane_id?: number;
  }>;
};

export type ListPriceLanesParams = {
  page?: number;
  per_page?: number;
  node?: string;
  search?: string;
  status?: string;
  scope_direction?: string;
  sort?: string;
  sort_dir?: 'asc' | 'desc';
};

export type PriceLaneSummary = {
  all: number;
  active: number;
  inactive: number;
  archived: number;
  ftl: number;
  weight: number;
  load: number;
  unit_transport: number;
  expiring: number;
  direct_trip: number;
  round_trip: number;
  simple_lane: number;
  multi_stop: number;
  scopes: Record<string, number>;
};

export type PaginatedPriceLanesResult = {
  items: ApiPriceLane[];
  meta: ApiListMeta;
};

const DEFAULT_META: ApiListMeta = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
};

export const priceListsService = {
  async listLanes(params: ListPriceLanesParams = {}): Promise<PaginatedPriceLanesResult> {
    const query: Record<string, string | number | boolean | undefined> = {
      page: params.page ?? 1,
      per_page: params.per_page ?? 10,
      node: params.node && params.node !== 'all' ? params.node : undefined,
      search: params.search?.trim() || undefined,
      status: params.status,
      scope_direction: params.scope_direction,
      sort: params.sort,
      sort_dir: params.sort_dir,
    };

    const res = await apiGet<ApiPriceLane[]>('/price-lists/lanes', query);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      meta: res.meta ?? {
        ...DEFAULT_META,
        current_page: Number(query.page) || 1,
        per_page: Number(query.per_page) || 10,
        total: Array.isArray(res.data) ? res.data.length : 0,
        last_page: 1,
      },
    };
  },

  async getSummary(): Promise<PriceLaneSummary> {
    const res = await apiGet<PriceLaneSummary>('/price-lists/lanes/summary');
    return res.data ?? {
      all: 0,
      active: 0,
      inactive: 0,
      archived: 0,
      ftl: 0,
      weight: 0,
      load: 0,
      unit_transport: 0,
      expiring: 0,
      direct_trip: 0,
      round_trip: 0,
      simple_lane: 0,
      multi_stop: 0,
      scopes: {},
    };
  },

  async storeLane(payload: StorePriceLanePayload): Promise<ApiPriceLane> {
    const res = await apiPost<ApiPriceLane>('/price-lists/lanes', payload);
    return res.data;
  },

  async updateLane(id: number | string, payload: StorePriceLanePayload): Promise<ApiPriceLane> {
    const res = await apiPut<ApiPriceLane>(`/price-lists/lanes/${id}`, payload);
    return res.data;
  },

  async importLanes(rows: ImportLaneRowPayload[]): Promise<ImportLanesResult> {
    const res = await apiPost<ImportLanesResult>('/price-lists/lanes/import', { rows });
    return res.data ?? { created: 0, skipped: 0, errors: [] };
  },
};
