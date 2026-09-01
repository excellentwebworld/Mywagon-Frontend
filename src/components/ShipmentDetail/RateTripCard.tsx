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
      <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        {isDone ? (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#18181B]">
                {t('deliveredOnTime', 'Delivered on time?')}
              </span>
              {carrierName && (
                <span className="text-[11px] text-[#64748B]">
                  ({carrierName})
                </span>
              )}
            </div>

            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: selectedOnTime !== false ? '#ECFDF5' : '#FEF2F2',
                color: selectedOnTime !== false ? '#059669' : '#DC2626',
                border: selectedOnTime !== false ? '1px solid #A7F3D0' : '1px solid #FECACA',
              }}
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
              <span className="text-[13px] font-semibold text-[#18181B]">
                {t('wasDeliveryOnTime', 'Was the delivery on time?')}
              </span>
              {carrierName && (
                <span className="text-[11px] text-[#64748B]">
                  ({carrierName})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSelect(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 hover:border-[#10B981] hover:text-[#10B981] flex items-center gap-1.5 disabled:opacity-60"
              >
                {submitting && selectedOnTime === true ? <Loader2 size={12} className="animate-spin" /> : null}
                <span>{t('yes', 'Yes')}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSelect(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 hover:border-[#EF4444] hover:text-[#EF4444] flex items-center gap-1.5 disabled:opacity-60"
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
