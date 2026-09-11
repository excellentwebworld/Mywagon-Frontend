import React, { useState } from 'react';
import { Truck, Phone, MessageSquare, Star, ShieldCheck, Check } from 'lucide-react';
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

function UserRatingBadge({
  rating,
  t,
}: {
  rating: number;
  t: (key: string, fallback?: string) => string;
}) {
  const stars = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
      title={t('yourRating', 'Your rating')}
    >
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={12}
            className={n <= stars ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}
            fill={n <= stars ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      <span>{stars}/5</span>
    </span>
  );
}

function RatingPill({ rating, ratingCount }: { rating?: string | null; ratingCount?: number | null }) {
  const value = rating && rating !== '—' ? rating : '0.0';
  return (
    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
      <Star size={11} fill="currentColor" /> {value}
      {ratingCount != null && Number.isFinite(Number(ratingCount)) ? ` (${ratingCount})` : ''}
    </span>
  );
}

function PhoneIconButton({
  phone,
  copied,
  onCopy,
  t,
}: {
  phone: string;
  copied: boolean;
  onCopy: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? t('copied', 'Copied!') : `${t('copyPhone', 'Click to copy phone')}: ${phone}`}
      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Phone size={14} />}
    </button>
  );
}

function PlateTags({ plates }: { plates: string[] }) {
  if (!plates.length) return null;
  return (
    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
      {plates.map((plate, pIdx) => (
        <span
          key={`${plate}-${pIdx}`}
          className="text-[11px] font-semibold font-mono px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
        >
          {pIdx === 0 ? `Vehicle: ${plate}` : `Trailer: ${plate}`}
        </span>
      ))}
    </div>
  );
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

  const handleRateCarrier = onRateCarrier || (onRate ? () => carrier && onRate() : undefined);
  const handleRateDriver = onRateDriver || (onRate ? () => driver && onRate() : undefined);
  const canRateCarrier =
    isCompleted && Boolean(handleRateCarrier) && !isCarrierRated && !(isFreelancer && isDriverRated);
  const canRateDriver = isCompleted && Boolean(handleRateDriver) && !isDriverRated;
  const carrierGivenRating =
    carrier?.userRating != null && !Number.isNaN(Number(carrier.userRating))
      ? Number(carrier.userRating)
      : isFreelancer && driver?.userRating != null && !Number.isNaN(Number(driver.userRating))
        ? Number(driver.userRating)
        : null;
  const driverGivenRating =
    driver?.userRating != null && !Number.isNaN(Number(driver.userRating))
      ? Number(driver.userRating)
      : null;
  const showCarrierUserRating =
    Boolean(carrierGivenRating != null) && (isCarrierRated || (isFreelancer && isDriverRated));
  const showDriverUserRating = Boolean(driverGivenRating != null) && isDriverRated;

  const canChat =
    normalizedStatus === 'scheduled' ||
    normalizedStatus === 'ready' ||
    normalizedStatus === 'past_due' ||
    normalizedStatus === 'on_trip' ||
    normalizedStatus === 'in_progress' ||
    ((normalizedStatus === 'fullfilled' || normalizedStatus === 'partially_fullfilled') && !isPaid);

  const carrierPhone = (carrier?.phone || '').trim();
  const driverPhone = (driver?.phone || '').trim();

  const handleCopyPhone = (phone: string, isCarrier = true) => {
    if (!phone) return;
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

  const handleOpenProfile = (
    id?: number | null,
    type?: 'carrier' | 'driver' | null,
    name?: string
  ) => {
    if (id && type) {
      openTransporterProfile({ id, type, name });
    }
  };

  const carrierPlates = carrier?.plates?.length ? carrier.plates : [];
  const driverPlates = driver?.plates?.length ? driver.plates : [];
  const vehicleLabel =
    driver?.vehicleType ||
    carrier?.vehicleType ||
    null;

  const formatTripsLine = (trips?: number | string | null, roleLabel?: string) => {
    const parts: string[] = [];
    if (roleLabel) parts.push(roleLabel);
    const tripsNum =
      trips != null && trips !== '' && Number.isFinite(Number(trips)) ? Number(trips) : 0;
    parts.push(`${t('completedTrips', 'Completed trips')}: ${tripsNum}`);
    if (vehicleLabel) {
      parts.push(`${t('vehicle', 'Vehicle')}: ${vehicleLabel}`);
    }
    return parts.join(' · ');
  };

  return (
    <CollapsibleCard
      id="carrier"
      icon={<Truck size={15} />}
      title={t('transporter', 'Transporter')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {isFreelancer && carrier ? (
          <div className="flex items-start gap-3.5">
            {carrier.avatar ? (
              <img
                src={carrier.avatar}
                alt={carrier.name}
                className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-amber-100 dark:ring-amber-900/50 shadow-2xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[14px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex-shrink-0 shadow-2xs">
                {carrier.initials || carrier.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile(carrier.userId, 'driver', carrier.name)}
                    className="font-bold text-[14px] text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors focus:outline-none"
                  >
                    {carrier.name}
                  </button>

                  <RatingPill rating={carrier.rating} ratingCount={carrier.ratingCount} />

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {t('freelancer', 'Freelancer')}
                  </span>

                  {carrier.partner && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck size={11} />
                      <span>{t('partner', 'PARTNER')}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {canRateCarrier ? (
                    <button
                      type="button"
                      onClick={() => handleRateCarrier?.(carrier)}
                      title={t('rateTheDriver', 'Rate the Driver')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#9B51E0] hover:bg-[#883cd1] active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                    >
                      <Star size={12} fill="#fff" />
                      <span>{t('rate', 'Rate')}</span>
                    </button>
                  ) : (
                    showCarrierUserRating &&
                    carrierGivenRating != null && (
                      <UserRatingBadge rating={carrierGivenRating} t={t} />
                    )
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
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                    >
                      <MessageSquare size={14} />
                    </button>
                  )}

                  {carrierPhone ? (
                    <PhoneIconButton
                      phone={carrierPhone}
                      copied={carrierPhoneCopied}
                      onCopy={() => handleCopyPhone(carrierPhone, true)}
                      t={t}
                    />
                  ) : null}
                </div>
              </div>

              <div className="text-[12px] mt-1 text-slate-500 dark:text-slate-400">
                {formatTripsLine(carrier.tripsCount, t('freelancer', 'Freelancer'))}
              </div>

              <PlateTags plates={carrierPlates.length ? carrierPlates : driverPlates} />
            </div>
          </div>
        ) : (
          carrier && (
            <div
              className={`flex items-start gap-3.5 ${
                driver ? 'pb-4 border-b border-slate-200 dark:border-slate-800' : ''
              }`}
            >
              {carrier.avatar ? (
                <img
                  src={carrier.avatar}
                  alt={carrier.name}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-purple-100 dark:ring-purple-900/50 shadow-2xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[14px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex-shrink-0 shadow-2xs">
                  {carrier.initials || carrier.name.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(carrier.userId, 'carrier', carrier.name)}
                      className="font-bold text-[14px] text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors focus:outline-none"
                    >
                      {carrier.name}
                    </button>

                    <RatingPill rating={carrier.rating} ratingCount={carrier.ratingCount} />

                    {carrier.partner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck size={11} />
                        <span>{t('partner', 'PARTNER')}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {canRateCarrier ? (
                      <button
                        type="button"
                        onClick={() => handleRateCarrier?.(carrier)}
                        title={t('rateCarrierCompany', 'Rate the Carrier Company')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#9B51E0] hover:bg-[#883cd1] active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                      >
                        <Star size={12} fill="#fff" />
                        <span>{t('rate', 'Rate')}</span>
                      </button>
                    ) : (
                      showCarrierUserRating &&
                      carrierGivenRating != null && (
                        <UserRatingBadge rating={carrierGivenRating} t={t} />
                      )
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
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                      >
                        <MessageSquare size={14} />
                      </button>
                    )}

                    {carrierPhone ? (
                      <PhoneIconButton
                        phone={carrierPhone}
                        copied={carrierPhoneCopied}
                        onCopy={() => handleCopyPhone(carrierPhone, true)}
                        t={t}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="text-[12px] mt-1 text-slate-500 dark:text-slate-400">
                  {driver
                    ? t('carrierCompany', 'Carrier Company')
                    : formatTripsLine(carrier.tripsCount, t('carrierCompany', 'Carrier Company'))}
                </div>

                {!driver ? <PlateTags plates={carrierPlates} /> : null}
              </div>
            </div>
          )
        )}

        {!isFreelancer && driver && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                {driver.avatar ? (
                  <img
                    src={driver.avatar}
                    alt={driver.name}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-blue-100 dark:ring-blue-900/50 shadow-2xs"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[14px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex-shrink-0 shadow-2xs">
                    {driver.initials || driver.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(driver.userId, 'driver', driver.name)}
                      className="font-bold text-[14px] text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors focus:outline-none"
                    >
                      {driver.name}
                    </button>

                    <RatingPill rating={driver.rating} ratingCount={driver.ratingCount} />
                  </div>

                  <div className="text-[12px] mt-1 text-slate-500 dark:text-slate-400">
                    {formatTripsLine(driver.tripsCount, t('companyDriver', 'Company Driver'))}
                    {driver.cargoSpecs ? ` · ${driver.cargoSpecs}` : ''}
                  </div>

                  <PlateTags plates={driverPlates.length ? driverPlates : carrierPlates} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {canRateDriver ? (
                  <button
                    type="button"
                    onClick={() => handleRateDriver?.(driver)}
                    title={t('rateTheDriver', 'Rate the Driver')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#9B51E0] hover:bg-[#883cd1] active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                  >
                    <Star size={12} fill="#fff" />
                    <span>{t('rate', 'Rate')}</span>
                  </button>
                ) : (
                  showDriverUserRating &&
                  driverGivenRating != null && (
                    <UserRatingBadge rating={driverGivenRating} t={t} />
                  )
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
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                  >
                    <MessageSquare size={14} />
                  </button>
                )}

                {driverPhone ? (
                  <PhoneIconButton
                    phone={driverPhone}
                    copied={driverPhoneCopied}
                    onCopy={() => handleCopyPhone(driverPhone, false)}
                    t={t}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
