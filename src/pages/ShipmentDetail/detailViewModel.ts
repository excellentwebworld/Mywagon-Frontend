import type { Shipment, ShipmentStop } from '../../context/AppContext';

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
  onTimePickup: string;
  onTimeDelivery: string;
  cancelRate: string;
  avgPickupDelay: string;
  avgResponse: string;
  plates: string[];
  templates: string[];
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
  displayId: string;
  lane: string;
  viaLabel: string | null;
  stopsCount: number;
  statusLabel: string;
  onTrack: boolean;
  primaryCustomer: string;
  owner: string;
  etaChip: string;
  etaStatusChip: string;
  milestones: MilestoneItem[];
  exceptionChips: { label: string; target: string }[];
  stops: ShipmentStop[];
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
  incidents: IncidentItem[];
  billing: BillingMetrics;
  auditEntries: AuditEntry[];
  shareGroups: ShareCustomerGroup[];
}

const MILESTONE_KEYS = [
  'created',
  'privateAccepted',
  'carrier',
  'startTrip',
  'arrival',
  'pickup',
  'pickup2',
  'inTransit',
  'delivery',
  'pod',
] as const;

function buildDefaultStops(shipment: Shipment): ShipmentStop[] {
  const customerName = shipment.customer[0]?.name || 'Alpha Foods Ltd';
  const orderId = shipment.customer[0]?.orders[0] || 'ORD-1091';
  return [
    {
      id: 1,
      type: 'pickup',
      location: shipment.origin,
      address: `${shipment.origin} DC, Warehouse Area A`,
      date: '18/02/2026',
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
      location: shipment.dest,
      address: `${shipment.dest} Retail Store, Main entrance`,
      date: '20/02/2026',
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
    case 'pending':
    case 'draft':
      return 2;
    case 'awarded':
      return 3;
    case 'scheduled':
    case 'ready':
    case 'upcoming':
      return 4;
    case 'past_due':
      return 5;
    case 'on_trip':
    case 'in_progress':
      return 7;
    case 'fullfilled':
    case 'partially_fullfilled':
    case 'delivered':
      return 9;
    case 'not_fullfilled':
    case 'canceled':
    case 'cancelled':
      return 0;
    default:
      return 2;
  }
}

function buildMilestones(shipment: Shipment): MilestoneItem[] {
  const cur = shipment.tl_cur >= 0 ? shipment.tl_cur : milestoneIndexForStatus(shipment.status);
  const labels: Record<(typeof MILESTONE_KEYS)[number], { en: string; el: string; time?: string; badge?: string }> = {
    created: { en: 'Created', el: 'Δημιουργία', time: '19/02/2026 10:53' },
    privateAccepted: { en: 'Private Accepted', el: 'Αποδοχή ιδιωτικής', time: '19/02/2026 12:12' },
    carrier: {
      en: shipment.carrier ? `Carrier: ${shipment.carrier}` : 'Carrier Assigned',
      el: 'Μεταφορέας',
      time: 'Bid accepted 12:12',
      badge: 'PARTNER',
    },
    startTrip: { en: 'Start Trip', el: 'Έναρξη διαδρομής', time: '19/02/2026 14:13' },
    arrival: { en: `Arrival ${shipment.origin}`, el: 'Άφιξη', time: '20/02/2026 01:40' },
    pickup: { en: `Pickup ${shipment.origin}`, el: 'Pickup', time: '20/02/2026 01:40' },
    pickup2: { en: `Pickup ${shipment.origin} #2`, el: 'Pickup #2', time: '20/02/2026 02:56' },
    inTransit: { en: 'In Transit', el: 'Σε μεταφορά' },
    delivery: { en: `Delivery ${shipment.dest}`, el: 'Παράδοση' },
    pod: { en: 'POD', el: 'POD' },
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
      time: meta.time,
      badge: meta.badge,
      state,
    };
  });
}

