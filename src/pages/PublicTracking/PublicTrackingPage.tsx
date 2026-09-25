import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Mail,
  Map as MapIcon,
  MapPin,
  Package,
  Phone,
  Star,
  Truck,
} from 'lucide-react';
import { publicTrackingService } from '../../api/services/publicTrackingService';
import { StatusBadge } from '../../components/ShipmentDetail/StatusBadge';
import { RouteMap } from '../../components/CreateShipmentWizard/itinerary/RouteMap';
import { useRouteLegs } from '../../components/CreateShipmentWizard/itinerary/useRouteLegs';
import type { EnrichedStop } from '../../components/CreateShipmentWizard/itinerary/types';
import {
  formatUtcToDisplayDate,
  formatUtcToDisplayDateTime,
  formatUtcToDisplayTime,
  isDateOnly,
  parseUtcInstant,
} from '../../utils/timezone';
import fullLogo from '../../assets/logo/fullLogo.svg';
import type {
  PublicTrackingPayload,
  TrackingProductLine,
  TrackingReceiptItem,
  TrackingStop,
  TrackingTimelineItem,
} from './types';
import { PublicTrackingSkeleton } from './PublicTrackingSkeleton';
import { useLiveDropoffEta } from './useLiveDropoffEta';
import './publicTracking.css';

type Lang = 'en' | 'el';

const I18N: Record<string, { en: string; el: string }> = {
  itinerary: { en: 'Itinerary Details', el: 'Λεπτομέρειες διαδρομής' },
  liveTracking: { en: 'Live Tracking', el: 'Ζωντανός εντοπισμός' },
  transporter: { en: 'Transporter', el: 'Μεταφορέας' },
  orderDetails: { en: 'Order Details', el: 'Λεπτομέρειες παραγγελίας' },
  confirmReceipt: { en: 'Confirm Receipt of Goods', el: 'Επιβεβαίωση παραλαβής εμπορευμάτων' },
  rateTransporter: { en: 'Rate your Transporter', el: 'Αξιολογήστε τον μεταφορέα' },
  pickup: { en: 'PICKUP', el: 'ΠΑΡΑΛΑΒΗ' },
  dropoff: { en: 'DROPOFF', el: 'ΠΑΡΑΔΟΣΗ' },
  freelancer: { en: 'Freelancer', el: 'Freelancer' },
  carrier: { en: 'Carrier', el: 'Μεταφορέας' },
  carrierCompany: { en: 'Carrier Company', el: 'Εταιρεία μεταφοράς' },
  companyDriver: { en: 'Company Driver', el: 'Οδηγός εταιρείας' },
  completedTrips: { en: 'Completed trips', el: 'Ολοκληρωμένα ταξίδια' },
  vehiclePlate: { en: 'Vehicle', el: 'Όχημα' },
  trailerPlate: { en: 'Trailer', el: 'Ρυμουλκούμενο' },
  phoneCopied: { en: 'Phone copied', el: 'Το τηλέφωνο αντιγράφηκε' },
  emailCopied: { en: 'Email copied', el: 'Το email αντιγράφηκε' },
  onBehalf: { en: 'on behalf of', el: 'εκ μέρους' },
  load: { en: 'Load', el: 'Φορτίο' },
  onTime: { en: 'On Time', el: 'Εντός χρόνου' },
  delayed: { en: 'Delayed', el: 'Καθυστέρηση' },
  eta: { en: 'ETA', el: 'ETA' },
  etaNotAvailable: { en: 'ETA Not Available', el: 'ETA μη διαθέσιμο' },
  supplier: { en: 'Supplier', el: 'Προμηθευτής' },
  quantity: { en: 'Quantity', el: 'Ποσότητα' },
  weight: { en: 'Weight', el: 'Βάρος' },
  product: { en: 'Product', el: 'Προϊόν' },
  vehicleType: { en: 'Vehicle Type', el: 'Τύπος οχήματος' },
  vehicle: { en: 'Vehicle', el: 'Όχημα' },
  tripsCompleted: { en: 'trips completed', el: 'ολοκληρωμένα ταξίδια' },
  fullReceipt: { en: 'Full Receipt', el: 'Πλήρης παραλαβή' },
  partialReceipt: { en: 'Partial Receipt', el: 'Μερική παραλαβή' },
  confirmCta: { en: 'Confirm Receipt', el: 'Επιβεβαίωση παραλαβής' },
  receiptConfirmed: { en: 'Receipt Confirmed', el: 'Παραλαβή επιβεβαιώθηκε' },
  submitRating: { en: 'Submit Rating', el: 'Υποβολή αξιολόγησης' },
  ratingThanks: { en: 'Thanks for your rating', el: 'Ευχαριστούμε για την αξιολόγηση' },
  suggested: { en: 'Suggested Route', el: 'Προτεινόμενη διαδρομή' },
  actual: { en: 'Actual Route', el: 'Πραγματική διαδρομή' },
  orderId: { en: 'Order ID', el: 'Κωδ. παραγγελίας' },
  item: { en: 'Item', el: 'Είδος' },
  ordered: { en: 'Ordered', el: 'Παραγγελία' },
  received: { en: 'Received', el: 'Παραλαβή' },
  notes: { en: 'Add comments about the delivery… (optional)', el: 'Προσθέστε σχόλια… (προαιρετικό)' },
  reviewPh: { en: 'Write a review… (optional)', el: 'Γράψτε μια αξιολόγηση… (προαιρετικό)' },
  copied: { en: 'Copied to clipboard', el: 'Αντιγράφηκε' },
  notFound: { en: 'Tracking link is invalid or expired.', el: 'Ο σύνδεσμος δεν είναι έγκυρος.' },
  powered: { en: 'Powered by', el: 'Με την υποστήριξη' },
  copyAddress: { en: 'Copy Address', el: 'Αντιγραφή διεύθυνσης' },
  addressCopied: { en: 'Address Copied!', el: 'Η διεύθυνση αντιγράφηκε!' },
  routeMap: { en: 'Route map', el: 'Χάρτης διαδρομής' },
  showLess: { en: 'Show less', el: 'Λιγότερα' },
  showMore: { en: 'Show more', el: 'Περισσότερα' },
  showMoreOrders: {
    en: '+ Show {n} more order(s)/product(s)',
    el: '+ Εμφάνιση ακόμη {n} παραγγελία(ες)/προϊόν(τα)',
  },
  manualTitle: { en: 'Manually Executed Trip', el: 'Χειροκίνητο ταξίδι' },
  manualBody: {
    en: 'Live GPS tracking and actual route data are not available.',
    el: 'Ζωντανή παρακολούθηση GPS και πραγματική διαδρομή δεν είναι διαθέσιμα.',
  },
  noGpsTitle: { en: 'Live GPS unavailable', el: 'Ζωντανό GPS μη διαθέσιμο' },
  noGpsBody: {
    en: 'Live GPS tracking is not available for this shipment. The shipper plan does not include live GPS tracking.',
    el: 'Η ζωντανή παρακολούθηση GPS δεν είναι διαθέσιμη για αυτό το φορτίο. Το πλάνο του αποστολέα δεν περιλαμβάνει ζωντανό GPS.',
  },
  noGpsShort: {
    en: 'No live GPS permission',
    el: 'Χωρίς άδεια ζωντανού GPS',
  },
  pickupLocation: { en: 'Pickup Location', el: 'Τοποθεσία παραλαβής' },
  dropoffLocation: { en: 'Drop-off Location', el: 'Τοποθεσία παράδοσης' },
  noOrders: { en: 'No order details available.', el: 'Δεν υπάρχουν διαθέσιμες λεπτομέρειες παραγγελίας.' },
  noStops: { en: 'No itinerary stops available.', el: 'Δεν υπάρχουν διαθέσιμες στάσεις διαδρομής.' },
  orderLabel: { en: 'Order', el: 'Παραγγελία' },
  itemsMissing: { en: 'Items missing', el: 'Λείπουν είδη' },
  damagedGoods: { en: 'Damaged goods', el: 'Κατεστραμμένα' },
  wrongItems: { en: 'Wrong items', el: 'Λάθος είδη' },
  quantityMismatch: { en: 'Quantity mismatch', el: 'Διαφορά ποσότητας' },
  notAssigned: { en: 'Not assigned', el: 'Δεν έχει ανατεθεί' },
  transporterNotAssigned: { en: 'Transporter is not assigned yet', el: 'Δεν έχει ανατεθεί μεταφορέας ακόμη' },
};

