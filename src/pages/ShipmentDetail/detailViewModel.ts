import type { Shipment, ShipmentStop } from '../../context/AppContext';
import type { PartnerBidItem } from '../../components/ShipmentDetail/BidsCard';

export type MilestoneState = 'done' | 'cur' | 'skip';

export interface MilestoneItem {
  key: string;
  labelEn: string;
  labelEl: string;
  time?: string;
  badge?: string;
  state: MilestoneState;
}

export interface DetailNote {
  id: string;
  author: string;
  timestamp: string;
  body: string;
  visibility: 'internal' | 'carrier';
}

export interface DetailDocument {
  id: string;
  name: string;
  status: 'ok' | 'miss' | 'rev';
  subtitle: string;
  actions: string[];
}

export interface AuditEntry {
  id: string;
  time: string;
  text: string;
  category: 'all' | 'bidding' | 'operations' | 'docs' | 'billing' | 'messages';
  tone?: 'bid' | 'counter' | 'reject' | 'accept' | 'default';
  priceBadge?: string;
}

export interface CarrierDetail {
  initials: string;
  avatar?: string | null;
  name: string;
  partner: boolean;
  rating: string;
  meta: string;
  userId?: number | null;
  userType?: 'carrier' | 'driver' | null;
  showDeliveryOnTime?: boolean;
  onTimePickup: string;
  onTimeDelivery: string;
  cancelRate: string;
  avgPickupDelay: string;
  avgResponse: string;
  plates: string[];
  templates: string[];
  canRate?: boolean;
}

export interface AssignedDriverDetail {
  initials: string;
  avatar?: string | null;
  name: string;
  partner: boolean;
  rating: string;
  meta: string;
  userId?: number | null;
  plates: string[];
  canRate?: boolean;
}

export interface TripSummary {
  distanceKm: number;
  duration: string;
  stops: number;
  weight: string;
  customers: number;
  orders: number;
}

export interface BillingMetrics {
  agreedPrice: string;
  priceType: string;
  costPerKm: string;
  costPerPallet: string;
  costPerTonne: string;
  costPerStop: string;
  kmDetail: string;
  palletDetail: string;
  tonneDetail: string;
  stopDetail: string;
  invoiceStatus: string;
  disputeStatus: string;
}

export interface TrackingStats {
  movement: string;
  etaVariance: string;
  kmRemaining: string;
  speed: string;
}

export interface IncidentItem {
  id: string;
  title: string;
  meta: string;
  severity: 'low' | 'med' | 'high';
  resolved: boolean;
}

export interface ShareDeliveryRow {
  location: string;
  email: string;
  orderRef: string;
}

export interface ShareCustomerGroup {
  name: string;
  deliveryCount: number;
  rows: ShareDeliveryRow[];
}

export interface ShipmentDetailViewModel {
  id: string;
  displayId: string;
  lane: string;
  viaLabel: string | null;
  stopsCount: number;
  statusLabel: string;
  status: Shipment['status'];
  onTrack: boolean;
  primaryCustomer: string;
  owner: string;
  etaChip: string;
  etaStatusChip: string;
  cancellationReason?: string | null;
  cancellationDate?: string | null;
  cancellationDetails?: string | null;
  unfulfilledReason?: string | null;
  unfulfilledDate?: string | null;
  milestones: MilestoneItem[];
  exceptionChips: { label: string; target: string }[];
  stops: ShipmentStop[];
  interestedPartners: PartnerBidItem[];
  invitedPartners: PartnerBidItem[];
  loadSummary: {
    vehicleType: string;
    cargoSpecs: string;
    quote: string;
    shipmentType: string;
    customer: string;
    orderIds: string;
    reference: string;
    contact: string;
    specialInstructions: string;
  };
  notes: DetailNote[];
  documents: DetailDocument[];
  tracking: TrackingStats;
  trip: TripSummary;
  carrier: CarrierDetail | null;
  assignedDriver: AssignedDriverDetail | null;
  incidents: IncidentItem[];
  billing: BillingMetrics;
  auditEntries: AuditEntry[];
  shareGroups: ShareCustomerGroup[];
  availableNavSections: string[];
  canRate: boolean;
  isAlreadyRated: boolean;
}

