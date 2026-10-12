import React from 'react';
import { X } from 'lucide-react';
import {
  STATUS_LABELS,
  cls,
  formatDmy,
  type CalendarEvent,
} from './calendarUtils';
import { FloatingPanel } from './FloatingPanel';

interface OverdueListProps {
  anchor: DOMRect | null;
  events: CalendarEvent[];
  onClose: () => void;
  onJump: (ev: CalendarEvent) => void;
  t: (key: string, defaultValue?: string) => string;
}

export const OverdueList: React.FC<OverdueListProps> = ({
  anchor,
  events,
  onClose,
  onJump,
  t,
}) => {
  return (
    <FloatingPanel
      anchor={anchor}
      onClose={onClose}
      width={420}
      label={t('overdueLoads', 'Overdue loads')}
    >
      <div className="cal-od-panel">
        <header className="cal-daymore-head">
          <div className="cal-daymore-title">
            <h3>
              {t('needsAttention', 'Needs attention')} · {events.length}
            </h3>
          </div>
          <button
            type="button"
            className="cal-icon-btn sm"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>
        <p className="cal-mini-note">
          {t(
            'overdueNote',
            'Past Due loads and Pending loads whose pickup date has passed, in the dates you are viewing.'
          )}
        </p>
        <div className="cal-od-list">
          {events.map((ev) => (
            <button
              type="button"
              key={ev.shipmentId}
              className={cls('cal-od-row', `ev--st-${ev.visualStatus}`)}
              onClick={() => onJump(ev)}
            >
              <span className="cal-od-id">
                <b>{ev.sid}</b>
                <small>{formatDmy(ev.dateYmd)}</small>
              </span>
              <span className="cal-od-lane">
                {ev.locationName || ev.city || '—'}
                <small>{ev.companyName || ''}</small>
              </span>
              <span className={cls('cal-pill', 'cal-pill--sm', `cal-pill--${ev.visualStatus}`)}>
                {t(`legend_${ev.visualStatus}`, STATUS_LABELS[ev.visualStatus])}
              </span>
            </button>
          ))}
        </div>
      </div>
    </FloatingPanel>
  );
};
