import type { Shipment, ShipmentStop } from '../../context/AppContext';
import type { PartnerBidItem } from '../../components/ShipmentDetail/BidsCard';
import type { LoadSummaryData } from '../../components/ShipmentDetail/LoadSummaryCard';

export type MilestoneState = 'done' | 'cur' | 'skip';

export interface MilestoneItem {
  key: string;
  labelEn: string;
  labelEl: string;
  actorRole?: string;
  actorName?: string;
  date?: string;
  time?: string;
  subtitle?: string;
  badge?: string;
  tone?: 'purple' | 'green' | 'red' | 'default';
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
  description?: string | null;
  fileName: string;
  fileType?: string | null;
  fileSize?: number | null;
  url?: string | null;
  uploadedBy?: string | null;
  createdAt?: string | null;
}

export interface AuditEntry {
  id: string;
  time: string;
  text: string;
  category: 'all' | 'bidding' | 'operations';
  tone?: 'bid' | 'counter' | 'reject' | 'accept' | 'default';
  priceBadge?: string;
}

export interface CarrierDetail {
  initials: string;
  avatar?: string | null;
  name: string;
  partner: boolean;
  rating: string;
  tripsCount?: number;
  phone?: string;
  email?: string;
  meta: string;
  userId?: number | null;
  userType?: 'carrier' | 'driver' | null;
  showDeliveryOnTime?: boolean;
  onTimePickup: string;
  onTimeDelivery: string;
  cancelRate: string;
  avgPickupDelay: string;
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
  tripsCount?: number;
  phone?: string;
  email?: string;
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

export interface ShipmentLogItem {
  id: number;
  action: string;
  actor: string;
  date: string;
  isRejection?: boolean;
  rejectionReason?: string | null;
}

export interface BidHistoryNegotiation {
  id: number;
  action: string;
  userName: string;
  date: string;
  price?: string | null;
  rawPrice?: number | null;
  notes?: string | null;
}

export interface BidHistoryItem {
  bidNumber: number;
  initiatorName: string;
  date: string;
  price: string;
  rawPrice?: number;
  negotiations?: BidHistoryNegotiation[];
}

export interface ShipmentDetailViewModel {
  id: string | number;
  displayId: string;
  lane: string;
  viaLabel?: string | null;
  stopsCount: number;
  statusLabel: string;
  status: Shipment['status'];
  isPrivateLoad: boolean;
  isEditingRequested?: boolean;
  editingRequestDetails?: string | null;
  onTrack: boolean;
  isDelayed: boolean;
  delayText: string;
  isPickedUp: boolean;
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
  isManualTrip: boolean;
  isPaid?: boolean;
  exceptionChips: { label: string; target: string }[];
  stops: ShipmentStop[];
  partners: PartnerBidItem[];
  loadSummary: LoadSummaryData;
  notes: DetailNote[];
  documents: DetailDocument[];
  shipmentLogs: ShipmentLogItem[];
  tracking: TrackingStats;
  trip: TripSummary;
  carrier: CarrierDetail | null;
  assignedDriver: AssignedDriverDetail | null;
  incidents: IncidentItem[];
  billing: BillingMetrics;
  auditEntries: AuditEntry[];
  shareGroups: ShareCustomerGroup[];
  availableNavSections: string[];
  shipmentLogs?: ShipmentLogItem[];
  bidsHistory?: BidHistoryItem[];
  canRate: boolean;
  isAlreadyRated: boolean;
  userRating?: number | null;
  ratingDeliveryOnTime?: boolean | null;
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
      pod: shipment.status === 'fullfilled' ? '1' : '0',
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

function formatTimestamp(ts?: string | null): { date: string; time: string } | null {
  if (!ts) return null;
  const str = String(ts).trim();
  if (!str) return null;

  // Case 1: DD/MM/YYYY or DD-MM-YYYY (with optional HH:mm)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::\d{2})?)?/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const hours = dmyMatch[4] ? dmyMatch[4].padStart(2, '0') : '';
    const minutes = dmyMatch[5] || '';
    return {
      date: `${day}/${month}/${year}`,
      time: hours && minutes ? `${hours}:${minutes}` : '',
    };
  }

