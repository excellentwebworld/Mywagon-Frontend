import React, { useState } from 'react';
import { MapPin, Copy, Navigation, CheckCircle2, Clock, FileText, Send, ChevronDown, ChevronUp } from 'lucide-react';
import type { ShipmentStop } from '../../context/AppContext';
import { CollapsibleCard } from './CollapsibleCard';

interface StopsCardProps {
  stops: ShipmentStop[];
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  onToast: (msg: string) => void;
  onRequestPod?: (stop: ShipmentStop) => void;
  onReportDelay?: (stop: ShipmentStop) => void;
  t: (key: string, fallback?: string) => string;
}

export const StopsCard: React.FC<StopsCardProps> = ({
  stops,
  expanded,
  onToggle,
  onCopy,
  onToast,
  onRequestPod,
  onReportDelay,
  t,
}) => {
  // State for tracking collapsed/expanded extra items per stop
  const [expandedStopOrders, setExpandedStopOrders] = useState<Record<number, boolean>>({});

  const toggleStopOrders = (idx: number) => {
    setExpandedStopOrders((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <CollapsibleCard
      id="stops"
      icon={<MapPin size={15} />}
      title={t('stopsAppointments', 'Stops & appointments')}
      count={stops.length}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-0">
        {stops.map((stop, idx) => {
          const isPickup = stop.type === 'pickup';
          const isDone = stop.locationStatus === '3' || stop.locationStatus === '7' || stop.pod === '1';
          const isOrdersExpanded = Boolean(expandedStopOrders[idx]);

          // Flatten all orders & products across all customers in this stop
          const customerOrderEntries = (stop.customers || []).flatMap((cust) => {
            return (cust.orders || []).map((ord) => {
              const ordObj = typeof ord === 'string' ? { id: ord, products: 'General Cargo', qty: 0, qtyUnit: '', weight: 0, weightUnit: '' } : ord;
              return {
                customerName: cust.name,
                order: ordObj,
              };
            });
          });

          const hasMultipleItems = customerOrderEntries.length > 1;
          const visibleEntries = isOrdersExpanded
            ? customerOrderEntries
            : customerOrderEntries.slice(0, 1);

          return (
            <div
              key={stop.id || idx}
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
                  <div className="mt-2 space-y-1.5">
                    {visibleEntries.map((entry, eIdx) => (
                      <div
                        key={`${entry.order.id}-${eIdx}`}
                        className="p-2 rounded-lg"
                        style={{ background: '#F5F5F7' }}
                      >
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span
                            className="font-semibold"
                            style={{ fontFamily: "'JetBrains Mono', monospace", color: '#18181B' }}
                          >
                            Order: {entry.order.id}
                          </span>
                          <span style={{ color: '#8E8E9A' }}>·</span>
                          <span className="font-medium text-[#18181B]">
                            {entry.order.products || 'General Cargo'}
                          </span>
                          {(entry.order.qty || entry.order.weight) && (
                            <>
                              <span style={{ color: '#8E8E9A' }}>·</span>
                              <span className="text-[#5E5E6E]">
                                {entry.order.qty ? `${entry.order.qty} ${entry.order.qtyUnit || 'Eur'}` : ''}
                                {entry.order.qty && entry.order.weight ? ' · ' : ''}
                                {entry.order.weight ? `${entry.order.weight} ${entry.order.weightUnit || 'T'}` : ''}
                              </span>
                            </>
                          )}
                        </div>

                        {entry.customerName && (
                          <div className="mt-1 text-[10px] font-medium flex items-center gap-1" style={{ color: '#059669' }}>
                            <span>🏪</span> {entry.customerName}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Expand / collapse toggle if multiple orders/products */}
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
                              {t('showMoreOrders', `+ Show ${customerOrderEntries.length - 1} more order(s)/product(s)`)}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* POD (Proof of Delivery) section on Dropoff stop directly */}
                  {!isPickup && (
                    <div
                      className="mt-2.5 p-2 rounded-lg flex items-center justify-between gap-2 flex-wrap"
                      style={{ background: stop.pod === '1' ? '#ECFDF5' : '#F8FAFC', border: '1px solid #E2E8F0' }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: stop.pod === '1' ? '#059669' : '#64748B' }} />
                        <span className="text-[11px] font-semibold" style={{ color: stop.pod === '1' ? '#065F46' : '#334155' }}>
                          POD (Proof of Delivery)
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded font-semibold"
                          style={{
                            background: stop.pod === '1' ? '#D1FAE5' : '#F1F5F9',
                            color: stop.pod === '1' ? '#047857' : '#64748B',
                          }}
                        >
                          {stop.pod === '1' ? t('uploaded', 'Uploaded') : t('notUploaded', 'Not uploaded')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {stop.pod === '1' ? (
                          <button
                            type="button"
                            onClick={() => onToast(t('viewingPod', 'Viewing POD document…'))}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-white border border-[#CBD5E1] text-[#334155] hover:bg-slate-50 cursor-pointer"
                          >
                            {t('viewPod', 'View POD')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (onRequestPod) {
                                onRequestPod(stop);
                              } else {
                                onToast(t('podRequestedSent', 'Push request for POD sent to driver'));
                              }
                            }}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded text-white bg-[#9B51E0] hover:opacity-90 cursor-pointer"
                            style={{ border: 'none' }}
                          >
                            <Send size={11} />
                            <span>{t('requestPod', 'Request POD')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions: Copy address, Directions, Report delay */}
                  <div className="flex items-center gap-3 mt-2.5 flex-wrap text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => onCopy(stop.address || stop.location)}
                      className="flex items-center gap-1 cursor-pointer hover:underline"
                      style={{ color: '#9B51E0', background: 'none', border: 'none' }}
                    >
                      <Copy size={12} />
                      <span>{t('copyAddress', 'Copy address')}</span>
                    </button>

                    <span style={{ color: '#E4E4E8' }}>·</span>

                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            stop.address || stop.location
                          )}`,
                          '_blank'
                        )
                      }
                      className="flex items-center gap-1 cursor-pointer hover:underline"
                      style={{ color: '#9B51E0', background: 'none', border: 'none' }}
                    >
                      <Navigation size={12} />
                      <span>{t('directions', 'Directions')}</span>
                    </button>

                    {onReportDelay && isPickup && (
                      <>
                        <span style={{ color: '#E4E4E8' }}>·</span>
                        <button
                          type="button"
                          onClick={() => onReportDelay(stop)}
                          className="flex items-center gap-1 cursor-pointer hover:underline"
                          style={{ color: '#D97706', background: 'none', border: 'none' }}
                        >
                          <Clock size={12} />
                          <span>{t('reportDelay', 'Report delay')}</span>
                        </button>
                      </>
                    )}
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
