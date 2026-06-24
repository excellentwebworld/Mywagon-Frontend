import { apiDelete, apiGet, apiPost } from '../client';
import {
  buildListParams,
  mapListItemToPartner,
  mergeDetailIntoPartner,
} from '../mappers/partnersMapper';
import type {
  ApiPartnerDetail,
  ApiPartnerListItem,
  ApiPartnerSummary,
  ApiTruckCategory,
  ListPartnersParams,
  PaginatedPartnersResult,
} from '../types/partners';
import type { FacetFilter, Partner, PartnersSortField } from '../../pages/Partners/types';
import type { ApiListMeta } from '../types/addressBook';

export const partnersService = {
  async getSummary(): Promise<ApiPartnerSummary> {
    const res = await apiGet<ApiPartnerSummary>('/partners/summary');
    return res.data;
  },

  async getTruckCategories(): Promise<ApiTruckCategory[]> {
    const res = await apiGet<ApiTruckCategory[]>('/partners/reference/truck-categories');
    return res.data ?? [];
  },

  async listPartners(params: ListPartnersParams): Promise<PaginatedPartnersResult> {
    const query: Record<string, string | number | boolean> = {};
    if (params.page) query.page = params.page;
    if (params.per_page) query.per_page = params.per_page;
    if (params.search) query.search = params.search;
    if (params.facet) query.facet = params.facet;
    if (params.statuses?.length) query.statuses = params.statuses.join(',');
    if (params.capabilities?.length) query.capabilities = params.capabilities.join(',');
    if (params.sort) query.sort = params.sort;
    if (params.sort_dir) query.sort_dir = params.sort_dir;

    const res = await apiGet<ApiPartnerListItem[]>('/partners', query);
    return {
      items: res.data ?? [],
      meta: res.meta ?? ({ current_page: 1, per_page: 12, total: 0, last_page: 1 } as ApiListMeta),
    };
  },

  async listPartnersMapped(
    facet: FacetFilter,
    statuses: string[],
    capabilities: number[],
    search: string,
    page: number,
    perPage: number,
    sortField: PartnersSortField,
    sortDir: 'asc' | 'desc'
  ): Promise<{ partners: Partner[]; meta: ApiListMeta }> {
    const params = buildListParams(facet, statuses, capabilities, search, page, perPage, sortField, sortDir);
    const result = await this.listPartners(params);
    return {
      partners: result.items.map(mapListItemToPartner),
      meta: result.meta,
    };
  },

  async getPartner(id: string): Promise<Partner> {
    const res = await apiGet<ApiPartnerDetail>(`/partners/${id}`);
    const base = mapListItemToPartner(res.data);
    return mergeDetailIntoPartner(base, res.data);
  },

  async invite(payload: {
    type: 'carrier' | 'driver' | 'shipper';
    email?: string;
    phone?: string;
    country_code?: string;
    unique_id?: string;
    relationship?: 'preferred' | 'standard' | null;
  }): Promise<{ id: number }> {
    const res = await apiPost<{ id: number }>('/partners/invite', payload);
    return res.data;
  },

  async accept(id: string): Promise<void> {
    await apiPost(`/partners/${id}/accept`);
  },

  async decline(id: string): Promise<void> {
    await apiPost(`/partners/${id}/decline`);
  },

  async delete(id: string): Promise<void> {
    await apiDelete(`/partners/${id}`);
  },

  async toggleStatus(id: string): Promise<{ is_suspended: boolean }> {
    const res = await apiPost<{ is_suspended: boolean }>(`/partners/${id}/toggle-status`);
    return res.data;
  },

  async togglePreferred(id: string): Promise<{ is_preferred: boolean; relationship: string | null }> {
    const res = await apiPost<{ is_preferred: boolean; relationship: string | null }>(
      `/partners/${id}/toggle-preferred`
    );
    return res.data;
  },

  async updateNotes(id: string, notes: string): Promise<void> {
    await apiPost(`/partners/${id}/notes`, { notes });
  },

  async updateTags(id: string, tags: string[]): Promise<void> {
    await apiPost(`/partners/${id}/tags`, { tags });
  },

  async storeContractLane(
    partnerId: string,
    payload: { origin_city: string; destination_city: string; price: number; unit: 'load' | 'pallet' }
  ) {
    const res = await apiPost(`/partners/${partnerId}/contract-lanes`, payload);
    return res.data;
  },

  async destroyContractLane(partnerId: string, laneId: string): Promise<void> {
    await apiDelete(`/partners/${partnerId}/contract-lanes/${laneId}`);
  },
};
