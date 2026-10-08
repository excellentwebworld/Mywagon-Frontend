import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { WEEKDAY_KEYS, type CalendarDayCell, type CalendarEvent } from './calendarUtils';

interface MonthViewProps {
  cells: CalendarDayCell[];
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDate: (dateYmd: string) => void;
  t: (key: string, defaultValue?: string) => string;
}

const MAX_VISIBLE_EVENTS_PER_CELL = 3;

export const MonthView: React.FC<MonthViewProps> = ({
  cells,
  eventsByDate,
  onSelectEvent,
  onSelectDate,
  t,
}) => {
  return (
    <div className="cal-month">
      {/* Weekday headers */}
      <div className="cal-weekday-row">
        {WEEKDAY_KEYS.map((k) => (
          <div key={k} className="cal-weekday-cell">
            {t(k, k.slice(0, 3).toUpperCase())}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="cal-grid">
        {cells.map((cell) => {
          const events = eventsByDate[cell.dateYmd] || [];
          const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS_PER_CELL);
          const hiddenCount = events.length - visibleEvents.length;

          return (
            <div
              key={cell.dateYmd}
              className={`cal-day-cell ${cell.isCurrentMonth ? '' : 'is-outside'} ${
                cell.isToday ? 'is-today' : ''
              } ${cell.isWeekend ? 'is-weekend' : ''}`}
            >
              <div className="cal-day-cell-header">
                <button
                  type="button"
                  className={`cal-day-number ${cell.isToday ? 'cal-day-number--today' : ''}`}
                  onClick={() => onSelectDate(cell.dateYmd)}
                  title={t('viewDaySchedule', 'View day schedule')}
                >
                  {cell.dayNumber}
                </button>

                {events.length > 0 && (
                  <span
                    className="cal-day-total-badge"
                    onClick={() => onSelectDate(cell.dateYmd)}
                    title={`${events.length} ${t('events', 'Events')}`}
                  >
                    {events.length}
                  </span>
                )}
              </div>

              <div className="cal-day-events-list">
                {visibleEvents.map((ev) => {
                  const isPickup = ev.type === 'pickup';
                  const titleDesc = `${ev.sid} · ${isPickup ? t('pickup', 'Pickup') : t('dropoff', 'Dropoff')}${
                    ev.timeStart ? ` · ${ev.timeStart}` : ''
                  }${ev.productName ? ` · ${ev.productName}` : ''}${ev.orderId ? ` · Order: ${ev.orderId}` : ''}`;

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className={`cal-event-chip cal-event-chip--${ev.type}`}
                      onClick={() => onSelectEvent(ev)}
                      title={titleDesc}
                    >
                      <span className="cal-event-chip-icon">
                        {isPickup ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      </span>
                      {ev.timeStart && <span className="cal-event-chip-time">{ev.timeStart}</span>}
                      <span className="cal-event-chip-sid">{ev.sid}</span>
                      {ev.productName ? (
                        <span className="cal-event-chip-prod">{ev.productName}</span>
                      ) : ev.orderId ? (
                        <span className="cal-event-chip-prod">#{ev.orderId}</span>
                      ) : null}
                    </button>
                  );
                })}

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    className="cal-more-chip"
                    onClick={() => onSelectDate(cell.dateYmd)}
                    title={t('viewAllEventsForDay', 'View all events for this day')}
                  >
                    +{hiddenCount} {t('more', 'more')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
