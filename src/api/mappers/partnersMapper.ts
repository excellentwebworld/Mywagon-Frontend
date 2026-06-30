import type {
  ApiContractLane,
  ApiPartnerDetail,
  ApiPartnerListItem,
  ApiPartnerSummary,
  ListPartnersParams,
} from '../types/partners';
import { formatErpLastUpdate } from '../../pages/ErpOrders/erpDateTimeUtils';
import type { FacetFilter, KpiFilter, Partner, ContractLane, PartnerStatus, PartnerType, PartnersSortField } from '../../pages/Partners/types';

const STATUS_MAP: Record<string, PartnerStatus> = {
  active: 'active',
  inv_sent: 'invited',
  inv_recv: 'pending',
  suspended: 'suspended',
};

const TYPE_MAP: Record<string, PartnerType> = {
  carrier_company: 'carrier_company',
  freelancer_driver: 'freelancer_driver',
  supplier: 'supplier',
};

export function mapApiStatus(status: string): PartnerStatus {
  return STATUS_MAP[status] ?? 'active';
}

export function mapApiType(type: string): PartnerType {
  return TYPE_MAP[type] ?? 'carrier_company';
}

export function mapListItemToPartner(item: ApiPartnerListItem): Partner {
  return {
    id: String(item.id),
    name: item.name,
    type: mapApiType(item.type),
    status: mapApiStatus(item.status),
    statusLabel: item.status_label,
    region: item.region,
    uniqueId: item.unique_id,
    email: item.contact_email,
    phone: item.contact_phone,
    isPreferred: item.is_preferred,
    isSent: item.is_sent,
    canAcceptDecline: item.can_accept_decline,
    rating: item.rating,
    trips: item.trips,
    capabilities: item.capabilities ?? [],
    capabilitiesExtra: item.capabilities_extra ?? 0,
    createdAt: item.created_at ?? '',
    createdAtFormatted: item.created_at ? formatErpLastUpdate(item.created_at) : '—',
    typeLabel: item.type_label,
  };
}

export function mergeDetailIntoPartner(base: Partner, detail: ApiPartnerDetail): Partner {
  const mappedDetail = mapListItemToPartner(detail);
  return {
    ...base,
    ...mappedDetail,
    canAcceptDecline: detail.can_accept_decline ?? base.canAcceptDecline,
    location: detail.location,
    notes: detail.notes ?? '',
    tags: detail.tags ?? [],
    isSuspended: detail.is_suspended,
    isAccepted: detail.is_accepted,
    isPending: detail.is_pending,
    contractLanes: (detail.contract_lanes ?? []).map(mapContractLane),
    fleet: detail.fleet ?? [],
    performance: detail.performance ?? undefined,
    companyProfile: detail.company_profile
      ? {
          companyName: detail.company_profile.company_name,
          vatNumber: detail.company_profile.vat_number,
          city: detail.company_profile.city,
          address: detail.company_profile.address,
          contactName: detail.company_profile.contact_name,
          email: detail.company_profile.email,
          phone: detail.company_profile.phone,
          uniqueId: detail.company_profile.unique_id,
        }
      : null,
    incomingLoadsMonitoring: detail.incoming_loads_monitoring,
  };
}

export function mapContractLane(lane: ApiContractLane): ContractLane {
  return {
    id: String(lane.id),
    originCity: lane.origin_city,
    destinationCity: lane.destination_city,
    lane: `${lane.origin_city} → ${lane.destination_city}`,
    unit: lane.unit,
    price: lane.price,
    status: lane.status,
    unitLabel: lane.unit_label,
  };
}

export function facetToApiParam(facet: FacetFilter): string {
  if (facet === 'supplier') return 'supplier';
  if (facet === 'st_invited') return 'st_inv_sent';
  if (facet === 'st_inv_recv') return 'st_inv_recv';
  return facet;
}

export function kpiToFacet(kpi: KpiFilter): FacetFilter | '' {
  switch (kpi) {
    case 'active':
      return 'st_active';
    case 'carriers':
      return 'carrier_company';
    case 'freelancers':
      return 'freelancer_driver';
    case 'shippers':
      return 'supplier';
    case 'invited':
      return 'st_invited';
    case 'suspended':
      return 'st_suspended';
    case 'all':
      return 'all';
    default:
      return '';
  }
}

export function buildListParams(
  facet: FacetFilter,
  statuses: string[],
  capabilities: number[],
  search: string,
  page: number,
  perPage: number,
  sortField: PartnersSortField,
  sortDir: 'asc' | 'desc' | ''
): ListPartnersParams {
  const params: ListPartnersParams = {
    page,
    per_page: perPage,
  };
  if (sortField) params.sort = sortField;
  if (sortDir) params.sort_dir = sortDir;
  if (facet && facet !== 'all') params.facet = facetToApiParam(facet);
  if (search.trim()) params.search = search.trim();
  if (statuses.length) params.statuses = statuses;
  if (capabilities.length) params.capabilities = capabilities;
  return params;
}

export function summaryToKpiCounts(summary: ApiPartnerSummary) {
  return {
    total: summary.total,
    active: summary.active,
    carriers: summary.carrier_companies,
    freelancers: summary.freelancer_drivers,
    shippers: summary.shippers,
    invited: summary.invited,
    suspended: summary.suspended,
  };
}

export function summaryToFacetCounts(summary: ApiPartnerSummary): Record<string, number> {
  const f = summary.facet ?? {};
  return {
    all: f.all ?? summary.total,
    carrier_company: f.carrier_company ?? summary.carrier_companies,
    freelancer_driver: f.freelancer_driver ?? summary.freelancer_drivers,
    supplier: f.supplier ?? summary.shippers,
    st_active: f.st_active ?? summary.active,
    st_invited: f.st_inv_sent ?? summary.invited,
    st_inv_recv: f.st_inv_recv ?? summary.invitation_received,
    st_suspended: f.st_suspended ?? summary.suspended,
  };
}

export function inviteTypeToApi(type: string): 'carrier' | 'driver' | 'shipper' {
  if (type === 'freelancer_driver') return 'driver';
  if (type === 'supplier') return 'shipper';
  return 'carrier';
}
