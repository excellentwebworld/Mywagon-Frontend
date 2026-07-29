import { ApiError, apiGet, apiPost, AUTH_TOKEN_KEY } from '../client';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';
import { buildListParams, mapListItemToTruck, mapPendingMatch, mapPendingMatchDetail } from '../mappers/availabilitiesMapper';
import type {
  ApiAvailabilityDetail,
  ApiAvailabilityListItem,
  ApiPendingMatch,
  ApiPendingMatchDetail,
  ApiPlaceBidResult,
  ApiProceedResult,
  ListAvailabilitiesParams,
  PaginatedAvailabilitiesResult,
} from '../types/availabilities';
import type { ApiListMeta } from '../types/addressBook';
import type {
  AvailableTruck,
  PendingMatchDetail,
  PendingShipment,
  QuickFilterKey,
  SearchCriteria,
  SortKey,
  VisibilityFilter,
} from '../../pages/SearchTrucks/types';

function toQueryString(params: ListAvailabilitiesParams): string {
  const search = new URLSearchParams();
  const set = (key: string, value: string | number | boolean | undefined) => {
    if (value === undefined || value === '') return;
    if (typeof value === 'boolean') search.set(key, value ? '1' : '0');
    else search.set(key, String(value));
  };

  set('page', params.page);
  set('per_page', params.per_page);
  set('visibility', params.visibility);
  set('search', params.search);
  set('sort', params.sort);
  set('pickup_city', params.pickup_city);
  set('pickup_lat', params.pickup_lat);
  set('pickup_lng', params.pickup_lng);
  set('pickup_radius', params.pickup_radius);
  set('pickup_ne_lat', params.pickup_ne_lat);
  set('pickup_ne_lng', params.pickup_ne_lng);
  set('pickup_sw_lat', params.pickup_sw_lat);
  set('pickup_sw_lng', params.pickup_sw_lng);
  set('dropoff_city', params.dropoff_city);
  set('dropoff_lat', params.dropoff_lat);
  set('dropoff_lng', params.dropoff_lng);
  set('dropoff_radius', params.dropoff_radius);
  set('pickup_date', params.pickup_date);
  set('dropoff_date', params.dropoff_date);
  set('available_today', params.available_today);
  set('starting_within_hours', params.starting_within_hours);
  set('has_bids', params.has_bids);
  set('load_match', params.load_match);
  set('trip_type', params.trip_type);
  set('available_from_start', params.available_from_start);
  set('available_from_end', params.available_from_end);
  set('min_price', params.min_price);
  set('max_price', params.max_price);
  (params.provider_names ?? []).forEach((name) => {
    search.append('provider_names[]', name);
  });

  (params.truck_type_ids ?? []).forEach((id) => {
    search.append('truck_type_ids[]', String(id));
  });
  (params.truck_category_ids ?? []).forEach((id) => {
    search.append('truck_category_ids[]', String(id));
  });

  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const SAT_PREFILL_KEY = 'sat_availability_prefill';

export const availabilitiesService = {
  async list(params: ListAvailabilitiesParams): Promise<PaginatedAvailabilitiesResult> {
    const res = await apiGet<ApiAvailabilityListItem[]>(`/availabilities${toQueryString(params)}`);
    return {
      items: res.data ?? [],
      meta: res.meta ?? ({ current_page: 1, per_page: 12, total: 0, last_page: 1 } as ApiListMeta),
    };
  },

  async listMapped(input: {
    page: number;
    perPage: number;
    visibility: VisibilityFilter;
    search: string;
    sort: SortKey;
    criteria: SearchCriteria;
    quickFilters: Set<QuickFilterKey>;
  }): Promise<{ trucks: AvailableTruck[]; meta: ApiListMeta }> {
    const params = buildListParams(input);
    const result = await this.list(params);
    return {
      trucks: result.items.map(mapListItemToTruck),
      meta: result.meta,
    };
  },

  /** Walk pages at per_page=100 for map pins (hard cap). */
  async listAllMappedForMap(
    input: {
      visibility: VisibilityFilter;
      search: string;
      sort: SortKey;
      criteria: SearchCriteria;
      quickFilters: Set<QuickFilterKey>;
    },
    options?: { perPage?: number; maxPins?: number }
  ): Promise<{ trucks: AvailableTruck[]; meta: ApiListMeta; capped: boolean }> {
    const perPage = options?.perPage ?? 100;
    const maxPins = options?.maxPins ?? 500;
    const trucks: AvailableTruck[] = [];
    let page = 1;
    let meta: ApiListMeta = {
      current_page: 1,
      per_page: perPage,
      total: 0,
      last_page: 1,
    };

    while (trucks.length < maxPins) {
      const result = await this.listMapped({
        ...input,
        page,
        perPage,
      });
      meta = result.meta;
      for (const truck of result.trucks) {
        trucks.push(truck);
        if (trucks.length >= maxPins) break;
      }
      if (page >= (result.meta.last_page || 1)) break;
      if (result.trucks.length === 0) break;
      page += 1;
    }

    const capped = trucks.length >= maxPins && trucks.length < (meta.total || 0);
    return { trucks, meta, capped };
  },

  async get(id: number): Promise<ApiAvailabilityDetail> {
    const res = await apiGet<ApiAvailabilityDetail>(`/availabilities/${id}`);
    return res.data;
  },

  async proceed(
    id: number,
    action: 'create_shipment' | 'pending_matches'
  ): Promise<ApiProceedResult> {
    const res = await apiPost<ApiProceedResult>(`/availabilities/${id}/proceed`, { action });
    return res.data;
  },

  async pendingMatches(
    id: number,
    input: {
      page?: number;
      perPage?: number;
      search?: string;
      filter?: 'all' | 'exact' | 'multi';
    } = {}
  ): Promise<{
    items: PendingShipment[];
    meta: ApiListMeta & { counts?: Record<string, number>; can_view_match_score?: boolean };
  }> {
    const res = await apiGet<ApiPendingMatch[]>(`/availabilities/${id}/pending-matches`, {
      page: input.page ?? 1,
      per_page: input.perPage ?? 10,
      search: input.search?.trim() || undefined,
      filter: input.filter && input.filter !== 'all' ? input.filter : undefined,
    });
    const meta = res.meta ?? {
      current_page: input.page ?? 1,
      per_page: input.perPage ?? 10,
      total: (res.data ?? []).length,
      last_page: 1,
    };
    return {
      items: (res.data ?? []).map(mapPendingMatch),
      meta,
    };
  },

  async pendingMatchDetail(
    availabilityId: number,
    shipmentId: number
  ): Promise<PendingMatchDetail> {
    const res = await apiGet<ApiPendingMatchDetail>(
      `/availabilities/${availabilityId}/pending-matches/${shipmentId}`
    );
    return mapPendingMatchDetail(res.data);
  },

  async placeBid(
    availabilityId: number,
    body: { shipment_id: number; quote?: number | string; notes?: string }
  ): Promise<ApiPlaceBidResult> {
    const res = await apiPost<ApiPlaceBidResult>(`/availabilities/${availabilityId}/bids`, body);
    return res.data;
  },

  async exportCsv(input: {
    visibility: VisibilityFilter;
    search: string;
    sort: SortKey;
    criteria: SearchCriteria;
    quickFilters: Set<QuickFilterKey>;
  }): Promise<void> {
    const params = buildListParams({
      page: 1,
      perPage: 12,
      ...input,
    });
    delete params.page;
    delete params.per_page;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/availabilities/export${toQueryString(params)}`, {
      headers: {
        Accept: 'text/csv',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      let message = 'Export failed';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        /* ignore */
      }
      throw new ApiError(message, response.status);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `available-trucks_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
