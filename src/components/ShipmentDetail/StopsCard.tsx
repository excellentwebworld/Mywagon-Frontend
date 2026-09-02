import React, { useState, useMemo } from 'react';
import { MapPin, Copy, CheckCircle2, FileText, ChevronDown, ChevronUp, Loader2, X, AlertTriangle } from 'lucide-react';
import type { ShipmentStop } from '../../context/AppContext';
import { productLineVisual, type ProductLineVisual } from '../../pages/ManageShipments/utils/listingUtils';
import { CollapsibleCard } from './CollapsibleCard';

interface StopsCardProps {
  stops: ShipmentStop[];
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  onToast: (msg: string) => void;
  onViewPod?: (stop: PhysicalStop) => void;
  onRequestPod?: (stop: ShipmentStop) => void;
  requestingPodStopId?: string | number | null;
  shipmentStatus?: string;
  t: (key: string, fallback?: string) => string;
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
}

export interface PhysicalStop {
  key: string;
  rawStop: ShipmentStop;
  id: number;
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
  orders: GroupedOrder[];
  totalProductCount: number;
  totalOrderCount: number;
}

function formatStopSchedule(date?: string, timeStart?: string, timeEnd?: string): string {
  const parts: string[] = [];
  if (date) {
    parts.push(date);
  }

  const s = (timeStart || '').trim();
  const e = (timeEnd || '').trim();

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
    // Group consecutive or same physical location by type + location + address
    const normLocation = (stop.location || '').trim().toLowerCase();
    const normAddress = (stop.address || '').trim().toLowerCase();
    const normType = stop.type;
    const groupKey = `${normType}|${normLocation}|${normAddress}`;

    let physical = map.get(groupKey);
    if (!physical) {
      physical = {
        key: groupKey,
        rawStop: stop,
        id: stop.id || idx + 1,
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
        orders: [],
        totalProductCount: 0,
        totalOrderCount: 0,
      };
      map.set(groupKey, physical);
    } else {
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
    }

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
        };
        physical.orders.push(ord);
      } else {
        ord.locationStatus = mergeLocationStatus(ord.locationStatus, stop.locationStatus);
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
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] text-[#EF4444]">
        <X size={18} strokeWidth={2.5} />
      </div>
    );
  }
  if (visual === 'done-pod') {
    return (
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#E0EAFF] bg-[#F0F5FF] text-[#2876F3]">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 18 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 9.5L5.5 14L16 3" />
          <path d="M1 5.5L5.5 10L16 -1" opacity="0.6" />
        </svg>
      </div>
    );
  }
  if (visual === 'done') {
    return (
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#E0EAFF] bg-[#F0F5FF] text-[#2876F3]">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    );
  }
  return null;
}