export function buildShipmentDetailViewModel(shipment: Shipment): ShipmentDetailViewModel {
  const stops = shipment.stops?.length ? shipment.stops : buildDefaultStops(shipment);
  const displayId = shipment.autoId || shipment.id;
  const price = shipment.price ?? shipment.best_bid;
  const quote = price != null ? `€ ${price.toLocaleString('en-US')}` : '€ 600,00';
  const primaryCustomer = shipment.customer[0]?.name || 'Alpha Foods Ltd';
  const orderIds = shipment.customer.flatMap((c) => c.orders).join(', ') || 'PAP-12345';

  const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);
  const fmtMin = (v: number | null | undefined) => (v == null ? '—' : `${v}m`);

  const carrier: CarrierDetail | null = shipment.carrier
    ? {
        initials: shipment.carrier_init || shipment.carrier.substring(0, 2).toUpperCase(),
        avatar: shipment.carrierAvatar ?? null,
        name: shipment.carrier.toUpperCase(),
        partner: true,
        rating: shipment.carrierRating != null ? shipment.carrierRating.toFixed(1) : '—',
        meta: shipment.carrierType === 'driver' ? 'Freelancer' : 'Carrier',
        userId: shipment.carrierId ?? null,
        userType:
          shipment.carrierType === 'driver' || shipment.carrierType === 'carrier'
            ? shipment.carrierType
            : null,
        onTimePickup: '—',
        onTimeDelivery: fmtPct(shipment.carrierOnTimeDeliveryPct),
        cancelRate: fmtPct(shipment.carrierCancellationRatePct),
        avgPickupDelay: fmtMin(shipment.carrierAvgPickupDelayMinutes),
        avgResponse: '—',
        plates: [],
        templates: ['Confirm pickup', 'Running late—update ETA', 'Send POD after delivery'],
        canRate: Boolean(
          shipment.carrierId &&
            (shipment.carrierType === 'carrier' || shipment.carrierType === 'driver') &&
            (shipment.status === 'fullfilled' ||
              shipment.status === 'partially_fullfilled' ||
              shipment.status === 'delivered')
        ),
      }
    : null;

  return {
    displayId,
    lane: `${shipment.origin} → ${shipment.dest}`,
    viaLabel: shipment.via,
    stopsCount: stops.length,
    statusLabel: shipment.status,
    onTrack: !shipment.at_risk,
    primaryCustomer,
    owner: 'Heraklis Sakkas',
    etaChip: '🔵 ETA: 20/02/2026 16:00',
    etaStatusChip: shipment.at_risk ? '⚠️ ETA at risk' : '✅ ETA on schedule',
    milestones: buildMilestones(shipment),
    exceptionChips: [{ label: '📄 POD Missing', target: 'docs' }],
    stops,
    loadSummary: {
      vehicleType: 'Semi-Trailer Truck',
      cargoSpecs: 'Curtainside',
      quote,
      shipmentType: shipment.vis === 'public' ? 'Public' : 'Private',
      customer: primaryCustomer,
      orderIds,
      reference: displayId,
      contact: 'contact@alphafoods.com',
      specialInstructions: shipment.driverNotes || 'Handle with care. Call 30 min before arrival.',
    },
    notes: [
      {
        id: 'n1',
        author: 'Heraklis S.',
        timestamp: '19/02/2026 10:53',
        body: 'Priority load for weekend delivery window.',
        visibility: 'internal',
      },
      {
        id: 'n2',
        author: 'System',
        timestamp: '19/02/2026 12:13',
        body: 'Carrier notified of pickup window.',
        visibility: 'carrier',
      },
    ],
    documents: [
      {
        id: 'd1',
        name: 'POD',
        status: 'miss',
        subtitle: 'Missing — not yet uploaded',
        actions: ['Request POD'],
      },
      {
        id: 'd2',
        name: 'CMR',
        status: 'ok',
        subtitle: 'Uploaded 19/02/2026 14:15 by Dimitris N.',
        actions: ['Download', 'Mark Reviewed'],
      },
      {
        id: 'd3',
        name: 'BOL',
        status: 'ok',
        subtitle: 'Uploaded 18/02/2026 08:30 by System',
        actions: ['Download'],
      },
      {
        id: 'd4',
        name: 'Photos (2)',
        status: 'rev',
        subtitle: 'Seal photos — pending review',
        actions: ['View', 'Approve'],
      },
    ],
    tracking: {
      movement: 'Moving',
      etaVariance: shipment.at_risk ? 'Delayed' : 'On time',
      kmRemaining: '87 km',
      speed: '72 km/h',
    },
    trip: {
      distanceKm: 491,
      duration: '5h 47m',
      stops: stops.length,
      weight: '26 T',
      customers: shipment.customer.length || 1,
      orders: shipment.customer.reduce((sum, c) => sum + (c.orders?.length || 0), 0) || 1,
    },
    carrier,
    incidents: [
      {
        id: 'i1',
        title: 'Late departure from stop #2',
        meta: 'Low severity · Resolved 20/02/2026 03:10',
        severity: 'low',
        resolved: true,
      },
    ],
    billing: {
      agreedPrice: quote,
      priceType: shipment.price_type === 'contract' ? 'Contract' : 'Spot',
      costPerKm: '€ 1,22',
      costPerPallet: '€ 18,75',
      costPerTonne: '€ 23,08',
      costPerStop: '€ 150,00',
      kmDetail: '491 km',
      palletDetail: '32 pallets',
      tonneDetail: '26 T',
      stopDetail: `${stops.length} stops`,
      invoiceStatus: 'Not issued',
      disputeStatus: 'No disputes',
    },
    auditEntries: [
      {
        id: 'a1',
        time: '19/02/2026 10:53',
        text: 'Shipment **Created** by Stamatia Malli',
        category: 'operations',
        tone: 'default',
      },
      {
        id: 'a2',
        time: '19/02/2026 11:00',
        text: '**Bids Broadcasted** to private carrier pool',
        category: 'bidding',
        tone: 'default',
      },
      {
        id: 'a3',
        time: '19/02/2026 11:45',
        text: '**Bid received** from KRP Transport S.A',
        category: 'bidding',
        tone: 'bid',
        priceBadge: '€ 580',
      },
      {
        id: 'a4',
        time: '19/02/2026 12:00',
        text: '**Counter-offer sent** to carrier',
        category: 'bidding',
        tone: 'counter',
        priceBadge: '€ 570',
      },
      {
        id: 'a5',
        time: '19/02/2026 12:12',
        text: '**Bid accepted** — DIMITRIS NTINOS assigned',
        category: 'bidding',
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
  };
}
