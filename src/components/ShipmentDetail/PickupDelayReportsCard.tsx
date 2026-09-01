import React from 'react';
import { Clock } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';

export interface ReportablePickup {
  location_id: number;
  location_name?: string | null;
  company_name?: string | null;
}

interface PickupDelayReportsCardProps {
  pickups: ReportablePickup[];
  expanded: boolean;
  onToggle: () => void;
  onReport: (pickup: ReportablePickup) => void;
  t: (key: string, fallback?: string) => string;
}

export const PickupDelayReportsCard: React.FC<PickupDelayReportsCardProps> = ({
  pickups,
  expanded,
  onToggle,
  onReport,
  t,
}) => {
  if (pickups.length === 0) return null;

  return (
    <CollapsibleCard
      id="pickup-delay"
      icon={<Clock size={15} />}
      title={t('pickupDelayReports', 'Pickup delay reports')}
      count={pickups.length}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        {pickups.map((pickup) => {
          const label = pickup.location_name || pickup.company_name || t('pickup', 'Pickup');
          return (
            <div
              key={pickup.location_id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
                  {label}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#92400E' }}>
                  {t('pickupDelayPendingHint', 'Pickup completed — report whether the driver was on time.')}
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer flex-shrink-0 transition-opacity hover:opacity-90"
                style={{ background: '#9B51E0', border: 'none' }}
                onClick={() => onReport(pickup)}
              >
                {t('reportDelay', 'Report delay')}
              </button>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
};
