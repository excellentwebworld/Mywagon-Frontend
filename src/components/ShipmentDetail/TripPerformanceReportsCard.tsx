import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';

export type TripPerformanceReportType =
  | 'shipper_pickup_delay'
  | 'shipper_dropoff_delay'
  | 'driver_loading_wait'
  | 'driver_dropoff_on_time';

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
  dropoffDelayText: string;
  canReportDelay: boolean;
}

export interface TripPerformanceData {
  deliveryOnTime: boolean | null;
  avgLoadingWaitMinutes: number | null;
  pickupStops: TripPerformancePickupStop[];
  dropoffStops: TripPerformanceDropoffStop[];
  reports: TripPerformanceReportItem[];
}

interface TripPerformanceReportsCardProps {
  performance: TripPerformanceData | null;
  expanded: boolean;
  onToggle: () => void;
  onReportDelay?: (pickup: {
    location_id: number;
    location_name?: string | null;
    company_name?: string | null;
  }) => void;
  onReportDropoffDelay?: (dropoff: {
    location_id: number;
    location_name?: string | null;
    company_name?: string | null;
  }) => void;
  /** Delivery performance (on-time Yes/No) — shown inside this card when completed. */
  showDeliveryPerformance?: boolean;
  carrierName?: string;
  initialOnTime?: boolean | null;
  isAlreadyReported?: boolean;
  submittingOnTime?: boolean;
  onSelectOnTime?: (onTime: boolean) => void | Promise<void>;
  t: (key: string, fallback?: string) => string;
}

function typeLabel(
  type: string,
  t: (key: string, fallback?: string) => string
): string {
  switch (type) {
    case 'shipper_pickup_delay':
      return t('shipperPickupDelay', 'Pickup delay (shipper)');
    case 'shipper_dropoff_delay':
      return t('shipperDropoffDelay', 'Dropoff delay (shipper)');
    case 'driver_loading_wait':
      return t('driverLoadingWait', 'Loading wait (driver)');
    case 'driver_dropoff_on_time':
      return t('driverDropoffOnTime', 'Dropoff on time (driver)');
    default:
      return t('report', 'Report');
  }
}

function deliveryOnTimeLabel(
  value: boolean | null,
  t: (key: string, fallback?: string) => string
): string {
  if (value === true) return t('yes', 'Yes');
  if (value === false) return t('no', 'No');
  return t('notRated', 'Not rated');
}

function avgWaitLabel(
  minutes: number | null,
  t: (key: string, fallback?: string) => string
): string {
  if (minutes == null || Number.isNaN(Number(minutes))) return '—';
  return `${Math.round(Number(minutes))} ${t('min', 'min')}`;
}

function isLateReport(report: TripPerformanceReportItem): boolean {
  if (report.type === 'shipper_pickup_delay') return true;
  if (report.type === 'shipper_dropoff_delay') return true;
  if (report.type === 'driver_loading_wait') return true;
  if (report.type === 'driver_dropoff_on_time') return report.wasOnTime === false;
  return false;
}

