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
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
            {trip.distanceKm}{' '}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              km
            </span>
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5 text-slate-500 dark:text-slate-400">
            {t('totalDistance', 'Total distance')}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
            {trip.duration}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5 text-slate-500 dark:text-slate-400">
            {t('estDuration', 'Est. duration')}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
            {trip.stops}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5 text-slate-500 dark:text-slate-400">
            {t('stops', 'Stops')}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
            {trip.weight}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5 text-slate-500 dark:text-slate-400">
            {t('totalWeight', 'Total weight')}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
            {trip.customers}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5 text-slate-500 dark:text-slate-400">
            {t('customers', 'Customers')}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
            {trip.orders}
          </div>
          <div className="text-[10px] font-semibold uppercase mt-0.5 text-slate-500 dark:text-slate-400">
            {t('orders', 'Orders')}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
};
