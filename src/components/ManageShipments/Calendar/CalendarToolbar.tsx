import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';

interface CalendarToolbarProps {
  viewPerspective: 'month' | 'day';
  onPerspectiveChange: (p: 'month' | 'day') => void;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  viewMode: 'list' | 'calendar';
  onViewModeChange: (m: 'list' | 'calendar') => void;
  totalEvents: number;
  pickupCount: number;
  deliveryCount: number;
  loading?: boolean;
  t: (key: string, defaultValue?: string) => string;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  viewPerspective,
  onPerspectiveChange,
  periodLabel,
  onPrev,
  onNext,
  onToday,
  viewMode,
  onViewModeChange,
  totalEvents,
  pickupCount,
  deliveryCount,
  loading = false,
  t,
}) => {
  return (
    <div className="cal-toolbar">
      <div className="cal-toolbar-left">
        <button
          type="button"
          className="cal-btn cal-btn--today"
          onClick={onToday}
          disabled={loading}
          aria-label={t('today', 'Today')}
        >
          {t('today', 'Today')}
        </button>

        <div className="cal-nav-group">
          <button
            type="button"
            className="cal-icon-btn"
            onClick={onPrev}
            disabled={loading}
            aria-label={t('previous', 'Previous')}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="cal-icon-btn"
            onClick={onNext}
            disabled={loading}
            aria-label={t('next', 'Next')}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <h2 className="cal-period-title">{periodLabel}</h2>

        <div className="cal-counts-chip" title={t('calendarSummaryTooltip', 'Scheduled stops')}>
          <span className="cal-counts-total">
            {totalEvents} {totalEvents === 1 ? t('event', 'Event') : t('events', 'Events')}
          </span>
          <span className="cal-counts-sep">·</span>
          <span className="cal-count-item cal-count-item--pickup">
            ↑ {pickupCount} {t('pickups', 'Pickups')}
          </span>
          <span className="cal-counts-sep">·</span>
          <span className="cal-count-item cal-count-item--dropoff">
            ↓ {deliveryCount} {t('dropoffs', 'Dropoffs')}
          </span>
        </div>
      </div>

      <div className="cal-toolbar-right">
        {/* Month vs Day Perspective */}
        <div className="cal-segmented" role="tablist" aria-label={t('calendarPerspective', 'Calendar Perspective')}>
          <button
            type="button"
            role="tab"
            aria-selected={viewPerspective === 'month'}
            className={`cal-segmented-btn ${viewPerspective === 'month' ? 'active' : ''}`}
            onClick={() => onPerspectiveChange('month')}
          >
            <LayoutGrid size={14} />
            <span>{t('month', 'Month')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewPerspective === 'day'}
            className={`cal-segmented-btn ${viewPerspective === 'day' ? 'active' : ''}`}
            onClick={() => onPerspectiveChange('day')}
          >
            <CalendarIcon size={14} />
            <span>{t('day', 'Day')}</span>
          </button>
        </div>

        {/* View Mode Switcher: Table vs Calendar */}
        <div className="cal-segmented" role="tablist" aria-label={t('viewMode', 'View Mode')}>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'list'}
            className={`cal-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title={t('tableView', 'Table View')}
          >
            <List size={14} />
            <span>{t('table', 'Table')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'calendar'}
            className={`cal-segmented-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => onViewModeChange('calendar')}
            title={t('calendarView', 'Calendar View')}
          >
            <CalendarIcon size={14} />
            <span>{t('calendar', 'Calendar')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
