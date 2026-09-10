import axios from 'axios';
import type { PublicTrackingPayload } from '../../pages/PublicTracking/types';

function publicApiBase(): string {
  const shipperBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/shipper/v1';
  return shipperBase.replace(/\/shipper\/v1\/?$/, '/public/v1');
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

async function getTracking(id: string, locationId: string): Promise<PublicTrackingPayload> {
  const base = publicApiBase();
  const res = await axios.get<ApiEnvelope<PublicTrackingPayload>>(
    `${base}/track-shipment/${encodeSegment(id)}/${encodeSegment(locationId)}`
  );
  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.message || 'Failed to load tracking');
  }
  return res.data.data;
}

async function confirmReceipt(
  id: string,
  locationId: string,
  body: {
    confirmation_type: 'full' | 'partial';
    reason_code?: string;
    notes?: string;
    guest_email?: string;
    items?: Array<{
      location_id?: number;
      order_id?: string;
      ordered_qty?: number | null;
      received_qty?: number | null;
    }>;
  }
) {
  const base = publicApiBase();
  const res = await axios.post<ApiEnvelope<unknown>>(
    `${base}/track-shipment/${encodeSegment(id)}/${encodeSegment(locationId)}/confirm-receipt`,
    body
  );
  if (!res.data?.success) {
    throw new Error(res.data?.message || 'Failed to confirm receipt');
  }
  return res.data.data;
}

async function submitRating(
  id: string,
  locationId: string,
  body: {
    rating: number;
    review?: string;
    guest_email?: string;
    delivery_on_time?: boolean;
  }
) {
  const base = publicApiBase();
  const res = await axios.post<ApiEnvelope<{ rated: boolean; guest_display_name?: string }>>(
    `${base}/track-shipment/${encodeSegment(id)}/${encodeSegment(locationId)}/rating`,
    body
  );
  if (!res.data?.success) {
    throw new Error(res.data?.message || 'Failed to submit rating');
  }
  return res.data.data;
}

export const publicTrackingService = {
  getTracking,
  confirmReceipt,
  submitRating,
};
