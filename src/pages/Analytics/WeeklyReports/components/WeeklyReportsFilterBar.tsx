import React from 'react';
import {
  Search,
  Download,
  Calendar,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '../../../../components/ui/DatePicker';

interface WeeklyReportsFilterBarProps {
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  appliedFrom?: string;
  appliedTo?: string;
  onSearchChange: (q: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onApplyDateFilter: () => void;
  onClearFilters: () => void;
  onSelectPreset: (presetKey: string) => void;
  activePreset: string;
  onExportAll: () => void;
  exportingAll: boolean;
  totalCount: number;
  dateRangeLabel?: string;
}

export const WeeklyReportsFilterBar: React.FC<WeeklyReportsFilterBarProps> = ({
  searchQuery,
  dateFrom,
  dateTo,
  appliedFrom,
  appliedTo,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onApplyDateFilter,
  onClearFilters,
  onSelectPreset,
  activePreset,
  onExportAll,
  exportingAll,
  totalCount,
  dateRangeLabel,
}) => {
  const { t } = useTranslation();

  const presets = [
    { key: 'all', label: 'All Reports' },
    { key: '1w', label: 'Last Week' },
    { key: '4w', label: 'Last 4 Weeks' },
    { key: '8w', label: 'Last 8 Weeks' },
    { key: '12w', label: 'Last 12 Weeks' },
    { key: 'year', label: 'This Year' },
  ];

  const hasActiveFilters = Boolean(
    searchQuery || dateFrom || dateTo || appliedFrom || appliedTo || activePreset !== 'all'
  );

  const now = new Date();
  const day = now.getDay();
  const diffToLastSunday = day === 0 ? 7 : day;
  const lastCompletedSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToLastSunday);
  const lastCompletedMonday = new Date(lastCompletedSunday.getFullYear(), lastCompletedSunday.getMonth(), lastCompletedSunday.getDate() - 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const maxAllowedFrom = dateTo || fmt(lastCompletedMonday);
  const maxAllowedTo = fmt(lastCompletedSunday);

  return (
    <div className="wr-filter-card">
      {/* Top Filter Controls: Presets & Date Range */}
      <div className="wr-filter-top">
        {/* Preset Pills */}
        <div className="wr-preset-pills">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`wr-preset-btn ${activePreset === p.key ? 'active' : ''}`}
              onClick={() => onSelectPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Range Picker Controls */}
        <div className="wr-date-controls">
          <div className="wr-date-inputs">
            <DatePicker
              value={dateFrom}
              onChange={onDateFromChange}
              max={maxAllowedFrom}
              allowedDaysOfWeek={[1]}
              direction="auto"
              placeholder={t('billingPage.fromDate', 'From')}
            />
            <span className="wr-date-sep" aria-hidden="true">
              →
            </span>
            <DatePicker
              value={dateTo}
              onChange={onDateToChange}
              min={dateFrom || undefined}
              max={maxAllowedTo}
              allowedDaysOfWeek={[0]}
              direction="auto"
              placeholder={t('billingPage.toDate', 'To')}
            />
          </div>

          <button
            type="button"
            className="wr-btn wr-btn-primary"
            onClick={onApplyDateFilter}
          >
            {t('weeklyReports.filter', 'Filter')}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="wr-btn wr-btn-danger flex items-center gap-1"
              onClick={onClearFilters}
              title={t('weeklyReports.clear', 'Clear filters')}
            >
              <X size={13} />
              <span>{t('weeklyReports.clear', 'Clear')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Filter Controls: Search & Bulk Export */}
      <div className="wr-filter-bottom">
        <div className="wr-search-wrap">
          <Search size={15} className="wr-search-icon" />
          <input
            id="wr-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(
              'weeklyReports.searchPlaceholder',
              'Search by week period, month, or year…'
            )}
            aria-label={t('weeklyReports.searchPlaceholder', 'Search weekly reports')}
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              type="button"
              className="wr-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="wr-filter-meta-actions">
          {dateRangeLabel && (
            <span className="wr-range-indicator" title="Active reporting window">
              <span className="wr-range-indicator-dot" />
              <span>{dateRangeLabel}</span>
            </span>
          )}

          <span className="wr-total-badge">
            <strong>{totalCount}</strong> {totalCount === 1 ? 'weekly report' : 'weekly reports'}
          </span>

          <button
            type="button"
            className="wr-btn wr-btn-export"
            onClick={onExportAll}
            disabled={exportingAll || totalCount === 0}
            title={t('weeklyReports.exportAll', 'Export All as CSV')}
          >
            {exportingAll ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span>{t('weeklyReports.exportAll', 'Export All (CSV)')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
