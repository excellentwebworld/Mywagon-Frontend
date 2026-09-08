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

  const showCard = showDeliveryPerformance || showReportsBlock;
  if (!showCard) return null;

  // Form while not yet submitted; result badge after shipper submits.
  const onTimeDone = showDeliveryPerformance && deliverySubmitted && !submittingOnTime;
  const showDeliveryForm = showDeliveryPerformance && !deliverySubmitted;

  const handleSelectOnTime = async (onTime: boolean) => {
    const previous = selectedOnTime;
    setSelectedOnTime(onTime);
    try {
      await onSelectOnTime?.(onTime);
      setSubmittedOnTime(true);
    } catch {
      setSelectedOnTime(previous ?? initialOnTime);
      setSubmittedOnTime(isAlreadyReported || initialOnTime !== null);
    }
  };

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
        {/* Delivery performance — submit on On Trip; result stays in this report */}
        {(showDeliveryForm || onTimeDone) && (
          <section className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('deliveryPerformance', 'Delivery performance')}
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {onTimeDone ? (
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
                      effectiveDeliveryOnTime !== false
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                    }`}
                  >
                    {effectiveDeliveryOnTime !== false ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <AlertTriangle size={13} />
                    )}
                    <span>
                      {effectiveDeliveryOnTime !== false
                        ? t('yesDeliveredOnTime', 'Yes (On schedule)')
                        : t('noDeliveredDelayed', 'No (Delayed)')}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
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
                      disabled={submittingOnTime}
                      onClick={() => handleSelectOnTime(true)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-500 hover:text-emerald-500 flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {submittingOnTime && selectedOnTime === true ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}
                      <span>{t('yes', 'Yes')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={submittingOnTime}
                      onClick={() => handleSelectOnTime(false)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-red-500 hover:text-red-500 flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {submittingOnTime && selectedOnTime === false ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}
                      <span>{t('no', 'No')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

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
              {(effectiveDeliveryOnTime != null ||
                (!showDeliveryForm && !showDeliveryPerformance)) && (
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

        {/* Pickup stops */}
        {pickupStops.length > 0 && (
          <section className="space-y-2.5 pt-1 border-t border-[var(--border)]">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('pickupStops', 'Pickup stops')}
            </div>

            <div className="space-y-2.5">
              {pickupStops.map((stop) => (
                <div
                  key={stop.locationId}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
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

                  {stop.canReportDelay && onReportDelay && (
                    <button
                      type="button"
                      className="mt-3 px-3 py-1.5 rounded-md text-[11px] font-semibold text-white bg-[#9B51E0] hover:bg-[#883cd1] cursor-pointer border-0 shadow-xs"
                      onClick={() =>
                        onReportDelay({
                          location_id: stop.locationId,
                          location_name: stop.locationName || stop.label,
                          company_name: stop.companyName,
                        })
                      }
                    >
                      {t('reportDelay', 'Report delay')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Dropoff stops */}
        {dropoffStops.length > 0 && (
          <section className="space-y-2.5 pt-1 border-t border-[var(--border)]">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('dropoffStops', 'Dropoff stops')}
            </div>

            <div className="space-y-2.5">
              {dropoffStops.map((stop) => (
                <div
                  key={stop.locationId}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
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

                  {stop.canReportDelay && onReportDropoffDelay && (
                    <button
                      type="button"
                      className="mt-3 px-3 py-1.5 rounded-md text-[11px] font-semibold text-white bg-[#9B51E0] hover:bg-[#883cd1] cursor-pointer border-0 shadow-xs"
                      onClick={() =>
                        onReportDropoffDelay({
                          location_id: stop.locationId,
                          location_name: stop.locationName || stop.label,
                          company_name: stop.companyName,
                        })
                      }
                    >
                      {t('reportDelay', 'Report delay')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {!showDeliveryForm &&
          !onTimeDone &&
          reports.length === 0 &&
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
