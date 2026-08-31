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

  const physicalStops = useMemo(() => groupPhysicalStops(stops), [stops]);

  const toggleStopOrders = (idx: number) => {
    setExpandedStopOrders((prev) => ({ ...prev, [idx]: !prev[idx] }));
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
      <div className="space-y-0">
        {physicalStops.map((stop, idx) => {
          const isPickup = stop.type === 'pickup';
          const isDone = stop.locationStatus === '3' || stop.locationStatus === '7' || stop.pod === '1';
          const isOrdersExpanded = Boolean(expandedStopOrders[idx]);
          const hasMultipleItems = stop.totalProductCount > 1 || stop.totalOrderCount > 1;

          return (
            <div
              key={stop.key || stop.id || idx}
              className="py-3.5"
              style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
            >
              <div className="flex items-start gap-3">
                {/* Stop number badge: Pickup is White with black border, Dropoff is Black with white text */}
                <span
                  className="rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5"
                  style={{
                    width: 26,
                    height: 26,
                    background: isPickup ? '#FFFFFF' : '#18181B',
                    color: isPickup ? '#18181B' : '#FFFFFF',
                    border: isPickup ? '1.5px solid #18181B' : '1.5px solid #18181B',
                  }}
                >
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Header: Location name in bold at the top */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[14px] font-bold" style={{ color: '#18181B' }}>
                      {stop.location}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Stop Type Tag: White for Pickup, Black for Dropoff */}
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                        style={{
                          background: isPickup ? '#FFFFFF' : '#18181B',
                          color: isPickup ? '#18181B' : '#FFFFFF',
                          border: isPickup ? '1px solid #D4D4D8' : 'none',
                        }}
                      >
                        {isPickup ? t('pickup', 'PICKUP') : t('dropoff', 'DROPOFF')}
                      </span>

                      <span className="text-[11px] font-semibold" style={{ color: '#5E5E6E' }}>
                        {stop.date ? `${stop.date} · ` : ''}
                        {stop.timeStart && stop.timeEnd
                          ? `${stop.timeStart} – ${stop.timeEnd}`
                          : stop.timeStart || '08:00 – 18:00'}
                      </span>

                      {isDone && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold"
                          style={{ color: '#059669' }}
                        >
                          <CheckCircle2 size={13} />
                          <span>{t('completed', 'Completed')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address below in smaller grey font */}
                  {stop.address && (
                    <div className="text-[12px] mt-0.5" style={{ color: '#8E8E9A' }}>
                      {stop.address}
                    </div>
                  )}

                  {/* Orders & Products list */}
                  <div className="mt-2.5 space-y-2">
                    {stop.orders.map((order, oIdx) => {
                      // If collapsed and this is subsequent order, hide it
                      if (!isOrdersExpanded && oIdx > 0) return null;

                      // Visible products for this order
                      const visibleProducts = isOrdersExpanded
                        ? order.products
                        : oIdx === 0
                        ? order.products.slice(0, 1)
                        : [];

                      if (visibleProducts.length === 0) return null;

                      return (
                        <div
                          key={`${order.orderId}-${oIdx}`}
                          className="p-2.5 rounded-lg"
                          style={{ background: '#F5F5F7' }}
                        >
                          {/* Products for this order */}
                          <div className="space-y-1.5">
                            {visibleProducts.map((prod, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex items-center gap-2 flex-wrap text-[11px]"
                              >
                                <span
                                  className="font-semibold font-mono"
                                  style={{ color: '#18181B' }}
                                >
                                  Order: {order.orderId}
                                </span>
                                {prod.name && prod.name !== '—' && (
                                  <>
                                    <span style={{ color: '#8E8E9A' }}>·</span>
                                    <span className="font-medium text-[#18181B]">
                                      {prod.name}
                                    </span>
                                  </>
                                )}
                                {(Boolean(prod.qty) || Boolean(prod.weight)) && (
                                  <>
                                    <span style={{ color: '#8E8E9A' }}>·</span>
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

                          {/* Customer Name underneath the order's product line(s) */}
                          {order.customerName && (
                            <div
                              className="mt-1.5 pt-1.5 border-t border-black/5 text-[11px] font-medium flex items-center gap-1.5"
                              style={{ color: '#059669' }}
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
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#9B51E0] hover:underline cursor-pointer pt-0.5"
                        style={{ background: 'none', border: 'none' }}
                      >
                        {isOrdersExpanded ? (
                          <>
                            <ChevronUp size={12} />
                            <span>{t('showLess', 'Show less')}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={12} />
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

                  {/* POD (Proof of Delivery) section on Dropoff stop when uploaded */}
                  {!isPickup && stop.pod === '1' && (
                    <div
                      className="mt-2.5 p-2 rounded-lg flex items-center justify-between gap-2 flex-wrap"
                      style={{ background: '#ECFDF5', border: '1px solid #E2E8F0' }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: '#059669' }} />
                        <span className="text-[11px] font-semibold" style={{ color: '#065F46' }}>
                          POD (Proof of Delivery)
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded font-semibold"
                          style={{
                            background: '#D1FAE5',
                            color: '#047857',
                          }}
                        >
                          {t('uploaded', 'Uploaded')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewPod) {
                              onViewPod(stop);
                            } else {
                              onToast(t('viewingPod', 'Viewing Proof of Delivery...'));
                            }
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
                          style={{ background: '#10B981', color: '#FFFFFF', border: 'none' }}
                        >
                          <FileText size={11} />
                          <span>{t('viewPod', 'View POD')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions: Copy Address */}
                  <div className="flex items-center gap-4 mt-2.5 text-[11px] font-semibold flex-wrap">
                    <button
                      type="button"
                      onClick={() => onCopy(`${stop.location}, ${stop.address}`)}
                      className="flex items-center gap-1 text-[#9B51E0] hover:underline cursor-pointer"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <Copy size={12} />
                      <span>{t('copyAddress', 'Copy Address')}</span>
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
