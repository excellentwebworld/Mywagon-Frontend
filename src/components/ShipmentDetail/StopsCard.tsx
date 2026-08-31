import React from 'react';
import { MapPin, Copy, Navigation, CheckCircle2, Clock } from 'lucide-react';
import type { ShipmentStop } from '../../context/AppContext';
import { CollapsibleCard } from './CollapsibleCard';

interface StopsCardProps {
  stops: ShipmentStop[];
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  onToast: (msg: string) => void;
  onReportDelay?: (stop: ShipmentStop) => void;
  t: (key: string, fallback?: string) => string;
}

export const StopsCard: React.FC<StopsCardProps> = ({
  stops,
  expanded,
  onToggle,
  onCopy,
  onToast,
  onReportDelay,
  t,
}) => {
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

          return (
            <div
              key={stop.id || idx}
              className="py-3"
              style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5"
                  style={{
                    width: 24,
                    height: 24,
                    background: isPickup ? '#2563EB' : '#059669',
                    color: '#fff',
                  }}
                >
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                        style={{
                          background: isPickup ? '#EFF6FF' : '#F0FDF4',
                          color: isPickup ? '#2563EB' : '#059669',
                        }}
                      >
                        {isPickup ? t('pickup', 'PICKUP') : t('delivery', 'DELIVERY')}
                      </span>

                      <span className="text-[11px] font-semibold" style={{ color: '#5E5E6E' }}>
                        {stop.date ? `${stop.date} · ` : ''}
                        {stop.timeStart && stop.timeEnd
                          ? `${stop.timeStart} – ${stop.timeEnd}`
                          : stop.timeStart || '08:00 – 18:00'}
                      </span>
                    </div>

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

                  <div
                    className="text-[14px] font-bold mt-1"
                    style={{ color: '#18181B' }}
                  >
                    {stop.location}
                  </div>

                  {stop.address && (
                    <div className="text-[12px] mt-0.5" style={{ color: '#8E8E9A' }}>
                      {stop.address}
                    </div>
                  )}

                  {/* Customer and Order items */}
                  {stop.customers && stop.customers.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {stop.customers.map((c) => (
                        <React.Fragment key={c.name}>
                          {c.orders?.map((o) => (
                            <span
                              key={o.id}
                              className="text-[11px] font-medium px-2 py-0.5 rounded"
                              style={{ background: '#F0F0F3', color: '#5E5E6E' }}
                            >
                              {o.qty ? `${o.qty} ${o.qtyUnit || 'Eur'} · ` : ''}
                              {o.weight ? `${o.weight} ${o.weightUnit || 'T'} · ` : ''}
                              {o.products || 'General Cargo'}
                            </span>
                          ))}
                          {c.orders?.map((o) => (
                            <span
                              key={`ord-${o.id}`}
                              className="text-[11px] font-medium px-2 py-0.5 rounded"
                              style={{ background: '#F0F0F3', color: '#5E5E6E' }}
                            >
                              Order: {o.id}
                            </span>
                          ))}
                          <span
                            className="text-[11px] font-medium inline-flex items-center gap-1"
                            style={{ color: '#059669' }}
                          >
                            <span>🏪</span> {c.name}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] font-semibold">
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
