import React, { useState, useMemo } from 'react';
import { MapPin, Copy, CheckCircle2, FileText, ChevronDown, ChevronUp, Loader2, X, AlertTriangle } from 'lucide-react';
import type { ShipmentStop } from '../../context/AppContext';
import { productLineVisual, formatReason, type ProductLineVisual } from '../../pages/ManageShipments/utils/listingUtils';
import { CollapsibleCard } from './CollapsibleCard';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dateDisplay';

export interface ReportablePickup {
  location_id: number;
  location_name?: string | null;
  company_name?: string | null;
}

interface StopsCardProps {
  stops: ShipmentStop[];
  oldStops?: ShipmentStop[];
  isUpdatedView?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  onToast: (msg: string) => void;
  onViewPod?: (stop: PhysicalStop) => void;
  onRequestPod?: (stop: ShipmentStop) => void;
  requestingPodStopId?: string | number | null;
  shipmentStatus?: string;
  reportablePickups?: ReportablePickup[];
  onReportDelay?: (pickup: ReportablePickup) => void;
  t: (key: string, fallback?: string) => string;
}

export interface ProductDiffHighlight {
  name?: boolean;
  qty?: boolean;
  weight?: boolean;
  isNew?: boolean;
}

export interface OrderDiffHighlight {
  orderId?: boolean;
  customerName?: boolean;
  isNew?: boolean;
  products: Record<number, ProductDiffHighlight>;
}

export interface StopDiffHighlight {
  isNew?: boolean;
  /** True when any schedule part changed (compat / whole-blob fallback). */
  schedule?: boolean;
  date?: boolean;
  time?: boolean;
  timeEnd?: boolean;
  location?: boolean;
  address?: boolean;
  orders: Record<number, OrderDiffHighlight>;
}

/** Same red as edit-shipment Step2 Updated Load highlights. */
export const DIFF_RED = '#DC2626';

function normalizeDiffDate(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return raw.toLowerCase();
}

function normalizeDiffTime(value?: string | null): string {
  const raw = (value ?? '').trim();
  return raw ? raw.slice(0, 5) : '';
}

