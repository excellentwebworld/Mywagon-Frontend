import React from 'react';
import { Activity } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';

export type TripPerformanceReportType =
  | 'shipper_pickup_delay'
  | 'shipper_dropoff_delay'
  | 'driver_loading_wait'
  | 'driver_dropoff_delay';

export interface TripPerformanceReportItem {
  type: TripPerformanceReportType | string;
  locationId: number;
  locationLabel: string;
  stopType?: 'pickup' | 'delivery';
  summary: string;
  wasOnTime?: boolean | null;
  reportedAt?: string | null;
  reporter: 'shipper' | 'driver' | string;
}

export interface TripPerformancePickupStop {
  locationId: number;
  label: string;
  locationName?: string | null;
  companyName?: string | null;
  pickupDelayText: string;
  loadingWaitText: string;
  canReportDelay: boolean;
}

export interface TripPerformanceDropoffStop {
  locationId: number;
  label: string;
  locationName?: string | null;
  companyName?: string | null;
  loadingWaitText: string;
  canReportDelay?: boolean;
}

export interface TripPerformanceData {
  deliveryOnTime: boolean | null;
  avgLoadingWaitMinutes: number | null;
  pickupStops: TripPerformancePickupStop[];
  dropoffStops: TripPerformanceDropoffStop[];
  reports: TripPerformanceReportItem[];
}

export interface TripPerformanceReportsCardProps {
  performance: TripPerformanceData | null;
  expanded: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}

export const TripPerformanceReportsCard: React.FC<TripPerformanceReportsCardProps> = ({
  performance,
  expanded,
  onToggle,
  t,
}) => {
  const pickupStops = performance?.pickupStops || [];
  const dropoffStops = performance?.dropoffStops || [];

  const showCard = Boolean(performance) && (pickupStops.length > 0 || dropoffStops.length > 0);
  if (!showCard) return null;

  const renderPickupCard = (stop: TripPerformancePickupStop) => (
    <div
      key={stop.locationId}
      className="h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 flex flex-col justify-between"
    >
      <div className="min-w-0 w-full">
        <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
          {stop.label}
        </div>

        <div className="mt-2 space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('pickupDelay', 'Pickup delay')}
            </span>
            <span className="text-[12px] font-semibold text-[#9B51E0] text-right">
              {stop.pickupDelayText}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('loadingWait', 'Loading wait')}
            </span>
            <span className="text-[12px] font-semibold text-[#9B51E0] text-right">
              {stop.loadingWaitText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDropoffCard = (stop: TripPerformanceDropoffStop) => (
    <div
      key={stop.locationId}
      className="h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 flex flex-col justify-between"
    >
      <div className="min-w-0 w-full">
        <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
          {stop.label}
        </div>

        <div className="mt-2 space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('loadingWait', 'Loading wait')}
            </span>
            <span className="text-[12px] font-semibold text-[#9B51E0] text-right">
              {stop.loadingWaitText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <CollapsibleCard
      id="tripPerformance"
      icon={<Activity size={15} />}
      title={t('tripPerformanceReports', 'Trip Performance Reports')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-4 text-[12px]">
        {/* Pickup and Dropoff stops side by side with dynamically matched box heights */}
        {pickupStops.length > 0 && dropoffStops.length > 0 ? (
          <>
            {/* Desktop layout: aligned 2-column rows where each row's boxes match height dynamically */}
            <div className="show-desktop-only space-y-2.5">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('pickupStops', 'Pickup stops')}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('dropoffStops', 'Dropoff stops')}
                </div>
              </div>

              <div className="space-y-2.5">
                {Array.from(
                  { length: Math.max(pickupStops.length, dropoffStops.length) },
                  (_, i) => {
                    const p = pickupStops[i];
                    const d = dropoffStops[i];

                    return (
                      <div
                        key={p?.locationId ?? d?.locationId ?? i}
                        className="grid grid-cols-2 gap-4 items-stretch"
                      >
                        <div className="min-w-0 h-full">
                          {p ? renderPickupCard(p) : <div className="h-full" />}
                        </div>
                        <div className="min-w-0 h-full">
                          {d ? renderDropoffCard(d) : <div className="h-full" />}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Mobile layout: stacked sections */}
            <div className="show-mobile-only space-y-4">
              <section className="space-y-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('pickupStops', 'Pickup stops')}
                </div>
                <div className="space-y-2.5">
                  {pickupStops.map((stop) => renderPickupCard(stop))}
                </div>
              </section>

              <section className="space-y-2.5 pt-2 border-t border-[var(--border)]">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('dropoffStops', 'Dropoff stops')}
                </div>
                <div className="space-y-2.5">
                  {dropoffStops.map((stop) => renderDropoffCard(stop))}
                </div>
              </section>
            </div>
          </>
        ) : (
          /* Only pickup stops or only dropoff stops */
          <section className="space-y-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {pickupStops.length > 0
                ? t('pickupStops', 'Pickup stops')
                : t('dropoffStops', 'Dropoff stops')}
            </div>
            <div className="space-y-2.5">
              {pickupStops.length > 0
                ? pickupStops.map((stop) => renderPickupCard(stop))
                : dropoffStops.map((stop) => renderDropoffCard(stop))}
            </div>
          </section>
        )}

        {pickupStops.length === 0 && dropoffStops.length === 0 && (
          <p className="m-0 text-[11px] text-slate-500 dark:text-slate-400">
            {t('noTripPerformanceReports', 'No trip performance reports yet.')}
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
