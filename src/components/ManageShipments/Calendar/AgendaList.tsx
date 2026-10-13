import React from 'react';
import { ArrowDown, ArrowUp, Calendar } from 'lucide-react';
import {
  STATUS_LABELS,
  cls,
  formatEventTimeRange,
  getTodayYmd,
  toYmd,
  type CalendarEvent,
} from './calendarUtils';

interface AgendaListProps {
  days: Date[];
  byDay: Record<string, CalendarEvent[]>;
  selectedId: string | null;
  showEmpty: boolean;
  onOpen: (ev: CalendarEvent, rect: DOMRect) => void;
  lang?: string;
  t: (key: string, defaultValue?: string) => string;
}

export const AgendaList: React.FC<AgendaListProps> = ({
  days,
  byDay,
  selectedId,
  showEmpty,
  onOpen,
  lang = 'en',
  t,
}) => {
  const todayYmd = getTodayYmd();
  const locale = lang === 'el' ? 'el-GR' : 'en-US';
  const rows = days
    .map((d) => ({ d, key: toYmd(d), evs: byDay[toYmd(d)] || [] }))
    .filter((r) => showEmpty || r.evs.length > 0);

  if (!rows.length) {
    return (
      <div className="cal-empty">
        <Calendar size={28} />
        <b>{t('noStopsInRange', 'No pickups or deliveries in this range')}</b>
        <span>{t('noStopsInRangeDesc', 'Try another range, the All tab, or fewer filters.')}</span>
      </div>
    );
  }

  return (
    <div className="ag">
      {rows.map(({ d, key, evs }) => {
        const isToday = key === todayYmd;
        const pu = evs.filter((e) => e.type === 'pickup').length;
        const dl = evs.length - pu;
        return (
          <section key={key} className="ag-day" aria-label={d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}>
            <h3 className={cls('ag-dayhead', isToday && 'is-today')}>
              <span>
                {d.toLocaleDateString(locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
              {isToday && <span className="today-tag">{t('today', 'Today')}</span>}
              <span className="ag-daysum">
                {evs.length
                  ? `${pu} ${t('pickups', 'Pickups').toLowerCase()} · ${dl} ${t('dropoffs', 'Dropoffs').toLowerCase()}`
                  : t('noPickupsOrDeliveries', 'No pickups or deliveries')}
              </span>
            </h3>
            {evs.map((ev) => {
              const vs = ev.visualStatus;
              const timeLabel = ev.allDay
                ? t('anyTime', 'Any time')
                : formatEventTimeRange(ev.timeStart, ev.timeEnd) || ev.timeStart;
              return (
                <button
                  type="button"
                  key={ev.id}
                  className={cls(
                    'ag-row',
                    `ev--st-${vs}`,
                    selectedId === ev.id && 'is-selected',
                    !ev.carrierName && vs !== 'canceled' && 'is-open',
                    vs === 'canceled' && 'is-canceled'
                  )}
                  onClick={(e) => onOpen(ev, e.currentTarget.getBoundingClientRect())}
                >
                  <span className="ag-time">{timeLabel}</span>
                  <span className="ag-kind">
                    <span className={cls('cal-kindtag', ev.type)}>
                      {ev.type === 'pickup' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      {ev.type === 'pickup' ? t('pickup', 'Pickup') : t('dropoff', 'Dropoff')}
                    </span>
                  </span>
                  <span className="ag-id">
                    <b>{ev.sid}</b>
                    {ev.orderId && <small>{ev.orderId}</small>}
                  </span>
                  <span className="ag-place">
                    <b>{ev.locationName || ev.city || '—'}</b>
                    <small>{ev.address || ''}</small>
                  </span>
                  <span className="ag-cust">
                    <small>{t('customer', 'Customer')}</small>
                    <span>{ev.companyName || '—'}</span>
                  </span>
                  <span className="ag-carrier">
                    <small>{t('transporter', 'Transporter')}</small>
                    <span>
                      {ev.carrierName || <i>{t('notAssigned', 'Not assigned')}</i>}
                    </span>
                  </span>
                  <span className="ag-status">
                    <span
                      className={cls('cal-pill', 'cal-pill--sm', `cal-pill--${vs}`)}
                      title={t(`legend_${vs}`, STATUS_LABELS[vs])}
                    >
                      {t(`legend_${vs}`, STATUS_LABELS[vs])}
                    </span>
                    {(ev.atRisk || ev.isOverdue) && (
                      <span className="ev__risk" title={t('needsAttention', 'Needs attention')}>
                        !
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
};
