import { apiGet } from '../client';
import { mapApiDetailToShipment, mapApiListItemToShipment } from '../mappers/shipmentsMapper';
import type {
  ApiShipmentDetail,
  ApiShipmentListItem,
  ListShipmentsParams,
  PaginatedShipmentsResult,
} from '../types/shipments';
import type { Shipment } from '../../context/AppContext';
import type { ApiListMeta } from '../types/addressBook';

export const shipmentsService = {
  async list(params: ListShipmentsParams = {}): Promise<PaginatedShipmentsResult> {
    const query: Record<string, string | number> = {};
    if (params.page) query.page = params.page;
    if (params.per_page) query.per_page = params.per_page;
    if (params.status) query.status = params.status;
    if (params.type) query.type = params.type;
    if (params.search) query.search = params.search;

    const res = await apiGet<ApiShipmentListItem[]>('/shipments', query);

    return {
      items: res.data ?? [],
      meta: {
        current_page: res.meta?.current_page ?? 1,
        per_page: res.meta?.per_page ?? 20,
        total: res.meta?.total ?? 0,
        last_page: res.meta?.last_page ?? 1,
      },
    };
  },

  async listMapped(params: ListShipmentsParams = {}): Promise<{ shipments: Shipment[]; meta: ApiListMeta }> {
    const result = await this.list(params);
    return {
      shipments: result.items.map(mapApiListItemToShipment),
      meta: result.meta,
    };
  },

  async get(id: string | number): Promise<ApiShipmentDetail> {
    const res = await apiGet<ApiShipmentDetail>(`/shipments/${id}`);
    return res.data;
  },

  async getMapped(id: string | number): Promise<Shipment> {
    const detail = await this.get(id);
    return mapApiDetailToShipment(detail);
  },
};
