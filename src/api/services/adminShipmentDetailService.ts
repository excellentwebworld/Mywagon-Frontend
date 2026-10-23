import axios from 'axios';
import type { ApiShipmentDetail } from '../types/shipments';
import { mapApiDetailToShipment } from '../mappers/shipmentsMapper';
import type { Shipment } from '../../context/AppContext';

function publicApiBase(): string {
  const shipperBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/shipper/v1';
  const replaced = shipperBase.replace(/\/shipper\/v1\/?$/, '/public/v1');
  if (replaced !== shipperBase) return replaced.replace(/\/$/, '');
  try {
    if (/^https?:\/\//i.test(shipperBase)) {
      const url = new URL(shipperBase);
      return `${url.origin}/api/public/v1`;
    }
  } catch {
    /* ignore */
  }
  return '/api/public/v1';
}

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const adminShipmentDetailService = {
  async getMapped(shipmentId: string | number): Promise<Shipment> {
    const base = publicApiBase();
    const id = String(shipmentId).trim();
    try {
      const res = await axios.get<ApiEnvelope<ApiShipmentDetail>>(`${base}/admin-shipment-detail/${encodeURIComponent(id)}`);
      if (!res.data?.success || !res.data.data) {
        throw new Error(res.data?.message || 'Failed to load shipment');
      }
      return mapApiDetailToShipment(res.data.data);
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Failed to load shipment'));
    }
  },
};