  // Case 2: Standard ISO string or YYYY-MM-DD
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}`,
      };
    }
  } catch {
    // fallback
  }

  if (str.includes('·')) {
    const parts = str.split('·');
    return { date: parts[0]?.trim() || str, time: parts[1]?.trim() || '' };
  }

  return { date: str, time: '' };
}

function buildMilestones(shipment: Shipment): MilestoneItem[] {
  const normStatus = (shipment.status || 'pending').toLowerCase();
  const createdParsed = formatTimestamp(shipment.createdAt || shipment.date);
  const createdDate = createdParsed?.date || '';
  const createdTime = createdParsed?.time || '';

  const updatedParsed = formatTimestamp(shipment.updatedAt || shipment.updated);
  const updatedDate = updatedParsed?.date || createdDate;
  const updatedTime = updatedParsed?.time || createdTime;

  const milestones: MilestoneItem[] = [
    {
      key: 'created',
      labelEn: 'Created',
      labelEl: 'Δημιουργία',
      date: createdDate,
      time: createdTime,
      tone: 'purple',
      state: 'done',
    },
  ];

  const acceptedLabelEn =
    shipment.channel === 'public'
      ? 'Public Shipment Accepted'
      : shipment.channel === 'private'
        ? 'Private Shipment Accepted'
        : 'Shipment Accepted';
  const acceptedLabelEl =
    shipment.channel === 'public'
      ? 'Αποδοχή δημόσιας αποστολής'
      : shipment.channel === 'private'
        ? 'Αποδοχή ιδιωτικής αποστολής'
        : 'Αποδοχή αποστολής';

  // Helper to extract timestamp from a log status or fallback
  const getLogStamp = (logs: Array<{ status: string; createdAt?: string }> | undefined, statusCodes: string[]) => {
    if (!logs) return null;
    const log = logs.find((l) => statusCodes.includes(String(l.status)));
    if (!log || !log.createdAt) return null;
    return formatTimestamp(log.createdAt);
  };

  // Helper to append Carrier / Freelancer milestone with Partner badge and latest bid subtitle
  const pushCarrierMilestone = () => {
    if (!shipment.carrier) return;
    const topBid = shipment.offers?.[0];
    const bidTime = topBid?.respondedAt
      ? formatTimestamp(topBid.respondedAt)?.time
      : updatedTime;
    const bidDate = topBid?.respondedAt
      ? formatTimestamp(topBid.respondedAt)?.date
      : createdDate;
    const isFreelancer =
      shipment.carrierRole === 'freelancer' ||
      shipment.carrierType === 'driver' ||
      topBid?.role === 'freelancer' ||
      topBid?.transporterType === 'driver';
    const isPartner = Boolean(
      shipment.carrierPartner ||
      shipment.assignedDriverPartner ||
      topBid?.isPartner ||
      shipment.carrier_init === 'P'
    );
    const prefixEn = isFreelancer ? 'Freelancer:' : 'Carrier:';
    const prefixEl = isFreelancer ? 'Freelancer:' : 'Μεταφορέας:';
    milestones.push({
      key: 'carrier',
      labelEn: `${prefixEn} ${shipment.carrier}`,
      labelEl: `${prefixEl} ${shipment.carrier}`,
      actorRole: prefixEn,
      actorName: shipment.carrier,
      badge: isPartner ? 'PARTNER' : undefined,
      date: bidDate,
      subtitle: bidTime ? `latest bid at ${bidTime}` : undefined,
      tone: 'purple',
      state: 'done',
    });
  };

  const pushTripLocationMilestones = (isFinished: boolean) => {
    const stopsList = shipment.stops?.length ? shipment.stops : [];
    const firstStopLogs = stopsList[0]?.logs;
    const startTripStamp =
      getLogStamp(firstStopLogs, ['1', '2']) ||
      formatTimestamp(shipment.updatedAt) ||
      { date: createdDate, time: createdTime };

    // 1. Start Trip
    milestones.push({
      key: 'start_trip',
      labelEn: 'Start Trip',
      labelEl: 'Έναρξη διαδρομής',
      date: startTripStamp.date,
      time: startTripStamp.time,
      tone: 'purple',
      state: 'done',
    });

    // 2. Physical Stops (Arrival & Pickup/Drop-off for each stop)
    if (!shipment.isManualTrip && shipment.startedBy !== 'carrier' && stopsList.length > 0) {
      stopsList.forEach((stop, idx) => {
        const isPickup = stop.type === 'pickup';
        const arriveStamp =
          getLogStamp(stop.logs, ['3', '4']) ||
          formatTimestamp(stop.date ? `${stop.date} ${stop.timeStart || ''}` : undefined) ||
          startTripStamp;
        const completeStamp = getLogStamp(stop.logs, ['5', '6']) || arriveStamp;

        // Arrival milestone
        milestones.push({
          key: `arrival_${stop.id || idx}`,
          labelEn: `Arrival - ${stop.location}`,
          labelEl: `Άφιξη - ${stop.location}`,
          date: arriveStamp.date,
          time: arriveStamp.time,
          tone: 'purple',
          state: 'done',
        });

        // Pickup / Drop-off milestone
        milestones.push({
          key: `complete_${stop.id || idx}`,
          labelEn: `${isPickup ? 'Pickup' : 'Drop-off'} - ${stop.location}`,
          labelEl: `${isPickup ? 'Παραλαβή' : 'Παράδοση'} - ${stop.location}`,
          date: completeStamp.date,
          time: completeStamp.time,
          tone: 'purple',
          state: 'done',
        });
      });
    } else if (shipment.isManualTrip || shipment.startedBy === 'carrier') {
      if (isFinished) {
        milestones.push({
          key: 'trip_completed',
          labelEn: 'Trip Completed',
          labelEl: 'Ολοκλήρωση διαδρομής',
          date: updatedDate,
          time: updatedTime,
          tone: 'green',
          state: 'done',
        });
      }
    }

    // 3. POD milestone (when shipment is completed)
    if (isFinished) {
      const deliveryStops = stopsList.filter((s) => s.type === 'delivery');
      const allPodsUploaded = deliveryStops.length > 0 && deliveryStops.every((s) => s.pod === '1');
      const podLog = stopsList.flatMap((s) => s.logs || []).find((l) => String(l.status) === '9');
      const podStamp = podLog?.createdAt ? formatTimestamp(podLog.createdAt) : formatTimestamp(shipment.updatedAt);

      if (allPodsUploaded) {
        milestones.push({
          key: 'pod_uploaded',
          labelEn: 'POD Uploaded',
          labelEl: 'POD Μεταφορτώθηκε',
          date: podStamp?.date || updatedDate,
          time: podStamp?.time || updatedTime,
          tone: 'green',
          state: 'done',
        });
      } else {
        milestones.push({
          key: 'pod_pending',
          labelEn: 'POD Upload Pending',
          labelEl: 'Εκκρεμεί μεταφόρτωση POD',
          tone: 'red',
          state: 'cur',
        });
      }

      // 4. Payment milestone
      if (shipment.isPaid || shipment.markAsPaid === '1') {
        const paidStamp = shipment.paidDate ? formatTimestamp(shipment.paidDate) : formatTimestamp(shipment.updatedAt);
        milestones.push({
          key: 'payment_done',
          labelEn: 'Payment Successful',
          labelEl: 'Επιτυχής πληρωμή',
          date: paidStamp?.date || updatedDate,
          time: paidStamp?.time || updatedTime,
          tone: 'green',
          state: 'done',
        });
      } else {
        milestones.push({
          key: 'payment_pending',
          labelEn: 'Payment pending',
          labelEl: 'Εκκρεμεί πληρωμή',
          tone: 'red',
          state: 'cur',
        });
      }
    }
  };

  switch (normStatus) {
    case 'draft':
      milestones.push({
        key: 'draft',
        labelEn: 'Draft saved',
        labelEl: 'Πρόχειρο αποθηκευμένο',
        date: updatedDate,
        time: updatedTime,
        tone: 'purple',
        state: 'cur',
      });
      break;

    case 'pending': {
      const hasBids =
        (shipment.bids != null && shipment.bids > 0) ||
        (shipment.offers != null && shipment.offers.length > 0);
      milestones.push({
        key: 'pending',
        labelEn: hasBids ? 'Pending on acceptance' : 'Waiting for Bid',
        labelEl: hasBids ? 'Αναμονή αποδοχής' : 'Αναμονή για προσφορές',
        date: hasBids ? updatedDate : undefined,
        time: hasBids ? updatedTime : undefined,
        tone: 'purple',
        state: 'cur',
      });
      break;
    }

    case 'scheduled':
    case 'ready':
    case 'upcoming':
    case 'past_due':
      milestones.push({
        key: 'accepted',
        labelEn: acceptedLabelEn,
        labelEl: acceptedLabelEl,
        tone: 'purple',
        state: 'done',
      });
      pushCarrierMilestone();
      milestones.push({
        key: 'ready',
        labelEn: normStatus === 'past_due' ? 'Pickup Past Due' : 'Waiting for trip start',
        labelEl: normStatus === 'past_due' ? 'Εκπρόθεσμη παραλαβή' : 'Αναμονή έναρξης διαδρομής',
        tone: 'purple',
        state: 'cur',
      });
      break;

    case 'on_trip':
    case 'in_progress':
      milestones.push({
        key: 'accepted',
        labelEn: acceptedLabelEn,
        labelEl: acceptedLabelEl,
        tone: 'purple',
        state: 'done',
      });
      pushCarrierMilestone();
      pushTripLocationMilestones(false);
      break;

    case 'fullfilled':
    case 'delivered':
      milestones.push({
        key: 'accepted',
        labelEn: acceptedLabelEn,
        labelEl: acceptedLabelEl,
        tone: 'purple',
        state: 'done',
      });
      pushCarrierMilestone();
      pushTripLocationMilestones(true);
      break;

    case 'canceled':
    case 'cancelled':
      milestones.push({
        key: 'canceled',
        labelEn: 'Canceled Shipment',
        labelEl: 'Ακυρώθηκε',
        date: updatedDate,
        time: updatedTime,
        tone: 'red',
        state: 'cur',
      });
      break;

    case 'not_fullfilled':
    case 'partially_fullfilled':
      milestones.push({
        key: 'accepted',
        labelEn: acceptedLabelEn,
        labelEl: acceptedLabelEl,
        tone: 'purple',
        state: 'done',
      });
      pushCarrierMilestone();
      pushTripLocationMilestones(true);
      break;
  }

  return milestones;
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
  const isPrivateLoad =
    shipment.vis !== 'public' &&
    shipment.channel !== 'public' &&
    (shipment as any).type !== 'public' &&
    shipment.loadSummary?.channel?.toLowerCase() !== 'public';
  const hasCarrier = Boolean(shipment.carrier || shipment.carrierId || shipment.assignedDriverName);

  const isFreelancer =
    shipment.carrierRole === 'freelancer' ||
    shipment.carrierType === 'driver' ||
    shipment.offers?.[0]?.role === 'freelancer' ||
    shipment.offers?.[0]?.transporterType === 'driver';

  const isPartner = Boolean(
    shipment.carrierPartner ||
    shipment.assignedDriverPartner ||
    shipment.offers?.[0]?.isPartner ||
    shipment.carrier_init === 'P'
  );

  const carrier: CarrierDetail | null = hasCarrier
    ? {
        initials:
          shipment.carrier_init ||
          (shipment.carrier ? shipment.carrier.substring(0, 2).toUpperCase() : 'TL'),
        avatar: shipment.carrierAvatar ?? null,
        name: shipment.carrier || 'Transmed Logistics S.A.',
        partner: isPartner,
        role: isFreelancer ? 'freelancer' : 'carrier',
        rating: shipment.carrierRating != null ? shipment.carrierRating.toFixed(1) : '4.9',
        meta: isFreelancer ? 'Freelancer' : 'Carrier Company · 240 completed trips',
        userId: shipment.carrierId ?? 101,
        userType: isFreelancer ? 'driver' : 'carrier',
        showDeliveryOnTime: true,
        onTimePickup: fmtPct(shipment.carrierOnTimeDeliveryPct, '98%'),
        onTimeDelivery: fmtPct(shipment.carrierOnTimeDeliveryPct, '96%'),
        cancelRate: fmtPct(shipment.carrierCancellationRatePct, '0.5%'),
        avgPickupDelay: fmtMin(shipment.carrierAvgPickupDelayMinutes, '8m'),
        plates: shipment.assignedDriverPlates?.length ? shipment.assignedDriverPlates : ['ΙΧΕ-7890', 'ΤΡ-4512'],
        templates: [],
        canRate: true,
      }
    : null;

  const assignedDriver: AssignedDriverDetail | null =
    shipment.assignedDriverName || (hasCarrier && !isFreelancer)
      ? {
          initials:
            shipment.assignedDriverInitials ||
            (shipment.assignedDriverName ? shipment.assignedDriverName.substring(0, 2).toUpperCase() : 'AL'),
          avatar: shipment.assignedDriverAvatar ?? null,
          name: shipment.assignedDriverName || 'Ανδρέας Λύτρας',
          partner: isPartner,
          rating:
            shipment.assignedDriverRating != null
              ? shipment.assignedDriverRating.toFixed(1)
              : '4.8',
          meta: 'Company Driver · +30 697 1234567',
          userId: shipment.assignedDriverId ?? 201,
          plates: shipment.assignedDriverPlates ?? ['ΙΧΕ-7890', 'ΤΡ-4512'],
          canRate: true,
        }
      : null;

  const mappedOffers: PartnerBidItem[] = (shipment.offers || []).map((o) => {
    const name = o.name || 'Transporter';
    return {
      id: o.id || `offer-${Math.random()}`,
      userId: o.transporterId ?? undefined,
      userType: o.transporterType ?? 'carrier',
      name,
      transporterType: o.transporterType === 'driver' || o.role === 'freelancer' ? 'freelancer' : 'carrier',
      initials: o.initials || name.substring(0, 2).toUpperCase(),
      avatar: o.avatar ?? null,
      rating: o.rating != null ? o.rating.toFixed(1) : '—',
      tripsCount: o.ratingCount ?? 0,
      hasBid: o.type === 'bid' || o.price != null,
      isInterested: o.type === 'interest',
      bidAmount: o.price ?? null,
      statusText: o.type === 'bid' ? 'Bid submitted' : 'Interested partner',
      time: o.respondedAt || undefined,
    };
  });

  const offerNames = new Set(mappedOffers.map((m) => m.name.toLowerCase().trim()));

  const mappedInvitees: PartnerBidItem[] = (shipment.invitees || [])
    .filter((inv) => !offerNames.has((inv.name || '').toLowerCase().trim()))
    .map((inv) => {
      const name = inv.name || 'Invited Partner';
      const isFreelancer = inv.transporterType === 'driver' || inv.role === 'freelancer';
      return {
        id: `invitee-${inv.id}`,
        userId: inv.transporterId ?? inv.id,
        userType: isFreelancer ? 'driver' : 'carrier',
        name,
        transporterType: isFreelancer ? 'freelancer' : 'carrier',
        initials: inv.initials || name.substring(0, 2).toUpperCase(),
        avatar: inv.avatar ?? null,
        rating: inv.rating != null ? Number(inv.rating).toFixed(1) : '4.9',
        tripsCount: inv.ratingCount ?? 120,
        hasBid: false,
        isInterested: false,
        bidAmount: null,
        statusText: 'Invited · Waiting response',
        time: inv.invitedAt ? String(inv.invitedAt).replace('T', ' ').substring(0, 16) : undefined,
      };
    });

  const partners: PartnerBidItem[] = [...mappedOffers, ...mappedInvitees];

  const distanceKm = shipment.journeyDistanceKm || 232;
  const duration = typeof shipment.journeyTime === 'string' ? shipment.journeyTime : '3h 45m';
  const totalWeight = shipment.totalWeight ? `${shipment.totalWeight} T` : '18 T';

  // Navigation sections active based on status
  const availableNavSections: string[] = [];
  const hasActiveBids = partners.some((p) => p.hasBid || p.isInterested);
  if (status === 'pending') {
    if (hasActiveBids) {
      availableNavSections.push('bids');
    } else if (isPrivateLoad && partners.length > 0) {
      availableNavSections.push('invited');
    }
  }
  availableNavSections.push('stops', 'load');
  if (status === 'on_trip' || status === 'in_progress') {
    availableNavSections.push('tracking');
  }
  if (hasCarrier && status !== 'draft' && status !== 'pending') {
    availableNavSections.push('carrier');
  }
  availableNavSections.push('docs', 'audit');

  const isCompleted =
    status === 'fullfilled' ||
    status === 'partially_fullfilled' ||
    status === 'delivered' ||
    status === 'not_fullfilled';

  const isPickedUp = status === 'on_trip' || status === 'in_progress' || isCompleted;

  // Load value sum of orders
  const loadValue = shipment.cargoValue != null
    ? `€ ${Number(shipment.cargoValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '€ 12,500.00';

  return {
    id: shipment.id,
    displayId,
    lane: `${shipment.origin || 'Athens'} → ${shipment.dest || 'Thessaloniki'}`,
    viaLabel: shipment.via,
    stopsCount: stops.length,
    statusLabel: status,
    status,
    isPrivateLoad,
    isEditingRequested: false, // only shown if edit requested
    editingRequestDetails: null,
    onTrack: !shipment.at_risk,
    isDelayed: Boolean(shipment.at_risk),
    delayText: '+15 min delay',
    isPickedUp,
    primaryCustomer,
    owner: shipment.ownerName || shipment.owner || 'My Vagon',
    etaChip: '🔵 ETA: 20/02 · 16:00',
    etaStatusChip: shipment.at_risk ? '⚠️ Delayed (+15 min)' : '✅ On Time',
    isPaid: Boolean(shipment.isPaid ?? (shipment.markAsPaid === '1')),
    cancellationReason: shipment.cancellationReason || shipment.riskReason || 'Equipment breakdown / shipper requested cancellation',
    cancellationDate: shipment.cancellationDate || shipment.updatedAt || '16/02/2026 · 16:45',
    cancellationDetails: shipment.cancellationDetails || 'Cancelled · Full refund issued',
    unfulfilledReason: shipment.unfulfilledReason || 'Carrier vehicle breakdown — delivery could not be completed',
    unfulfilledDate: shipment.unfulfilledDate || '20/02/2026 · 15:30',
    milestones: buildMilestones(shipment),
    exceptionChips: shipment.at_risk
      ? [{ label: 'Delay Warning', target: 'tracking' }]
      : [{ label: 'POD Verified', target: 'docs' }],
    stops,
    partners,
    loadSummary: shipment.loadSummary || {
      vehicleTypes: shipment.truckTypes?.length ? shipment.truckTypes : ['Semi-Trailer'],
      cargoSpecs: ['Curtainside'],
      quote,
      loadValue,
      channel: isPrivateLoad ? 'Private' : 'Public',
      negotiable: shipment.negotiable !== false,
      liveNavigation: shipment.navigation !== false,
      specialInstructions: shipment.driverNotes || '—',
    },
    notes: shipment.notesList && shipment.notesList.length > 0
      ? shipment.notesList
      : shipment.driverNotes
      ? [
          {
            id: 'note-1',
            author: shipment.owner || 'Shipper',
            timestamp: shipment.createdAt ? String(shipment.createdAt).replace('T', ' ').substring(0, 16) : 'Creation',
            body: shipment.driverNotes,
            visibility: 'carrier',
          },
        ]
      : [],
    documents: (shipment.documentsList || []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize,
      url: d.url,
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt,
    })),
    shipmentLogs: shipment.shipmentLogs || [],
    tracking: {
      movement: 'Moving 68 km/h',
      etaVariance: shipment.at_risk ? '+12 min delay' : 'On time',
      kmRemaining: '87 km',
      speed: '68 km/h',
    },
    trip: shipment.tripSummary || {
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
    auditEntries: shipment.auditEntries?.length
      ? shipment.auditEntries
      : [
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
            category: 'operations',
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
    isManualTrip: Boolean(shipment.isManualTrip || shipment.startedBy === 'carrier'),
    bidsHistory: shipment.bidsHistory || [],
    canRate: isCompleted && hasCarrier,
    isAlreadyRated: Boolean(shipment.shipperRating),
    userRating: shipment.shipperRating?.rating ?? null,
    ratingDeliveryOnTime: shipment.shipperRating?.deliveryOnTime ?? null,
  };
}
