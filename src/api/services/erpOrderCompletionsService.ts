import { gatewayFetch } from '../chatGatewayUrl';
import { getStoredToken } from '../client';

/**
 * ERP orders the shipper marked complete in Vagon AI (delivered outside MYVAGON).
 *
 * Kept by the gateway, not Laravel: `/erp-orders` still reports these as
 * unplanned, so the orders toolbar reads this list to drop them from its
 * Unplanned view and show them under Completed. Completing and reopening are
 * confirmed writes that go through the chat's confirmation card, never here.
 */
export type CompletedErpOrder = {
  order_id: string;
  order_reference: string;
  customer_name: string | null;
  prior_status: string;
  reason: string | null;
  completed_at: string;
};

export const erpOrderCompletionsService = {
  async list(locale?: string): Promise<CompletedErpOrder[]> {
    const res = await gatewayFetch('/vagon-ai/erp-order-completions', { token: getStoredToken(), locale });
    const body = (await res.json()) as { completed?: CompletedErpOrder[] };
    return Array.isArray(body.completed) ? body.completed : [];
  },
};
