import React, { useMemo } from 'react';
import { EventChip } from './EventChip';
import {
  cls,
  getWeekdayLabels,
  toDateLocale,
  type CalendarDayCell,
  type CalendarEvent,
} from './calendarUtils';

interface MonthViewProps {
  cells: CalendarDayCell[];
  eventsByDate: Record<string, CalendarEvent[]>;
  selectedId: string | null;
  onSelectEvent: (event: CalendarEvent, rect: DOMRect) => void;
  onSelectDate: (dateYmd: string) => void;
  /** Opens day view for the cell date (e.g. "+N more"). */
  onMore: (dateYmd: string) => void;
  lang?: string;
  t: (key: string, defaultValue?: string) => string;
}

const MAX_VISIBLE = 3;

export const MonthView: React.FC<MonthViewProps> = ({
  cells,
  eventsByDate,
  selectedId,
  onSelectEvent,
  onSelectDate,
  onMore,
  lang = 'en',
  t,
}) => {
  const weekdayLabels = useMemo(() => getWeekdayLabels(toDateLocale(lang), false), [lang]);
  const weeks = Math.ceil(cells.length / 7) || 5;

  return (
    <div className="mg">
      <div className="mg-head" aria-hidden>
        {weekdayLabels.map((label, idx) => (
          <div key={`${label}-${idx}`}>{label}</div>
        ))}
      </div>
      <div className="mg-grid" style={{ gridTemplateRows: `repeat(${weeks}, minmax(116px, 1fr))` }}>
        {cells.map((cell) => {
          const events = eventsByDate[cell.dateYmd] || [];
          const shown = events.length > MAX_VISIBLE ? events.slice(0, MAX_VISIBLE - 1) : events;
          const hidden = events.length - shown.length;

          return (
            <div
              key={cell.dateYmd}
              className={cls(
                'mg-cell',
                !cell.isCurrentMonth && 'is-out',
                cell.isToday && 'is-today',
                cell.isWeekend && 'is-weekend'
              )}
            >
              <div className="mg-top">
                <button
                  type="button"
                  className="mg-dnum"
                  onClick={() => onSelectDate(cell.dateYmd)}
                  aria-label={t('viewDaySchedule', 'View day schedule')}
                >
                  {cell.dayNumber === 1
                    ? `${cell.dayNumber} ${cell.date.toLocaleDateString(toDateLocale(lang), { month: 'short' })}`
                    : cell.dayNumber}
                </button>
                {events.length > 0 && (
                  <span className="mg-count">
                    {events.length} {events.length === 1 ? t('stop', 'stop') : t('stops', 'stops')}
                  </span>
                )}
              </div>
              {shown.map((e) => (
                <EventChip
                  key={e.id}
                  ev={e}
                  compact
                  onOpen={onSelectEvent}
                  selected={selectedId === e.id}
                  t={t}
                />
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  className="mg-more"
                  onClick={() => onMore(cell.dateYmd)}
                >
                  +{hidden} {t('more', 'more')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
