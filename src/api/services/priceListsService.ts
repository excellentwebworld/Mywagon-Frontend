import { apiGet, apiPost, apiPut } from '../client';
import type { ApiPriceLane, StorePriceLanePayload } from '../types/priceLists';

export type ImportLaneRowPayload = {
  line: number;
  origin_city: string;
  destination_city: string;
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

export const priceListsService = {
  async listLanes(status?: string): Promise<ApiPriceLane[]> {
    const res = await apiGet<ApiPriceLane[]>('/price-lists/lanes', status ? { status } : undefined);
    return res.data ?? [];
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
