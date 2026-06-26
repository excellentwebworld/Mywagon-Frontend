// ─── Partner UI model (API-backed) ───────────────────────
export type PartnerType = 'carrier_company' | 'freelancer_driver' | 'supplier';
export type PartnerStatus = 'active' | 'invited' | 'pending' | 'suspended';

export interface ContractLane {
  id: string;
  originCity: string;
  destinationCity: string;
  lane: string;
  unit: 'load' | 'pallet';
  unitLabel: string;
  price: number;
  status: string;
}

export interface PartnerPerformance {
  loads_30d: number;
  lifetime_loads: number;
  fulfilled_pct: number;
  partially_fulfilled_pct: number;
  canceled_pct: number;
  unfulfilled_pct: number;
}

export interface FleetItem {
  label: string;
  driver: string | null;
}

export interface ShipperCompanyProfile {
  companyName: string | null;
  vatNumber: string | null;
  city: string | null;
  address: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  uniqueId: string | null;
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  typeLabel: string;
  status: PartnerStatus;
  statusLabel: string;
  region: string;
  location?: string;
  uniqueId: string | null;
  email: string;
  phone: string;
  isPreferred: boolean;
  isSent: boolean;
  canAcceptDecline: boolean;
  rating: number | null;
  trips: number;
  capabilities: string[];
  capabilitiesExtra: number;
  createdAt: string;
  createdAtFormatted: string;
  notes?: string;
  tags?: string[];
  isSuspended?: boolean;
  isAccepted?: boolean;
  isPending?: boolean;
  contractLanes?: ContractLane[];
  fleet?: FleetItem[];
  performance?: PartnerPerformance | null;
  companyProfile?: ShipperCompanyProfile | null;
  incomingLoadsMonitoring?: { enabled: boolean };
}

// ─── Filter / Sort ───────────────────────────────────────
export type FacetFilter =
  | 'all'
  | 'carrier_company'
  | 'freelancer_driver'
  | 'supplier'
  | 'st_active'
  | 'st_invited'
  | 'st_inv_recv'
  | 'st_suspended';

export type KpiFilter =
  | ''
  | 'all'
  | 'active'
  | 'carriers'
  | 'freelancers'
  | 'shippers'
  | 'invited'
  | 'suspended';

export type PartnersSortField = '' | 'name' | 'created_at';

export type StatusFilter = 'active' | 'invited' | 'pending' | 'suspended';

export interface ActiveFilters {
  status: StatusFilter[];
  capability: number[];
}

// ─── Invite Modal ─────────────────────────────────────────
export type InviteMethod = 'email' | 'phone' | 'unique_id';
export type InvitePartnerType = 'carrier_company' | 'freelancer_driver' | 'supplier';

export interface InviteFormState {
  method: InviteMethod;
  partnerType: InvitePartnerType;
  contact: string;
  countryCode: string;
  relationship: 'preferred' | 'standard' | null;
  sent: boolean;
}

// ─── Open sections in detail panel ───────────────────────
export interface OpenSections {
  companyProfile: boolean;
  kpis: boolean;
  fleet: boolean;
  contracts: boolean;
  notes: boolean;
}

// ─── Generic Modal variants ───────────────────────────────
export type GenericModalType = 'addLane' | null;

export type ConfirmAction =
  | { type: 'suspend'; partner: Partner }
  | { type: 'reactivate'; partner: Partner }
  | { type: 'remove'; partner: Partner }
  | { type: 'decline'; partner: Partner }
  | { type: 'deleteLane'; partner: Partner; laneId: string }
  | null;