const MILESTONE_KEYS = [
  'created',
  'posted',
  'bids',
  'awarded',
  'ready',
  'inTransit',
  'pickup',
  'delivery',
  'pod',
] as const;

function buildDefaultStops(shipment: Shipment): ShipmentStop[] {
  const customerName = shipment.customer?.[0]?.name || 'Alpha Foods Ltd';
  const orderId = shipment.customer?.[0]?.orders?.[0] || 'ORD-1091';
  return [
    {
      id: 1,
      type: 'pickup',
      location: shipment.origin || 'Athens',
      address: `${shipment.origin || 'Athens'} Logistics Center, Area A`,
      date: shipment.pickDt || '18/02/2026',
      timeStart: '08:00',
      timeEnd: '12:00',
      customers: [
        {
          name: customerName,
          orders: [
            {
              id: orderId,
              products: 'General Cargo',
              qty: 16,
              qtyUnit: 'Eur',
              weight: 13,
              weightUnit: 'T',
            },
          ],
        },
      ],
    },
    {
      id: 2,
      type: 'delivery',
      location: shipment.dest || 'Thessaloniki',
      address: `${shipment.dest || 'Thessaloniki'} Distribution Hub, Dock 4`,
      date: shipment.delDt || '20/02/2026',
      timeStart: '14:00',
      timeEnd: '18:00',
      customers: [
        {
          name: customerName,
          orders: [
            {
              id: orderId,
              products: 'General Cargo',
              qty: 16,
              qtyUnit: 'Eur',
              weight: 13,
              weightUnit: 'T',
            },
          ],
        },
      ],
    },
  ];
}

function milestoneIndexForStatus(status: Shipment['status']): number {
  switch (status) {
    case 'draft':
      return 0;
    case 'pending':
      return 1;
    case 'awarded':
      return 3;
    case 'scheduled':
    case 'ready':
    case 'upcoming':
      return 4;
    case 'on_trip':
    case 'in_progress':
      return 5;
    case 'past_due':
      return 4;
    case 'fullfilled':
    case 'partially_fullfilled':
    case 'delivered':
      return 8;
    case 'not_fullfilled':
      return 6;
    case 'canceled':
    case 'cancelled':
      return 0;
    default:
      return 1;
  }
}

function buildMilestones(shipment: Shipment): MilestoneItem[] {
  const cur = shipment.tl_cur >= 0 ? shipment.tl_cur : milestoneIndexForStatus(shipment.status);
  const labels: Record<(typeof MILESTONE_KEYS)[number], { en: string; el: string; time?: string }> = {
    created: { en: 'Created', el: 'Δημιουργία', time: shipment.createdAt || '26/02 · 11:40' },
    posted: { en: 'Posted', el: 'Δημοσίευση', time: '26/02 · 12:00' },
    bids: { en: 'Bids', el: 'Προσφορές', time: '26/02 · 12:15' },
    awarded: {
      en: shipment.carrier ? `Awarded: ${shipment.carrier}` : 'Awarded',
      el: 'Ανάθεση',
      time: '26/02 · 12:30',
    },
    ready: { en: 'Ready', el: 'Έτοιμο', time: '27/02 · 08:00' },
    inTransit: { en: 'In Transit', el: 'Σε διαδρομή', time: '27/02 · 09:30' },
    pickup: { en: `Pickup ${shipment.origin || ''}`, el: 'Παραλαβή', time: '27/02 · 10:15' },
    delivery: { en: `Delivery ${shipment.dest || ''}`, el: 'Παράδοση', time: '28/02 · 14:00' },
    pod: { en: 'POD / Done', el: 'POD / Ολοκλήρωση', time: '28/02 · 14:45' },
  };

  return MILESTONE_KEYS.map((key, index) => {
    let state: MilestoneState = 'skip';
    if (index < cur) state = 'done';
    else if (index === cur) state = 'cur';

    const meta = labels[key];
    return {
      key,
      labelEn: meta.en,
      labelEl: meta.el,
      time: state === 'skip' ? undefined : meta.time,
      state,
    };
  });
}

