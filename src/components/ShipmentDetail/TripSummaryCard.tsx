import React from 'react';
import { Zap } from 'lucide-react';
import type { TripSummary } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface TripSummaryCardProps {
  trip: TripSummary;
  expanded: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}

export const TripSummaryCard: React.FC<TripSummaryCardProps> = ({
  trip,
  expanded,
  onToggle,
  t,
}) => {
  return (
    <CollapsibleCard
      id="trip"
      icon={<Zap size={15} />}
      title={t('tripSummary', 'Trip summary')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
        <div className="p-2.5 rounded-lg" style={{ background: '#F5F5F7' }}>
          <div
            className="text-[18px] font-bold"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: '#18181B',
            }}
          >
            {trip.distanceKm}{' '}
            <span className="text-[11px] font-normal" style={{ color: '#8E8E9A' }}>
              km
            </span>
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#8E8E9A' }}>
            {t('totalDistance', 'Total distance')}
          </div>
        </div>

        <div className="p-2.5 rounded-lg" style={{ background: '#F5F5F7' }}>
          <div
            className="text-[18px] font-bold"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: '#18181B',
            }}
          >
            {trip.duration}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#8E8E9A' }}>
            {t('estDuration', 'Est. duration')}
          </div>
        </div>

        <div className="p-2.5 rounded-lg" style={{ background: '#F5F5F7' }}>
          <div
            className="text-[18px] font-bold"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: '#18181B',
            }}
          >
            {trip.stops}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#8E8E9A' }}>
            {t('stops', 'Stops')}
          </div>
        </div>

        <div className="p-2.5 rounded-lg" style={{ background: '#F5F5F7' }}>
          <div
            className="text-[18px] font-bold"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: '#18181B',
            }}
          >
            {trip.weight}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#8E8E9A' }}>
            {t('totalWeight', 'Total weight')}
          </div>
        </div>

        <div className="p-2.5 rounded-lg" style={{ background: '#F5F5F7' }}>
          <div
            className="text-[18px] font-bold"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: '#18181B',
            }}
          >
            {trip.customers}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#8E8E9A' }}>
            {t('customers', 'Customers')}
          </div>
        </div>

        <div className="p-2.5 rounded-lg" style={{ background: '#F5F5F7' }}>
          <div
            className="text-[18px] font-bold"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: '#18181B',
            }}
          >
            {trip.orders}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#8E8E9A' }}>
            {t('orders', 'Orders')}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
};
