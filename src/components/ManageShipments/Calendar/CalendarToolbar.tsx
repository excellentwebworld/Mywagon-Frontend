import React from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Columns3,
  List,
  PanelLeft,
} from 'lucide-react';
import {
  CALENDAR_RANGES,
  cls,
  type CalendarLayout,
  type CalendarRange,
} from './calendarUtils';

interface CalendarToolbarProps {
  range: CalendarRange;
  layout: CalendarLayout;
  onRangeChange: (r: CalendarRange) => void;
  onLayoutChange: (l: CalendarLayout) => void;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  railOpen: boolean;
  onToggleRail: () => void;
  stopsCount: number;
  loadsCount: number;
  overdueCount: number;
  onOverdueClick: (rect: DOMRect) => void;
  filterCount: number;
  loading?: boolean;
  t: (key: string, defaultValue?: string) => string;
}

const RANGE_LABEL_KEYS: Record<CalendarRange, [string, string]> = {
  day: ['day', 'Day'],
  '3day': ['threeDay', 'Three Day'],
  workweek: ['workingWeek', 'Working Week'],
  week: ['week', 'Week'],
  month: ['month', 'Month'],
};

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  range,
  layout,
  onRangeChange,
  onLayoutChange,
  periodLabel,
  onPrev,
  onNext,
  onToday,
  railOpen,
  onToggleRail,
  stopsCount,
  loadsCount,
  overdueCount,
  onOverdueClick,
  filterCount,
  loading = false,
  t,
}) => {
  const rangeName = t(...RANGE_LABEL_KEYS[range]);

  return (
    <div className="cal-toolbar">
      <div className="cal-toolbar-left">
        <button
          type="button"
          className={cls('cal-icon-btn', railOpen && 'is-on')}
          onClick={onToggleRail}
          aria-label={railOpen ? t('hideCalendarPanel', 'Hide calendar panel') : t('showCalendarPanel', 'Show calendar panel')}
          aria-pressed={railOpen}
          disabled={loading}
        >
          <PanelLeft size={18} />
          {filterCount > 0 && <span className="cal-tb-badge">{filterCount}</span>}
        </button>

        <button
          type="button"
          className="cal-btn cal-btn--today"
          onClick={onToday}
          disabled={loading}
        >
          <CalendarIcon size={15} />
          {t('today', 'Today')}
        </button>

        <div className="cal-nav-group">
          <button
            type="button"
            className="cal-icon-btn"
            onClick={onPrev}
            disabled={loading}
            aria-label={`${t('previous', 'Previous')} ${rangeName}`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="cal-icon-btn"
            onClick={onNext}
            disabled={loading}
            aria-label={`${t('next', 'Next')} ${rangeName}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <h2 className="cal-period-title" aria-live="polite">
          {periodLabel}
        </h2>

        <span className="cal-range-sum">
          {stopsCount} {t('stops', 'stops')} · {loadsCount} {t('loads', 'loads')}
        </span>

        {overdueCount > 0 && (
          <button
            type="button"
            className="cal-chip-alert"
            onClick={(e) => onOverdueClick(e.currentTarget.getBoundingClientRect())}
          >
            <AlertTriangle size={14} />
            {overdueCount} {t('overdue', 'overdue')}
          </button>
        )}
      </div>

      <div className="cal-toolbar-right">
        <div className="cal-seg" role="group" aria-label={t('layout', 'Layout')}>
          <button
            type="button"
            aria-pressed={layout === 'grid'}
            onClick={() => onLayoutChange('grid')}
          >
            <Columns3 size={15} />
            <span>{range === 'month' ? t('grid', 'Grid') : t('hours', 'Hours')}</span>
          </button>
          <button
            type="button"
            aria-pressed={layout === 'list'}
            onClick={() => onLayoutChange('list')}
          >
            <List size={15} />
            <span>{t('list', 'List')}</span>
          </button>
        </div>

        <div className="cal-seg cal-seg--range" role="group" aria-label={t('range', 'Range')}>
          {CALENDAR_RANGES.map(([v]) => (
            <button
              key={v}
              type="button"
              aria-pressed={range === v}
              onClick={() => onRangeChange(v)}
            >
              {t(...RANGE_LABEL_KEYS[v])}
            </button>
          ))}
        </div>

        <select
          className="cal-range-select"
          value={range}
          onChange={(e) => onRangeChange(e.target.value as CalendarRange)}
          aria-label={t('range', 'Range')}
        >
          {CALENDAR_RANGES.map(([v]) => (
            <option key={v} value={v}>
              {t(...RANGE_LABEL_KEYS[v])}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
