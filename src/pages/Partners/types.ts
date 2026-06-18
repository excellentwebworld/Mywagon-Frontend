import type { Partner } from '../../context/AppContext';

// ─── Filter / Sort ───────────────────────────────────────
export type FacetFilter =
  | 'all'
  | 'carrier_company'
  | 'freelancer_driver'
  | 'customer'
  | 'st_active'
  | 'st_invited'
  | 'st_pending'
  | 'st_suspended'
  | `reg_${number}`;

export type KpiFilter =
  | ''
  | 'all'
  | 'active'
  | 'carriers'
  | 'freelancers'
  | 'invited'
  | 'missingBank'
  | 'suspended';

export type SortOption = 'name' | 'act' | 'ot' | 'ld';

export type StatusFilter = 'active' | 'invited' | 'pending' | 'suspended';
export type CapabilityFilter = string;
export type PerformanceFilter = 'ontime90' | 'rating4' | 'cancel5';

export interface ActiveFilters {
  status: StatusFilter[];
  capability: CapabilityFilter[];
  performance: PerformanceFilter[];
  region: number[];
}

// ─── Invite Modal ─────────────────────────────────────────
export type InviteMethod = 'email' | 'phone';
export type InvitePartnerType = 'carrier_company' | 'freelancer_driver' | 'customer';
export type InviteTag = 'pref' | 'priv' | 'std';

export interface InviteFormState {
  method: InviteMethod;
  partnerType: InvitePartnerType;
  tags: InviteTag[];
  contact: string;
  sent: boolean;
}

// ─── Open sections in detail panel ───────────────────────
export interface OpenSections {
  kpis: boolean;
  info: boolean;
  fleet: boolean;
  trips: boolean;
  billing: boolean;
  contracts: boolean;
  docs: boolean;
  notes: boolean;
}

// ─── Generic Modal variants ───────────────────────────────
export type GenericModalType =
  | 'addCap'
  | 'addLane'
  | 'addCustomer'
  | 'editBank'
  | null;

// re-export for convenience
export type { Partner };