/** Visible live-driver pin (data URI) — clearer than the tiny Laravel SVG path. */
const LIVE_ICON = {
  url:
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="16" fill="#6C3AED" stroke="#ffffff" stroke-width="3"/>
        <circle cx="22" cy="22" r="6" fill="#ffffff"/>
        <path d="M22 6 L26 16 L22 14 L18 16 Z" fill="#ffffff"/>
      </svg>`
    ),
  scaledSize: { width: 44, height: 44 },
  anchor: { x: 22, y: 22 },
};

const PARTIAL_REASONS: Array<{ key: string; labelKey: string }> = [
  { key: 'Items missing', labelKey: 'itemsMissing' },
  { key: 'Damaged goods', labelKey: 'damagedGoods' },
  { key: 'Wrong items', labelKey: 'wrongItems' },
  { key: 'Quantity mismatch', labelKey: 'quantityMismatch' },
];

function t(lang: Lang, key: string): string {
  return I18N[key]?.[lang] ?? key;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

function formatStopSchedule(fromDate?: string | null, toDate?: string | null): string {
  const from = (fromDate || '').trim();
  const to = (toDate || '').trim();
  if (!from && !to) return '';

  const dateLine = formatUtcToDisplayDate(from || to);
  const startTime = from && !isDateOnly(from) ? formatUtcToDisplayTime(from) : '';
  const endTime = to && !isDateOnly(to) ? formatUtcToDisplayTime(to) : '';

  let timeText = '';
  if (startTime && endTime && startTime !== endTime) {
    timeText = `${startTime} – ${endTime}`;
  } else if (startTime) {
    timeText = startTime;
  } else if (endTime) {
    timeText = endTime;
  }

  if (dateLine && timeText) return `${dateLine} - ${timeText}`;
  if (dateLine) return dateLine;
  if (from) return from;
  if (to) return to;
  return '';
}

function timelineDotClass(step: TrackingTimelineItem): string {
  const classes: string[] = [];
  const isPodPending = step.variant === 'pod' && (step.state === 'pending' || step.state === 'cur');
  const isDanger = step.variant === 'danger' || step.state === 'failed';

  if (isPodPending) {
    classes.push('pod-pending');
    if (step.state === 'cur') classes.push('cur');
    else classes.push('pending');
  } else if (isDanger) {
    classes.push('failed');
  } else if (step.state === 'cur') {
    classes.push('cur');
  } else if (step.state === 'done') {
    classes.push('done');
  } else if (step.state === 'pending') {
    classes.push('pending');
  } else {
    classes.push(step.state);
  }

  return classes.join(' ');
}

function timelineStepClass(step: TrackingTimelineItem): string {
  if (step.variant === 'pod' && (step.state === 'pending' || step.state === 'cur')) return 'is-pod-pending';
  if (step.state === 'failed' || step.variant === 'danger') return 'is-failed';
  if (step.state === 'pending') return 'is-pending';
  if (step.state === 'cur') return 'is-cur';
  if (step.state === 'done') return 'is-done';
  return '';
}

function timelineConnectorClass(
  step: TrackingTimelineItem,
  isLast: boolean,
  shipmentStatus: string
): string {
  if (isLast) {
    const completed =
      shipmentStatus === 'fullfilled' ||
      shipmentStatus === 'delivered' ||
      shipmentStatus === 'canceled' ||
      shipmentStatus === 'cancelled' ||
      shipmentStatus === 'not_fullfilled';
    return completed ? '' : 'dashed';
  }
  if (step.state === 'done' || step.state === 'failed') return 'done';
  return '';
}

/** Resolve tracking tokens + guest email from query, path params, or Amplify-decoded paths. */
function usePublicTrackingTokens(): {
  encryptedId: string;
  encryptedLocationIds: string;
  guestEmail: string;
} {
  const params = useParams<{ encryptedId?: string; encryptedLocationIds?: string; '*'?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  return useMemo(() => {
    const guestEmail = (
      searchParams.get('email') ||
      searchParams.get('guest_email') ||
      ''
    ).trim();

    const sid = searchParams.get('sid') || searchParams.get('id') || '';
    const lid = searchParams.get('lid') || searchParams.get('location') || searchParams.get('location_id') || '';
    if (sid && lid) {
      return { encryptedId: sid, encryptedLocationIds: lid, guestEmail };
    }

    if (params.encryptedId && params.encryptedLocationIds) {
      return {
        encryptedId: params.encryptedId,
        encryptedLocationIds: params.encryptedLocationIds,
        guestEmail,
      };
    }

    const marker = location.pathname.includes('/shipper/track-shipment/')
      ? '/shipper/track-shipment/'
      : '/track-shipment/';
    const idx = location.pathname.indexOf(marker);
    if (idx >= 0) {
      const rest = location.pathname.slice(idx + marker.length).replace(/\/$/, '');
      const eyJParts = rest.split(/(?=eyJ)/).filter(Boolean).map((p) => p.replace(/\/$/, ''));
      if (eyJParts.length >= 2) {
        return {
          encryptedId: eyJParts[0],
          encryptedLocationIds: eyJParts.slice(1).join(''),
          guestEmail,
        };
      }
      const segs = rest.split('/').filter(Boolean);
      if (segs.length >= 2) {
        return { encryptedId: segs[0], encryptedLocationIds: segs.slice(1).join('/'), guestEmail };
      }
    }

    const splat = params['*'] || '';
    if (splat) {
      const eyJParts = splat.split(/(?=eyJ)/).filter(Boolean).map((p) => p.replace(/\/$/, ''));
      if (eyJParts.length >= 2) {
        return {
          encryptedId: eyJParts[0],
          encryptedLocationIds: eyJParts.slice(1).join(''),
          guestEmail,
        };
      }
      const segs = splat.split('/').filter(Boolean);
      if (segs.length >= 2) {
        return { encryptedId: segs[0], encryptedLocationIds: segs.slice(1).join('/'), guestEmail };
      }
    }

    return { encryptedId: '', encryptedLocationIds: '', guestEmail };
  }, [location.pathname, params, searchParams]);
}

function stopsToEnriched(
  stops: TrackingStop[],
  mapPoints: PublicTrackingPayload['map']['points']
): EnrichedStop[] {
  const fromStops = stops.map((s, idx) => {
    const point = mapPoints.find((p) => p.id === s.id) || mapPoints[idx];
    const lat = s.lat != null ? Number(s.lat) : point?.lat != null ? Number(point.lat) : null;
    const lng = s.lng != null ? Number(s.lng) : point?.lng != null ? Number(point.lng) : null;
    return {
      id: String(s.id || idx + 1),
      type: s.type === 'pickup' ? 1 : 2,
      location_id: s.id || idx + 1,
      locationName: s.company_name || s.city || '',
      location_name: s.company_name || s.city || '',
      address: s.address || '',
      city: s.city || '',
      lat,
      lng,
      resolvedName: s.company_name || s.city || point?.label || '',
      resolvedCity: s.city || '',
      resolvedCompany: s.company_name || '',
      resolvedAddress: s.address || s.city || '',
      hasPickup: s.type === 'pickup',
      hasDropoff: s.type === 'dropoff',
      customers: [],
      lines: [],
    };
  });

  const withCoords = fromStops.filter((s) => s.lat != null && s.lng != null);
  if (withCoords.length > 0) return withCoords as EnrichedStop[];

  return mapPoints
    .filter((p) => p.lat != null && p.lng != null)
    .map((p, idx) => ({
      id: String(p.id || idx + 1),
      type: p.type === 'pickup' ? 1 : 2,
      location_id: p.id || idx + 1,
      locationName: p.label || '',
      location_name: p.label || '',
      address: p.label || '',
      city: '',
      lat: Number(p.lat),
      lng: Number(p.lng),
      resolvedName: p.label || '',
      resolvedCity: '',
      resolvedCompany: p.label || '',
      resolvedAddress: p.label || '',
      hasPickup: p.type === 'pickup',
      hasDropoff: p.type !== 'pickup',
      customers: [],
      lines: [],
    })) as EnrichedStop[];
}

const TrackingLiveMap: React.FC<{
  data: PublicTrackingPayload;
  stops?: TrackingStop[];
  lang: Lang;
  livePosition: { lat: number; lng: number } | null;
  socketStatus?: 'idle' | 'connecting' | 'connected' | 'error';
}> = ({ data, stops: passedStops, lang, livePosition, socketStatus = 'idle' }) => {
  const [routeMode, setRouteMode] = useState<'suggested' | 'actual'>('suggested');
  const enrichedStops = useMemo(
    () => stopsToEnriched(passedStops || data.stops, data.map.points || []),
    [passedStops, data.stops, data.map.points]
  );
  const routeLegs = useRouteLegs(enrichedStops);
  const actualRoute = data.map.actual_route || [];
  const isLive = Boolean(data.map.live?.enabled);
  const hasGpsPermission = Boolean(data.map.permissions?.gps);
  const isManualTrip =
    (data.shipment.started_by || '') === 'carrier' || (data.map.mode || '') === 'manual';
  const status = (data.shipment.status || '').toLowerCase();
  const isOnTrip = status === 'on_trip' || status === 'in_progress';
  const isCompleted =
    status === 'fullfilled' ||
    status === 'partially_fullfilled' ||
    status === 'delivered' ||
    status === 'not_fullfilled';
  const hasActual = actualRoute.length > 1 || Boolean(data.map.permissions?.actual_route);
  // Match TrackingMapCard: toggle on completed; during live keep suggested + GPS marker.
  const showToggle = !isLive && (isCompleted || hasActual || Boolean(data.map.permissions?.show_route_toggle));
  const showLiveChrome = isLive || isOnTrip;
  const liveBlocked = showLiveChrome && !isLive && (isManualTrip || !hasGpsPermission);

  const activePolylinePath =
    routeMode === 'actual' && actualRoute.length > 1 ? actualRoute : routeLegs.polylinePath;
  const activeDirectionsResult = routeMode === 'actual' ? null : routeLegs.directionsResult;

  const mapT = useCallback(
    (key: string) => {
      if (key === 'pickupLocation') return t(lang, 'pickupLocation');
      if (key === 'dropoffLocation') return t(lang, 'dropoffLocation');
      if (key === 'loading') return '…';
      if (key === 'step2MapPlaceholder') return t(lang, 'liveTracking');
      return key;
    },
    [lang]
  );

  const liveStatusLabel = (() => {
    if (isManualTrip && !isLive) {
      return t(lang, 'manualTitle');
    }
    if (!hasGpsPermission && !isLive) {
      return t(lang, 'noGpsShort');
    }
    if (socketStatus === 'connected') {
      return lang === 'el' ? 'Ζωντανά συνδεδεμένο' : 'Live connected';
    }
    if (socketStatus === 'connecting') {
      return lang === 'el' ? 'Σύνδεση…' : 'Connecting…';
    }
    if (socketStatus === 'error') {
      return lang === 'el' ? 'Σφάλμα σύνδεσης' : 'Connection error';
    }
    return lang === 'el' ? 'Αναμονή GPS' : 'Waiting for GPS';
  })();

  const liveStatusClass = (() => {
    if (liveBlocked) return 'denied';
    return socketStatus;
  })();

  return (
    <div className="pt-map-stack">
      {liveBlocked ? (
        <div className="pt-live-notice" role="status">
          <span className="pt-live-notice-icon" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <div className="pt-live-notice-title">
              {isManualTrip ? t(lang, 'manualTitle') : t(lang, 'noGpsTitle')}
            </div>
            <div className="pt-live-notice-body">
              {isManualTrip ? t(lang, 'manualBody') : t(lang, 'noGpsBody')}
            </div>
          </div>
        </div>
      ) : null}

      {showLiveChrome ? (
        <div className="pt-map-toolbar">
          <div className={`pt-live-status ${liveStatusClass}`}>
            <span className="pt-live-status-dot" aria-hidden="true" />
            {liveStatusLabel}
            {!liveBlocked && livePosition
              ? ` · ${livePosition.lat.toFixed(4)}, ${livePosition.lng.toFixed(4)}`
              : !liveBlocked && socketStatus === 'connected'
                ? lang === 'el'
                  ? ' · αναμονή θέσης…'
                  : ' · waiting for position…'
                : ''}
          </div>
          {showToggle ? (
            <div className="pt-route-toggle">
              <button
                type="button"
                className={routeMode === 'actual' ? 'act-actual' : ''}
                onClick={() => setRouteMode('actual')}
                disabled={actualRoute.length < 2}
              >
                {t(lang, 'actual')}
              </button>
              <button
                type="button"
                className={routeMode === 'suggested' ? 'act-suggested' : ''}
                onClick={() => setRouteMode('suggested')}
              >
                {t(lang, 'suggested')}
              </button>
            </div>
          ) : null}
        </div>
      ) : showToggle ? (
        <div className="pt-map-toolbar">
          <div className="pt-route-toggle">
            <button
              type="button"
              className={routeMode === 'actual' ? 'act-actual' : ''}
              onClick={() => setRouteMode('actual')}
              disabled={actualRoute.length < 2}
            >
              {t(lang, 'actual')}
            </button>
            <button
              type="button"
              className={routeMode === 'suggested' ? 'act-suggested' : ''}
              onClick={() => setRouteMode('suggested')}
            >
              {t(lang, 'suggested')}
            </button>
          </div>
        </div>
      ) : null}
      <div className="pt-map-wrap">
        <div className="pt-map">
          <RouteMap
            stops={enrichedStops}
            polylinePath={
              activePolylinePath.length > 0
                ? activePolylinePath
                : enrichedStops
                    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
                    .map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) }))
            }
            directionsResult={activeDirectionsResult}
            loading={routeLegs.loading}
            height={isOnTrip || isLive ? 260 : 280}
            expanded
            strokeColor={routeMode === 'actual' ? '#d97706' : '#9B51E0'}
            livePosition={isLive ? livePosition : null}
            followLive={isLive}
            liveIcon={LIVE_ICON}
            t={mapT as any}
          />
        </div>
      </div>
    </div>
  );
};

/** Match StopsCard OrderStatusIcon — purple ticks for completed stops. */
const StopCompletedIcon: React.FC = () => (
  <div className="pt-order-tick" title="Completed">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="16"
      viewBox="0 0 18 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 9.5L5.5 14L16 3" />
      <path d="M1 5.5L5.5 10L16 -1" opacity="0.6" />
    </svg>
  </div>
);

const ItineraryStop: React.FC<{
  stop: TrackingStop;
  index: number;
  lang: Lang;
  onCopy: (value?: string | null, toastMsg?: string) => void;
}> = ({ stop, index, lang, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const isPickup = stop.type === 'pickup';
  const schedule =
    formatStopSchedule(stop.from_date, stop.to_date) ||
    (stop.schedule_label ? formatStopSchedule(stop.schedule_label) : '') ||
    stop.schedule_label ||
    '';
  const lines = stop.lines || [];
  const addressLine = [stop.address, stop.city].filter(Boolean).join(', ');
  const copyValue = [stop.address, stop.city].filter(Boolean).join(', ');
  const supplierLabel = stop.supplier_name || '';
  const pickupPhone = isPickup ? (stop.phone || '').trim() : '';
  const pickupEmail = isPickup ? (stop.email || '').trim() : '';

  // Same as shipment detail StopsCard: one card per order_id, products listed inside.
  const orderGroups = useMemo(() => {
    const groups: { orderId: string; products: TrackingProductLine[] }[] = [];
    const indexByOrder = new Map<string, number>();
    for (const line of lines) {
      const orderId = (line.order_id || '').trim() || '—';
      const existing = indexByOrder.get(orderId);
      if (existing === undefined) {
        indexByOrder.set(orderId, groups.length);
        groups.push({ orderId, products: [line] });
        continue;
      }
      groups[existing].products.push(line);
    }
    return groups;
  }, [lines]);

  const totalProductCount = orderGroups.reduce((sum, g) => sum + g.products.length, 0);
  const hasMultipleItems = totalProductCount > 1 || orderGroups.length > 1;

  const handleCopy = async () => {
    await onCopy(copyValue || addressLine);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <article className="pt-stop">
      <div className="pt-stop-top">
        <div className={`pt-stop-num ${isPickup ? 'pk' : 'dl'}`}>{index + 1}</div>
        <div className="pt-stop-main">
          <div className="pt-stop-head">
            <div className="pt-stop-name">{stop.company_name || '—'}</div>
            <div className="pt-stop-meta">
              <span className={`pt-stop-type ${isPickup ? 'pk' : 'dl'}`}>
                {isPickup ? t(lang, 'pickup') : t(lang, 'dropoff')}
              </span>
              {schedule ? <span className="pt-stop-sched">{schedule}</span> : null}
            </div>
          </div>

          {addressLine ? <div className="pt-stop-addr">{addressLine}</div> : null}

          {/* Pickup only: phone/email copy icons under address (never on dropoff). */}
          {isPickup && (pickupPhone || pickupEmail) ? (
            <div className="pt-stop-contacts">
              {pickupPhone ? (
                <button
                  type="button"
                  className="pt-icon-btn"
                  title={pickupPhone}
                  aria-label={t(lang, 'phoneCopied')}
                  onClick={() => onCopy(pickupPhone, `${t(lang, 'phoneCopied')}: ${pickupPhone}`)}
                >
                  <Phone size={14} />
                </button>
              ) : null}
              {pickupEmail ? (
                <button
                  type="button"
                  className="pt-icon-btn"
                  title={pickupEmail}
                  aria-label={t(lang, 'emailCopied')}
                  onClick={() => onCopy(pickupEmail, `${t(lang, 'emailCopied')}: ${pickupEmail}`)}
                >
                  <Mail size={14} />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="pt-stop-orders">
            {orderGroups.map((group, oIdx) => {
              if (!ordersExpanded && oIdx > 0) return null;

              const visibleProducts = ordersExpanded
                ? group.products
                : oIdx === 0
                  ? group.products.slice(0, 1)
                  : [];

              if (visibleProducts.length === 0) return null;

              return (
                <div className="pt-order-row" key={`${group.orderId}-${oIdx}`}>
                  <div className="pt-order-row-main">
                    <div className="pt-order-row-line">
                      <span className="oid">
                        {t(lang, 'orderLabel')}: {group.orderId}
                      </span>
                    </div>
                    {visibleProducts.map((line, pIdx) => (
                      <div className="pt-order-row-line pt-order-product" key={`${line.location_id}-${pIdx}`}>
                        {line.product_name ? <span className="prod">{line.product_name}</span> : null}
                        {line.qty != null || line.weight != null ? (
                          <>
                            {line.product_name ? <span className="sep">·</span> : null}
                            <span className="qty">
                              {line.qty != null ? `${line.qty} ${line.qty_unit || ''}`.trim() : ''}
                              {line.qty != null && line.weight != null ? ' · ' : ''}
                              {line.weight != null ? `${line.weight} ${line.weight_unit || ''}`.trim() : ''}
                            </span>
                          </>
                        ) : null}
                      </div>
                    ))}
                    {supplierLabel && oIdx === 0 ? (
                      <div className="pt-stop-supplier">
                        <span aria-hidden="true">🏪</span>
                        <span>{supplierLabel}</span>
                      </div>
                    ) : null}
                  </div>
                  {stop.completed ? <StopCompletedIcon /> : null}
                </div>
              );
            })}

            {hasMultipleItems ? (
              <button
                type="button"
                className="pt-more-btn"
                onClick={() => setOrdersExpanded((v) => !v)}
              >
                {ordersExpanded ? (
                  <>
                    <ChevronUp size={13} />
                    {t(lang, 'showLess')}
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} />
                    {t(lang, 'showMoreOrders').replace('{n}', String(Math.max(totalProductCount - 1, 1)))}
                  </>
                )}
              </button>
            ) : null}

            {orderGroups.length === 0 && supplierLabel ? (
              <div className="pt-order-row">
                <div className="pt-order-row-main">
                  <div className="pt-stop-supplier" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <span aria-hidden="true">🏪</span>
                    <span>{supplierLabel}</span>
                  </div>
                </div>
                {stop.completed ? <StopCompletedIcon /> : null}
              </div>
            ) : null}
          </div>

          {/* Copy Address at bottom — matches StopsCard */}
          <div className="pt-stop-actions">
            {copyValue ? (
              <button type="button" className="pt-copy-link" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle2 size={13} />
                    {t(lang, 'addressCopied')}
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    {t(lang, 'copyAddress')}
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

export const PublicTrackingPage: React.FC = () => {
  const { encryptedId, encryptedLocationIds, guestEmail: guestFromUrl } = usePublicTrackingTokens();
  const [lang, setLang] = useState<Lang>('en');
  const [data, setData] = useState<PublicTrackingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [activeNav, setActiveNav] = useState('itinerary');
  const [livePosition, setLivePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const [rcptType, setRcptType] = useState<'full' | 'partial'>('full');
  const [rcptNotes, setRcptNotes] = useState('');
  const [rcptReason, setRcptReason] = useState('');
  const [rcptItems, setRcptItems] = useState<TrackingReceiptItem[]>([]);
  const [rcptSaving, setRcptSaving] = useState(false);
  const [rcptDone, setRcptDone] = useState(false);

  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateDone, setRateDone] = useState(false);
  const ignoreScrollSpyUntil = useRef(0);

  const resolvedGuestEmail = useMemo(() => {
    const fromPayload =
      data?.guest?.email || data?.receipt?.guest_email || data?.rating?.guest_email || '';
    return (guestFromUrl || fromPayload || '').trim();
  }, [guestFromUrl, data]);

  const normalizedStops = useMemo<TrackingStop[]>(() => {
    if (!data) return [];
    const rawStops = [...(data.stops || [])].sort(
      (a, b) => Number(a.seq || 0) - Number(b.seq || 0)
    );

    const mapPickup = data.map?.points?.find((p) => p.type === 'pickup');
    const mapDropoff = data.map?.points?.find((p) => p.type !== 'pickup');
    const laneOrigin = data.shipment?.lane ? data.shipment.lane.split('→')[0]?.trim() : '';
    const laneDest = data.shipment?.lane ? data.shipment.lane.split('→')[1]?.trim() : '';

    const hasPickup = rawStops.some((s) => s.type === 'pickup');
    const hasDropoff = rawStops.some((s) => s.type === 'dropoff');
    const stops: TrackingStop[] = [...rawStops];

    // Always ensure both pickup and dropoff are present (status-independent).
    if (!hasPickup) {
      const label = (mapPickup?.label || laneOrigin || 'Pickup').trim();
      stops.unshift({
        id: mapPickup?.id || 0,
        seq: 1,
        type: 'pickup',
        company_name: label,
        address: mapPickup?.label || label,
        city: laneOrigin || null,
        lat: mapPickup?.lat != null ? Number(mapPickup.lat) : null,
        lng: mapPickup?.lng != null ? Number(mapPickup.lng) : null,
        from_date: null,
        to_date: null,
        schedule_label: null,
        completed: false,
        phone: null,
        email: null,
        lines: [],
        supplier_name: data.header?.shipper_name || '',
      });
    }

    if (!hasDropoff) {
      const label = (mapDropoff?.label || laneDest || 'Drop-off').trim();
      stops.push({
        id: mapDropoff?.id || 0,
        seq: stops.length + 1,
        type: 'dropoff',
        company_name: label,
        address: mapDropoff?.label || label,
        city: laneDest || null,
        lat: mapDropoff?.lat != null ? Number(mapDropoff.lat) : null,
        lng: mapDropoff?.lng != null ? Number(mapDropoff.lng) : null,
        from_date: data.header?.eta_at || null,
        to_date: null,
        schedule_label: data.header?.eta_at ? formatStopSchedule(data.header.eta_at) : null,
        completed: false,
        phone: null,
        email: null,
        lines: [],
        supplier_name: data.header?.shipper_name || '',
      });
    }

    // Absolute fallback when API returned no stops at all: use map points.
    if (stops.length === 0 && (data.map?.points || []).length > 0) {
      return (data.map.points || []).map((p, idx) => {
        const isPk = p.type === 'pickup';
        const label = (p.label || (isPk ? laneOrigin : laneDest) || (isPk ? 'Pickup' : 'Drop-off')).trim();
        return {
          id: p.id || idx + 1,
          seq: idx + 1,
          type: (isPk ? 'pickup' : 'dropoff') as 'pickup' | 'dropoff',
          company_name: label,
          address: p.label || label,
          city: isPk ? laneOrigin || null : laneDest || null,
          lat: p.lat != null ? Number(p.lat) : null,
          lng: p.lng != null ? Number(p.lng) : null,
          from_date: !isPk ? data.header?.eta_at || null : null,
          to_date: null,
          schedule_label: !isPk && data.header?.eta_at ? formatStopSchedule(data.header.eta_at) : null,
          completed: false,
          phone: null,
          email: null,
          lines: [],
          supplier_name: data.header?.shipper_name || '',
        };
      });
    }

    return stops.map((s, idx) => {
      const lines = (s.lines || []).filter((l) => Boolean(l.order_id || l.product_name));
      // Prefer this stop's own lines; if empty, only reuse lines that match this location id.
      const resolvedLines =
        lines.length > 0
          ? lines
          : (data.orders || [])
              .flatMap((o) => o.products || [])
              .filter((l) => s.id && Number(l.location_id) === Number(s.id));

      const cleanFromDate = (s.from_date || '').trim();
      const isInvalidFromDate =
        !cleanFromDate ||
        cleanFromDate === '0000-00-00 00:00:00' ||
        cleanFromDate === '0000-00-00' ||
        cleanFromDate === 'null' ||
        cleanFromDate === 'undefined' ||
        cleanFromDate.startsWith('0000-00-00') ||
        cleanFromDate.startsWith('00/00/0000') ||
        cleanFromDate.startsWith('00-00-0000');

      const cleanSchedLabel = (s.schedule_label || '').trim();
      const isInvalidSchedLabel =
        !cleanSchedLabel || cleanSchedLabel === 'null' || cleanSchedLabel === 'undefined';

      return {
        ...s,
        from_date: isInvalidFromDate ? null : cleanFromDate,
        schedule_label: isInvalidSchedLabel
          ? s.from_date && !isInvalidFromDate
            ? formatStopSchedule(s.from_date, s.to_date)
            : null
          : cleanSchedLabel,
        lines: resolvedLines,
        seq: idx + 1,
      };
    });
  }, [data]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  }, []);

  const copyText = useCallback(
    async (value?: string | null, toastMsg?: string) => {
      if (!value) return;
      const msg = toastMsg || t(lang, 'copied');
      try {
        await navigator.clipboard.writeText(value);
        showToast(msg);
      } catch {
        showToast(msg);
      }
    },
    [lang, showToast]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!encryptedId || !encryptedLocationIds) {
        setLoading(false);
        setError(t('en', 'notFound'));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const payload = await publicTrackingService.getTracking(
          encryptedId,
          encryptedLocationIds,
          guestFromUrl || undefined
        );
        if (cancelled) return;
        setData(payload);
        setRcptItems(payload.receipt.items || []);
        setRcptDone(payload.receipt.already_confirmed);
        setRateDone(payload.rating.already_rated);
        const last =
          payload.map?.last_position || payload.map?.live?.last_position || null;
        if (last && Number.isFinite(Number(last.lat)) && Number.isFinite(Number(last.lng))) {
          setLivePosition({ lat: Number(last.lat), lng: Number(last.lng) });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('en', 'notFound'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encryptedId, encryptedLocationIds, guestFromUrl]);

  // Live tracking socket (Laravel traking.js parity)
  useEffect(() => {
    const live = data?.map?.live;
    if (!live?.enabled || !live.shipper_id || !live.shipment_id) {
      setSocketStatus('idle');
      return;
    }

    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined) || '';
    if (!socketUrl) {
      setSocketStatus('error');
      if (import.meta.env.DEV) {
        console.warn('[PublicTracking] VITE_SOCKET_URL is not set — live GPS disabled');
      }
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;
    setSocketStatus('connecting');

    try {
      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 8,
      });

      socket.on('connect', () => {
        if (cancelled) return;
        setSocketStatus('connected');
        if (import.meta.env.DEV) {
          console.log('[PublicTracking] Socket connected', socket?.id, socketUrl);
        }

        // Laravel traking.js: join_shipper with server ack
        socket?.emit('join_shipper', { user_id: live.shipper_id }, (ack: unknown) => {
          if (cancelled) return;
          if (import.meta.env.DEV) {
            console.log('[PublicTracking] join_shipper ack:', ack);
          }
        });

        if (live.driver_id) {
          socket?.emit(
            'get_driver_last_location',
            { driver_id: live.driver_id, shipment_id: live.shipment_id },
            (response: { lat?: number; lng?: number } | null) => {
              if (cancelled) return;
              if (import.meta.env.DEV) {
                console.log('[PublicTracking] get_driver_last_location ack:', response);
              }
              if (response?.lat == null || response?.lng == null) return;
              setLivePosition({ lat: Number(response.lat), lng: Number(response.lng) });
            }
          );
        } else if (import.meta.env.DEV) {
          console.warn('[PublicTracking] live.driver_id missing — waiting for live_tracking events only');
        }
      });

      socket.on('connect_error', (err) => {
        if (cancelled) return;
        setSocketStatus('error');
        if (import.meta.env.DEV) {
          console.warn('[PublicTracking] Socket connect_error:', err.message);
        }
      });

      socket.on('disconnect', () => {
        if (cancelled) return;
        setSocketStatus('connecting');
      });

      socket.on(
        'live_tracking',
        (payload: { shipment_id?: number | string; lat?: number; lng?: number; heading?: number }) => {
          if (cancelled || payload == null) return;
          if (Number(payload.shipment_id) !== Number(live.shipment_id)) return;
          if (payload.lat == null || payload.lng == null) return;
          if (import.meta.env.DEV) {
            console.log('[PublicTracking] live_tracking:', payload);
          }
          setLivePosition({ lat: Number(payload.lat), lng: Number(payload.lng) });
        }
      );
    } catch (err) {
      setSocketStatus('error');
      if (import.meta.env.DEV) {
        console.warn('[PublicTracking] Socket init failed:', err);
      }
    }

    return () => {
      cancelled = true;
      setSocketStatus('idle');
      try {
        socket?.off('live_tracking');
        socket?.off('connect');
        socket?.off('connect_error');
        socket?.off('disconnect');
        socket?.disconnect();
      } catch {
        // ignore
      }
    };
  }, [data?.map?.live]);

  const getStickyOffset = useCallback(() => {
    const topbarH = (document.querySelector('.pt-topbar') as HTMLElement | null)?.offsetHeight || 0;
    const cmdH = (document.querySelector('.pt-cmd') as HTMLElement | null)?.offsetHeight || 0;
    const jnavH = (document.querySelector('.pt-jnav') as HTMLElement | null)?.offsetHeight || 0;
    return topbarH + cmdH + jnavH + 10;
  }, []);

  const syncStickyOffsets = useCallback(() => {
    const topbarH = (document.querySelector('.pt-topbar') as HTMLElement | null)?.offsetHeight || 0;
    const cmdH = (document.querySelector('.pt-cmd') as HTMLElement | null)?.offsetHeight || 0;
    const jnavH = (document.querySelector('.pt-jnav') as HTMLElement | null)?.offsetHeight || 0;
    document.documentElement.style.setProperty('--pt-jnav-top', `${topbarH + cmdH}px`);
    document.documentElement.style.setProperty('--pt-section-offset', `${topbarH + cmdH + jnavH + 10}px`);
  }, []);

  useEffect(() => {
    syncStickyOffsets();
    window.addEventListener('resize', syncStickyOffsets);
    return () => window.removeEventListener('resize', syncStickyOffsets);
  }, [syncStickyOffsets, data, lang, loading]);

  const jumpTo = (id: string) => {
    setActiveNav(id);
    ignoreScrollSpyUntil.current = Date.now() + 1000;

    const el = document.getElementById(id);
    if (!el) return;

    syncStickyOffsets();
    const offset = getStickyOffset();
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });

    const tab = document.querySelector(`[data-pt-nav="${id}"]`) as HTMLElement | null;
    tab?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  useEffect(() => {
    const tab = document.querySelector(`[data-pt-nav="${activeNav}"]`) as HTMLElement | null;
    tab?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeNav]);

  useEffect(() => {
    if (!data) return;

    const shipmentStatus = (data.shipment.status || '').toLowerCase();
    const isScheduledOrLater = [
      'scheduled',
      'ready',
      'past_due',
      'on_trip',
      'in_progress',
      'fullfilled',
      'fulfilled',
      'partially_fullfilled',
      'partially_fulfilled',
    ].includes(shipmentStatus);

    const hasReceipt = (data.receipt.can_confirm && isScheduledOrLater) || data.receipt.already_confirmed || rcptDone;

    const sectionIds = [
      'itinerary',
      'tracking',
      ...(hasReceipt ? ['receipt'] : []),
      'transporter',
      'order',
    ];

    const handleScroll = () => {
      if (Date.now() < ignoreScrollSpyUntil.current) return;

      const stickyOffset = getStickyOffset();
      const scrollY = window.scrollY;
      const windowH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      // 1. If at the top of the page, activate itinerary
      if (scrollY < 60) {
        setActiveNav('itinerary');
        return;
      }

      // 2. If scrolled near the bottom of the page, activate the last bottom card
      if (windowH + scrollY >= docH - 40) {
        setActiveNav((prev) => {
          if (prev === 'order') return 'order';
          if (prev === 'transporter') return 'transporter';
          if (prev === 'receipt' && hasReceipt) return 'receipt';
          return 'order';
        });
        return;
      }

      // 3. Find which section is currently dominant under sticky header
      let bestSection = '';
      let minDistance = Infinity;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();

        if (rect.bottom > stickyOffset && rect.top <= stickyOffset + 140) {
          const dist = Math.abs(rect.top - stickyOffset);
          if (dist < minDistance) {
            minDistance = dist;
            bestSection = id;
          }
        }
      }

      if (bestSection) {
        setActiveNav(bestSection);
      } else {
        let closestAbove = '';
        let closestAboveTop = -Infinity;
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= stickyOffset + 180 && rect.top > closestAboveTop) {
            closestAboveTop = rect.top;
            closestAbove = id;
          }
        }
        if (closestAbove) {
          setActiveNav(closestAbove);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [data, rcptDone, getStickyOffset]);

  const onConfirmReceipt = async () => {
    if (!data) return;
    setRcptSaving(true);
    try {
      await publicTrackingService.confirmReceipt(encryptedId, encryptedLocationIds, {
        confirmation_type: rcptType,
        reason_code: rcptType === 'partial' ? rcptReason || undefined : undefined,
        notes: rcptNotes || undefined,
        guest_email: resolvedGuestEmail || undefined,
        items: rcptItems.map((it) => ({
          location_id: it.location_id,
          order_id: it.order_id,
          ordered_qty: it.ordered_qty,
          received_qty: rcptType === 'full' ? it.ordered_qty : it.received_qty,
        })),
      });
      setRcptDone(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error');
    } finally {
      setRcptSaving(false);
    }
  };

  const onSubmitRating = async () => {
    if (!data || stars < 1) return;
    setRateSaving(true);
    try {
      await publicTrackingService.submitRating(encryptedId, encryptedLocationIds, {
        rating: stars,
        review: review || undefined,
        guest_email: resolvedGuestEmail || undefined,
      });
      setRateDone(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error');
    } finally {
      setRateSaving(false);
    }
  };

  const etaBlocked = Boolean(
    data &&
      !data.shipment.tracking_required_by_shipper &&
      (data.shipment.started_by || '') === 'carrier'
  );

  const etaOrigin = useMemo(() => {
    const last = data?.map?.last_position || data?.map?.live?.last_position || livePosition;
    if (!last) return null;
    const lat = Number(last.lat);
    const lng = Number(last.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  }, [data?.map?.last_position, data?.map?.live?.last_position, livePosition]);

  const etaDestination = useMemo(() => {
    const drops = normalizedStops.filter(
      (s) => s.type === 'dropoff' && s.lat != null && s.lng != null
    );
    const last = drops[drops.length - 1];
    if (!last) return null;
    const lat = Number(last.lat);
    const lng = Number(last.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [normalizedStops]);

  const liveEta = useLiveDropoffEta({
    blocked: etaBlocked,
    origin: etaBlocked ? null : etaOrigin,
    destination: etaBlocked ? null : etaDestination,
  });

  const fontLink = useMemo(
    () => (
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    ),
    []
  );

  if (loading) {
    return (
      <>
        {fontLink}
        <PublicTrackingSkeleton />
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="pt-page">
        {fontLink}
        <div className="pt-topbar">
          <div className="pt-topbar-inner">
            <a className="pt-logo" href="https://myvagon.com" target="_blank" rel="noreferrer">
              <img src={fullLogo} alt="MYVAGON" />
            </a>
            <div className="pt-lang">
              <button type="button" className={lang === 'en' ? 'act' : ''} onClick={() => setLang('en')}>
                EN
              </button>
              <button type="button" className={lang === 'el' ? 'act' : ''} onClick={() => setLang('el')}>
                EL
              </button>
            </div>
          </div>
        </div>
        <div className="pt-error">{error || t(lang, 'notFound')}</div>
      </div>
    );
  }

  const kindLabel =
    data.header.transporter_kind === 'freelancer' ? t(lang, 'freelancer') : t(lang, 'carrier');
  const timeline = data.timeline ?? [];
  const scheduledEtaRaw = data.header.eta_at || data.header.eta_label || '';
  const scheduledEtaParsed = parseUtcInstant(scheduledEtaRaw);
  const scheduledEtaDisplay = scheduledEtaParsed ? formatUtcToDisplayDateTime(scheduledEtaRaw) : '';
  const liveEtaDisplay = liveEta.etaAt ? formatUtcToDisplayDateTime(liveEta.etaAt) : '';
  const liveEtaParsed = liveEta.etaAt ? parseUtcInstant(liveEta.etaAt) : null;
  const showEtaUnavailable = etaBlocked;
  const shownEtaDisplay = !showEtaUnavailable && liveEtaDisplay ? liveEtaDisplay : scheduledEtaDisplay;
  const isOnTime = scheduledEtaParsed
    ? (liveEtaParsed ? liveEtaParsed.getTime() : Date.now()) <= scheduledEtaParsed.getTime()
    : Boolean(data.header.on_time);
  const isManualTrip = (data.shipment.started_by || '') === 'carrier';
  const shipmentStatus = (data.shipment.status || '').toLowerCase();
  const isScheduledOrLater = [
    'scheduled',
    'ready',
    'past_due',
    'on_trip',
    'in_progress',
    'fullfilled',
    'fulfilled',
    'partially_fullfilled',
    'partially_fulfilled',
  ].includes(shipmentStatus);
  const canShowReceipt = (data.receipt.can_confirm && isScheduledOrLater) || data.receipt.already_confirmed || rcptDone;
  const hasTransporter = Boolean(
    (data.header.transporter_name && data.header.transporter_name.trim() !== '' && data.header.transporter_name !== '—') ||
    (data.transporter?.name && data.transporter.name.trim() !== '' && data.transporter.name !== '—')
  );
  const isFulfilledForRating = [
    'fullfilled',
    'fulfilled',
    'partially_fullfilled',
    'partially_fulfilled',
  ].includes(shipmentStatus);
  // Rate transporter only after load is fulfilled — extension on the transporter card.
  const canShowRating =
    hasTransporter &&
    isFulfilledForRating &&
    (data.rating.can_rate || data.rating.already_rated || rateDone);
  const transporterName = hasTransporter
    ? (data.header.transporter_name || data.transporter?.name)
    : t(lang, 'notAssigned');
  const shipperName = data.header.shipper_name || '';
  const isLiveTracking =
    Boolean(data.map.live?.enabled) ||
    shipmentStatus === 'on_trip' ||
    shipmentStatus === 'in_progress';
  const trackingTitle = t(lang, 'liveTracking');

  return (
    <div className="pt-page">
      {fontLink}

      <div className="pt-topbar">
        <div className="pt-topbar-inner">
          <a className="pt-logo" href="https://myvagon.com" target="_blank" rel="noreferrer">
            <img src={fullLogo} alt="MYVAGON" />
          </a>
          <div className="pt-lang">
            <button type="button" className={lang === 'en' ? 'act' : ''} onClick={() => setLang('en')}>
              EN
            </button>
            <button type="button" className={lang === 'el' ? 'act' : ''} onClick={() => setLang('el')}>
              EL
            </button>
          </div>
        </div>
      </div>

      <div className="pt-cmd">
        <div className="pt-cmd-inner">
          <div className="pt-cmd-row">
            <div className="pt-cmd-main">
              <div className="pt-sid">
                <span className="pt-load-label">{t(lang, 'load')}</span>
                <span className="pt-sid-id">#{data.shipment.auto_id}</span>
                <StatusBadge status={data.shipment.status || data.shipment.status_label} size="sm" />
              </div>
              <div className="pt-fwd">
                <span className="pt-fwd-badge">{kindLabel}</span>
                <strong className={hasTransporter ? '' : 'pt-unassigned-name'}>{transporterName}</strong>
                {shipperName ? (
                  <>
                    <span className="pt-fwd-sep">{t(lang, 'onBehalf')}</span>
                    <span className="pt-cust-badge">
                      <strong>{shipperName}</strong>
                    </span>
                  </>
                ) : null}
              </div>
              {isManualTrip ? (
                <div className="pt-manual-banner">
                  <span aria-hidden>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{t(lang, 'manualTitle')}</div>
                    <div style={{ marginTop: 2 }}>{t(lang, 'manualBody')}</div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="pt-cmd-chips">
              {showEtaUnavailable ? (
                <span className="pt-chip pt-chip-muted">{t(lang, 'etaNotAvailable')}</span>
              ) : shownEtaDisplay ? (
                <>
                  <span className="pt-chip pt-chip-in">
                    {t(lang, 'eta')}: {shownEtaDisplay}
                  </span>
                  <span className={`pt-chip ${isOnTime ? 'pt-chip-ok' : 'pt-chip-wr'}`}>
                    {isOnTime ? t(lang, 'onTime') : t(lang, 'delayed')}
                  </span>
                </>
              ) : liveEta.status === 'loading' ? (
                <span className="pt-chip pt-chip-muted">{t(lang, 'eta')}: …</span>
              ) : (
                <span className="pt-chip pt-chip-muted">{t(lang, 'etaNotAvailable')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-ms-bar">
        <div className="pt-ms-card">
          <div className="pt-ms-scroll">
            <div className="pt-ms-row">
              {timeline.map((step, idx) => {
                const isLast = idx === timeline.length - 1;
                const connectorClass = timelineConnectorClass(step, isLast, data.shipment.status);
                return (
                  <div className={`pt-ms-step ${timelineStepClass(step)}`} key={`${step.key}-${idx}`}>
                    <div className="pt-ms-track">
                      <div className={`pt-ms-dot ${timelineDotClass(step)}`} />
                      {!isLast && (
                        <div
                          className={`pt-ms-connector ${
                            step.state === 'done' ? 'done' : ''
                          }`}
                        />
                      )}
                      {isLast && connectorClass === 'dashed' && (
                        <div className="pt-ms-connector dashed" />
                      )}
                    </div>
                    <div className="pt-ms-body">
                      <div className="pt-ms-label">{step.label}</div>
                      {step.highlight ? <div className="pt-ms-highlight">{step.highlight}</div> : null}
                      {step.detail ? <div className="pt-ms-detail">{step.detail}</div> : null}
                      {step.at ? (
                        <div className="pt-ms-at">
                          <p>{formatUtcToDisplayDate(step.at)}</p>
                          <p>{formatUtcToDisplayTime(step.at)}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-jnav">
        <div className="pt-jnav-main">
          {(
            [
              ['itinerary', 'itinerary', <MapPin size={13} key="i" />],
              ['tracking', 'liveTracking', <MapIcon size={13} key="t" />],
              ...(canShowReceipt ? [['receipt', 'confirmReceipt', <ClipboardCheck size={13} key="r" />]] : []),
              ['transporter', 'transporter', <Truck size={13} key="p" />],
              ['order', 'orderDetails', <Package size={13} key="o" />],
            ] as Array<[string, string, React.ReactNode]>
          ).map(([id, key, icon]) => (
            <button
              key={id}
              type="button"
              data-pt-nav={id}
              className={`pt-jn ${activeNav === id ? 'act' : ''}`}
              onClick={() => jumpTo(id)}
            >
              {icon}
              {t(lang, key)}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-wrap">
        <div className="pt-grid">
          <div>
            <div className="pt-card" id="itinerary">
              <div className="pt-card-h">
                <h3>
                  <MapPin size={15} className="pt-card-icon" />
                  {t(lang, 'itinerary')}
                  <span className="pt-count">{normalizedStops.length}</span>
                </h3>
              </div>
              <div className="pt-card-body pt-stops-body">
                {normalizedStops.length === 0 ? (
                  <div className="pt-empty">{t(lang, 'noStops')}</div>
                ) : (
                  normalizedStops.map((stop, idx) => (
                    <ItineraryStop key={`${stop.id}-${idx}`} stop={stop} index={idx} lang={lang} onCopy={copyText} />
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="pt-card" id="tracking">
              <div className="pt-card-h">
                <h3>
                  <MapIcon size={15} className="pt-card-icon" />
                  {trackingTitle}
                </h3>
              </div>
              <div className="pt-card-body">
                <TrackingLiveMap
                  data={data}
                  stops={normalizedStops}
                  lang={lang}
                  livePosition={livePosition}
                  socketStatus={socketStatus}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-bottom-grid">
            {canShowReceipt ? (
              <div className="pt-action-card pt-rcpt" id="receipt">
                <div className="pt-action-card-h pt-rcpt-h">
                  <ClipboardCheck size={16} />
                  <h3>{t(lang, 'confirmReceipt')}</h3>
                </div>
                {rcptDone ? (
                  <div className="pt-confirmed">
                    <div className="pt-confirmed-emoji" aria-hidden="true">✅</div>
                    <div className="pt-confirmed-title ok">{t(lang, 'receiptConfirmed')}</div>
                    {data.receipt.confirmation?.confirmed_at ? (
                      <div className="pt-confirmed-at">
                        {formatUtcToDisplayDateTime(data.receipt.confirmation.confirmed_at)}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="pt-action-card-body pt-rcpt-body">
                    <div className="pt-rcpt-type">
                      <button
                        type="button"
                        className={`pt-rcpt-opt ${rcptType === 'full' ? 'selected' : ''}`}
                        onClick={() => setRcptType('full')}
                      >
                        {t(lang, 'fullReceipt')}
                      </button>
                      <button
                        type="button"
                        className={`pt-rcpt-opt ${rcptType === 'partial' ? 'selected' : ''}`}
                        onClick={() => setRcptType('partial')}
                      >
                        {t(lang, 'partialReceipt')}
                      </button>
                    </div>

                    {rcptType === 'partial' ? (
                      <table className="pt-order-table pt-rcpt-table">
                        <thead>
                          <tr>
                            <th>{t(lang, 'orderId')}</th>
                            <th>{t(lang, 'item')}</th>
                            <th>{t(lang, 'ordered')}</th>
                            <th>{t(lang, 'received')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rcptItems.map((it, idx) => (
                            <tr key={`${it.location_id}-${idx}`}>
                              <td className="pt-mono">{it.order_id || '—'}</td>
                              <td>{it.product_name || '—'}</td>
                              <td>
                                {it.ordered_qty ?? '—'} {it.qty_unit}
                              </td>
                              <td>
                                <input
                                  className="pt-qty-input"
                                  type="number"
                                  min={0}
                                  value={it.received_qty ?? 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setRcptItems((prev) =>
                                      prev.map((row, i) => (i === idx ? { ...row, received_qty: val } : row))
                                    );
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}

                    {rcptType === 'partial' ? (
                      <div className="pt-reason-row">
                        {PARTIAL_REASONS.map(({ key, labelKey }) => (
                          <button
                            key={key}
                            type="button"
                            className={`pt-reason-chip ${rcptReason === key ? 'act' : ''}`}
                            onClick={() => setRcptReason(key)}
                          >
                            {t(lang, labelKey)}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <textarea
                      className="pt-textarea"
                      placeholder={t(lang, 'notes')}
                      value={rcptNotes}
                      onChange={(e) => setRcptNotes(e.target.value)}
                    />

                    <div className="pt-action-footer">
                      <button
                        type="button"
                        className="pt-btn pt-btn-ok"
                        disabled={rcptSaving || !data.receipt.can_confirm}
                        onClick={onConfirmReceipt}
                      >
                        {t(lang, 'confirmCta')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-card" id="transporter">
              <div className="pt-card-h">
                <h3>
                  <Truck size={15} className="pt-card-icon" />
                  {t(lang, 'transporter')}
                </h3>
              </div>
              <div className="pt-card-body">
                {!hasTransporter ? (
                  <div className="pt-empty-transporter">
                    <Truck size={24} className="pt-empty-transporter-icon" />
                    <p className="pt-empty-transporter-text">{t(lang, 'transporterNotAssigned')}</p>
                  </div>
                ) : (() => {
                  const tr = data.transporter;
                  const isFreelancer = tr.kind === 'freelancer' || tr.rateable_type === 'driver';
                  const hasCompanyDriver = !isFreelancer && Boolean(tr.driver_name);
                  const plates = tr.plates || [];
                  const vehicleType = tr.vehicle || data.vehicle_type || '';
                  const phone = (tr.phone || '').trim();
                  const name = tr.name || t(lang, 'notAssigned');
                  const ratingVal =
                    tr.rating != null && !Number.isNaN(Number(tr.rating))
                      ? Number(tr.rating).toFixed(1)
                      : null;
                  const tripsCount = Number.isFinite(Number(tr.trips_count))
                    ? Number(tr.trips_count)
                    : 0;
                  const driverTripsCount = Number.isFinite(Number(tr.driver_trips_count))
                    ? Number(tr.driver_trips_count)
                    : tripsCount;

                  const carrierSubParts: string[] = [];
                  if (isFreelancer || !hasCompanyDriver) {
                    carrierSubParts.push(`${t(lang, 'completedTrips')}: ${tripsCount}`);
                    if (vehicleType) {
                      carrierSubParts.push(`${t(lang, 'vehicle')}: ${vehicleType}`);
                    }
                  }

                  const driverSubParts: string[] = [];
                  driverSubParts.push(`${t(lang, 'completedTrips')}: ${driverTripsCount}`);
                  if (vehicleType) {
                    driverSubParts.push(`${t(lang, 'vehicle')}: ${vehicleType}`);
                  }

                  const showPlatesOnCarrier = isFreelancer || !hasCompanyDriver;
                  const showPlatesOnDriver = hasCompanyDriver && plates.length > 0;

                  return (
                    <div className="pt-cr-stack">
                      <div className="pt-cr-card">
                        <div className={`pt-cr-av ${isFreelancer ? 'freelancer' : 'carrier'}`}>
                          {tr.avatar ? <img src={tr.avatar} alt="" /> : initials(name)}
                        </div>
                        <div className="pt-cr-body">
                          <div className="pt-cr-top">
                            <div className="pt-cr-identity">
                              <span className="pt-cr-name">{name}</span>
                              {ratingVal ? (
                                <span className="pt-cr-rating">
                                  <Star size={11} fill="currentColor" />
                                  {ratingVal}
                                </span>
                              ) : null}
                            </div>
                            {phone ? (
                              <button
                                type="button"
                                className="pt-phone-icon-btn"
                                title={`${t(lang, 'phoneCopied')}: ${phone}`}
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(phone);
                                  } catch {
                                    /* ignore */
                                  }
                                  showToast(`${t(lang, 'phoneCopied')}: ${phone}`);
                                }}
                              >
                                <Phone size={14} />
                              </button>
                            ) : null}
                          </div>

                          {carrierSubParts.length > 0 ? (
                            <div className="pt-cr-sub">{carrierSubParts.join(' · ')}</div>
                          ) : null}

                          {showPlatesOnCarrier && plates.length > 0 ? (
                            <div className="pt-plates">
                              {plates.map((p, idx) => (
                                <span className="pt-plate" key={`${p}-${idx}`}>
                                  {idx === 0
                                    ? `${t(lang, 'vehiclePlate')}: ${p}`
                                    : `${t(lang, 'trailerPlate')}: ${p}`}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {hasCompanyDriver ? (
                        <div className="pt-cr-driver">
                          <div className="pt-cr-av driver">{initials(tr.driver_name || '')}</div>
                          <div className="pt-cr-body">
                            <div className="pt-cr-identity">
                              <span className="pt-cr-name">{tr.driver_name}</span>
                            </div>
                            <div className="pt-cr-sub">{driverSubParts.join(' · ')}</div>
                            {showPlatesOnDriver ? (
                              <div className="pt-plates">
                                <span className="pt-plate">{`${t(lang, 'vehiclePlate')}: ${plates[0]}`}</span>
                                {plates[1] ? (
                                  <span className="pt-plate">{`${t(lang, 'trailerPlate')}: ${plates[1]}`}</span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
              {canShowRating ? (
                <div className="pt-rate-extend" id="rating">
                  <div className="pt-rate-extend-h">
                    <Star size={14} />
                    <h4>{t(lang, 'rateTransporter')}</h4>
                  </div>
                  {rateDone ? (
                    <div className="pt-rate-extend-thanks">{t(lang, 'ratingThanks')}</div>
                  ) : (
                    <>
                      <div className="pt-stars pt-stars-extend">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`pt-star ${n <= stars ? 'active' : ''}`}
                            onClick={() => setStars(n)}
                            aria-label={`${n} star`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="pt-textarea"
                        placeholder={t(lang, 'reviewPh')}
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                      />
                      <div className="pt-action-footer">
                        <button
                          type="button"
                          className="pt-btn pt-btn-pr"
                          disabled={rateSaving || stars < 1 || !data.rating.can_rate}
                          onClick={onSubmitRating}
                        >
                          {t(lang, 'submitRating')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="pt-card" id="order">
              <div className="pt-card-h">
                <h3>
                  <Package size={15} className="pt-card-icon" />
                  {t(lang, 'orderDetails')}
                </h3>
              </div>
              <div className="pt-card-body">
                {data.orders.length === 0 ? (
                  <div className="pt-empty">{t(lang, 'noOrders')}</div>
                ) : (
                  data.orders.map((order) => (
                    <table className="pt-order-table" key={order.order_id}>
                      <thead>
                        <tr>
                          <th className="pt-order-header" colSpan={3}>
                            {order.order_id}
                          </th>
                        </tr>
                        <tr>
                          <th>{t(lang, 'product')}</th>
                          <th>{t(lang, 'quantity')}</th>
                          <th>{t(lang, 'weight')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.products.map((p, idx) => (
                          <tr key={`${p.location_id}-${idx}`}>
                            <td>{p.product_name || '—'}</td>
                            <td>{p.qty != null ? `${p.qty} ${p.qty_unit}` : '—'}</td>
                            <td>{p.weight != null ? `${p.weight} ${p.weight_unit}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))
                )}
                {data.vehicle_type ? (
                  <div className="pt-vehicle-box">
                    <div className="lbl">{t(lang, 'vehicleType')}</div>
                    <div className="val">{data.vehicle_type}</div>
                  </div>
                ) : null}
              </div>
            </div>
        </div>


        <div className="pt-footer">
          {t(lang, 'powered')} <strong>MYVAGON</strong>
        </div>
      </div>

      <div className={`pt-toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
};

export default PublicTrackingPage;
