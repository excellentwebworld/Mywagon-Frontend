import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Mail,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { weeklyReportsService } from '../../../api/services/weeklyReportsService';
import type {
  WeeklyReportItem,
  WeeklyReportsMeta,
} from '../../../api/types/weeklyReports';
import { WeeklyReportsFilterBar } from './components/WeeklyReportsFilterBar';
import { WeeklyReportKpis } from './components/WeeklyReportKpis';
import { WeeklyReportsTable } from './components/WeeklyReportsTable';
import { WeeklyReportEmailModal } from './components/WeeklyReportEmailModal';

import './weekly-reports.css';

export function getMondayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

export function getSundayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diffToSunday = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + diffToSunday);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

export function getPresetDateRange(presetKey: string, referenceDate?: Date): { from: string; to: string } {
  const now = referenceDate || new Date();
  const day = now.getDay();
  const diffToLastSunday = day === 0 ? 7 : day;
  const lastSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToLastSunday);
  const lastMonday = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() - 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  if (presetKey === '1w' || presetKey === 'last_week') {
    return { from: fmt(lastMonday), to: fmt(lastSunday) };
  }
  if (presetKey === '4w') {
    const from = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() - 21);
    return { from: fmt(from), to: fmt(lastSunday) };
  }
  if (presetKey === '8w') {
    const from = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() - 49);
    return { from: fmt(from), to: fmt(lastSunday) };
  }
  if (presetKey === '12w') {
    const from = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() - 77);
    return { from: fmt(from), to: fmt(lastSunday) };
  }
  if (presetKey === 'year') {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return { from: getMondayOfWeek(fmt(yearStart)), to: fmt(lastSunday) };
  }
  return { from: '', to: '' };
}

export function resolveActivePreset(
  from?: string,
  to?: string
): string {
  if (!from && !to) {
    return 'all';
  }
  for (const key of ['1w', '4w', '8w', '12w', 'year'] as const) {
    const expected = getPresetDateRange(key);
    if (expected.from === from && expected.to === to) {
      return key;
    }
  }
  const yearPreset = getPresetDateRange('year');
  if (
    to === yearPreset.to &&
    (from === yearPreset.from || from === `${new Date().getFullYear()}-01-01`)
  ) {
    return 'year';
  }
  return 'custom';
}

