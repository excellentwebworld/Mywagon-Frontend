import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock } from 'lucide-react';

const DELAY_BUCKETS = [
  { value: 'under_10', labelKey: 'delayUnder10', fallback: 'Under 10 minutes' },
  { value: '10_30', labelKey: 'delay10to30', fallback: '10–30 minutes' },
  { value: '30_60', labelKey: 'delay30to60', fallback: '30–60 minutes' },
  { value: '60_120', labelKey: 'delay1to2h', fallback: '1–2 hours' },
  { value: '120_180', labelKey: 'delay2to3h', fallback: '2–3 hours' },
  { value: '180_240', labelKey: 'delay3to4h', fallback: '3–4 hours' },
  { value: '240_plus', labelKey: 'delayOver4h', fallback: 'More than 4 hours' },
  { value: 'exact', labelKey: 'delayExact', fallback: 'Exact time' },
] as const;

interface PickupDelayModalProps {
  open: boolean;
  locationLabel?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    was_on_time: boolean;
    delay_bucket?: string;
    hours?: number;
    minutes?: number;
  }) => void;
  t: (key: string, fallback?: string) => string;
}

export const PickupDelayModal: React.FC<PickupDelayModalProps> = ({
  open,
  locationLabel,
  submitting = false,
  onClose,
  onSubmit,
  t,
}) => {
  const [onTime, setOnTime] = useState(true);
  const [bucket, setBucket] = useState<string>('under_10');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (open) {
      setOnTime(true);
      setBucket('under_10');
      setHours(0);
      setMinutes(0);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    if (onTime) {
      onSubmit({ was_on_time: true });
      return;
    }
    if (bucket === 'exact') {
      onSubmit({ was_on_time: false, delay_bucket: 'exact', hours, minutes });
      return;
    }
    onSubmit({ was_on_time: false, delay_bucket: bucket });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E8] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#9B51E0]/10 text-[#9B51E0] flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#18181B] m-0">
                {t('driverPickupDelay', 'Driver Pickup Delay')}
              </h2>
              {locationLabel && (
                <p className="text-[12px] text-[#6B7280] m-0 mt-0.5">{locationLabel}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-[#E4E4E8] flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F4F5] transition-colors cursor-pointer bg-white"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-[14px] text-[#374151] m-0 font-medium leading-relaxed">
            {t('wasDriverOnTimePickup', 'Was the driver on time for pickup?')}
          </p>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2.5 text-[14px] text-[#18181B] cursor-pointer font-medium select-none">
              <input
                type="radio"
                name="was_on_time"
                checked={onTime}
                onChange={() => setOnTime(true)}
                className="w-4 h-4 text-[#9B51E0] accent-[#9B51E0] cursor-pointer"
              />
              <span>{t('yes', 'Yes')}</span>
            </label>

            <label className="flex items-center gap-2.5 text-[14px] text-[#18181B] cursor-pointer font-medium select-none">
              <input
                type="radio"
                name="was_on_time"
                checked={!onTime}
                onChange={() => setOnTime(false)}
                className="w-4 h-4 text-[#9B51E0] accent-[#9B51E0] cursor-pointer"
              />
              <span>{t('no', 'No')}</span>
            </label>
          </div>

          {!onTime && (
            <div className="flex flex-col gap-2.5 pt-2 border-t border-[#E5E7EB] animate-in fade-in duration-150">
              <label htmlFor="delay-bucket" className="text-[13px] font-semibold text-[#18181B]">
                {t('howLongWasDelay', 'How long was the delay?')}
              </label>

              <select
                id="delay-bucket"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="text-[13px] p-2.5 rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9B51E0]/20 focus:border-[#9B51E0] bg-white text-[#18181B] w-full"
              >
                {DELAY_BUCKETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey, opt.fallback)}
                  </option>
                ))}
              </select>

              {bucket === 'exact' && (
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="delay-hours" className="text-[11px] text-[#6B7280]">
                      {t('hours', 'Hours')}
                    </label>
                    <input
                      id="delay-hours"
                      type="number"
                      min={0}
                      max={24}
                      placeholder="0"
                      value={hours || ''}
                      onChange={(e) => setHours(Number(e.target.value) || 0)}
                      className="text-[13px] p-2 rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9B51E0]/20 focus:border-[#9B51E0] w-full"
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="delay-minutes" className="text-[11px] text-[#6B7280]">
                      {t('minutes', 'Minutes')}
                    </label>
                    <input
                      id="delay-minutes"
                      type="number"
                      min={0}
                      max={59}
                      placeholder="0"
                      value={minutes || ''}
                      onChange={(e) => setMinutes(Number(e.target.value) || 0)}
                      className="text-[13px] p-2 rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9B51E0]/20 focus:border-[#9B51E0] w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E4E4E8] bg-[#F9FAFB] flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] font-semibold text-[13px] hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={onClose}
            disabled={submitting}
          >
            {t('notNow', 'Not now')}
          </button>
          <button
            type="button"
            className="px-5 py-2 rounded-lg bg-[#9B51E0] text-white font-semibold text-[13px] hover:bg-[#8A3FD4] disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? t('submitting', 'Submitting…') : t('submit', 'Submit')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

