import type { ApiResponse } from '../types/addressBook';
import type {
  AddonQuote,
  BillingCycle,
  SubscriptionCheckout,
  SubscriptionOverview,
  SubscriptionQuote,
  SubscriptionVerifyResult,
} from '../types/subscription';
import { createWebViewApi, type WebViewRole } from '../webviewClient';

const BASE = '/webview/subscription';

export function createWebViewSubscriptionService(role: WebViewRole, userId: string) {
  const axiosInstance = createWebViewApi(role, userId);

  async function get<T>(path: string): Promise<ApiResponse<T>> {
    const res = await axiosInstance.get<ApiResponse<T>>(path);
    return res.data;
  }

  async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
    const res = await axiosInstance.post<ApiResponse<T>>(path, { ...body, user_id: userId });
    return res.data;
  }

  return {
    getOverview() {
      return get<SubscriptionOverview>(BASE).then((res) => res.data);
    },

    quotePlan(planId: number, period: BillingCycle) {
      return post<SubscriptionQuote>(`${BASE}/quote`, { plan_id: planId, period }).then((res) => res.data);
    },

    checkoutPlan(planId: number, period: BillingCycle, autoPay: boolean) {
      return post<SubscriptionCheckout>(`${BASE}/checkout`, {
        plan_id: planId,
        period,
        auto_pay: autoPay,
      }).then((res) => res.data);
    },

    verifyPayment(transactionId?: string, orderCode?: string) {
      return post<SubscriptionVerifyResult>(`${BASE}/verify-payment`, {
        transaction_id: transactionId,
        order_code: orderCode,
        t: transactionId,
        s: orderCode,
      }).then((res) => res.data);
    },

    setAutoPay(enabled: boolean) {
      return post(`${BASE}/auto-pay`, { enabled });
    },

    cancelPlan() {
      return post(`${BASE}/cancel`);
    },

    quoteAddon(addonPriceId: number, count: number, interval: BillingCycle) {
      return post<AddonQuote>(`${BASE}/addons/quote`, {
        addon_price_id: addonPriceId,
        count,
        interval,
      }).then((res) => res.data);
    },

    checkoutAddon(addonPriceId: number, count: number, interval: BillingCycle, autoPay: boolean) {
      return post<SubscriptionCheckout>(`${BASE}/addons/checkout`, {
        addon_price_id: addonPriceId,
        count,
        interval,
        auto_pay: autoPay,
      }).then((res) => res.data);
    },

    cancelAddon(id: number) {
      return post(`${BASE}/addons/${id}/cancel`);
    },

    setAddonAutoPay(id: number, enabled: boolean) {
      return post(`${BASE}/addons/${id}/auto-pay`, { enabled });
    },

    contactUs(payload: { name: string; email: string; phone: string; description: string }) {
      return post(`${BASE}/contact-us`, payload);
    },
  };
}

export type WebViewSubscriptionService = ReturnType<typeof createWebViewSubscriptionService>;
