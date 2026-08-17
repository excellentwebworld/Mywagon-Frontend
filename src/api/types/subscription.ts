export type BillingCycle = 'month' | 'year';

export interface SubscriptionUsageItem {
  slug: string;
  name?: string;
  used: number;
  limit: number | null;
  unlimited: boolean;
}

export interface SubscriptionPermissionItem {
  slug: string;
  name: string;
  type: string;
  value: string;
  included: boolean;
  order_by?: number;
  is_beta?: boolean;
}

export interface SubscriptionPlanItem {
  id: number;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly_monthly_rate: number;
  is_free: boolean;
  is_current: boolean;
  upgrade_available_monthly: boolean;
  upgrade_available_yearly: boolean;
  permissions: SubscriptionPermissionItem[];
}

export interface SubscriptionCurrent {
  user_subscription_id: number;
  plan_id: number;
  plan_name: string | null;
  price_charged: number;
  list_monthly: number;
  list_yearly_monthly_rate: number;
  interval: BillingCycle;
  status: 'active' | 'cancelled' | 'expired' | string;
  is_cancelled: boolean;
  is_custom: boolean;
  is_free: boolean;
  recurring_payment: boolean;
  start_date: string | null;
  expire_date: string | null;
  days_left: number;
  can_cancel: boolean;
  can_upgrade: boolean;
  has_payment_method: boolean;
  payment_method_label?: string | null;
}

export interface SubscriptionAddonOffer {
  addon_id: number;
  addon_price_id: number;
  slug: string;
  name: string;
  description?: string | null;
  type: 'count' | 'status' | string;
  billing_type: 'recurring' | 'one_time' | string;
  monthly_price: number;
  yearly_price: number;
  included_in_plan: boolean;
}

export interface PurchasedAddon {
  id: number;
  slug: string;
  name: string;
  count: number;
  price: number;
  total: number;
  interval: string;
  start_date: string;
  end_date: string;
  status: number;
  is_cancelled: boolean;
  auto_pay: boolean;
  billing_type: string;
}

export interface SubscriptionBillingDetails {
  company_name: string | null;
  vat_id: string | null;
  address: string | null;
  address_lines?: string[];
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  invoice_email: string | null;
}

export interface SubscriptionOverview {
  vat_applies: boolean;
  vat_percent: number;
  currency?: string;
  auto_pay_available: boolean;
  current: SubscriptionCurrent | null;
  usage: SubscriptionUsageItem[];
  plans: SubscriptionPlanItem[];
  addons: {
    recurring: SubscriptionAddonOffer[];
    one_time: SubscriptionAddonOffer[];
  };
  purchased_addons: PurchasedAddon[];
  billing: SubscriptionBillingDetails;
  seats?: {
    active_users: number;
    paid_users: number;
  };
  contact?: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export interface SubscriptionQuote {
  plan_id: number;
  plan_name: string;
  period: BillingCycle;
  subtotal: number;
  vat_percent: number;
  vat_amount: number;
  total: number;
  currency: string;
  prorated: boolean;
  keeps_expire_date: boolean;
}

export interface AddonQuote {
  addon_price_id: number;
  name: string;
  slug: string;
  type: string;
  billing_type: string;
  count: number;
  interval: BillingCycle;
  unit_price: number;
  subtotal: number;
  vat_percent: number;
  vat_amount: number;
  total: number;
  currency?: string;
  is_recurring: boolean;
}

export interface SubscriptionCheckout {
  activated: boolean;
  checkout_url: string | null;
  order_code: string | null;
  payment_timeout: number;
  amount?: number;
}

export interface SubscriptionVerifyResult {
  payment_status: string;
  kind: 'plan' | 'addon';
  verified: boolean;
  duplicate?: boolean;
}