export const WeeklyReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [reports, setReports] = useState<WeeklyReportItem[]>([]);
  const [meta, setMeta] = useState<WeeklyReportsMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') || searchParams.get('search') || ''
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => (searchParams.get('q') || searchParams.get('search') || '').trim()
  );

  const [dateFrom, setDateFrom] = useState(() => {
    const f = searchParams.get('from');
    if (f) return f;
    const p = searchParams.get('preset');
    if (p && ['1w', '4w', '8w', '12w', 'year'].includes(p)) {
      return getPresetDateRange(p).from;
    }
    return '';
  });

  const [dateTo, setDateTo] = useState(() => {
    const t = searchParams.get('to');
    if (t) return t;
    const p = searchParams.get('preset');
    if (p && ['1w', '4w', '8w', '12w', 'year'].includes(p)) {
      return getPresetDateRange(p).to;
    }
    return '';
  });

  const [appliedFrom, setAppliedFrom] = useState(() => {
    const f = searchParams.get('from');
    if (f) return f;
    const p = searchParams.get('preset');
    if (p && ['1w', '4w', '8w', '12w', 'year'].includes(p)) {
      return getPresetDateRange(p).from;
    }
    return '';
  });

  const [appliedTo, setAppliedTo] = useState(() => {
    const t = searchParams.get('to');
    if (t) return t;
    const p = searchParams.get('preset');
    if (p && ['1w', '4w', '8w', '12w', 'year'].includes(p)) {
      return getPresetDateRange(p).to;
    }
    return '';
  });

  const activePreset = resolveActivePreset(appliedFrom, appliedTo);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [selectedReport, setSelectedReport] = useState<WeeklyReportItem | null>(null);
  const [exportingReportId, setExportingReportId] = useState<string | number | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load reports
  const fetchReports = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await weeklyReportsService.list({
          from: appliedFrom || undefined,
          to: appliedTo || undefined,
          q: debouncedSearch || undefined,
          page,
          per_page: perPage,
        });

        setReports(res.data);
        setMeta(res.meta);
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : 'Failed to load weekly reports',
          'error'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedFrom, appliedTo, debouncedSearch, page, perPage, showToast]
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Sync state to URL search params
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (debouncedSearch) nextParams.set('q', debouncedSearch);
    if (appliedFrom) nextParams.set('from', appliedFrom);
    if (appliedTo) nextParams.set('to', appliedTo);
    if (activePreset && activePreset !== 'all' && activePreset !== 'custom') {
      nextParams.set('preset', activePreset);
    }
    setSearchParams(nextParams, { replace: true });
  }, [debouncedSearch, appliedFrom, appliedTo, activePreset, setSearchParams]);

  // Handlers
  const handleDateFromChange = (v: string) => {
    if (!v) {
      setDateFrom('');
      return;
    }
    const monday = getMondayOfWeek(v);
    const sunday = getSundayOfWeek(v);
    setDateFrom(monday);

    // If dateTo is empty or before this Monday, autofill with this week's weekend (Sunday)
    if (!dateTo || dateTo < monday) {
      setDateTo(sunday);
    } else {
      setDateTo(getSundayOfWeek(dateTo));
    }
  };

  const handleDateToChange = (v: string) => {
    if (!v) {
      setDateTo('');
      return;
    }
    const sunday = getSundayOfWeek(v);
    const monday = getMondayOfWeek(v);
    setDateTo(sunday);

    // If dateFrom is empty or after this Sunday, set dateFrom to the Monday of this week
    if (!dateFrom || dateFrom > sunday) {
      setDateFrom(monday);
    } else {
      setDateFrom(getMondayOfWeek(dateFrom));
    }
  };

  const handleApplyDateFilter = () => {
    const finalFrom = dateFrom ? getMondayOfWeek(dateFrom) : '';
    const finalTo = dateTo ? getSundayOfWeek(dateTo) : (finalFrom ? getSundayOfWeek(finalFrom) : '');
    setDateFrom(finalFrom);
    setDateTo(finalTo);
    setAppliedFrom(finalFrom);
    setAppliedTo(finalTo);
    setPage(1);
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedFrom('');
    setAppliedTo('');
    setSearchQuery('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleSelectPreset = (presetKey: string) => {
    setPage(1);

    if (presetKey === 'all') {
      setDateFrom('');
      setDateTo('');
      setAppliedFrom('');
      setAppliedTo('');
      return;
    }

    const range = getPresetDateRange(presetKey);
    setDateFrom(range.from);
    setDateTo(range.to);
    setAppliedFrom(range.from);
    setAppliedTo(range.to);
  };

  const handleExportCsv = async (report: WeeklyReportItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExportingReportId(report.id);
    try {
      const result = await weeklyReportsService.exportReport(report.week_start);
      showToast(`Exported ${result.filename || 'weekly report CSV'}`, 'success');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not export weekly report.',
        'error'
      );
    } finally {
      setExportingReportId(null);
    }
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const result = await weeklyReportsService.exportAll({
        from: appliedFrom || undefined,
        to: appliedTo || undefined,
      });
      showToast(`Exported ${result.filename || 'weekly reports register'}`, 'success');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not export weekly reports.',
        'error'
      );
    } finally {
      setExportingAll(false);
    }
  };

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

  const dateRangeLabel = (() => {
    const fromLabel = formatDateLabel(appliedFrom || meta?.date_range_start);
    const toLabel = formatDateLabel(appliedTo || meta?.date_range_end);
    if (activePreset === '1w' || activePreset === 'last_week') return `Last Week (${fromLabel} – ${toLabel})`;
    if (activePreset === '4w') return `Last 4 Weeks (${fromLabel} – ${toLabel})`;
    if (activePreset === '8w') return `Last 8 Weeks (${fromLabel} – ${toLabel})`;
    if (activePreset === '12w') return `Last 12 Weeks (${fromLabel} – ${toLabel})`;
    if (activePreset === 'year') return `This Year (${fromLabel} – ${toLabel})`;
    if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
    return undefined;
  })();

  return (
    <div className="wr-page">
      {/* Header Banner */}
      <div className="wr-header-card">
        <div className="wr-header-content">
          <div className="wr-header-title-wrap">
            <div className="wr-header-icon">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="wr-header-title">
                {t('weeklyReports.title', 'Weekly Reports')}
              </h1>
              <p className="wr-header-desc">
                {t(
                  'weeklyReports.subtitle',
                  'Weekly logistics performance summaries delivered every Monday to your inbox'
                )}
              </p>
            </div>
          </div>

          <div className="wr-header-actions">
            <button
              type="button"
              className="wr-btn wr-btn-secondary"
              onClick={() => fetchReports(true)}
              disabled={refreshing || loading}
              title="Refresh reports"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <WeeklyReportKpis
        reports={reports}
        meta={meta}
        loading={loading}
        dateFrom={appliedFrom}
        dateTo={appliedTo}
        activePreset={activePreset}
      />

      {/* Filter Toolbar (Date range, presets, search, bulk export) */}
      <WeeklyReportsFilterBar
        searchQuery={searchQuery}
        dateFrom={dateFrom}
        dateTo={dateTo}
        appliedFrom={appliedFrom}
        appliedTo={appliedTo}
        onSearchChange={setSearchQuery}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onApplyDateFilter={handleApplyDateFilter}
        onClearFilters={handleClearFilters}
        onSelectPreset={handleSelectPreset}
        activePreset={activePreset}
        onExportAll={handleExportAll}
        exportingAll={exportingAll}
        totalCount={meta?.total ?? reports.length}
        dateRangeLabel={dateRangeLabel}
      />

      {/* Main Weekly Reports Table */}
      <WeeklyReportsTable
        reports={reports}
        loading={loading}
        page={page}
        lastPage={meta?.last_page ?? 1}
        total={meta?.total ?? reports.length}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={(newPerPage) => {
          setPerPage(newPerPage);
          setPage(1);
        }}
        onSelectReport={(r) => setSelectedReport(r)}
        onExportCsv={handleExportCsv}
        exportingReportId={exportingReportId}
      />

      {/* Weekly Report Email Modal */}
      {selectedReport && (
        <WeeklyReportEmailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onExportCsv={(r) => handleExportCsv(r)}
        />
      )}
    </div>
  );
};

export default WeeklyReportsPage;
