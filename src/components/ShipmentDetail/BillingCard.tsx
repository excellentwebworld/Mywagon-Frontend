import React from 'react';
import { Euro } from 'lucide-react';
import type { BillingMetrics } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface BillingCardProps {
  billing: BillingMetrics;
  expanded: boolean;
  onToggle: () => void;
  onMarkPaid?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const BillingCard: React.FC<BillingCardProps> = ({
  billing,
  expanded,
  onToggle,
  onMarkPaid,
  t,
}) => {
  const isPaid =
    billing.invoiceStatus?.toLowerCase().includes('paid') ||
    billing.invoiceStatus?.toLowerCase().includes('settled');

  return (
    <CollapsibleCard
      id="billing"
      icon={<Euro size={15} />}
      title={t('billing', 'Billing')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-slate-500 dark:text-slate-400">
              {t('agreedPrice', 'AGREED PRICE')}
            </div>
            <div className="font-bold text-[13px] font-mono text-slate-900 dark:text-white">
              {billing.agreedPrice}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-slate-500 dark:text-slate-400">
              {t('priceType', 'PRICE TYPE')}
            </div>
            <div className="font-bold text-[13px] font-mono text-slate-900 dark:text-white">
              {billing.priceType?.toUpperCase()}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-slate-500 dark:text-slate-400">
              {t('costPerKm', 'COST / KM')}
            </div>
            <div className="font-bold text-[13px] font-mono text-slate-900 dark:text-white">
              {billing.costPerKm}
            </div>
            {billing.kmDetail && (
              <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400">
                {billing.kmDetail}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-slate-500 dark:text-slate-400">
              {t('costPerPallet', 'COST / PALLET')}
            </div>
            <div className="font-bold text-[13px] font-mono text-slate-900 dark:text-white">
              {billing.costPerPallet}
            </div>
            {billing.palletDetail && (
              <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400">
                {billing.palletDetail}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-slate-500 dark:text-slate-400">
              {t('costPerTonne', 'COST / TONNE')}
            </div>
            <div className="font-bold text-[13px] font-mono text-slate-900 dark:text-white">
              {billing.costPerTonne}
            </div>
            {billing.tonneDetail && (
              <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400">
                {billing.tonneDetail}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-slate-500 dark:text-slate-400">
              {t('costPerStop', 'COST / STOP')}
            </div>
            <div className="font-bold text-[13px] font-mono text-slate-900 dark:text-white">
              {billing.costPerStop}
            </div>
            {billing.stopDetail && (
              <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400">
                {billing.stopDetail}
              </div>
            )}
          </div>
        </div>

        {/* Settlement footer */}
        <div className="flex items-center gap-2 mt-3.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isPaid
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <span
              className="rounded-full"
              style={{ width: 5, height: 5, background: 'currentColor' }}
            />
            {isPaid ? t('settled', 'Settled / Paid') : t('notSettled', 'Not settled')}
          </span>

          {!isPaid && onMarkPaid && (
            <button
              type="button"
              onClick={onMarkPaid}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-[#9B51E0] hover:bg-[#883cd1] cursor-pointer shadow-xs transition-all border-0"
            >
              {t('markAsPaid', 'Mark as paid')}
            </button>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
};