function toStopId(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function oldStopMatchesRef(oldStop: PhysicalStop, refId: number): boolean {
  if (toStopId(oldStop.id) === refId) return true;
  return (oldStop.locationIds || []).some((id) => toStopId(id) === refId);
}

export function computeStopsDiff(
  updatedPhysicalStops: PhysicalStop[],
  oldPhysicalStops: PhysicalStop[]
): Record<number, StopDiffHighlight> {
  const highlights: Record<number, StopDiffHighlight> = {};

  if (!oldPhysicalStops || oldPhysicalStops.length === 0) {
    return highlights;
  }

  const norm = (val?: string | null) => (val ?? '').trim().toLowerCase();
  const num = (val?: string | number | null) => {
    const parsed = parseFloat(String(val ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  updatedPhysicalStops.forEach((upStop, upIdx) => {
    const refId = toStopId(upStop.rawStop?.locationReferenceId);

    // 1. Match by locationReferenceId (coerce string/number ids — API often mixes both)
    let matchedOldStop: PhysicalStop | undefined =
      refId != null ? oldPhysicalStops.find((oldStop) => oldStopMatchesRef(oldStop, refId)) : undefined;

    // 2. Match by direct array index if stop types match
    if (!matchedOldStop && upIdx < oldPhysicalStops.length && oldPhysicalStops[upIdx].type === upStop.type) {
      matchedOldStop = oldPhysicalStops[upIdx];
    }

    // 3. Match by nth occurrence of same stop type (e.g. 1st pickup -> 1st pickup)
    if (!matchedOldStop) {
      const upTypeIndex = updatedPhysicalStops
        .slice(0, upIdx + 1)
        .filter((s) => s.type === upStop.type).length - 1;
      const oldOfSameType = oldPhysicalStops.filter((s) => s.type === upStop.type);
      if (upTypeIndex >= 0 && upTypeIndex < oldOfSameType.length) {
        matchedOldStop = oldOfSameType[upTypeIndex];
      }
    }

    if (!matchedOldStop) {
      // Brand-new stop: NEW badge only — same as edit Step2 (no red field paints).
      const orderHighlights: Record<number, OrderDiffHighlight> = {};
      upStop.orders.forEach((ord, oIdx) => {
        const prodHighlights: Record<number, ProductDiffHighlight> = {};
        ord.products.forEach((_, pIdx) => {
          prodHighlights[pIdx] = { isNew: true };
        });
        orderHighlights[oIdx] = { isNew: true, products: prodHighlights };
      });
      highlights[upIdx] = {
        isNew: true,
        orders: orderHighlights,
      };
      return;
    }

    const dateChanged =
      normalizeDiffDate(matchedOldStop.date) !== normalizeDiffDate(upStop.date);
    const timeChanged =
      normalizeDiffTime(matchedOldStop.timeStart) !== normalizeDiffTime(upStop.timeStart);
    const timeEndChanged =
      normalizeDiffTime(matchedOldStop.timeEnd) !== normalizeDiffTime(upStop.timeEnd);
    const scheduleChanged = dateChanged || timeChanged || timeEndChanged;

    const locationChanged = norm(matchedOldStop.location) !== norm(upStop.location);
    const addressChanged = norm(matchedOldStop.address) !== norm(upStop.address);

    const orderHighlights: Record<number, OrderDiffHighlight> = {};

    upStop.orders.forEach((upOrd, oIdx) => {
      let matchedOldOrd: GroupedOrder | undefined = upOrd.orderId && upOrd.orderId !== '—'
        ? matchedOldStop!.orders.find((o) => norm(o.orderId) === norm(upOrd.orderId))
        : undefined;

      if (!matchedOldOrd && oIdx < matchedOldStop!.orders.length) {
        matchedOldOrd = matchedOldStop!.orders[oIdx];
      }

      if (!matchedOldOrd) {
        // New order line on an existing stop: NEW badge only (matches Step2).
        const prodHighlights: Record<number, ProductDiffHighlight> = {};
        upOrd.products.forEach((_, pIdx) => {
          prodHighlights[pIdx] = { isNew: true };
        });
        orderHighlights[oIdx] = { isNew: true, products: prodHighlights };
        return;
      }

      const orderIdChanged = norm(matchedOldOrd.orderId) !== norm(upOrd.orderId);
      const customerNameChanged = norm(matchedOldOrd.customerName) !== norm(upOrd.customerName);

      const prodHighlights: Record<number, ProductDiffHighlight> = {};
      upOrd.products.forEach((upProd, pIdx) => {
        let matchedOldProd: GroupedProduct | undefined = matchedOldOrd!.products[pIdx];
        if (!matchedOldProd && upProd.name && upProd.name !== '—') {
          matchedOldProd = matchedOldOrd!.products.find((p) => norm(p.name) === norm(upProd.name));
        }

        if (!matchedOldProd) {
          prodHighlights[pIdx] = { isNew: true };
          return;
        }

        const nameChanged = norm(matchedOldProd.name) !== norm(upProd.name);
        const qtyChanged =
          num(matchedOldProd.qty) !== num(upProd.qty) ||
          norm(matchedOldProd.qtyUnit) !== norm(upProd.qtyUnit);
        const weightChanged =
          num(matchedOldProd.weight) !== num(upProd.weight) ||
          norm(matchedOldProd.weightUnit) !== norm(upProd.weightUnit);

        if (nameChanged || qtyChanged || weightChanged) {
          prodHighlights[pIdx] = {
            name: nameChanged,
            qty: qtyChanged,
            weight: weightChanged,
          };
        }
      });

      if (orderIdChanged || customerNameChanged || Object.keys(prodHighlights).length > 0) {
        orderHighlights[oIdx] = {
          orderId: orderIdChanged,
          customerName: customerNameChanged,
          products: prodHighlights,
        };
      }
    });

    if (
      scheduleChanged ||
      locationChanged ||
      addressChanged ||
      Object.keys(orderHighlights).length > 0
    ) {
      highlights[upIdx] = {
        schedule: scheduleChanged,
        date: dateChanged,
        time: timeChanged,
        timeEnd: timeEndChanged,
        location: locationChanged,
        address: addressChanged,
        orders: orderHighlights,
      };
    }
  });

  return highlights;
}

export interface GroupedProduct {
  name: string;
  qty?: number | string;
  qtyUnit?: string;
  weight?: number | string;
  weightUnit?: string;
}

export interface GroupedOrder {
  orderId: string;
  customerName?: string;
  products: GroupedProduct[];
  locationStatus?: string;
  pod?: string;
  unableStatus?: number;
  reason?: string | null;
  trackingUrl?: string | null;
}

export interface PhysicalStop {
  key: string;
  rawStop: ShipmentStop;
  id: number;
  /** All shipment location IDs merged into this physical stop. */
  locationIds: number[];
  type: 'pickup' | 'delivery';
  location: string;
  address: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  locationStatus?: string;
  pod?: string;
  podImages?: Array<{ id?: number | null; url: string }>;
  logs?: Array<{ status: string; createdAt: string }>;
  unableStatus?: number;
  reason?: string | null;
  /** Driver dropoff on-time flag: '1' on time, '0' delayed. */
  onTimeDelivery?: string | null;
  orders: GroupedOrder[];
  totalProductCount: number;
  totalOrderCount: number;
}

function formatStopSchedule(date?: string, timeStart?: string, timeEnd?: string): string {
  const parts: string[] = [];
  if (date) {
    parts.push(formatDisplayDate(date) || date);
  }

  const s = formatDisplayTime((timeStart || '').trim()) || (timeStart || '').trim();
  const e = formatDisplayTime((timeEnd || '').trim()) || (timeEnd || '').trim();

  let timeText = '';
  if (s && e && s !== e) {
    timeText = `${s} – ${e}`;
  } else if (s) {
    timeText = s;
  } else if (e) {
    timeText = e;
  }

  if (timeText) {
    parts.push(timeText);
  }

  return parts.join(' · ');
}

/** Merge driver location status when grouping rows at the same physical stop (Laravel per-line rules). */
function mergeLocationStatus(current?: string, incoming?: string): string {
  const cur = Number(current ?? 0);
  const next = Number(incoming ?? 0);
  const failed = new Set([2, 4, 6, 8]);
  const success = new Set([5, 7]);
  if (failed.has(cur) || failed.has(next)) {
    return String(failed.has(next) ? next : cur);
  }
  if (success.has(cur) || success.has(next)) {
    return String(success.has(next) ? next : cur);
  }
  return String(Math.max(cur, next));
}

function groupPhysicalStops(stops: ShipmentStop[]): PhysicalStop[] {
  const map = new Map<string, PhysicalStop>();

  stops.forEach((stop, idx) => {
    // Same place + type + schedule only (multi-product at one appointment).
    // Different time windows at the same address stay separate stops.
    const normLocation = (stop.location || '').trim().toLowerCase();
    const normAddress = (stop.address || '').trim().toLowerCase();
    const normType = stop.type;
    const normDate = (stop.date || '').trim().toLowerCase();
    const normTimeStart = (stop.timeStart || '').trim().toLowerCase();
    const groupKey = `${normType}|${normLocation}|${normAddress}|${normDate}|${normTimeStart}`;

    const stopLocationId = toStopId(stop.id) ?? idx + 1;
    let physical = map.get(groupKey);
    if (!physical) {
      physical = {
        key: groupKey,
        rawStop: stop,
        id: stopLocationId,
        locationIds: [stopLocationId],
        type: stop.type,
        location: stop.location || '—',
        address: stop.address || '',
        date: stop.date || '',
        timeStart: stop.timeStart || '',
        timeEnd: stop.timeEnd || '',
        locationStatus: stop.locationStatus ?? '0',
        pod: stop.pod ?? '0',
        podImages: stop.podImages ?? [],
        logs: stop.logs ?? [],
        unableStatus: stop.unableStatus ?? 0,
        reason: stop.reason || (stop as any).unable_reason || null,
        onTimeDelivery: stop.onTimeDelivery ?? null,
        orders: [],
        totalProductCount: 0,
        totalOrderCount: 0,
      };
      map.set(groupKey, physical);
    } else {
      if (!physical.locationIds.includes(stopLocationId)) {
        physical.locationIds.push(stopLocationId);
      }
      if (stop.podImages && stop.podImages.length > 0) {
        physical.podImages = [...(physical.podImages || []), ...stop.podImages];
      }
      physical.locationStatus = mergeLocationStatus(physical.locationStatus, stop.locationStatus);
      if (stop.reason || (stop as any).unable_reason) {
        physical.reason = stop.reason || (stop as any).unable_reason;
      }
      if (stop.unableStatus) {
        physical.unableStatus = stop.unableStatus;
      }
      // Prefer an explicit delayed/on-time report if any merged row has one
      if (stop.onTimeDelivery === '0' || stop.onTimeDelivery === '1') {
        physical.onTimeDelivery = stop.onTimeDelivery;
      } else if (physical.onTimeDelivery == null && stop.onTimeDelivery != null) {
        physical.onTimeDelivery = stop.onTimeDelivery;
      }
    }

    const stopTrackingUrl = (stop as any).tracking_url || (stop as any).trackingUrl || null;
    const customers = stop.customers || [];
    if (customers.length === 0) {
      const orderId = '—';
      let ord = physical.orders.find((o) => o.orderId === orderId);
      if (!ord) {
        ord = {
          orderId,
          customerName: '',
          products: [],
          locationStatus: stop.locationStatus ?? '0',
          pod: stop.pod ?? '0',
          unableStatus: stop.unableStatus ?? 0,
          reason: stop.reason || (stop as any).unable_reason || null,
          trackingUrl: stopTrackingUrl,
        };
        physical.orders.push(ord);
      } else {
        ord.locationStatus = mergeLocationStatus(ord.locationStatus, stop.locationStatus);
        if (!ord.trackingUrl && stopTrackingUrl) ord.trackingUrl = stopTrackingUrl;
      }
      if (ord.products.length === 0) {
        ord.products.push({
          name: 'General Cargo',
          qty: 0,
          weight: 0,
        });
        physical.totalProductCount++;
      }
    } else {
      customers.forEach((cust) => {
        const custName = cust.name && cust.name !== '—' && cust.name.toLowerCase() !== stop.location.toLowerCase() ? cust.name : '';
        (cust.orders || []).forEach((orderItem) => {
          const ordObj =
            typeof orderItem === 'string'
              ? { id: orderItem, products: 'General Cargo', qty: 0, qtyUnit: '', weight: 0, weightUnit: '' }
              : orderItem;

          const orderId = ordObj.id || '—';
          let ord = physical.orders.find(
            (o) => o.orderId === orderId
          );
          if (!ord) {
            ord = {
              orderId,
              customerName: custName,
              products: [],
              locationStatus: stop.locationStatus ?? '0',
              pod: stop.pod ?? '0',
              unableStatus: stop.unableStatus ?? 0,
              reason: stop.reason || (stop as any).unable_reason || null,
              trackingUrl: stopTrackingUrl,
            };
            physical.orders.push(ord);
          } else {
            if (!ord.customerName && custName) {
              ord.customerName = custName;
            }
            ord.locationStatus = mergeLocationStatus(ord.locationStatus, stop.locationStatus);
            if (stop.pod === '1') ord.pod = '1';
            if (stop.unableStatus) ord.unableStatus = stop.unableStatus;
            if (stop.reason || (stop as any).unable_reason) {
              ord.reason = stop.reason || (stop as any).unable_reason;
            }
            if (!ord.trackingUrl && stopTrackingUrl) {
              ord.trackingUrl = stopTrackingUrl;
            }
          }

          const prodName = ordObj.products && ordObj.products !== '—' ? ordObj.products : 'General Cargo';
          const qty = ordObj.qty || 0;
          const qtyUnit = ordObj.qtyUnit || '';
          const weight = ordObj.weight || 0;
          const weightUnit = ordObj.weightUnit || '';

          const isDuplicate = ord.products.some(
            (p) =>
              p.name === prodName &&
              Number(p.qty) === Number(qty) &&
              p.qtyUnit === qtyUnit &&
              Number(p.weight) === Number(weight) &&
              p.weightUnit === weightUnit
          );

          if (!isDuplicate) {
            ord.products.push({
              name: prodName,
              qty,
              qtyUnit,
              weight,
              weightUnit,
            });
            physical.totalProductCount++;
          }
        });
      });
    }

    physical.totalOrderCount = physical.orders.length;
  });

  return Array.from(map.values());
}

function OrderStatusIcon({ visual }: { visual: ProductLineVisual }) {
  if (visual === 'failed') {
    return (
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] text-[#EF4444]" title="Unable">
        <X size={18} strokeWidth={2.5} />
      </div>
    );
  }
  // Two ticks = pickup/dropoff completed (POD is shown separately via the green rectangle)
  if (visual === 'done-pod') {
    return (
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#E9D5FF] bg-[#F3E8FF] text-[#9B51E0]" title="Completed">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 18 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 9.5L5.5 14L16 3" />
          <path d="M1 5.5L5.5 10L16 -1" opacity="0.6" />
        </svg>
      </div>
    );
  }
  // One tick = arrived at location
  if (visual === 'done') {
    return (
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#E9D5FF] bg-[#F3E8FF] text-[#9B51E0]" title="Arrived">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    );
  }
  return null;
}

/** On-trip ticks: arrive → 1 tick, complete → 2 ticks (POD does not gate the second tick). */
function resolveStopTickVisual(
  type: 'pickup' | 'delivery',
  status?: string | number | null,
  pod?: string | number | null,
  unableStatus?: number | null,
  logs?: Array<{ status: string }>
): ProductLineVisual {
  const failedOrDefault = productLineVisual(type, status, pod, unableStatus);
  if (failedOrDefault === 'failed') return 'failed';

  const code = Number(status ?? 0);
  const logCodes = (logs || []).map((l) => Number(l.status));
  const hasComplete =
    code === 5 ||
    code === 7 ||
    logCodes.includes(5) ||
    logCodes.includes(7);
  if (hasComplete) return 'done-pod';

  const hasArrived = code === 3 || logCodes.includes(3);
  if (hasArrived) return 'done';

  return 'default';
}

export const StopsCard: React.FC<StopsCardProps> = ({
  stops,
  oldStops,
  isUpdatedView = false,
  expanded,
  onToggle,
  onCopy,
  onToast,
  onViewPod,
  onRequestPod,
  requestingPodStopId = null,
  shipmentStatus,
  reportablePickups = [],
  onReportDelay,
  t,
}) => {
  const [expandedStopOrders, setExpandedStopOrders] = useState<Record<number, boolean>>({});
  const [copiedStopIndex, setCopiedStopIndex] = useState<number | null>(null);

  const normalizedStatus = (shipmentStatus || '').toLowerCase().trim();
  const canRequestPod =
    Boolean(onRequestPod) &&
    (normalizedStatus === 'fullfilled' ||
      normalizedStatus === 'fulfilled' ||
      normalizedStatus === 'partially_fullfilled' ||
      normalizedStatus === 'partially_fulfilled' ||
      normalizedStatus === 'delivered');

  const isCanceled =
    normalizedStatus === 'canceled' || normalizedStatus === 'cancelled';

  // Canceled before trip start: keep cancel reason in the top banner only —
  // do not paint pickup/dropoff rows as failed "location problems".
  const tripHadStarted = useMemo(
    () =>
      stops.some((s) => {
        const st = Number(s.locationStatus ?? 0);
        return Number.isFinite(st) && st >= 3;
      }),
    [stops]
  );
  const suppressCancelAsStopIssue = isCanceled && !tripHadStarted;

  const physicalStops = useMemo(() => groupPhysicalStops(stops), [stops]);
  const oldPhysicalStops = useMemo(
    () => (isUpdatedView && oldStops ? groupPhysicalStops(oldStops) : []),
    [isUpdatedView, oldStops]
  );
  const diffHighlights = useMemo(() => {
    if (!isUpdatedView || oldPhysicalStops.length === 0) return {};
    return computeStopsDiff(physicalStops, oldPhysicalStops);
  }, [isUpdatedView, physicalStops, oldPhysicalStops]);

  const toggleStopOrders = (idx: number) => {
    setExpandedStopOrders((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyAddress = (stop: PhysicalStop, idx: number) => {
    const fullAddress = [stop.location, stop.address].filter(Boolean).join(', ');
    onCopy(fullAddress);
    setCopiedStopIndex(idx);
    setTimeout(() => setCopiedStopIndex(null), 2000);
  };

  return (
    <CollapsibleCard
      id="stops"
      icon={<MapPin size={15} />}
      title={t('itineraryDetails', 'Itinerary Details')}
      count={physicalStops.length}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-4 divide-y divide-[var(--border)]">
        {physicalStops.map((stop, idx) => {
          const isPickup = stop.type === 'pickup';
          const isOrdersExpanded = Boolean(expandedStopOrders[idx]);
          const hasMultipleItems = stop.totalProductCount > 1 || stop.totalOrderCount > 1;
          const isCopied = copiedStopIndex === idx;
          const delayPickup = isPickup
            ? reportablePickups.find((p) => stop.locationIds.includes(p.location_id))
            : undefined;

          const stopHl = isUpdatedView ? diffHighlights[idx] : undefined;
          // Match edit Step2: paint changed fields with DIFF_RED (#DC2626).
          const diffColor = (changed?: boolean) => (changed ? DIFF_RED : undefined);
          const dateLabel = formatDisplayDate(stop.date) || stop.date || '';
          const timeStartLabel =
            formatDisplayTime((stop.timeStart || '').trim()) || (stop.timeStart || '').trim();
          const timeEndLabel =
            formatDisplayTime((stop.timeEnd || '').trim()) || (stop.timeEnd || '').trim();
          const hasSchedule = Boolean(dateLabel || timeStartLabel || timeEndLabel);
          // Prefer granular flags (same as edit Step2). Fall back to whole-schedule only when
          // older highlights lack date/time split.
          const hasGranularSchedule =
            stopHl?.date != null || stopHl?.time != null || stopHl?.timeEnd != null;
          const scheduleDateChanged = hasGranularSchedule
            ? Boolean(stopHl?.date)
            : Boolean(stopHl?.schedule);
          const scheduleTimeChanged = hasGranularSchedule
            ? Boolean(stopHl?.time)
            : Boolean(stopHl?.schedule);
          const scheduleTimeEndChanged = hasGranularSchedule
            ? Boolean(stopHl?.timeEnd || stopHl?.time)
            : Boolean(stopHl?.schedule);

          return (
            <div
              key={stop.key || stop.id || idx}
              className="py-4 first:pt-1 last:pb-1"
            >
              <div className="flex items-start gap-3">
                {/* Stop number badge */}
                <span
                  className={`rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-2xs ${
                    isPickup
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-[1.5px] border-slate-900 dark:border-slate-400'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-[1.5px] border-slate-900 dark:border-white'
                  }`}
                  style={{ width: 26, height: 26 }}
                >
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Header: Location name in bold at the top */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div
                      className="text-[14px] font-bold leading-tight transition-colors text-slate-900 dark:text-white"
                      style={{ color: diffColor(stopHl?.location) }}
                    >
                      {stop.location}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {delayPickup && onReportDelay && (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-md text-[11px] font-semibold text-white bg-[#9B51E0] hover:bg-[#883cd1] cursor-pointer whitespace-nowrap transition-opacity shadow-xs border-0"
                          onClick={() => onReportDelay(delayPickup)}
                        >
                          {t('reportDelay', 'Report delay')}
                        </button>
                      )}

                      {/* Stop Type Tag */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          isPickup
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                        }`}
                      >
                        {isPickup ? t('pickup', 'PICKUP') : t('dropoff', 'DROPOFF')}
                      </span>

                      {/* NEW Tag for new stop (matching Step 2) */}
                      {stopHl?.isNew && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#10B981] text-white shadow-xs"
                        >
                          {t('newTag', 'NEW')}
                        </span>
                      )}

                      {hasSchedule && (
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {dateLabel ? (
                            <span
                              style={{
                                color: diffColor(scheduleDateChanged),
                                fontWeight: scheduleDateChanged ? 700 : undefined,
                              }}
                            >
                              {dateLabel}
                            </span>
                          ) : null}
                          {dateLabel && (timeStartLabel || timeEndLabel) ? (
                            <span> · </span>
                          ) : null}
                          {timeStartLabel && timeEndLabel && timeStartLabel !== timeEndLabel ? (
                            <>
                              <span
                                style={{
                                  color: diffColor(scheduleTimeChanged),
                                  fontWeight: scheduleTimeChanged ? 700 : undefined,
                                }}
                              >
                                {timeStartLabel}
                              </span>
                              <span> – </span>
                              <span
                                style={{
                                  color: diffColor(scheduleTimeEndChanged),
                                  fontWeight: scheduleTimeEndChanged ? 700 : undefined,
                                }}
                              >
                                {timeEndLabel}
                              </span>
                            </>
                          ) : timeStartLabel || timeEndLabel ? (
                            <span
                              style={{
                                color: diffColor(scheduleTimeChanged || scheduleTimeEndChanged),
                                fontWeight:
                                  scheduleTimeChanged || scheduleTimeEndChanged ? 700 : undefined,
                              }}
                            >
                              {timeStartLabel || timeEndLabel}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address below */}
                  {stop.address && (
                    <div
                      className="text-[12px] mt-0.5 transition-colors text-slate-500 dark:text-slate-400"
                      style={{
                        color: diffColor(stopHl?.address),
                        fontWeight: stopHl?.address ? 600 : undefined,
                      }}
                    >
                      {stop.address}
                    </div>
                  )}

                  {/* Orders & Products list */}
                  <div className="mt-2.5 space-y-2">
                    {stop.orders.map((order, oIdx) => {
                      if (!isOrdersExpanded && oIdx > 0) return null;

                      const visibleProducts = isOrdersExpanded
                        ? order.products
                        : oIdx === 0
                        ? order.products.slice(0, 1)
                        : [];

                      if (visibleProducts.length === 0) return null;

                      const ordHl = stopHl?.orders?.[oIdx];

                      const orderVisual = resolveStopTickVisual(
                        stop.type,
                        order.locationStatus ?? stop.locationStatus,
                        order.pod ?? stop.pod,
                        order.unableStatus ?? stop.unableStatus,
                        stop.logs
                      );
                      const issueReason =
                        order.reason ||
                        stop.reason ||
                        (stop.rawStop as any)?.reason ||
                        (stop.rawStop as any)?.unable_reason ||
                        null;
                      const hasOperationalFailure =
                        orderVisual === 'failed' ||
                        order.unableStatus === 1 ||
                        stop.unableStatus === 1 ||
                        order.locationStatus === '6' ||
                        order.locationStatus === '4' ||
                        order.locationStatus === '8' ||
                        stop.locationStatus === '6' ||
                        stop.locationStatus === '4' ||
                        stop.locationStatus === '8';
                      const orderHasIssue = suppressCancelAsStopIssue
                        ? hasOperationalFailure
                        : hasOperationalFailure || Boolean(issueReason);
                      const showIssueReason =
                        orderHasIssue &&
                        Boolean(issueReason) &&
                        !suppressCancelAsStopIssue;

                      const effectiveVisual: ProductLineVisual = orderHasIssue
                        ? 'failed'
                        : orderVisual;

                      return (
                        <div
                          key={`${order.orderId}-${oIdx}`}
                          className={`p-2.5 rounded-xl border transition-colors ${
                            orderHasIssue
                              ? 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                              : 'bg-[var(--surface-alt)] border-[var(--border)] hover:border-[var(--border-focus)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              {/* Order level header with optional NEW tag */}
                              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                <span
                                  className="font-semibold font-mono transition-colors text-[var(--text-primary)]"
                                  style={{ color: diffColor(ordHl?.orderId) }}
                                >
                                  Order: {order.orderId}
                                </span>
                                {ordHl?.isNew && !stopHl?.isNew && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-[#10B981] text-white shadow-xs">
                                    {t('newTag', 'NEW')}
                                  </span>
                                )}
                              </div>

                              {visibleProducts.map((prod, pIdx) => {
                                const prodHl = ordHl?.products?.[pIdx];

                                return (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2 flex-wrap text-[11px] pt-0.5"
                                  >
                                    {prod.name && prod.name !== '—' && (
                                      <span
                                        className="font-medium transition-colors text-[var(--text-primary)]"
                                        style={{
                                          color: diffColor(prodHl?.name),
                                          fontWeight: prodHl?.name ? 600 : undefined,
                                        }}
                                      >
                                        {prod.name}
                                      </span>
                                    )}
                                    {(Boolean(prod.qty) || Boolean(prod.weight)) && (
                                      <>
                                        {prod.name && prod.name !== '—' && (
                                          <span className="text-[var(--text-tertiary)]">·</span>
                                        )}
                                        <span className="text-[var(--text-secondary)]">
                                          {prod.qty ? (
                                            <span
                                              style={{
                                                color: diffColor(prodHl?.qty),
                                                fontWeight: prodHl?.qty ? 600 : undefined,
                                              }}
                                            >
                                              {`${prod.qty} ${prod.qtyUnit || 'EUR Pallets'}`}
                                            </span>
                                          ) : ''}
                                          {prod.qty && prod.weight ? ' · ' : ''}
                                          {prod.weight ? (
                                            <span
                                              style={{
                                                color: diffColor(prodHl?.weight),
                                                fontWeight: prodHl?.weight ? 600 : undefined,
                                              }}
                                            >
                                              {`${prod.weight} ${prod.weightUnit || 'Tonnes'}`}
                                            </span>
                                          ) : ''}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <OrderStatusIcon visual={effectiveVisual} />
                          </div>

                          {/* Issue Reason Alert in Red if present */}
                          {showIssueReason && (
                            <div className="mt-2.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                              <AlertTriangle size={14} className="shrink-0 text-red-500" />
                              <span>{formatReason(issueReason, t)}</span>
                            </div>
                          )}

                          {order.customerName && (
                            <div
                              className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                              style={{ color: diffColor(ordHl?.customerName) }}
                            >
                              <span>🏪</span>
                              <span>{order.customerName}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Expand / collapse toggle if multiple products or orders */}
                    {hasMultipleItems && (
                      <button
                        type="button"
                        onClick={() => toggleStopOrders(idx)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline cursor-pointer pt-0.5 transition-colors focus:outline-none"
                      >
                        {isOrdersExpanded ? (
                          <>
                            <ChevronUp size={13} />
                            <span>{t('showLess', 'Show less')}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={13} />
                            <span>
                              {t(
                                'showMoreOrders',
                                `+ Show ${stop.totalProductCount - 1} more order(s)/product(s)`
                              )}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* POD section on Dropoff stop directly inside the rectangle */}
                  {!isPickup && (
                    <div
                      className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 flex-wrap ${
                        stop.pod === '1' || (stop.podImages && stop.podImages.length > 0)
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200'
                          : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText
                          size={15}
                          className={stop.pod === '1' || (stop.podImages && stop.podImages.length > 0) ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)]'}
                        />
                        <span
                          className={`text-[12px] font-bold ${
                            stop.pod === '1' || (stop.podImages && stop.podImages.length > 0)
                              ? 'text-emerald-800 dark:text-emerald-200'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          POD (Proof of Delivery)
                        </span>
                        {stop.pod === '1' || (stop.podImages && stop.podImages.length > 0) ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                            {t('uploaded', 'Uploaded')}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--surface-alt)] text-[var(--text-secondary)] border border-[var(--border)]">
                            {t('notUploaded', 'Not uploaded')}
                          </span>
                        )}
                      </div>

                      {stop.pod === '1' || (stop.podImages && stop.podImages.length > 0) ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewPod) {
                              onViewPod(stop);
                            } else {
                              onToast(t('viewingPod', 'Viewing Proof of Delivery...'));
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] active:scale-95 text-white shadow-xs transition-all cursor-pointer focus:outline-none"
                        >
                          <FileText size={12} />
                          <span>{t('viewPod', 'View POD')}</span>
                        </button>
                      ) : canRequestPod ? (
                        <button
                          type="button"
                          disabled={requestingPodStopId === stop.id || requestingPodStopId === stop.rawStop?.id}
                          onClick={() => {
                            if (!onRequestPod) return;
                            onRequestPod(stop.rawStop);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 bg-[#9B51E0] hover:bg-[#8B3FE0] active:scale-95 text-white shadow-xs transition-all focus:outline-none ${
                            requestingPodStopId === stop.id || requestingPodStopId === stop.rawStop?.id
                              ? 'opacity-70 cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                        >
                          {requestingPodStopId === stop.id || requestingPodStopId === stop.rawStop?.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <FileText size={12} />
                          )}
                          <span>
                            {requestingPodStopId === stop.id || requestingPodStopId === stop.rawStop?.id
                              ? t('requesting', 'Requesting...')
                              : t('requestPod', 'Request POD')}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  )}

                  {/* Actions: Copy Address */}
                  <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(stop, idx)}
                      className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline cursor-pointer transition-colors active:scale-95 focus:outline-none"
                    >
                      {isCopied ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in duration-150">
                          <CheckCircle2 size={13} />
                          <span>{t('copied', 'Address Copied!')}</span>
                        </span>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>{t('copyAddress', 'Copy Address')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
};
