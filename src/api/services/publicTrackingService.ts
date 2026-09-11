import axios from 'axios';
import type { PublicTrackingPayload } from '../../pages/PublicTracking/types';

function publicApiBase(): string {
  const shipperBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/shipper/v1';
  // https://host/api/shipper/v1  →  https://host/api/public/v1
  // /api/shipper/v1              →  /api/public/v1
  const replaced = shipperBase.replace(/\/shipper\/v1\/?$/, '/public/v1');
  if (replaced !== shipperBase) return replaced.replace(/\/$/, '');
  // Fallback if env shape differs
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

function trackingQuery(id: string, locationId: string, guestEmail?: string | null) {
  const params: Record<string, string> = { sid: id, lid: locationId };
  const email = (guestEmail || '').trim();
  if (email) {
    params.email = email;
    params.guest_email = email;
  }
  return params;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

async function getTracking(
  id: string,
  locationId: string,
  guestEmail?: string | null
): Promise<PublicTrackingPayload> {
  const base = publicApiBase();
  try {
    const res = await axios.get<ApiEnvelope<PublicTrackingPayload>>(`${base}/track-shipment`, {
      params: trackingQuery(id, locationId, guestEmail),
    });
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Failed to load tracking');
    }
    return res.data.data;
  } catch (err) {
    throw new Error(apiErrorMessage(err, 'Failed to load tracking'));
  }
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
  try {
    const res = await axios.post<ApiEnvelope<unknown>>(
      `${base}/track-shipment/confirm-receipt`,
      body,
      { params: trackingQuery(id, locationId, body.guest_email) }
    );
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Failed to confirm receipt');
    }
    return res.data.data;
  } catch (err) {
    throw new Error(apiErrorMessage(err, 'Failed to confirm receipt'));
  }
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
  try {
    const res = await axios.post<ApiEnvelope<{ rated: boolean; guest_display_name?: string }>>(
      `${base}/track-shipment/rating`,
      body,
      { params: trackingQuery(id, locationId, body.guest_email) }
    );
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Failed to submit rating');
    }
    return res.data.data;
  } catch (err) {
    throw new Error(apiErrorMessage(err, 'Failed to submit rating'));
  }
}

export const publicTrackingService = {
  getTracking,
  confirmReceipt,
  submitRating,
};
