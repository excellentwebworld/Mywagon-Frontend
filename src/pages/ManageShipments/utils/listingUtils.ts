import type { Shipment } from '../../../context/AppContext';

export type KpiKey =
  | 'action'
  | 'bids'
  | 'uncov'
  | 'expiring'
  | 'risk'
  | 'pickup24'
  | 'pod'
  | 'invoice';

export type StatusTabKey =
  | 'active'
  | 'pending'
  | 'scheduled'
  | 'upcoming'
  | 'in_progress'
  | 'drafts'
  | 'completed'
  | 'partially_paid'
  | 'cancelled';

export interface FilterState {
  status: string[];
  bidState: string[];
  visibility: string[];
  facility: string[];
  customer: string[];
  dateRange: string[];
  exceptions: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  status: [],
  bidState: [],
  visibility: [],
  facility: [],
  customer: [],
  dateRange: [],
  exceptions: [],
};

export function computeKpiCounts(shipments: Shipment[]) {
  return {
    action: shipments.filter((s) => s.status === 'pending').length,
    bids: shipments.filter((s) => s.status === 'pending' && s.bids > 0).length,
    uncov: shipments.filter((s) => !s.carrier).length,
    expiring: shipments.filter((s) => s.status === 'pending' && Boolean(s.bid_exp)).length,
    risk: shipments.filter((s) => s.at_risk).length,
    pickup24: shipments.filter((s) => s.status === 'upcoming' || s.status === 'in_progress').length,
    pod: shipments.filter((s) => s.status === 'delivered').length,
    invoice: 0,
  };
}

export function matchesKpi(shipment: Shipment, kpi: KpiKey | null): boolean {
  if (!kpi) return true;
  switch (kpi) {
    case 'action':
      return shipment.status === 'pending';
    case 'bids':
      return shipment.status === 'pending' && shipment.bids > 0;
    case 'uncov':
      return !shipment.carrier;
    case 'expiring':
      return shipment.status === 'pending' && Boolean(shipment.bid_exp);
    case 'risk':
      return Boolean(shipment.at_risk);
    case 'pickup24':
      return shipment.status === 'upcoming' || shipment.status === 'in_progress';
    case 'pod':
      return shipment.status === 'delivered';
    case 'invoice':
      return false;
    default:
      return true;
  }
}

export function matchesStatusTab(shipment: Shipment, tab: StatusTabKey): boolean {
  switch (tab) {
    case 'active':
      return shipment.status !== 'cancelled' && shipment.status !== 'delivered';
    case 'pending':
      return shipment.status === 'pending';
    case 'scheduled':
      return shipment.status === 'upcoming';
    case 'upcoming':
      return shipment.status === 'upcoming';
    case 'in_progress':
      return shipment.status === 'in_progress';
    case 'drafts':
      return false;
    case 'completed':
      return shipment.status === 'delivered';
    case 'partially_paid':
      return false;
    case 'cancelled':
      return shipment.status === 'cancelled';
    default:
      return true;
  }
}

export function countByStatusTab(shipments: Shipment[], tab: StatusTabKey): number {
  return shipments.filter((s) => matchesStatusTab(s, tab)).length;
}

function matchesSearch(shipment: Shipment, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const customerMatches = shipment.customer.some((c) => c.name.toLowerCase().includes(q));
  const carrierMatches = shipment.carrier?.toLowerCase().includes(q);
  return (
    (shipment.autoId || shipment.id).toLowerCase().includes(q) ||
    shipment.origin.toLowerCase().includes(q) ||
    shipment.dest.toLowerCase().includes(q) ||
    Boolean(customerMatches) ||
    Boolean(carrierMatches)
  );
}

function matchesFilters(shipment: Shipment, filters: FilterState): boolean {
  if (filters.status.length && !filters.status.includes(shipment.status)) return false;
  if (filters.visibility.length && !filters.visibility.includes(shipment.vis)) return false;
  if (filters.bidState.includes('has_bids') && !(shipment.bids > 0)) return false;
  if (filters.bidState.includes('no_bids') && shipment.bids > 0) return false;
  if (filters.bidState.includes('expiring') && !shipment.bid_exp) return false;
  if (filters.bidState.includes('has_counter') && !shipment.counter) return false;
  if (filters.exceptions.includes('at_risk') && !shipment.at_risk) return false;
  if (filters.exceptions.includes('uncovered') && shipment.carrier) return false;
  if (filters.customer.length) {
    const names = shipment.customer.map((c) => c.name);
    if (!filters.customer.some((name) => names.includes(name))) return false;
  }
  return true;
}

export function filterShipments(
  shipments: Shipment[],
  opts: {
    searchQuery: string;
    activeKpi: KpiKey | null;
    activeTab: StatusTabKey;
    filters: FilterState;
  }
): Shipment[] {
  return shipments
    .filter((s) => matchesSearch(s, opts.searchQuery))
    .filter((s) => matchesStatusTab(s, opts.activeTab))
    .filter((s) => matchesKpi(s, opts.activeKpi))
    .filter((s) => matchesFilters(s, opts.filters));
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    totalPages,
    total: items.length,
  };
}

export function statusBadgeClass(status: Shipment['status'], atRisk?: boolean): string {
  if (atRisk) return 'badge-danger';
  switch (status) {
    case 'pending':
      return 'badge-warning';
    case 'upcoming':
      return 'badge-accent';
    case 'in_progress':
      return 'badge-info';
    case 'awarded':
    case 'delivered':
      return 'badge-success';
    case 'cancelled':
      return 'badge-gray';
    default:
      return 'badge-gray';
  }
}

export const TIMELINE_STEPS = [
  'Created',
  'Posted',
  'Bids',
  'Awarded',
  'Dispatched',
  'Picked up',
  'In transit',
  'Delivered',
  'POD',
  'Invoiced',
];

export function timelineCurrentIndex(status: Shipment['status']): number {
  switch (status) {
    case 'pending':
      return 2;
    case 'awarded':
      return 3;
    case 'upcoming':
      return 4;
    case 'in_progress':
      return 6;
    case 'delivered':
      return 8;
    case 'cancelled':
      return 0;
    default:
      return 2;
  }
}
