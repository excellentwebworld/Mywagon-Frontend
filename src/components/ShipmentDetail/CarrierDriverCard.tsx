import React, { useState } from 'react';
import { Truck, Phone, MessageSquare, Star, ShieldCheck } from 'lucide-react';
import type {
  CarrierDetail,
  AssignedDriverDetail,
} from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';
import { useTransporterProfileOptional } from '../TransporterProfile/TransporterProfileContext';

interface CarrierDriverCardProps {
  carrier: CarrierDetail | null;
  driver?: AssignedDriverDetail | null;
  status?: string;
  isPaid?: boolean;
  isCarrierRated?: boolean;
  isDriverRated?: boolean;
  onRateCarrier?: (carrier: CarrierDetail) => void;
  onRateDriver?: (driver: AssignedDriverDetail) => void;
  onChatCarrier?: (carrier: CarrierDetail) => void;
  onChatDriver?: (driver: AssignedDriverDetail) => void;
  expanded: boolean;
  onToggle: () => void;
  onToast: (msg: string) => void;
  onRate?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const CarrierDriverCard: React.FC<CarrierDriverCardProps> = ({
  carrier,
  driver,
  status = '',
  isPaid = false,
  isCarrierRated = false,
  isDriverRated = false,
  onRateCarrier,
  onRateDriver,
  onChatCarrier,
  onChatDriver,
  expanded,
  onToggle,
  onToast,
  onRate,
  t,
}) => {
  const { openTransporterProfile } = useTransporterProfileOptional();
  const [carrierPhoneRevealed, setCarrierPhoneRevealed] = useState(false);
  const [driverPhoneRevealed, setDriverPhoneRevealed] = useState(false);

  if (!carrier && !driver) {
    return null;
  }

  const isFreelancer =
    carrier?.userType === 'driver' ||
    carrier?.meta?.toLowerCase().includes('freelancer');

  const handleRateCarrier = onRateCarrier || (onRate ? () => carrier && onRate() : undefined);
  const handleRateDriver = onRateDriver || (onRate ? () => driver && onRate() : undefined);

  const carrierPhone = carrier?.phone || '+30 210 5551234';
  const driverPhone = driver?.phone || '+30 697 1234567';

  const handleCopyPhone = (phone: string, isCarrier = true) => {
    navigator.clipboard.writeText(phone);
    onToast(`${t('phoneCopied', 'Phone copied')}: ${phone}`);
    if (isCarrier) setCarrierPhoneRevealed(true);
    else setDriverPhoneRevealed(true);
  };

  const handleOpenProfile = (id?: number | null, type?: 'carrier' | 'driver' | null, name?: string) => {
    if (id && type) {
      openTransporterProfile({ id, type, name });
    }
  };

  const carrierPlates = carrier?.plates?.length ? carrier.plates : ['ΙΧΕ-7890', 'ΤΡ-4512'];
  const driverPlates = driver?.plates?.length ? driver.plates : ['ΙΧΕ-7890', 'ΤΡ-4512'];

  return (
    <CollapsibleCard
      id="carrier"
      icon={<Truck size={15} />}
      title={t('transporter', 'Transporter')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* If Transporter is a Freelancer */}
        {isFreelancer && carrier ? (
          <div className="flex items-start gap-3">
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
                  background: '#FEF3C7',
                  color: '#B45309',
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
                    onClick={() => handleOpenProfile(carrier.userId, 'driver', carrier.name)}
                    className="font-bold text-[14px] text-left hover:underline cursor-pointer"
                    style={{ color: '#18181B', background: 'none', border: 'none', padding: 0 }}
                  >
                    {carrier.name}
                  </button>

                  {carrier.rating && carrier.rating !== '—' && (
                    <span className="text-[11px] font-bold inline-flex items-center gap-0.5" style={{ color: '#9B51E0' }}>
                      <Star size={11} fill="#9B51E0" /> {carrier.rating} ({carrier.tripsCount || 85})
                    </span>
                  )}

                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: '#FEF3C7', color: '#B45309' }}
                  >
                    {t('freelancer', 'Freelancer')}
                  </span>

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

                {/* Email, Message, Copy Phone, Rate Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {handleRateCarrier && !isCarrierRated && (
                    <button
                      type="button"
                      onClick={() => handleRateCarrier(carrier)}
                      title={t('rateCarrierCompany', 'Rate the Carrier Company')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-sm"
                      style={{ background: '#9B51E0' }}
                    >
                      <Star size={11} fill="#fff" />
                      <span>{t('rate', 'Rate')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onChatCarrier
                        ? onChatCarrier(carrier)
                        : onToast(`${t('message', 'Message')} ${carrier.name}`)
                    }
                    title={t('message', 'Message')}
                    className="p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                    style={{ border: '1px solid #E4E4E8', color: '#5E5E6E', background: '#FFFFFF' }}
                  >
                    <MessageSquare size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyPhone(carrierPhone, true)}
                    title={t('copyPhone', 'Click to copy phone')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold hover:bg-black/5 transition-colors cursor-pointer"
                    style={{ border: '1px solid #E4E4E8', color: '#5E5E6E', background: '#FFFFFF' }}
                  >
                    <Phone size={12} />
                    <span>{carrierPhoneRevealed ? carrierPhone : t('phone', 'Phone')}</span>
                  </button>
                </div>
              </div>

              <div className="text-[12px] mt-0.5" style={{ color: '#8E8E9A' }}>
                {t('completedTrips', 'Completed trips')}: <strong>{carrier.tripsCount || 85}</strong> · Semi-Trailer Truck
              </div>

              {/* License plates: Vehicle + Trailer */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {carrierPlates.map((plate, pIdx) => (
                  <span
                    key={pIdx}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      background: '#F0F0F3',
                      color: '#18181B',
                    }}
                  >
                    {pIdx === 0 ? `Vehicle: ${plate}` : `Trailer: ${plate}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Carrier Company Rectangle */
          carrier && (
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
                      onClick={() => handleOpenProfile(carrier.userId, 'carrier', carrier.name)}
                      className="font-bold text-[14px] text-left hover:underline cursor-pointer"
                      style={{ color: '#18181B', background: 'none', border: 'none', padding: 0 }}
                    >
                      {carrier.name}
                    </button>

                    {carrier.rating && carrier.rating !== '—' && (
                      <span className="text-[11px] font-bold inline-flex items-center gap-0.5" style={{ color: '#9B51E0' }}>
                        <Star size={11} fill="#9B51E0" /> {carrier.rating} ({carrier.tripsCount || 142})
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

                  {/* Buttons: Rate, Message, Copy Phone */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {handleRateCarrier && !isCarrierRated && (
                      <button
                        type="button"
                        onClick={() => handleRateCarrier(carrier)}
                        title={t('rateCarrierCompany', 'Rate the Carrier Company')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-sm"
                        style={{ background: '#9B51E0' }}
                      >
                        <Star size={11} fill="#fff" />
                        <span>{t('rate', 'Rate')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onChatCarrier
                          ? onChatCarrier(carrier)
                          : onToast(`${t('message', 'Message')} ${carrier.name}`)
                      }
                      title={t('message', 'Message')}
                      className="p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                      style={{ border: '1px solid #E4E4E8', color: '#5E5E6E', background: '#FFFFFF' }}
                    >
                      <MessageSquare size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(carrierPhone, true)}
                      title={t('copyPhone', 'Click to copy phone')}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold hover:bg-black/5 transition-colors cursor-pointer"
                      style={{ border: '1px solid #E4E4E8', color: '#5E5E6E', background: '#FFFFFF' }}
                    >
                      <Phone size={12} />
                      <span>{carrierPhoneRevealed ? carrierPhone : t('phone', 'Phone')}</span>
                    </button>
                  </div>
                </div>

                <div className="text-[12px] mt-0.5" style={{ color: '#8E8E9A' }}>
                  Carrier Company · {carrier.tripsCount || 240} completed trips
                </div>

                {/* 3-4 Performance Metrics */}
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

                {/* License plates: Vehicle + Trailer */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {carrierPlates.map((plate, pIdx) => (
                    <span
                      key={pIdx}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: '#F0F0F3',
                        color: '#18181B',
                      }}
                    >
                      {pIdx === 0 ? `Vehicle: ${plate}` : `Trailer: ${plate}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* Company Driver (Nested inside Carrier Company) */}
        {!isFreelancer && driver && (
          <div className="flex items-center justify-between gap-3 pt-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex-wrap">
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
                <div className="text-[13px] font-semibold text-[#18181B] flex items-center gap-1.5">
                  <span>{driver.name}</span>
                  {driver.rating && driver.rating !== '—' && (
                    <span className="text-[11px] font-semibold text-[#9B51E0] inline-flex items-center gap-0.5">
                      <Star size={10} fill="#9B51E0" /> {driver.rating} ({driver.tripsCount || 85})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Company Driver · {driver.tripsCount || 120} trips completed · Vehicle: {driverPlates[0] || 'ΙΧΕ-7890'} · Trailer: {driverPlates[1] || 'ΤΡ-4512'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {handleRateDriver && !isDriverRated && (
                <button
                  type="button"
                  onClick={() => handleRateDriver(driver)}
                  title={t('rateTheDriver', 'Rate the Driver')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-sm"
                  style={{ background: '#9B51E0' }}
                >
                  <Star size={11} fill="#fff" />
                  <span>{t('rate', 'Rate')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopyPhone(driverPhone, false)}
                title={t('copyPhone', 'Click to copy phone')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-[#CBD5E1] text-[#334155] hover:bg-slate-50 cursor-pointer"
              >
                <Phone size={12} />
                <span>{driverPhoneRevealed ? driverPhone : t('phone', 'Phone')}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChatDriver
                    ? onChatDriver(driver)
                    : onToast(`${t('message', 'Message')} ${driver.name}`)
                }
                title={t('message', 'Message')}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-[#CBD5E1] text-[#334155] hover:bg-slate-50 cursor-pointer"
              >
                {t('message', 'Message')}
              </button>
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
