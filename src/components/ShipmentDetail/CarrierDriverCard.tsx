import React from 'react';
import { Truck, Phone, MessageSquare, Star, ShieldCheck } from 'lucide-react';
import type {
  CarrierDetail,
  AssignedDriverDetail,
} from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface CarrierDriverCardProps {
  carrier: CarrierDetail | null;
  driver?: AssignedDriverDetail | null;
  expanded: boolean;
  onToggle: () => void;
  onToast: (msg: string) => void;
  onRate?: () => void;
  onOpenProfile?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const CarrierDriverCard: React.FC<CarrierDriverCardProps> = ({
  carrier,
  driver,
  expanded,
  onToggle,
  onToast,
  onRate,
  onOpenProfile,
  t,
}) => {
  if (!carrier && !driver) {
    return null;
  }

  return (
    <CollapsibleCard
      id="carrier"
      icon={<Truck size={15} />}
      title={t('carrierDriver', 'Carrier & driver')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {carrier && (
          <div
            className="flex items-start gap-3 pb-3"
            style={{ borderBottom: driver ? '1px solid #E4E4E8' : 'none' }}
          >
            {carrier.avatar ? (
              <img
                src={carrier.avatar}
                alt={carrier.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  fontSize: 14,
                  background: '#F3E8FF',
                  color: '#9B51E0',
                }}
              >
                {carrier.initials || carrier.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={onOpenProfile || (() => onToast(carrier.name))}
                    className="font-bold text-[14px] text-left hover:underline cursor-pointer"
                    style={{ color: '#18181B', background: 'none', border: 'none', padding: 0 }}
                  >
                    {carrier.name}
                  </button>

                  {carrier.rating && carrier.rating !== '—' && (
                    <span className="text-[11px] font-bold inline-flex items-center gap-0.5" style={{ color: '#9B51E0' }}>
                      <Star size={11} fill="#9B51E0" /> {carrier.rating}
                    </span>
                  )}

                  {carrier.partner && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#ECFDF5', color: '#059669' }}
                    >
                      <ShieldCheck size={10} />
                      <span>{t('partner', 'PARTNER')}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToast(`${t('calling', 'Calling')} ${carrier.name}`)}
                    title={t('call', 'Call')}
                    className="p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                    style={{ border: '1px solid #E4E4E8', color: '#5E5E6E', background: '#FFFFFF' }}
                  >
                    <Phone size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToast(`${t('message', 'Message')} ${carrier.name}`)}
                    title={t('message', 'Message')}
                    className="p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                    style={{ border: '1px solid #E4E4E8', color: '#5E5E6E', background: '#FFFFFF' }}
                  >
                    <MessageSquare size={13} />
                  </button>
                </div>
              </div>

              <div className="text-[12px] mt-0.5" style={{ color: '#8E8E9A' }}>
                {carrier.meta || 'Carrier'} · {t('verifiedCarrier', 'Verified carrier')}
              </div>

              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
                <div className="p-2 rounded-lg" style={{ background: '#F5F5F7' }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#8E8E9A' }}>
                    {t('onTimePickup', 'On-time pickup')}
                  </div>
                  <div className="text-[12px] font-bold mt-0.5" style={{ color: '#18181B' }}>
                    {carrier.onTimePickup || '98%'}
                  </div>
                </div>

                <div className="p-2 rounded-lg" style={{ background: '#F5F5F7' }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#8E8E9A' }}>
                    {t('onTimeDelivery', 'On-time delivery')}
                  </div>
                  <div className="text-[12px] font-bold mt-0.5" style={{ color: '#18181B' }}>
                    {carrier.onTimeDelivery || '96%'}
                  </div>
                </div>

                <div className="p-2 rounded-lg" style={{ background: '#F5F5F7' }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#8E8E9A' }}>
                    {t('cancelRate', 'Cancel rate')}
                  </div>
                  <div className="text-[12px] font-bold mt-0.5" style={{ color: '#18181B' }}>
                    {carrier.cancelRate || '0.5%'}
                  </div>
                </div>

                <div className="p-2 rounded-lg" style={{ background: '#F5F5F7' }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#8E8E9A' }}>
                    {t('avgPickupDelay', 'Avg delay')}
                  </div>
                  <div className="text-[12px] font-bold mt-0.5" style={{ color: '#18181B' }}>
                    {carrier.avgPickupDelay || '8m'}
                  </div>
                </div>
              </div>

              {/* License plates */}
              {carrier.plates && carrier.plates.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {carrier.plates.map((plate, pIdx) => (
                    <span
                      key={pIdx}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: '#F0F0F3',
                        color: '#18181B',
                      }}
                    >
                      {plate}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assigned driver info */}
        {driver && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              {driver.avatar ? (
                <img
                  src={driver.avatar}
                  alt={driver.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 12,
                    background: '#EFF6FF',
                    color: '#2563EB',
                  }}
                >
                  {driver.initials || driver.name.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: '#18181B' }}>
                  {driver.name}
                </div>
                <div className="text-[11px] truncate" style={{ color: '#8E8E9A' }}>
                  {t('assignedDriver', 'Assigned driver')}
                  {driver.rating && driver.rating !== '—' ? ` · ★ ${driver.rating}` : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToast(`${t('message', 'Message')} ${driver.name}`)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors hover:bg-black/5"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E8',
                color: '#5E5E6E',
              }}
            >
              {t('messageDriver', 'Message driver')}
            </button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
