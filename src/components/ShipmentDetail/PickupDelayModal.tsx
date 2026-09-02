import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Loader2 } from 'lucide-react';

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
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mv-modal bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mv-modal-header px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white m-0">
                {t('pickupDelayReport', 'Pickup Delay Report')}
              </h2>
              {locationLabel && (
                <p className="text-[12px] text-slate-500 dark:text-slate-400 m-0 truncate max-w-[280px]">
                  {locationLabel}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-white dark:bg-slate-800"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-[14px] text-slate-700 dark:text-slate-300 m-0 font-medium leading-relaxed">
            {t('wasDriverOnTimePickup', 'Was the driver on time for pickup?')}
          </p>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2.5 text-[14px] text-slate-900 dark:text-slate-100 cursor-pointer font-medium select-none">
              <input
                type="radio"
                name="was_on_time"
                checked={onTime}
                onChange={() => setOnTime(true)}
                className="w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer"
              />
              <span>{t('yes', 'Yes')}</span>
            </label>

            <label className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-[14px] cursor-pointer font-medium select-none">
              <input
                type="radio"
                name="was_on_time"
                checked={!onTime}
                onChange={() => setOnTime(false)}
                className="w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer"
              />
              <span>{t('no', 'No')}</span>
            </label>
          </div>

          {!onTime && (
            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
              <label htmlFor="delay-bucket" className="text-[13px] font-semibold text-slate-900 dark:text-white">
                {t('howLongWasDelay', 'How long was the delay?')}
              </label>

              <select
                id="delay-bucket"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="text-[13px] p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-full"
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
                    <label htmlFor="delay-hours" className="text-[11px] text-slate-500 dark:text-slate-400">
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
                      className="text-[13px] p-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-full"
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="delay-minutes" className="text-[11px] text-slate-500 dark:text-slate-400">
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
                      className="text-[13px] p-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mv-modal-footer px-6 py-3.5 border-t border-[var(--border)] flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            onClick={onClose}
            disabled={submitting}
          >
            {t('notNow', 'Not now')}
          </button>
          <button
            type="button"
            className="px-5 py-2 rounded-lg text-white font-semibold text-[13px] flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
            style={{ background: '#9B51E0' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{t('submitting', 'Submitting...')}</span>
              </>
            ) : (
              <span>{t('submitReport', 'Submit Report')}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
