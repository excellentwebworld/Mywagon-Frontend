import React, { useState, useMemo } from 'react';
import { MapPin, Copy, CheckCircle2, Clock, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { ShipmentStop } from '../../context/AppContext';
import { CollapsibleCard } from './CollapsibleCard';

interface StopsCardProps {
  stops: ShipmentStop[];
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  onToast: (msg: string) => void;
  onViewPod?: (stop: PhysicalStop) => void;
  onRequestPod?: (stop: ShipmentStop) => void;
  onReportDelay?: (stop: ShipmentStop) => void;
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
  orders: GroupedOrder[];
  totalProductCount: number;
  totalOrderCount: number;
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
        orders: [],
        totalProductCount: 0,
        totalOrderCount: 0,
      };
      map.set(groupKey, physical);
    } else if (stop.podImages && stop.podImages.length > 0) {
      physical.podImages = [...(physical.podImages || []), ...stop.podImages];
    }

    const customers = stop.customers || [];
    if (customers.length === 0) {
      const orderId = '—';
      let ord = physical.orders.find((o) => o.orderId === orderId);
      if (!ord) {
        ord = { orderId, customerName: '', products: [] };
        physical.orders.push(ord);
      }
      ord.products.push({
        name: 'General Cargo',
        qty: 0,
        weight: 0,
      });
      physical.totalProductCount++;
    } else {
      customers.forEach((cust) => {
        const custName = cust.name && cust.name !== '—' ? cust.name : '';
        (cust.orders || []).forEach((orderItem) => {
          const ordObj =
            typeof orderItem === 'string'
              ? { id: orderItem, products: 'General Cargo', qty: 0, qtyUnit: '', weight: 0, weightUnit: '' }
              : orderItem;

          const orderId = ordObj.id || '—';
          let ord = physical.orders.find(
            (o) => o.orderId === orderId && (!custName || !o.customerName || o.customerName === custName)
          );
          if (!ord) {
            ord = { orderId, customerName: custName, products: [] };
            physical.orders.push(ord);
          } else if (!ord.customerName && custName) {
            ord.customerName = custName;
          }

          ord.products.push({
            name: ordObj.products && ordObj.products !== '—' ? ordObj.products : 'General Cargo',
            qty: ordObj.qty || 0,
            qtyUnit: ordObj.qtyUnit || '',
            weight: ordObj.weight || 0,
            weightUnit: ordObj.weightUnit || '',
          });
          physical.totalProductCount++;
        });
      });
    }

    physical.totalOrderCount = physical.orders.length;
  });

  return Array.from(map.values());
}

export const StopsCard: React.FC<StopsCardProps> = ({
  stops,
  expanded,
  onToggle,
  onCopy,
  onToast,
  onViewPod,
  onRequestPod,
  onReportDelay,
  t,
}) => {
  const [expandedStopOrders, setExpandedStopOrders] = useState<Record<number, boolean>>({});
  const [copiedStopIndex, setCopiedStopIndex] = useState<number | null>(null);

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
      <div className="space-y-0 divide-y divide-[#E4E4E8]">
        {physicalStops.map((stop, idx) => {
          const isPickup = stop.type === 'pickup';
          const isDone = stop.locationStatus === '3' || stop.locationStatus === '7' || stop.pod === '1';
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

                      <span className="text-[11px] font-semibold text-[#5E5E6E]">
                        {stop.date ? `${stop.date} · ` : ''}
                        {stop.timeStart && stop.timeEnd
                          ? `${stop.timeStart} – ${stop.timeEnd}`
                          : stop.timeStart || '08:00 – 18:00'}
                      </span>

                      {isDone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669]">
                          <CheckCircle2 size={13} />
                          <span>{t('completed', 'Completed')}</span>
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

                      return (
                        <div
                          key={`${order.orderId}-${oIdx}`}
                          className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0] transition-colors hover:border-[#DDDDE5]"
                        >
                          <div className="space-y-1.5">
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

                  {/* POD section on Dropoff stop when uploaded */}
                  {!isPickup && stop.pod === '1' && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-[#059669]" />
                        <span className="text-[12px] font-bold text-[#065F46]">
                          POD (Proof of Delivery)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#D1FAE5] text-[#047857]">
                          {t('uploaded', 'Uploaded')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onViewPod) {
                            onViewPod(stop);
                          } else {
                            onToast(t('viewingPod', 'Viewing Proof of Delivery...'));
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] active:scale-95 text-white shadow-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50"
                      >
                        <FileText size={12} />
                        <span>{t('viewPod', 'View POD')}</span>
                      </button>
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
