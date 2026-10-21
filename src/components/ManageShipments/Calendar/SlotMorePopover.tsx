import React from 'react';
import { X } from 'lucide-react';
import { FloatingPanel } from './FloatingPanel';
import { cls, type CalendarEvent } from './calendarUtils';

interface SlotMorePopoverProps {
  events: CalendarEvent[];
  extra: number;
  onClose: () => void;
  onOpen: (ev: CalendarEvent, rect: DOMRect) => void;
  onViewList: () => void;
  t: (key: string, defaultValue?: string) => string;
}

export const SlotMorePopover: React.FC<SlotMorePopoverProps> = ({
  events,
  extra,
  onClose,
  onOpen,
  onViewList,
  t,
}) => {
  return (
    <FloatingPanel onClose={onClose} width={420} label={t('moreStops', 'More stops')}>
      <div className="cal-more">
        <header className="cal-more-head">
          <b>
            +{extra} {t('moreStops', 'more stops')}
          </b>
          <button type="button" className="cal-icon-btn sm" onClick={onClose} aria-label={t('close', 'Close')}>
            <X size={15} />
          </button>
        </header>
        <div className="cal-more-rows">
          {events.map((ev) => (
            <button
              key={ev.id}
              type="button"
              className="cal-more-row"
              onClick={(e) => onOpen(ev, e.currentTarget.getBoundingClientRect())}
            >
              <span
                className={cls(
                  'ev__kind',
                  ev.type === 'pickup' ? 'ev__kind--pickup' : 'ev__kind--delivery'
                )}
              >
                {ev.type === 'pickup' ? t('pickup', 'Pickup') : t('dropoff', 'Dropoff')}
              </span>
              <span className="cal-more-sid">{ev.sid}</span>
              <span className="cal-more-cust">{ev.companyName || t('unknownCustomer', '—')}</span>
              <span className="cal-more-place">{ev.locationName || ev.city || '—'}</span>
            </button>
          ))}
        </div>
        <footer className="cal-more-foot">
          <button type="button" className="cal-btn cal-btn--primary cal-btn--wide" onClick={onViewList}>
            {t('viewList', 'View list')}
          </button>
        </footer>
      </div>
    </FloatingPanel>
  );
};