export const TripPerformanceReportsCard: React.FC<TripPerformanceReportsCardProps> = ({
  performance,
  expanded,
  onToggle,
  onReportDelay,
  onReportDropoffDelay,
  showDeliveryPerformance = false,
  carrierName = '',
  initialOnTime = null,
  isAlreadyReported = false,
  submittingOnTime = false,
  onSelectOnTime,
  t,
}) => {
  const [selectedOnTime, setSelectedOnTime] = useState<boolean | null>(initialOnTime);
  const [submittedOnTime, setSubmittedOnTime] = useState(
    isAlreadyReported || initialOnTime !== null
  );

  useEffect(() => {
    if (initialOnTime !== null) {
      setSelectedOnTime(initialOnTime);
      setSubmittedOnTime(true);
    } else if (isAlreadyReported) {
      setSubmittedOnTime(true);
      setSelectedOnTime((prev) => (prev === null ? true : prev));
    }
  }, [initialOnTime, isAlreadyReported]);

  const reports = (performance?.reports || []).filter(
    (r) => r.type !== 'driver_dropoff_on_time'
  );
  const pickupStops = performance?.pickupStops || [];
  const dropoffStops = performance?.dropoffStops || [];

  // Profile avg under "This load" only when this shipment has a reported loading wait.
  const hasThisLoadLoadingWait =
    reports.some((r) => r.type === 'driver_loading_wait') ||
    pickupStops.some((s) => {
      const text = (s.loadingWaitText || '').trim().toLowerCase();
      return text !== '' && !text.includes('not reported');
    });
  const showAvgLoadingWait =
    hasThisLoadLoadingWait && performance?.avgLoadingWaitMinutes != null;

  const effectiveDeliveryOnTime =
    selectedOnTime ??
    initialOnTime ??
    performance?.deliveryOnTime ??
    null;

  const deliverySubmitted =
    submittedOnTime ||
    isAlreadyReported ||
    initialOnTime !== null ||
    performance?.deliveryOnTime != null;

  const showReportsBlock =
    Boolean(performance) &&
    (reports.length > 0 ||
      pickupStops.length > 0 ||
      dropoffStops.length > 0 ||
      effectiveDeliveryOnTime != null ||
      showAvgLoadingWait);

  const showCard = showReportsBlock;
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
              {t('dropoffDelay', 'Dropoff delay')}
            </span>
            <span className="text-[12px] font-semibold text-[#9B51E0] text-right">
              {stop.dropoffDelayText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <CollapsibleCard
      id="trip-performance"
      icon={<Activity size={15} />}
      title={t('tripPerformanceReports', 'Trip Performance Reports')}
      count={reports.length > 0 ? reports.length : undefined}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-4 text-[12px]">

        {/* Logged reports */}
        {reports.length > 0 && (
          <section className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('loggedReports', 'Logged reports')}
            </div>
            {reports.map((report) => {
              const late = isLateReport(report);

              return (
                <div
                  key={`${report.type}-${report.locationId}`}
                  className={`rounded-xl border px-3.5 py-3 ${
                    late
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
                        {report.locationLabel}
                      </div>
                      <div
                        className={`mt-0.5 text-[11px] font-medium ${
                          late
                            ? 'text-amber-800 dark:text-amber-300'
                            : 'text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {typeLabel(report.type, t)}
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 text-[12px] font-bold ${
                        late
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-emerald-900 dark:text-emerald-200'
                      }`}
                    >
                      {report.summary}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Load summary metrics — delivery on time appears after shipper submits */}
        {(performance || effectiveDeliveryOnTime != null) && (
          <section className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('thisLoadSummary', 'This load')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {effectiveDeliveryOnTime != null && (
                <div className="rounded-xl border border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/40 px-3.5 py-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('deliveryOnTimeThisLoad', 'Delivery on time (this load)')}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-[#9B51E0]">
                    {deliveryOnTimeLabel(effectiveDeliveryOnTime, t)}
                  </div>
                </div>
              )}

              {showAvgLoadingWait && (
                <div className="rounded-xl border border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/40 px-3.5 py-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('yourAvgLoadingWait', 'Your avg loading wait')}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-[#9B51E0]">
                    {avgWaitLabel(performance!.avgLoadingWaitMinutes, t)}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Pickup and Dropoff stops side by side with dynamically matched box heights */}
        {(pickupStops.length > 0 || dropoffStops.length > 0) && (
          <div className="pt-1 border-t border-[var(--border)]">
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
          </div>
        )}

        {reports.length === 0 &&
          pickupStops.length === 0 &&
          dropoffStops.length === 0 && (
          <p className="m-0 text-[11px] text-slate-500 dark:text-slate-400">
            {t('noTripPerformanceReports', 'No trip performance reports yet.')}
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
