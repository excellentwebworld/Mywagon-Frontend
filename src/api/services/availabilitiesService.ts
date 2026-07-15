import { apiGet, apiPost } from '../client';
import { buildListParams, mapListItemToTruck, mapPendingMatch } from '../mappers/availabilitiesMapper';
import type {
  ApiAvailabilityDetail,
  ApiAvailabilityListItem,
  ApiPendingMatch,
  ApiPlaceBidResult,
  ApiProceedResult,
  ListAvailabilitiesParams,
  PaginatedAvailabilitiesResult,
} from '../types/availabilities';
import type { ApiListMeta } from '../types/addressBook';
import type {
  AvailableTruck,
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
  set('dropoff_city', params.dropoff_city);
  set('dropoff_lat', params.dropoff_lat);
  set('dropoff_lng', params.dropoff_lng);
  set('dropoff_radius', params.dropoff_radius);
  set('pickup_date', params.pickup_date);
  set('available_today', params.available_today);
  set('starting_within_hours', params.starting_within_hours);
  set('has_bids', params.has_bids);
  set('load_match', params.load_match);

  (params.truck_type_ids ?? []).forEach((id) => {
    search.append('truck_type_ids[]', String(id));
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

  async pendingMatches(id: number): Promise<PendingShipment[]> {
    const res = await apiGet<ApiPendingMatch[]>(`/availabilities/${id}/pending-matches`);
    return (res.data ?? []).map(mapPendingMatch);
  },

  async placeBid(
    availabilityId: number,
    body: { shipment_id: number; quote?: number | string; notes?: string }
  ): Promise<ApiPlaceBidResult> {
    const res = await apiPost<ApiPlaceBidResult>(`/availabilities/${availabilityId}/bids`, body);
    return res.data;
  },
};
