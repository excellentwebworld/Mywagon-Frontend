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
  const [carrierPhoneCopied, setCarrierPhoneCopied] = useState(false);
  const [driverPhoneCopied, setDriverPhoneCopied] = useState(false);

  if (!carrier && !driver) {
    return null;
  }

  const isFreelancer =
    carrier?.userType === 'driver' ||
    carrier?.meta?.toLowerCase().includes('freelancer');

  const normalizedStatus = (status || '').toLowerCase();
  const isCompleted = [
    'fullfilled',
    'partially_fullfilled',
    'not_fullfilled',
    'unfullfilled',
    'canceled',
    'delivered',
  ].includes(normalizedStatus);

  // In Laravel shipper panel: Rate button only displays on ended/completed loads when not yet rated
  const handleRateCarrier = onRateCarrier || (onRate ? () => carrier && onRate() : undefined);
  const handleRateDriver = onRateDriver || (onRate ? () => driver && onRate() : undefined);
  const canRateCarrier = isCompleted && Boolean(handleRateCarrier) && !isCarrierRated;
  const canRateDriver = isCompleted && Boolean(handleRateDriver) && !isDriverRated;

  // In Laravel shipper panel: Chat button displays on active trips (scheduled, ready, past_due, on_trip, or fulfilled when unpaid)
  const canChat =
    normalizedStatus === 'scheduled' ||
    normalizedStatus === 'ready' ||
    normalizedStatus === 'past_due' ||
    normalizedStatus === 'on_trip' ||
    normalizedStatus === 'in_progress' ||
    ((normalizedStatus === 'fullfilled' || normalizedStatus === 'partially_fullfilled') && !isPaid);

  const carrierPhone = carrier?.phone || '+30 210 5551234';
  const driverPhone = driver?.phone || '+30 697 1234567';

  const handleCopyPhone = (phone: string, isCarrier = true) => {
    navigator.clipboard.writeText(phone);
    onToast(`${t('phoneCopied', 'Phone copied')}: ${phone}`);
    if (isCarrier) {
      setCarrierPhoneCopied(true);
      setTimeout(() => setCarrierPhoneCopied(false), 2000);
    } else {
      setDriverPhoneCopied(true);
      setTimeout(() => setDriverPhoneCopied(false), 2000);
    }
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
      <div className="space-y-4">
        {/* If Transporter is a Freelancer */}
        {isFreelancer && carrier ? (
          <div className="flex items-start gap-3.5">
            {carrier.avatar ? (
              <img
                src={carrier.avatar}
                alt={carrier.name}
                className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-amber-100 shadow-2xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[14px] bg-[#FEF3C7] text-[#B45309] flex-shrink-0 shadow-2xs">
                {carrier.initials || carrier.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile(carrier.userId, 'driver', carrier.name)}
                    className="font-bold text-[14px] text-[#18181B] hover:text-[#9B51E0] hover:underline cursor-pointer transition-colors focus:outline-none"
                  >
                    {carrier.name}
                  </button>

                  {carrier.rating && carrier.rating !== '—' && (
                    <span className="text-[11px] font-bold text-[#9B51E0] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#F8F7FC] border border-[#E9D5FF]">
                      <Star size={11} fill="#9B51E0" /> {carrier.rating} ({carrier.tripsCount || 85})
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">
                    {t('freelancer', 'Freelancer')}
                  </span>

                  {carrier.partner && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                      <ShieldCheck size={11} />
                      <span>{t('partner', 'PARTNER')}</span>
                    </span>
                  )}
                </div>

                {/* Rate, Message, Copy Phone Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {canRateCarrier && (
                    <button
                      type="button"
                      onClick={() => handleRateCarrier?.(carrier)}
                      title={t('rateTheDriver', 'Rate the Driver')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#9B51E0] hover:bg-[#883cd1] active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                    >
                      <Star size={12} fill="#fff" />
                      <span>{t('rate', 'Rate')}</span>
                    </button>
                  )}

                  {canChat && (
                    <button
                      type="button"
                      onClick={() =>
                        onChatCarrier
                          ? onChatCarrier(carrier)
                          : onToast(`${t('message', 'Message')} ${carrier.name}`)
                      }
                      title={t('message', 'Message')}
                      className="p-1.5 rounded-lg bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                    >
                      <MessageSquare size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyPhone(carrierPhone, true)}
                    title={t('copyPhone', 'Click to copy phone')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                  >
                    <Phone size={12} />
                    <span>{carrierPhoneCopied ? t('copied', 'Copied!') : carrierPhone}</span>
                  </button>
                </div>
              </div>

              <div className="text-[12px] mt-1 text-[#8E8E9A]">
                {t('completedTrips', 'Completed trips')}: <strong className="text-[#18181B]">{carrier.tripsCount || 85}</strong> · Semi-Trailer Truck
              </div>

              {/* License plates */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {carrierPlates.map((plate, pIdx) => (
                  <span
                    key={pIdx}
                    className="text-[11px] font-semibold font-mono px-2.5 py-1 rounded-md bg-[#F0F0F3] text-[#18181B] border border-[#E4E4E8]"
                  >
                    {pIdx === 0 ? `Vehicle: ${plate}` : `Trailer: ${plate}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Carrier Company Block */
          carrier && (
            <div className={`flex items-start gap-3.5 ${driver ? 'pb-4 border-b border-[#E4E4E8]' : ''}`}>
              {carrier.avatar ? (
                <img
                  src={carrier.avatar}
                  alt={carrier.name}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-purple-100 shadow-2xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[14px] bg-[#F3E8FF] text-[#9B51E0] flex-shrink-0 shadow-2xs">
                  {carrier.initials || carrier.name.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(carrier.userId, 'carrier', carrier.name)}
                      className="font-bold text-[14px] text-[#18181B] hover:text-[#9B51E0] hover:underline cursor-pointer transition-colors focus:outline-none"
                    >
                      {carrier.name}
                    </button>

                    {carrier.rating && carrier.rating !== '—' && (
                      <span className="text-[11px] font-bold text-[#9B51E0] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#F8F7FC] border border-[#E9D5FF]">
                        <Star size={11} fill="#9B51E0" /> {carrier.rating} ({carrier.tripsCount || 142})
                      </span>
                    )}

                    {carrier.partner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                        <ShieldCheck size={11} />
                        <span>{t('partner', 'PARTNER')}</span>
                      </span>
                    )}
                  </div>

                  {/* Buttons: Rate, Message, Copy Phone */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {canRateCarrier && (
                      <button
                        type="button"
                        onClick={() => handleRateCarrier?.(carrier)}
                        title={t('rateCarrierCompany', 'Rate the Carrier Company')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#9B51E0] hover:bg-[#883cd1] active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                      >
                        <Star size={12} fill="#fff" />
                        <span>{t('rate', 'Rate')}</span>
                      </button>
                    )}

                    {canChat && (
                      <button
                        type="button"
                        onClick={() =>
                          onChatCarrier
                            ? onChatCarrier(carrier)
                            : onToast(`${t('message', 'Message')} ${carrier.name}`)
                        }
                        title={t('message', 'Message')}
                        className="p-1.5 rounded-lg bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                      >
                        <MessageSquare size={14} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyPhone(carrierPhone, true)}
                      title={t('copyPhone', 'Click to copy phone')}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                    >
                      <Phone size={12} />
                      <span>{carrierPhoneCopied ? t('copied', 'Copied!') : carrierPhone}</span>
                    </button>
                  </div>
                </div>

                <div className="text-[12px] mt-1 text-[#8E8E9A]">
                  Carrier Company · {carrier.tripsCount || 240} completed trips
                </div>

                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E9A]">
                      {t('onTimePickup', 'On-time pickup')}
                    </div>
                    <div className="text-[13px] font-bold text-[#18181B] mt-0.5">
                      {carrier.onTimePickup || '98%'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E9A]">
                      {t('onTimeDelivery', 'On-time delivery')}
                    </div>
                    <div className="text-[13px] font-bold text-[#18181B] mt-0.5">
                      {carrier.onTimeDelivery || '96%'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E9A]">
                      {t('cancelRate', 'Cancel rate')}
                    </div>
                    <div className="text-[13px] font-bold text-[#18181B] mt-0.5">
                      {carrier.cancelRate || '0.5%'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E9A]">
                      {t('avgPickupDelay', 'Avg delay')}
                    </div>
                    <div className="text-[13px] font-bold text-[#18181B] mt-0.5">
                      {carrier.avgPickupDelay || '8m'}
                    </div>
                  </div>
                </div>

                {/* License plates */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {carrierPlates.map((plate, pIdx) => (
                    <span
                      key={pIdx}
                      className="text-[11px] font-semibold font-mono px-2.5 py-1 rounded-md bg-[#F0F0F3] text-[#18181B] border border-[#E4E4E8]"
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
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                {driver.avatar ? (
                  <img
                    src={driver.avatar}
                    alt={driver.name}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-blue-100 shadow-2xs"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[14px] bg-[#EFF6FF] text-[#2563EB] flex-shrink-0 shadow-2xs">
                    {driver.initials || driver.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(driver.userId, 'driver', driver.name)}
                      className="font-bold text-[14px] text-[#18181B] hover:text-[#9B51E0] hover:underline cursor-pointer transition-colors focus:outline-none"
                    >
                      {driver.name}
                    </button>

                    {driver.rating && driver.rating !== '—' && (
                      <span className="text-[11px] font-bold text-[#9B51E0] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#F8F7FC] border border-[#E9D5FF]">
                        <Star size={11} fill="#9B51E0" /> {driver.rating} ({driver.tripsCount ?? 22})
                      </span>
                    )}

                    {driver.partner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                        <ShieldCheck size={11} />
                        <span>{t('partner', 'PARTNER')}</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[12px] mt-1 text-[#64748B]">
                    {t('companyDriver', 'Company Driver')} · {driver.tripsCount ?? 22} {t('tripsCompleted', 'trips completed')}
                    {driver.vehicleType ? ` · ${driver.vehicleType}` : ' · Semi-Trailer Truck'}
                    {driver.cargoSpecs ? ` · ${driver.cargoSpecs}` : ''}
                  </div>

                  {/* License plates */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {driverPlates.map((plate, pIdx) => (
                      <span
                        key={pIdx}
                        className="text-[11px] font-semibold font-mono px-2.5 py-1 rounded-md bg-[#F0F0F3] text-[#18181B] border border-[#E4E4E8]"
                      >
                        {pIdx === 0 ? `Vehicle: ${plate}` : `Trailer: ${plate}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {canRateDriver && (
                  <button
                    type="button"
                    onClick={() => handleRateDriver?.(driver)}
                    title={t('rateTheDriver', 'Rate the Driver')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#9B51E0] hover:bg-[#883cd1] active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                  >
                    <Star size={12} fill="#fff" />
                    <span>{t('rate', 'Rate')}</span>
                  </button>
                )}

                {canChat && (
                  <button
                    type="button"
                    onClick={() =>
                      onChatDriver
                        ? onChatDriver(driver)
                        : onToast(`${t('message', 'Message')} ${driver.name}`)
                    }
                    title={t('message', 'Message')}
                    className="p-1.5 rounded-lg bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                  >
                    <MessageSquare size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCopyPhone(driverPhone, false)}
                  title={t('copyPhone', 'Click to copy phone')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                >
                  <Phone size={12} />
                  <span>{driverPhoneCopied ? t('copied', 'Copied!') : driverPhone}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
