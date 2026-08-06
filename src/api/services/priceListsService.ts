import { apiGet, apiPost, apiPut } from '../client';
import type { ApiPriceLane, StorePriceLanePayload } from '../types/priceLists';

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
};
