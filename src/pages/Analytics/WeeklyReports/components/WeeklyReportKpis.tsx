import React from 'react';
import {
  FileText,
  CheckCircle,
  PlusCircle,
  Truck,
  Calendar,
} from 'lucide-react';
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

    if (activePreset === '1w' || activePreset === 'last_week') {
      return fromLabel && toLabel ? `Last Week (${fromLabel} – ${toLabel})` : 'Last Week';
    }
    if (activePreset === '4w') {
      return fromLabel && toLabel ? `Last 4 Weeks (${fromLabel} – ${toLabel})` : 'Last 4 Weeks';
    }
    if (activePreset === '8w') {
      return fromLabel && toLabel ? `Last 8 Weeks (${fromLabel} – ${toLabel})` : 'Last 8 Weeks';
    }
    if (activePreset === '12w') {
      return fromLabel && toLabel ? `Last 12 Weeks (${fromLabel} – ${toLabel})` : 'Last 12 Weeks';
    }
    if (activePreset === 'year') {
      return fromLabel && toLabel ? `This Year (${fromLabel} – ${toLabel})` : 'This Year';
    }
    if (fromLabel && toLabel) {
      return `${fromLabel} – ${toLabel}`;
    }
    if (meta?.date_range_start && meta?.date_range_end) {
      return `${formatDateLabel(meta.date_range_start)} – ${formatDateLabel(meta.date_range_end)} (All available)`;
    }
    return 'All Available Reports';
  };

  const kpis = [
    {
      label: 'Total Weekly Reports',
      val: totalReports,
      sub: getPeriodSubtitle(),
      icon: <FileText size={18} className="text-blue-500" />,
      accent: 'blue',
    },
    {
      label: 'Loads Fulfilled',
      val: totalFulfilled,
      sub: 'Completed shipments in period',
      icon: <CheckCircle size={18} className="text-[var(--mv-success)]" />,
      accent: 'emerald',
    },
    {
      label: 'Loads Created',
      val: totalCreated,
      sub: 'New shipments placed in period',
      icon: <PlusCircle size={18} className="text-indigo-500" />,
      accent: 'indigo',
    },
    {
      label: 'Active In Transit',
      val: totalInProgress,
      sub: 'On trip · Scheduled · Ready',
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
