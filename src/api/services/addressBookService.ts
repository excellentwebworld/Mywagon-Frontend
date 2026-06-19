import { apiDelete, apiGet, apiPost, apiPut, AUTH_TOKEN_KEY, ApiError } from '../client';
import {
  directoryToListParams,
  listParamsToExportQuery,
  mapDetailToLocation,
  mapListItemToLocation,
  mapLocationItemToPayload,
  mapLocationToPayload,
} from '../mappers/addressBookMapper';
import type { LocationItem } from '../../context/AppContext';
import type { CompanyFormData, CreateLocationData } from '../../pages/AddressBook/types';
import type {
  ApiAddressBookSummary,
  ApiAmenity,
  ApiCompanyEntity,
  ApiCompanyEntityPayload,
  ApiCompanyLookup,
  ApiDuplicateCheckResult,
  ApiListMeta,
  ApiLocationDetail,
  ApiLocationListItem,
  ApiLocationStats,
  ListLocationsParams,
} from '../types/addressBook';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export interface PaginatedLocationsResult {
  items: LocationItem[];
  meta: ApiListMeta;
}

export const addressBookService = {
  async getSummary(): Promise<ApiAddressBookSummary> {
    const res = await apiGet<ApiAddressBookSummary>('/address-book/summary');
    return res.data;
  },

  async listLocations(params: ListLocationsParams): Promise<PaginatedLocationsResult> {
    const res = await apiGet<ApiLocationListItem[]>('/address-book/locations', params as Record<string, string | number | boolean>);
    return {
      items: (res.data ?? []).map(mapListItemToLocation),
      meta: res.meta ?? {
        current_page: 1,
        per_page: params.per_page ?? 12,
        total: res.data?.length ?? 0,
        last_page: 1,
      },
    };
  },

  async getLocation(id: string): Promise<LocationItem> {
    const [detailRes, statsRes] = await Promise.all([
      apiGet<ApiLocationDetail>(`/address-book/locations/${id}`),
      apiGet<ApiLocationStats>(`/address-book/locations/${id}/stats`).catch(() => null),
    ]);
    return mapDetailToLocation(detailRes.data, statsRes?.data);
  },

  async createLocation(data: CreateLocationData): Promise<LocationItem> {
    const payload = mapLocationToPayload(data);
    const res = await apiPost<ApiLocationDetail>('/address-book/locations', payload);
    return mapDetailToLocation(res.data);
  },

  async updateLocation(id: string, loc: LocationItem): Promise<LocationItem> {
    const payload = mapLocationItemToPayload(loc);
    const res = await apiPut<ApiLocationDetail>(`/address-book/locations/${id}`, payload);
    return mapDetailToLocation(res.data);
  },

  async deleteLocation(id: string): Promise<void> {
    await apiDelete<null>(`/address-book/locations/${id}`);
  },

  async restoreLocation(id: string): Promise<LocationItem> {
    const res = await apiPost<ApiLocationDetail>(`/address-book/locations/${id}/restore`);
    return mapDetailToLocation(res.data);
  },

  async listAllLocations(params: Omit<ListLocationsParams, 'page'>): Promise<LocationItem[]> {
    const first = await this.listLocations({ ...params, page: 1, per_page: 100 });
    const all = [...first.items];
    const lastPage = first.meta.last_page ?? 1;
    for (let page = 2; page <= lastPage; page += 1) {
      const next = await this.listLocations({ ...params, page, per_page: 100 });
      all.push(...next.items);
    }
    return all;
  },

  async checkDuplicate(
    locationName: string,
    companyName: string,
    addressId?: string
  ): Promise<ApiDuplicateCheckResult> {
    const res = await apiPost<ApiDuplicateCheckResult>('/address-book/locations/check-duplicate', {
      location_name: locationName,
      company_name: companyName,
      address_id: addressId ? parseInt(addressId, 10) : undefined,
    });

    const failed = res.success === false || (res as { status?: boolean }).status === false;
    if (failed) {
      throw new ApiError(res.message || 'Duplicate check failed', 422);
    }

    return res.data ?? { duplicate: false, existing_id: null };
  },

  async listCompanies(search?: string): Promise<ApiCompanyLookup[]> {
    const res = await apiGet<ApiCompanyLookup[]>('/address-book/companies', search ? { search } : undefined);
    return res.data ?? [];
  },

  async listAmenities(): Promise<ApiAmenity[]> {
    const res = await apiGet<ApiAmenity[]>('/address-book/amenities');
    return res.data ?? [];
  },

  async listCompanyEntities(search?: string): Promise<ApiCompanyEntity[]> {
    const res = await apiGet<ApiCompanyEntity[]>('/address-book/company-entities', search ? { search } : undefined);
    return res.data ?? [];
  },

  async createCompanyEntity(payload: ApiCompanyEntityPayload): Promise<ApiCompanyEntity> {
    const res = await apiPost<ApiCompanyEntity>('/address-book/company-entities', payload);
    return res.data;
  },

  async exportExcel(params: ListLocationsParams): Promise<Blob> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const query = new URLSearchParams(listParamsToExportQuery(params));
    const response = await fetch(`${API_BASE}/address-book/export?${query.toString()}`, {
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Export failed');
    }
    return response.blob();
  },
};

export { directoryToListParams };
