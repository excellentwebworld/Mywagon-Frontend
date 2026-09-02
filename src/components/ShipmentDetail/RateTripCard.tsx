import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';

interface RateTripCardProps {
  carrierName?: string;
  expanded: boolean;
  onToggle: () => void;
  onSelectOnTime?: (onTime: boolean) => void;
  submitting?: boolean;
  initialOnTime?: boolean | null;
  isAlreadyReported?: boolean;
  t: (key: string, fallback?: string) => string;
}

export const RateTripCard: React.FC<RateTripCardProps> = ({
  carrierName = '',
  expanded,
  onToggle,
  onSelectOnTime,
  submitting = false,
  initialOnTime = null,
  isAlreadyReported = false,
  t,
}) => {
  const [selectedOnTime, setSelectedOnTime] = useState<boolean | null>(initialOnTime);
  const [submitted, setSubmitted] = useState<boolean>(isAlreadyReported || initialOnTime !== null);

  useEffect(() => {
    if (initialOnTime !== null) {
      setSelectedOnTime(initialOnTime);
      setSubmitted(true);
    } else if (isAlreadyReported) {
      setSubmitted(true);
      if (selectedOnTime === null) {
        setSelectedOnTime(true);
      }
    }
  }, [initialOnTime, isAlreadyReported]);

  const handleSelect = (onTime: boolean) => {
    setSelectedOnTime(onTime);
    setSubmitted(true);
    if (onSelectOnTime) {
      onSelectOnTime(onTime);
    }
  };

  const isDone = (submitted || isAlreadyReported || selectedOnTime !== null) && !submitting;

  return (
    <CollapsibleCard
      id="rate"
      icon={<Clock size={15} />}
      title={t('deliveryPerformance', 'Delivery performance')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        {isDone ? (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                {t('deliveredOnTime', 'Delivered on time?')}
              </span>
              {carrierName && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ({carrierName})
                </span>
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                selectedOnTime !== false
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}
            >
              {selectedOnTime !== false ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              <span>
                {selectedOnTime !== false
                  ? t('yesDeliveredOnTime', 'Yes (On schedule)')
                  : t('noDeliveredDelayed', 'No (Delayed)')}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                {t('wasDeliveryOnTime', 'Was the delivery on time?')}
              </span>
              {carrierName && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ({carrierName})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSelect(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-500 hover:text-emerald-500 flex items-center gap-1.5 disabled:opacity-60"
              >
                {submitting && selectedOnTime === true ? <Loader2 size={12} className="animate-spin" /> : null}
                <span>{t('yes', 'Yes')}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSelect(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-red-500 hover:text-red-500 flex items-center gap-1.5 disabled:opacity-60"
              >
                {submitting && selectedOnTime === false ? <Loader2 size={12} className="animate-spin" /> : null}
                <span>{t('no', 'No')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