export const StopsCard: React.FC<StopsCardProps> = ({
  stops,
  expanded,
  onToggle,
  onCopy,
  onToast,
  onViewPod,
  onRequestPod,
  requestingPodStopId = null,
  shipmentStatus,
  t,
}) => {
  const [expandedStopOrders, setExpandedStopOrders] = useState<Record<number, boolean>>({});
  const [copiedStopIndex, setCopiedStopIndex] = useState<number | null>(null);

  const normalizedStatus = (shipmentStatus || '').toLowerCase().trim();
  const canRequestPod =
    normalizedStatus === 'fullfilled' ||
    normalizedStatus === 'fulfilled' ||
    normalizedStatus === 'partially_fullfilled' ||
    normalizedStatus === 'partially_fulfilled' ||
    normalizedStatus === 'delivered';

  const physicalStops = useMemo(() => groupPhysicalStops(stops), [stops]);

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
      title={t('pickupDropoffDetails', 'Pickup/Drop-off Location Details:')}
      count={physicalStops.length}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-4 divide-y divide-[#EBEBF0]">
        {physicalStops.map((stop, idx) => {
          const isPickup = stop.type === 'pickup';
          const isOrdersExpanded = Boolean(expandedStopOrders[idx]);
          const hasMultipleItems = stop.totalProductCount > 1 || stop.totalOrderCount > 1;
          const isCopied = copiedStopIndex === idx;

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
                      ? 'bg-white text-[#18181B] border-[1.5px] border-[#18181B]'
                      : 'bg-[#18181B] text-white border-[1.5px] border-[#18181B]'
                  }`}
                  style={{ width: 26, height: 26 }}
                >
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Header: Location name in bold at the top */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[14px] font-bold text-[#18181B] leading-tight">
                      {stop.location}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Stop Type Tag */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          isPickup
                            ? 'bg-white text-[#18181B] border border-[#D4D4D8]'
                            : 'bg-[#18181B] text-white'
                        }`}
                      >
                        {isPickup ? t('pickup', 'PICKUP') : t('dropoff', 'DROPOFF')}
                      </span>

                      {formatStopSchedule(stop.date, stop.timeStart, stop.timeEnd) && (
                        <span className="text-[11px] font-semibold text-[#5E5E6E]">
                          {formatStopSchedule(stop.date, stop.timeStart, stop.timeEnd)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address below */}
                  {stop.address && (
                    <div className="text-[12px] mt-0.5 text-[#8E8E9A]">
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

                      const orderVisual = productLineVisual(
                        stop.type,
                        order.locationStatus ?? stop.locationStatus,
                        order.pod ?? stop.pod,
                        order.unableStatus ?? stop.unableStatus
                      );
                      const issueReason =
                        order.reason ||
                        stop.reason ||
                        (stop.rawStop as any)?.reason ||
                        (stop.rawStop as any)?.unable_reason ||
                        null;
                      const orderHasIssue =
                        orderVisual === 'failed' ||
                        order.unableStatus === 1 ||
                        stop.unableStatus === 1 ||
                        order.locationStatus === '6' ||
                        order.locationStatus === '4' ||
                        order.locationStatus === '8' ||
                        stop.locationStatus === '6' ||
                        stop.locationStatus === '4' ||
                        stop.locationStatus === '8' ||
                        Boolean(issueReason);

                      const isStopDone =
                        !orderHasIssue &&
                        (orderVisual === 'done' ||
                          orderVisual === 'done-pod' ||
                          stop.locationStatus === '5' ||
                          stop.locationStatus === '7' ||
                          order.locationStatus === '5' ||
                          order.locationStatus === '7' ||
                          stop.pod === '1' ||
                          order.pod === '1' ||
                          (stop.type === 'pickup' &&
                            (normalizedStatus === 'on_trip' ||
                              normalizedStatus === 'in_progress' ||
                              normalizedStatus === 'fullfilled' ||
                              normalizedStatus === 'fulfilled' ||
                              normalizedStatus === 'partially_fullfilled' ||
                              normalizedStatus === 'partially_fulfilled' ||
                              normalizedStatus === 'delivered')));

                      const effectiveVisual: ProductLineVisual = orderHasIssue
                        ? 'failed'
                        : isStopDone
                        ? ((order.pod === '1' || stop.pod === '1') ? 'done-pod' : 'done')
                        : orderVisual;

                      return (
                        <div
                          key={`${order.orderId}-${oIdx}`}
                          className={`p-2.5 rounded-xl border transition-colors ${
                            orderHasIssue
                              ? 'bg-[#FEF2F2]/30 border-[#FECACA]'
                              : 'bg-[#F8F9FA] border-[#EBEBF0] hover:border-[#DDDDE5]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              {visibleProducts.map((prod, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="flex items-center gap-2 flex-wrap text-[11px]"
                                >
                                  <span className="font-semibold font-mono text-[#18181B]">
                                    Order: {order.orderId}
                                  </span>
                                  {prod.name && prod.name !== '—' && (
                                    <>
                                      <span className="text-[#8E8E9A]">·</span>
                                      <span className="font-medium text-[#18181B]">
                                        {prod.name}
                                      </span>
                                    </>
                                  )}
                                  {(Boolean(prod.qty) || Boolean(prod.weight)) && (
                                    <>
                                      <span className="text-[#8E8E9A]">·</span>
                                      <span className="text-[#5E5E6E]">
                                        {prod.qty ? `${prod.qty} ${prod.qtyUnit || 'EUR Pallets'}` : ''}
                                        {prod.qty && prod.weight ? ' · ' : ''}
                                        {prod.weight ? `${prod.weight} ${prod.weightUnit || 'Tonnes'}` : ''}
                                      </span>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>

                            <OrderStatusIcon visual={effectiveVisual} />
                          </div>

                          {/* Issue Reason Alert in Red if present */}
                          {orderHasIssue && issueReason && (
                            <div className="mt-2.5 p-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] flex items-center gap-1.5">
                              <AlertTriangle size={14} className="shrink-0 text-[#EF4444]" />
                              <span>{issueReason}</span>
                            </div>
                          )}

                          {order.customerName && (
                            <div className="mt-1.5 pt-1.5 border-t border-black/5 text-[11px] font-semibold text-[#059669] flex items-center gap-1.5">
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
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9B51E0] hover:text-[#7C3AED] hover:underline cursor-pointer pt-0.5 transition-colors focus:outline-none"
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
                      className="mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 flex-wrap"
                      style={{
                        backgroundColor: stop.pod === '1' || (stop.podImages && stop.podImages.length > 0) ? '#ECFDF5' : '#F8FAFC',
                        borderColor: stop.pod === '1' || (stop.podImages && stop.podImages.length > 0) ? '#A7F3D0' : '#E2E8F0',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText
                          size={15}
                          className={stop.pod === '1' || (stop.podImages && stop.podImages.length > 0) ? 'text-[#059669]' : 'text-[#64748B]'}
                        />
                        <span
                          className={`text-[12px] font-bold ${
                            stop.pod === '1' || (stop.podImages && stop.podImages.length > 0)
                              ? 'text-[#065F46]'
                              : 'text-[#334155]'
                          }`}
                        >
                          POD (Proof of Delivery)
                        </span>
                        {stop.pod === '1' || (stop.podImages && stop.podImages.length > 0) ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#D1FAE5] text-[#047857]">
                            {t('uploaded', 'Uploaded')}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#F1F5F9] text-[#64748B]">
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
                            if (onRequestPod) {
                              onRequestPod(stop.rawStop);
                            } else {
                              onToast(t('podRequestedSent', 'Push notification sent to driver requesting POD'));
                            }
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
                      className="inline-flex items-center gap-1.5 text-[#9B51E0] hover:text-[#7C3AED] hover:underline cursor-pointer transition-colors active:scale-95 focus:outline-none"
                    >
                      {isCopied ? (
                        <span className="inline-flex items-center gap-1 text-[#10B981] font-bold animate-in fade-in duration-150">
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
