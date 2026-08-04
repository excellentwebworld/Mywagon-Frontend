import React from 'react';
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
  t: (key: string) => string;
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
      title={<>⏱ {t('pickupDelayReports') || 'Pickup delay reports'}</>}
      count={pickups.length}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {pickups.map((pickup) => {
          const label = pickup.location_name || pickup.company_name || t('pickup') || 'Pickup';
          return (
            <div
              key={pickup.location_id}
              className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {t('pickupDelayPendingHint') || 'Pickup completed — report whether the driver was on time.'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm shrink-0"
                onClick={() => onReport(pickup)}
              >
                {t('reportDelay') || 'Report delay'}
              </button>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
};
