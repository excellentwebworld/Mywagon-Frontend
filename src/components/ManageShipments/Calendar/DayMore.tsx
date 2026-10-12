import React from 'react';
import { X } from 'lucide-react';
import { EventChip } from './EventChip';
import { FloatingPanel } from './FloatingPanel';
import { formatDayHeader, toDateLocale, type CalendarEvent } from './calendarUtils';

interface DayMoreProps {
  dateYmd: string;
  anchor: DOMRect | null;
  events: CalendarEvent[];
  onOpen: (ev: CalendarEvent, rect: DOMRect) => void;
  onClose: () => void;
  onDayOpen: (dateYmd: string) => void;
  lang?: string;
  t: (key: string, defaultValue?: string) => string;
}

export const DayMore: React.FC<DayMoreProps> = ({
  dateYmd,
  anchor,
  events,
  onOpen,
  onClose,
  onDayOpen,
  lang = 'en',
  t,
}) => {
  return (
    <FloatingPanel
      anchor={anchor}
      onClose={onClose}
      width={340}
      label={`${t('stopsOn', 'Stops on')} ${formatDayHeader(dateYmd, toDateLocale(lang))}`}
    >
      <div className="cal-daymore">
        <header className="cal-pop-head">
          <b>{formatDayHeader(dateYmd, toDateLocale(lang))}</b>
          <button type="button" className="cal-icon-btn sm" onClick={onClose} aria-label={t('close', 'Close')}>
            <X size={15} />
          </button>
        </header>
        <div className="cal-daymore-list">
          {events.map((e) => (
            <EventChip
              key={e.id}
              ev={e}
              onOpen={(ev, r) => {
                onClose();
                onOpen(ev, r);
              }}
              t={t}
            />
          ))}
        </div>
        <button
          type="button"
          className="cal-btn cal-btn--wide"
          onClick={() => {
            onClose();
            onDayOpen(dateYmd);
          }}
        >
          {t('openDayView', 'Open day view')}
        </button>
      </div>
    </FloatingPanel>
  );
};
