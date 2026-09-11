import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../api';
import type { ApiPerformanceSummary } from '../../api/types/dashboard';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { formatEuro } from '../../pages/ManageShipments/utils/listingUtils';
import { formatDashError, translateDashMessage } from './dashErrorUtils';
import { DashPerfSkeleton } from './DashboardSkeletons';

const DASH = '—';

function formatMoney(value: number | null | undefined): string {
  return formatEuro(value) ?? DASH;
}

function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return DASH;
  return `${value.toFixed(1)}%`;
}

function formatInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return DASH;
  return value.toLocaleString();
}

export const PerformanceSummary: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const { showToast } = useApp();
  const { t } = useTranslation();
  const [data, setData] = useState<ApiPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    dashboardService
      .getPerformanceSummary()
      .then((summary) => {
        if (!cancelled) setData(summary);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(formatDashError(err, 'dashPerfLoadFailed').key);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const showPlaceholder = !loading && !data;

  return (
    <div className="perf-card">
      <div className="perf-hd">
        <h4>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-8" />
          </svg>
          <span>{t('perfTitle')}</span>
        </h4>
        <span className="perf-period">{t('perfSinceDay1')}</span>
      </div>
      {error && !loading && (
        <div className="dash-widget-error" style={{ padding: '8px 16px' }}>
          {translateDashMessage(t, error)}
        </div>
      )}
      {loading ? (
        <DashPerfSkeleton />
      ) : (
        <div className="perf-grid">
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfTotalCost')}</div>
            <div className="perf-cell-value">{showPlaceholder ? DASH : formatMoney(data!.total_cost)}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfTotalLoads')}</div>
            <div className="perf-cell-value">{showPlaceholder ? DASH : formatInt(data!.total_loads)}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfOnTimePickup')}</div>
            <div className="perf-cell-value">{showPlaceholder ? DASH : formatPct(data!.on_time_pickup_pct)}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfOnTimeDelivery')}</div>
            <div className="perf-cell-value">{showPlaceholder ? DASH : formatPct(data!.on_time_delivery_pct)}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfAvgCostKm')}</div>
            <div className="perf-cell-value">{showPlaceholder ? DASH : formatMoney(data!.avg_cost_per_km)}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfAvgCostLoad')}</div>
            <div className="perf-cell-value">{showPlaceholder ? DASH : formatMoney(data!.avg_cost_per_load)}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfPipelineRevenue')}</div>
            <div className="perf-cell-value">{showPlaceholder ? DASH : formatMoney(data!.pipeline_revenue)}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfRevenueDelivered')}</div>
            <div className="perf-cell-value">
              {showPlaceholder ? DASH : formatMoney(data!.revenue_delivered_on_mv)}
            </div>
          </div>
        </div>
      )}
      <div className="perf-footer">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            showToast(t('comingSoon'), 'info');
          }}
        >
          {t('viewFullAnalytics')}
        </a>
      </div>
    </div>
  );
};
