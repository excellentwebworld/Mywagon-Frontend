import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  STATUS_LABELS,
  cls,
  formatEventTimeRange,
  type CalendarEvent,
} from './calendarUtils';

interface EventChipProps {
  ev: CalendarEvent;
  onOpen: (ev: CalendarEvent, rect: DOMRect) => void;
  selected?: boolean;
  compact?: boolean;
  style?: React.CSSProperties;
  t: (key: string, defaultValue?: string) => string;
}

export const EventChip: React.FC<EventChipProps> = ({
  ev,
  onOpen,
  selected = false,
  compact = false,
  style,
  t,
}) => {
  const risk = ev.atRisk || ev.isOverdue;
  const multi =
    ev.stopCount > 2 && ev.stopIndex != null
      ? ` ${(ev.stopIndex ?? 0) + 1}/${ev.stopCount}`
      : '';
  const timeLabel = ev.allDay
    ? t('anyTime', 'Any time')
    : formatEventTimeRange(ev.timeStart, ev.timeEnd) || ev.timeStart;
  const vs = ev.visualStatus;
  const label = `${ev.type === 'pickup' ? t('pickup', 'Pickup') : t('dropoff', 'Dropoff')} ${ev.sid}, ${timeLabel}, ${ev.companyName || ''}, ${ev.locationName || ''}, ${STATUS_LABELS[vs]}`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      className={cls(
        'ev',
        `ev--st-${vs}`,
        compact && 'ev--compact',
        !ev.carrierName && vs !== 'canceled' && 'ev--open',
        vs === 'canceled' && 'ev--canceled',
        selected && 'is-selected'
      )}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(ev, e.currentTarget.getBoundingClientRect());
      }}
    >
      <span className="ev__top">
        {ev.type === 'pickup' ? (
          <ArrowUp size={12} className="ev__icon" aria-hidden />
        ) : (
          <ArrowDown size={12} className="ev__icon" aria-hidden />
        )}
        <span className="ev__kind">
          {ev.type === 'pickup' ? 'PU' : 'DL'}
          {multi}
        </span>
        <span className="ev__time">{timeLabel}</span>
        <span className="ev__sid">{ev.sid}</span>
        {risk && (
          <span className="ev__risk" aria-hidden>
            !
          </span>
        )}
      </span>
      <span className="ev__cust">{ev.companyName || t('unknownCustomer', '—')}</span>
      {!compact && <span className="ev__place">{ev.locationName || ev.city || ''}</span>}
    </button>
  );
};