export function buildShipmentDetailViewModel(shipment: Shipment): ShipmentDetailViewModel {
  const stops = shipment.stops?.length ? shipment.stops : buildDefaultStops(shipment);
  const displayId = shipment.autoId || shipment.id || 'SHP-0000';
  const price = shipment.price ?? shipment.agreedPrice ?? shipment.quotedPrice ?? shipment.best_bid;
  const quote = price != null ? `€ ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '€ 410,00';
  const primaryCustomer = shipment.customer?.[0]?.name || 'Alpha Foods Ltd';
  const orderIds =
    shipment.orderIds?.join(', ') ||
    shipment.customer?.flatMap((c) => c.orders?.map((o) => (typeof o === 'string' ? o : o.id))).join(', ') ||
    'PAP-70112';

  const fmtPct = (v: number | null | undefined, fallback = '—') => (v == null ? fallback : `${v}%`);
  const fmtMin = (v: number | null | undefined, fallback = '—') => (v == null ? fallback : `${v}m`);

  const status = shipment.status || 'draft';
  const hasCarrier = Boolean(shipment.carrier || shipment.carrierId || shipment.assignedDriverName);

  const carrier: CarrierDetail | null = hasCarrier
    ? {
        initials:
          shipment.carrier_init ||
          (shipment.carrier ? shipment.carrier.substring(0, 2).toUpperCase() : 'TL'),
        avatar: shipment.carrierAvatar ?? null,
        name: shipment.carrier || 'Transmed Logistics S.A.',
        partner: true,
        rating: shipment.carrierRating != null ? shipment.carrierRating.toFixed(1) : '4.9',
        meta: shipment.carrierType === 'driver' ? 'Freelancer' : 'Carrier · 240 completed trips',
        userId: shipment.carrierId ?? null,
        userType:
          shipment.carrierType === 'driver' || shipment.carrierType === 'carrier'
            ? shipment.carrierType
            : 'carrier',
        showDeliveryOnTime: true,
        onTimePickup: fmtPct(shipment.carrierOnTimeDeliveryPct, '98%'),
        onTimeDelivery: fmtPct(shipment.carrierOnTimeDeliveryPct, '96%'),
        cancelRate: fmtPct(shipment.carrierCancellationRatePct, '0.5%'),
        avgPickupDelay: fmtMin(shipment.carrierAvgPickupDelayMinutes, '8m'),
        avgResponse: '12m',
        plates: shipment.assignedDriverPlates?.length ? shipment.assignedDriverPlates : ['ΙΧΕ-7890', 'ΤΡ-4512'],
        templates: ['Confirm pickup', 'Running late — update ETA', 'Send POD after delivery'],
        canRate: true,
      }
    : null;

  const assignedDriver: AssignedDriverDetail | null =
    shipment.assignedDriverName || hasCarrier
      ? {
          initials:
            shipment.assignedDriverInitials ||
            (shipment.assignedDriverName ? shipment.assignedDriverName.substring(0, 2).toUpperCase() : 'AL'),
          avatar: shipment.assignedDriverAvatar ?? null,
          name: shipment.assignedDriverName || 'Ανδρέας Λύτρας',
          partner: true,
          rating:
            shipment.assignedDriverRating != null
              ? shipment.assignedDriverRating.toFixed(1)
              : '4.8',
          meta: 'Assigned driver · +30 697 1234567',
          userId: shipment.assignedDriverId ?? null,
          plates: shipment.assignedDriverPlates ?? ['ΙΧΕ-7890'],
          canRate: true,
        }
      : null;

  const interestedPartners: PartnerBidItem[] =
    shipment.offers?.map((o, i) => ({
      id: o.id || `bid-${i}`,
      name: o.type === 'bid' ? 'Hellas Freight Express' : 'Aegean Transport Hub',
      rating: '4.8',
      tripsCount: 145,
      bidAmount: 420,
      statusText: o.type === 'bid' ? 'Bid submitted' : 'Interested partner',
      time: '26/02 · 12:15',
    })) || [];

  const invitedPartners: PartnerBidItem[] = [
    {
      id: 'inv1',
      name: 'Transmed Logistics S.A.',
      initials: 'TL',
      rating: '4.9',
      tripsCount: 320,
      statusText: 'Invited · Waiting response',
      time: '26/02 11:45',
    },
    {
      id: 'inv2',
      name: 'Hellas Freight Express',
      initials: 'HF',
      rating: '4.8',
      tripsCount: 145,
      statusText: 'Invited · Waiting response',
      time: '26/02 11:46',
    },
    {
      id: 'inv3',
      name: 'Aegean Transport Hub',
      initials: 'AT',
      rating: '4.7',
      tripsCount: 88,
      statusText: 'Invited · Waiting response',
      time: '26/02 11:48',
    },
  ];

  const distanceKm = shipment.journeyDistanceKm || 232;
  const duration = typeof shipment.journeyTime === 'string' ? shipment.journeyTime : '3h 45m';
  const totalWeight = shipment.totalWeight ? `${shipment.totalWeight} T` : '18 T';

  // Navigation sections active based on status
  const availableNavSections = ['stops', 'load'];
  if (status === 'pending') {
    availableNavSections.push('bids');
  }
  if (status === 'on_trip' || status === 'in_progress') {
    availableNavSections.push('tracking');
  }
  if (hasCarrier && status !== 'draft' && status !== 'pending') {
    availableNavSections.push('carrier');
  }
  availableNavSections.push('docs', 'billing', 'audit');

  const isCompleted =
    status === 'fullfilled' ||
    status === 'partially_fullfilled' ||
    status === 'delivered' ||
    status === 'not_fullfilled';

  return {
    id: shipment.id,
    displayId,
    lane: `${shipment.origin || 'Athens'} → ${shipment.dest || 'Thessaloniki'}`,
    viaLabel: shipment.via,
    stopsCount: stops.length,
    statusLabel: status,
    status,
    onTrack: !shipment.at_risk,
    primaryCustomer,
    owner: 'Ηρακλής Σακκάς',
    etaChip: '🔵 ETA: 20/02 · 16:00',
    etaStatusChip: shipment.at_risk ? '⚠️ +12 min delay' : '✅ ETA on schedule',
    cancellationReason: shipment.riskReason || 'Equipment breakdown / shipper requested cancellation',
    cancellationDate: shipment.updatedAt || '16/02/2026 · 16:45',
    cancellationDetails: 'Full refund issued · Read-only audit state',
    unfulfilledReason: 'Carrier vehicle breakdown — delivery could not be completed',
    unfulfilledDate: '20/02/2026 · 15:30',
    milestones: buildMilestones(shipment),
    exceptionChips: shipment.at_risk
      ? [{ label: 'Delay Warning', target: 'tracking' }]
      : [{ label: 'POD Verified', target: 'docs' }],
    stops,
    interestedPartners,
    invitedPartners,
    loadSummary: {
      vehicleType: shipment.truckTypes?.[0] || 'Semi-Trailer',
      cargoSpecs: 'Curtainside',
      quote,
      shipmentType: shipment.vis === 'public' ? 'PUBLIC' : 'PRIVATE',
      customer: primaryCustomer,
      orderIds,
      reference: shipment.ref || '11PAP-1031801',
      contact: 'contact@alphafoods.com',
      specialInstructions: shipment.driverNotes || 'Handle with care. Call 30 min before arrival.',
    },
    notes: [
      {
        id: 'n1',
        author: 'Ηρακλής Σ.',
        timestamp: '26/02/2026 · 11:40',
        body: 'Priority load for weekend delivery window. Call 30 min before arrival.',
        visibility: 'internal',
      },
      {
        id: 'n2',
        author: 'System',
        timestamp: '26/02/2026 · 12:00',
        body: 'Carrier notified of pickup window and temperature specifications.',
        visibility: 'carrier',
      },
    ],
    documents: [
      {
        id: 'd1',
        name: 'POD (Proof of Delivery)',
        status: isCompleted ? 'ok' : 'miss',
        subtitle: isCompleted ? 'Uploaded 17/02 14:42 · Ανδρέας Λύτρας' : 'Missing — not yet uploaded',
        actions: isCompleted ? ['Download'] : ['Upload'],
      },
      {
        id: 'd2',
        name: 'CMR (Waybill)',
        status: 'ok',
        subtitle: 'Uploaded 17/02 14:45 · Ανδρέας Λύτρας',
        actions: ['Download'],
      },
      {
        id: 'd3',
        name: 'Invoice / Receipt',
        status: isCompleted ? 'ok' : 'rev',
        subtitle: isCompleted ? 'Invoice #INV-9901 · Paid' : 'Draft invoice generated',
        actions: ['Download', 'View'],
      },
    ],
    tracking: {
      movement: 'Moving 68 km/h',
      etaVariance: shipment.at_risk ? '+12 min delay' : 'On time',
      kmRemaining: '87 km',
      speed: '68 km/h',
    },
    trip: {
      distanceKm,
      duration,
      stops: stops.length,
      weight: totalWeight,
      customers: shipment.customer?.length || 1,
      orders: shipment.customer?.reduce((sum, c) => sum + (c.orders?.length || 0), 0) || 1,
    },
    carrier,
    assignedDriver,
    incidents: [
      {
        id: 'i1',
        title: 'Καθυστέρηση 45 λεπτών',
        meta: '20/02 · 12:05 — Στάση εκτός προγράμματος στη Λαμία',
        severity: 'med',
        resolved: status === 'fullfilled',
      },
    ],
    billing: {
      agreedPrice: quote,
      priceType: shipment.price_type === 'contract' ? 'CONTRACT' : 'SPOT',
      costPerKm: '€ 1,77',
      costPerPallet: '€ 17,08',
      costPerTonne: '€ 22,78',
      costPerStop: '€ 205,00',
      kmDetail: `${distanceKm} km`,
      palletDetail: '24 pal.',
      tonneDetail: totalWeight,
      stopDetail: `${stops.length} stops`,
      invoiceStatus: isCompleted ? 'Paid' : 'Not settled',
      disputeStatus: 'No disputes',
    },
    auditEntries: [
      {
        id: 'a1',
        time: '14/02 · 12:00',
        text: 'Shipment **Created** by Ηρακλής Σακκάς',
        category: 'operations',
        tone: 'default',
      },
      {
        id: 'a2',
        time: '15/02 · 10:00',
        text: 'Bid accepted — **Transmed Logistics** booked at € 410 by Ηρακλής Σακκάς',
        category: 'bidding',
        tone: 'accept',
        priceBadge: '€ 410',
      },
      {
        id: 'a3',
        time: '17/02 · 07:10',
        text: 'Pickup completed: **Ιωάννινα** (stop #1)',
        category: 'operations',
        tone: 'default',
      },
      {
        id: 'a4',
        time: '17/02 · 14:40',
        text: 'Delivery completed: **Βόλος** (stop #2)',
        category: 'operations',
        tone: 'default',
      },
      {
        id: 'a5',
        time: '17/02 · 14:42',
        text: 'POD uploaded by **Ανδρέας Λύτρας**',
        category: 'docs',
        tone: 'default',
      },
      {
        id: 'a6',
        time: '17/02 · 14:50',
        text: 'Trip concluded — **fulfilled**',
        category: 'operations',
        tone: 'accept',
      },
    ],
    shareGroups: [
      {
        name: primaryCustomer,
        deliveryCount: 2,
        rows: stops
          .filter((s) => s.type === 'delivery')
          .map((s) => ({
            location: s.location,
            email: 'contact@alphafoods.com',
            orderRef: orderIds.split(',')[0] || displayId,
          })),
      },
    ],
    availableNavSections,
    canRate: isCompleted && hasCarrier,
    isAlreadyRated: status === 'fullfilled',
  };
}
