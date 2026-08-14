import { apiGet, apiPost } from '../client';
import type {
  AddonQuote,
  BillingCycle,
  SubscriptionCheckout,
  SubscriptionOverview,
  SubscriptionQuote,
  SubscriptionVerifyResult,
} from '../types/subscription';

export const subscriptionService = {
  getOverview() {
    return apiGet<SubscriptionOverview>('/subscription').then((res) => res.data);
  },

  quotePlan(planId: number, period: BillingCycle) {
    return apiPost<SubscriptionQuote>('/subscription/quote', {
      plan_id: planId,
      period,
    }).then((res) => res.data);
  },

  checkoutPlan(planId: number, period: BillingCycle, autoPay: boolean) {
    return apiPost<SubscriptionCheckout>('/subscription/checkout', {
      plan_id: planId,
      period,
      auto_pay: autoPay,
    }).then((res) => res.data);
  },

  verifyPayment(transactionId?: string, orderCode?: string) {
    return apiPost<SubscriptionVerifyResult>('/subscription/verify-payment', {
      transaction_id: transactionId,
      order_code: orderCode,
      t: transactionId,
      s: orderCode,
    }).then((res) => res.data);
  },

  setAutoPay(enabled: boolean) {
    return apiPost('/subscription/auto-pay', { enabled });
  },

  cancelPlan() {
    return apiPost('/subscription/cancel');
  },

  quoteAddon(addonPriceId: number, count: number, interval: BillingCycle) {
    return apiPost<AddonQuote>('/subscription/addons/quote', {
      addon_price_id: addonPriceId,
      count,
      interval,
    }).then((res) => res.data);
  },

  checkoutAddon(addonPriceId: number, count: number, interval: BillingCycle, autoPay: boolean) {
    return apiPost<SubscriptionCheckout>('/subscription/addons/checkout', {
      addon_price_id: addonPriceId,
      count,
      interval,
      auto_pay: autoPay,
    }).then((res) => res.data);
  },

  cancelAddon(id: number) {
    return apiPost(`/subscription/addons/${id}/cancel`);
  },

  setAddonAutoPay(id: number, enabled: boolean) {
    return apiPost(`/subscription/addons/${id}/auto-pay`, { enabled });
  },
};
