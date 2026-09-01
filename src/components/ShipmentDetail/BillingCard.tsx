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
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
              {t('agreedPrice', 'AGREED PRICE')}
            </div>
            <div
              className="font-bold text-[13px]"
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: '#18181B',
              }}
            >
              {billing.agreedPrice}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
              {t('priceType', 'PRICE TYPE')}
            </div>
            <div
              className="font-bold text-[13px]"
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: '#18181B',
              }}
            >
              {billing.priceType?.toUpperCase()}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
              {t('costPerKm', 'COST / KM')}
            </div>
            <div
              className="font-bold text-[13px]"
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: '#18181B',
              }}
            >
              {billing.costPerKm}
            </div>
            {billing.kmDetail && (
              <div className="text-[10px] mt-0.5" style={{ color: '#8E8E9A' }}>
                {billing.kmDetail}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
              {t('costPerPallet', 'COST / PALLET')}
            </div>
            <div
              className="font-bold text-[13px]"
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: '#18181B',
              }}
            >
              {billing.costPerPallet}
            </div>
            {billing.palletDetail && (
              <div className="text-[10px] mt-0.5" style={{ color: '#8E8E9A' }}>
                {billing.palletDetail}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
              {t('costPerTonne', 'COST / TONNE')}
            </div>
            <div
              className="font-bold text-[13px]"
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: '#18181B',
              }}
            >
              {billing.costPerTonne}
            </div>
            {billing.tonneDetail && (
              <div className="text-[10px] mt-0.5" style={{ color: '#8E8E9A' }}>
                {billing.tonneDetail}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
              {t('costPerStop', 'COST / STOP')}
            </div>
            <div
              className="font-bold text-[13px]"
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: '#18181B',
              }}
            >
              {billing.costPerStop}
            </div>
            {billing.stopDetail && (
              <div className="text-[10px] mt-0.5" style={{ color: '#8E8E9A' }}>
                {billing.stopDetail}
              </div>
            )}
          </div>
        </div>

        {/* Settlement footer */}
        <div className="flex items-center gap-2 mt-3.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: isPaid ? '#ECFDF5' : '#FFFBEB',
              color: isPaid ? '#059669' : '#92400E',
            }}
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
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: '#9B51E0', border: 'none' }}
            >
              {t('markAsPaid', 'Mark as paid')}
            </button>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
};
