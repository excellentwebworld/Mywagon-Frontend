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
  Map,
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
  parseUtcInstant,
} from '../../utils/timezone';
import fullLogo from '../../assets/logo/fullLogo.svg';
import type {
  PublicTrackingPayload,
  TrackingReceiptItem,
  TrackingStop,
  TrackingTimelineItem,
} from './types';
import { PublicTrackingSkeleton } from './PublicTrackingSkeleton';
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
  manualTitle: { en: 'Manually Executed Trip', el: 'Χειροκίνητο ταξίδι' },
  manualBody: {
    en: 'Live GPS tracking and actual route data are not available.',
    el: 'Ζωντανή παρακολούθηση GPS και πραγματική διαδρομή δεν είναι διαθέσιμα.',
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
};

const LIVE_ICON = {
  path: 'M1.71,6.484,13.3.384a3.2,3.2,0,0,1,4.35,4.26l-1.62,3.24a3.2,3.2,0,0,0,0,2.86l1.62,3.24a3.2,3.2,0,0,1-4.35,4.26l-11.59-6.1A3.2,3.2,0,0,1,1.71,6.484Z',
  fillColor: '#1f1f41',
  fillOpacity: 1,
  strokeWeight: 1,
  scale: 0.8,
  rotation: 120,
  anchor: { x: 0, y: 0 },
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
  const startTime = from ? formatUtcToDisplayTime(from) : '';
  const endTime = to ? formatUtcToDisplayTime(to) : '';

  let timeText = '';
  if (startTime && endTime && startTime !== endTime) {
    timeText = `${startTime} – ${endTime}`;
  } else if (startTime) {
    timeText = startTime;
  } else if (endTime) {
    timeText = endTime;
  }

  if (dateLine && timeText) return `${dateLine} - ${timeText}`;
  return dateLine || timeText;
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
    classes.push('done', 'success');
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

    const marker = '/track-shipment/';
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
  lang: Lang;
  livePosition: { lat: number; lng: number } | null;
}> = ({ data, lang, livePosition }) => {
  const [routeMode, setRouteMode] = useState<'suggested' | 'actual'>('suggested');
  const enrichedStops = useMemo(
    () => stopsToEnriched(data.stops, data.map.points || []),
    [data.stops, data.map.points]
  );
  const routeLegs = useRouteLegs(enrichedStops);
  const actualRoute = data.map.actual_route || [];
  const isLive = Boolean(data.map.live?.enabled);
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

  return (
    <div className="pt-map-stack">
      {showToggle ? (
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
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isPickup = stop.type === 'pickup';
  const schedule = formatStopSchedule(stop.from_date, stop.to_date) || stop.schedule_label || '';
  const lines = stop.lines || [];
  const hasMultiple = lines.length > 1;
  const visibleLines = expanded ? lines : lines.slice(0, 1);
  const addressLine = [stop.address, stop.city].filter(Boolean).join(', ');
  const copyValue = [stop.address, stop.city].filter(Boolean).join(', ');
  const supplierLabel = stop.supplier_name || '';
  const pickupPhone = isPickup ? (stop.phone || '').trim() : '';
  const pickupEmail = isPickup ? (stop.email || '').trim() : '';

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

          {/* Orders first — same order as StopsCard on shipment detail */}
          <div className="pt-stop-orders">
            {visibleLines.map((line, i) => (
              <div className="pt-order-row" key={`${line.location_id}-${i}`}>
                <div className="pt-order-row-main">
                  <div className="pt-order-row-line">
                    {line.order_id ? <span className="oid">{t(lang, 'orderLabel')}: {line.order_id}</span> : null}
                    {line.product_name ? (
                      <>
                        <span className="sep">·</span>
                        <span className="prod">{line.product_name}</span>
                      </>
                    ) : null}
                    {line.qty != null || line.weight != null ? (
                      <>
                        <span className="sep">·</span>
                        <span className="qty">
                          {line.qty != null ? `${line.qty} ${line.qty_unit || ''}`.trim() : ''}
                          {line.qty != null && line.weight != null ? ' · ' : ''}
                          {line.weight != null ? `${line.weight} ${line.weight_unit || ''}`.trim() : ''}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {supplierLabel && i === 0 ? (
                    <div className="pt-stop-supplier">
                      <span aria-hidden="true">🏪</span>
                      <span>{supplierLabel}</span>
                    </div>
                  ) : null}
                </div>
                {stop.completed ? <StopCompletedIcon /> : null}
              </div>
            ))}

            {lines.length === 0 && supplierLabel ? (
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

            {hasMultiple ? (
              <button type="button" className="pt-more-btn" onClick={() => setExpanded((v) => !v)}>
                {expanded ? (
                  <>
                    <ChevronUp size={13} />
                    {t(lang, 'showLess')}
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} />
                    {`+ ${t(lang, 'showMore')} (${lines.length - 1})`}
                  </>
                )}
              </button>
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
      setLivePosition(null);
      return;
    }

    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined) || '';
    if (!socketUrl) return;

    let cancelled = false;
    let socket: Socket | null = null;

    try {
      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 8,
      });

      socket.on('connect', () => {
        if (cancelled) return;
        socket?.emit('join_shipper', { user_id: live.shipper_id });
        if (live.driver_id) {
          socket?.emit(
            'get_driver_last_location',
            { driver_id: live.driver_id, shipment_id: live.shipment_id },
            (response: { lat?: number; lng?: number } | null) => {
              if (cancelled || response?.lat == null || response?.lng == null) return;
              setLivePosition({ lat: Number(response.lat), lng: Number(response.lng) });
            }
          );
        }
      });

      socket.on(
        'live_tracking',
        (payload: { shipment_id?: number | string; lat?: number; lng?: number; heading?: number }) => {
          if (cancelled || payload == null) return;
          if (Number(payload.shipment_id) !== Number(live.shipment_id)) return;
          if (payload.lat == null || payload.lng == null) return;
          setLivePosition({ lat: Number(payload.lat), lng: Number(payload.lng) });
        }
      );
    } catch {
      // socket optional
    }

    return () => {
      cancelled = true;
      try {
        socket?.off('live_tracking');
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

    const sectionIds = [
      'itinerary',
      'tracking',
      'transporter',
      'order',
      ...(data.receipt.can_confirm || data.receipt.already_confirmed || rcptDone ? ['receipt'] : []),
      ...(data.rating.can_rate || data.rating.already_rated || rateDone ? ['rating'] : []),
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

      // 2. If scrolled near the bottom of the page, activate receipt or rating
      if (windowH + scrollY >= docH - 40) {
        const hasReceipt = data.receipt.can_confirm || data.receipt.already_confirmed || rcptDone;
        const hasRating = data.rating.can_rate || data.rating.already_rated || rateDone;
        setActiveNav((prev) => {
          if (prev === 'rating' && hasRating) return 'rating';
          if (prev === 'receipt' && hasReceipt) return 'receipt';
          return hasReceipt ? 'receipt' : hasRating ? 'rating' : prev;
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
  }, [data, rcptDone, rateDone, getStickyOffset]);

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
  const etaRaw = data.header.eta_at || data.header.eta_label || '';
  const etaParsed = parseUtcInstant(etaRaw);
  const etaDisplay = etaParsed ? formatUtcToDisplayDateTime(etaRaw) : '';
  // Spec: Delayed if now is past scheduled dropoff ETA (upper bound), else On Time.
  const isOnTime = etaParsed ? Date.now() <= etaParsed.getTime() : Boolean(data.header.on_time);
  const isManualTrip = (data.shipment.started_by || '') === 'carrier';
  const canShowReceipt = data.receipt.can_confirm || data.receipt.already_confirmed || rcptDone;
  const canShowRating = data.rating.can_rate || data.rating.already_rated || rateDone;
  const transporterName = data.header.transporter_name || data.transporter.name || '—';
  const shipperName = data.header.shipper_name || '';
  const shipmentStatus = (data.shipment.status || '').toLowerCase();
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
                <strong>{transporterName}</strong>
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
              {etaDisplay ? (
                <span className="pt-chip pt-chip-in">
                  {t(lang, 'eta')}: {etaDisplay}
                </span>
              ) : null}
              {etaDisplay || data.header.eta_at ? (
                <span className={`pt-chip ${isOnTime ? 'pt-chip-ok' : 'pt-chip-wr'}`}>
                  {isOnTime ? t(lang, 'onTime') : t(lang, 'delayed')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-ms-bar">
        <div className="pt-ms-card">
          <div className="pt-ms-row">
            {timeline.map((step, idx) => {
              const isLast = idx === timeline.length - 1;
              const connectorClass = timelineConnectorClass(step, isLast, data.shipment.status);
              return (
                <div className={`pt-ms-step ${timelineStepClass(step)}`} key={`${step.key}-${idx}`}>
                  <div className="pt-ms-track">
                    <div className={`pt-ms-dot ${timelineDotClass(step)}`} />
                    {!isLast || connectorClass === 'dashed' ? (
                      <div className={`pt-ms-connector ${connectorClass}`} />
                    ) : null}
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

      <div className="pt-jnav">
        <div className="pt-jnav-main">
          {(
            [
              ['itinerary', 'itinerary', <MapPin size={13} key="i" />],
              ['tracking', 'liveTracking', <Map size={13} key="t" />],
              ['transporter', 'transporter', <Truck size={13} key="p" />],
              ['order', 'orderDetails', <Package size={13} key="o" />],
              ...(canShowReceipt ? [['receipt', 'confirmReceipt', <ClipboardCheck size={13} key="r" />]] : []),
              ...(canShowRating ? [['rating', 'rateTransporter', <Star size={13} key="rat" />]] : []),
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
                  <span className="pt-count">{data.stops.length}</span>
                </h3>
              </div>
              <div className="pt-card-body pt-stops-body">
                {data.stops.length === 0 ? (
                  <div className="pt-empty">{t(lang, 'noStops')}</div>
                ) : (
                  data.stops.map((stop, idx) => (
                    <ItineraryStop key={`${stop.id}-${idx}`} stop={stop} index={idx} lang={lang} onCopy={copyText} />
                  ))
                )}
              </div>
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

          <div>
            <div className="pt-card" id="tracking">
              <div className="pt-card-h">
                <h3>
                  <Map size={15} className="pt-card-icon" />
                  {trackingTitle}
                </h3>
              </div>
              <div className="pt-card-body">
                <TrackingLiveMap
                  data={data}
                  lang={lang}
                  livePosition={livePosition}
                />
              </div>
            </div>

            <div className="pt-card" id="transporter">
              <div className="pt-card-h">
                <h3>
                  <Truck size={15} className="pt-card-icon" />
                  {t(lang, 'transporter')}
                </h3>
              </div>
              <div className="pt-card-body">
                {(() => {
                  const tr = data.transporter;
                  const isFreelancer = tr.kind === 'freelancer' || tr.rateable_type === 'driver';
                  const plates = tr.plates || [];
                  const vehicleType = tr.vehicle || data.vehicle_type || '';
                  const phone = (tr.phone || '').trim();
                  const name = tr.name || '—';
                  const ratingVal =
                    tr.rating != null && !Number.isNaN(Number(tr.rating))
                      ? Number(tr.rating).toFixed(1)
                      : null;
                  const tripsCount = Number.isFinite(Number(tr.trips_count))
                    ? Number(tr.trips_count)
                    : 0;

                  const subParts: string[] = [];
                  subParts.push(`${t(lang, 'completedTrips')}: ${tripsCount}`);
                  if (vehicleType) {
                    subParts.push(`${t(lang, 'vehicle')}: ${vehicleType}`);
                  }

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
                              <span className={`pt-cr-badge ${isFreelancer ? 'freelancer' : 'carrier'}`}>
                                {isFreelancer ? t(lang, 'freelancer') : t(lang, 'carrier')}
                              </span>
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

                          <div className="pt-cr-sub">{subParts.join(' · ')}</div>

                          {plates.length > 0 ? (
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

                      {!isFreelancer && tr.driver_name ? (
                        <div className="pt-cr-driver">
                          <div className="pt-cr-av driver">{initials(tr.driver_name)}</div>
                          <div className="pt-cr-body">
                            <div className="pt-cr-identity">
                              <span className="pt-cr-name">{tr.driver_name}</span>
                              <span className="pt-cr-badge driver">{t(lang, 'companyDriver')}</span>
                            </div>
                            <div className="pt-cr-sub">
                              {[
                                t(lang, 'companyDriver'),
                                vehicleType ? `${t(lang, 'vehicle')}: ${vehicleType}` : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {(canShowReceipt || canShowRating) ? (
          <div className="pt-actions-grid">
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

            {canShowRating ? (
              <div className="pt-action-card pt-rate" id="rating">
                <div className="pt-action-card-h pt-rate-h">
                  <Star size={16} />
                  <h3>{t(lang, 'rateTransporter')}</h3>
                </div>
                {rateDone ? (
                  <div className="pt-confirmed">
                    <div className="pt-confirmed-emoji" aria-hidden="true">⭐</div>
                    <div className="pt-confirmed-title rate">{t(lang, 'ratingThanks')}</div>
                  </div>
                ) : (
                  <div className="pt-action-card-body pt-rate-body">
                    <div className="pt-rate-person">
                      <div className="pt-cr-av carrier pt-rate-av">
                        {data.rating.avatar ? (
                          <img src={data.rating.avatar} alt="" />
                        ) : (
                          initials(data.rating.transporter_name || data.transporter.name)
                        )}
                      </div>
                      <div className="pt-rate-person-meta">
                        <div className="pt-rate-person-name">
                          {data.rating.transporter_name || data.transporter.name}
                        </div>
                        {(data.rating.plates || data.transporter.plates || []).length > 0 ? (
                          <div className="pt-rate-person-plates">
                            {(data.rating.plates || data.transporter.plates || []).join(' · ')}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="pt-stars">
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
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="pt-footer">
          {t(lang, 'powered')} <strong>MYVAGON</strong>
        </div>
      </div>

      <div className={`pt-toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
};

export default PublicTrackingPage;
