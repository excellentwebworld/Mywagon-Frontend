import { apiGet, apiPost, AUTH_TOKEN_KEY, ApiError } from '../client';
import { mapApiDetailToShipment, mapApiListItemToShipment } from '../mappers/shipmentsMapper';
import type {
  ApiCancelReasonsPayload,
  ApiShipmentDetail,
  ApiShipmentListItem,
  ApiShipmentsSummary,
  ListShipmentsParams,
  PaginatedShipmentsResult,
} from '../types/shipments';
import type { Shipment } from '../../context/AppContext';
import type { ApiListMeta } from '../types/addressBook';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

function toQuery(params: ListShipmentsParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  const assign = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        query[`${key}[${i}]`] = String(v);
      });
      return;
    }
    query[key] = typeof value === 'number' ? value : String(value);
  };

  assign('page', params.page);
  assign('per_page', params.per_page);
  assign('status', params.status);
  assign('type', params.type);
  assign('channel', params.channel);
  assign('search', params.search);
  assign('kpi', params.kpi);
  assign('sort', params.sort);
  assign('carrier_name', params.carrier_name);
  assign('product_type', params.product_type);
  assign('pickup_lat', params.pickup_lat);
  assign('pickup_lng', params.pickup_lng);
  assign('pickup_radius', params.pickup_radius);
  assign('dropoff_lat', params.dropoff_lat);
  assign('dropoff_lng', params.dropoff_lng);
  assign('dropoff_radius', params.dropoff_radius);
  assign('trip_km_min', params.trip_km_min);
  assign('trip_km_max', params.trip_km_max);
  assign('price_min', params.price_min);
  assign('price_max', params.price_max);
  assign('pickup_from', params.pickup_from);
  assign('pickup_to', params.pickup_to);
  assign('dropoff_from', params.dropoff_from);
  assign('dropoff_to', params.dropoff_to);
  assign('posted_from', params.posted_from);
  assign('posted_to', params.posted_to);
  assign('bid_state', params.bid_state);
  assign('customer', params.customer);
  assign('trip_mode', params.trip_mode);

  return query;
}

function toSearchParams(params: ListShipmentsParams): URLSearchParams {
  const q = new URLSearchParams();
  Object.entries(toQuery(params)).forEach(([k, v]) => q.set(k, String(v)));
  return q;
}

export const shipmentsService = {
  async list(params: ListShipmentsParams = {}): Promise<PaginatedShipmentsResult> {
    const res = await apiGet<ApiShipmentListItem[]>('/shipments', toQuery(params));

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

  async summary(params: Omit<ListShipmentsParams, 'page' | 'per_page'> = {}): Promise<ApiShipmentsSummary> {
    const res = await apiGet<ApiShipmentsSummary>('/shipments/summary', toQuery(params));
    return (
      res.data ?? {
        kpis: {
          needs_action: 0,
          awaiting_response: 0,
          at_risk: 0,
          pickup_today: 0,
          awaiting_pod: 0,
        },
        statuses: {},
      }
    );
  },

  async exportShipments(params: Omit<ListShipmentsParams, 'page' | 'per_page'> = {}): Promise<void> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const query = toSearchParams(params);
    const response = await fetch(`${API_BASE}/shipments/export?${query.toString()}`, {
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new ApiError('Export failed', response.status);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trips_Export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async get(id: string | number): Promise<ApiShipmentDetail> {
    const res = await apiGet<ApiShipmentDetail>(`/shipments/${id}`);
    return res.data;
  },

  async getMapped(id: string | number): Promise<Shipment> {
    const detail = await this.get(id);
    return mapApiDetailToShipment(detail);
  },

  async cancelReasons(id: string | number): Promise<ApiCancelReasonsPayload> {
    const res = await apiGet<ApiCancelReasonsPayload>(`/shipments/${id}/cancel-reasons`);
    return (
      res.data ?? {
        reasons: [],
        cancellation_charge: { charge: 0, flag: false, message: '' },
        shipment: { id: Number(id), auto_id: String(id), status: '' },
      }
    );
  },

  async cancel(
    id: string | number,
    body: { cancel_reason_id: number; cancel_notes?: string }
  ): Promise<void> {
    await apiPost(`/shipments/${id}/cancel`, body);
  },
};
