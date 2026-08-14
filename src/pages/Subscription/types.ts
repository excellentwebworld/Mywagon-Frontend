export type BillingCycle = 'monthly' | 'yearly';
export type PlanKey = 'essential' | 'plus' | 'pro';
export type AddonTab = 'recurring' | 'usage';

export type PlanLimitValue = number | string;

export interface PlanLimits {
  privateLoads: PlanLimitValue;
  partners: PlanLimitValue;
  dispatchers: PlanLimitValue;
  trackingLinks: PlanLimitValue;
  bids: PlanLimitValue;
  publicLoads: PlanLimitValue;
  searchTrucks: PlanLimitValue;
  marketplace: PlanLimitValue;
  manageShipments: PlanLimitValue;
  rating: PlanLimitValue;
  chat: PlanLimitValue;
  gps: PlanLimitValue;
  pods: PlanLimitValue;
  multistop: PlanLimitValue;
}

export interface PlanDef {
  key: PlanKey;
  name: string;
  price: { monthly: number; yearly: number };
  desc: string;
  free?: boolean;
  popular?: boolean;
  limits: PlanLimits;
}

export interface UsageItem {
  key: string;
  used: number;
  limit: number | null;
}

export interface RecurringAddon {
  id: string;
  name: string;
  desc: string;
  price: number;
  unit: string;
  icon: string;
  enabled: boolean;
}

export interface UsageAddon {
  id: string;
  name: string;
  desc: string;
  price: number;
  unit: string;
  icon: string;
  owned: number;
  cart: number;
}

export type SubModal =
  | { kind: 'upgrade'; planKey: PlanKey }
  | { kind: 'enable'; addonId: string }
  | { kind: 'remove'; addonId: string }
  | { kind: 'purchase'; addonId: string };
