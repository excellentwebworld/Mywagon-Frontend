import React from 'react';
import {
  FileText,
  CheckCircle,
  PlusCircle,
  Truck,
  Calendar,
} from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { WeeklyReportItem, WeeklyReportsMeta } from '../../../../api/types/weeklyReports';

interface WeeklyReportKpisProps {
  reports: WeeklyReportItem[];
  meta?: WeeklyReportsMeta;
  loading: boolean;
  dateFrom?: string;
  dateTo?: string;
  activePreset?: string;
}

export const WeeklyReportKpis: React.FC<WeeklyReportKpisProps> = ({
  reports,
  meta,
  loading,
  dateFrom,
  dateTo,
  activePreset,
}) => {
  const { t } = useTranslation();

  if (loading && (!meta || reports.length === 0)) {
    return (
      <div className="wr-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="wr-kpi-card is-skeleton">
            <div className="wr-kpi-header">
              <div className="wr-sk-line wr-sk-label wr-sk-shimmer" />
              <div className="wr-sk-icon wr-sk-shimmer" />
            </div>
            <div className="wr-sk-line wr-sk-val wr-sk-shimmer" />
            <div className="wr-sk-line wr-sk-sub wr-sk-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  const totalReports = meta?.total ?? reports.length;

  let sumFulfilled = 0;
  let sumCreated = 0;
  let sumInProgress = 0;

  reports.forEach((r) => {
    sumFulfilled += r.summary?.total_fulfilled ?? 0;
    sumCreated += r.summary?.total_created ?? 0;
    sumInProgress += r.summary?.total_in_progress ?? 0;
  });

  const totalFulfilled = meta?.overall_fulfilled ?? sumFulfilled;
  const totalCreated = meta?.overall_created ?? sumCreated;
  const totalInProgress = meta?.overall_in_progress ?? sumInProgress;

  const formatDateLabel = (dStr?: string) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const getPeriodSubtitle = () => {
    const fromLabel = formatDateLabel(dateFrom || meta?.date_range_start);
    const toLabel = formatDateLabel(dateTo || meta?.date_range_end);
    const range = fromLabel && toLabel ? ` (${fromLabel} – ${toLabel})` : '';

    if (activePreset === '1w' || activePreset === 'last_week') {
      return `${t('analytics.weeklyReports.presetLastWeek', 'Last Week')}${range}`;
    }
    if (activePreset === '4w') {
      return `${t('analytics.weeklyReports.presetLast4Weeks', 'Last 4 Weeks')}${range}`;
    }
    if (activePreset === '8w') {
      return `${t('analytics.weeklyReports.presetLast8Weeks', 'Last 8 Weeks')}${range}`;
    }
    if (activePreset === '12w') {
      return `${t('analytics.weeklyReports.presetLast12Weeks', 'Last 12 Weeks')}${range}`;
    }
    if (activePreset === 'year') {
      return `${t('analytics.weeklyReports.presetThisYear', 'This Year')}${range}`;
    }
    if (fromLabel && toLabel) {
      return `${fromLabel} – ${toLabel}`;
    }
    if (meta?.date_range_start && meta?.date_range_end) {
      return t(
        'analytics.weeklyReports.allAvailableRange',
        '{{from}} – {{to}} (All available)',
        {
          from: formatDateLabel(meta.date_range_start),
          to: formatDateLabel(meta.date_range_end),
        }
      );
    }
    return t('analytics.weeklyReports.allAvailableReports', 'All Available Reports');
  };

  const kpis = [
    {
      label: t('analytics.weeklyReports.kpiTotalReports', 'Total Weekly Reports'),
      val: totalReports,
      sub: getPeriodSubtitle(),
      icon: <FileText size={18} className="text-blue-500" />,
      accent: 'blue',
    },
    {
      label: t('analytics.weeklyReports.kpiLoadsFulfilled', 'Loads Fulfilled'),
      val: totalFulfilled,
      sub: t('analytics.weeklyReports.kpiFulfilledSub', 'Completed shipments in period'),
      icon: <CheckCircle size={18} className="text-[var(--mv-success)]" />,
      accent: 'emerald',
    },
    {
      label: t('analytics.weeklyReports.kpiLoadsCreated', 'Loads Created'),
      val: totalCreated,
      sub: t('analytics.weeklyReports.kpiCreatedSub', 'New shipments placed in period'),
      icon: <PlusCircle size={18} className="text-indigo-500" />,
      accent: 'indigo',
    },
    {
      label: t('analytics.weeklyReports.kpiActiveInTransit', 'Active In Transit'),
      val: totalInProgress,
      sub: t('analytics.weeklyReports.kpiInTransitSub', 'On trip · Scheduled · Ready'),
      icon: <Truck size={18} className="text-amber-500" />,
      accent: 'amber',
    },
  ];

  return (
    <div className="wr-kpi-grid">
      {kpis.map((kp, idx) => (
        <div key={idx} className={`wr-kpi-card wr-kpi-${kp.accent}`}>
          <div className="wr-kpi-header">
            <span className="wr-kpi-label">{kp.label}</span>
            <div className="wr-kpi-icon-wrap">{kp.icon}</div>
          </div>
          <div className="wr-kpi-value">{kp.val}</div>
          <div className="wr-kpi-sub">{kp.sub}</div>
        </div>
      ))}
    </div>
  );
};
