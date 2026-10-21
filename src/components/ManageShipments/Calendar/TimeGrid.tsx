import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { EventChip } from './EventChip';
import {
  HOUR_HEIGHT_PX,
  cls,
  getTodayYmd,
  layoutDayEvents,
  padZero,
  toYmd,
  weekdayIndex,
  type CalendarEvent,
} from './calendarUtils';

interface TimeGridProps {
  days: Date[];
  byDay: Record<string, CalendarEvent[]>;
  selectedId: string | null;
  onOpen: (ev: CalendarEvent, rect: DOMRect) => void;
  onDayOpen: (dateYmd: string) => void;
  /** Day range: full Pickup/Dropoff label, SID, customer, location. */
  detailed?: boolean;
  lang?: string;
  t: (key: string, defaultValue?: string) => string;
}

const WD3_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TimeGrid: React.FC<TimeGridProps> = ({
  days,
  byDay,
  selectedId,
  onOpen,
  onDayOpen,
  detailed = false,
  lang = 'en',
  t,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const todayYmd = getTodayYmd();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 6 * HOUR_HEIGHT_PX - 24;
  }, [days.length]);

  const hasAllDay = useMemo(
    () => days.some((d) => (byDay[toYmd(d)] || []).some((e) => e.allDay)),
    [days, byDay]
  );

  const n = days.length;
  const oneDay = detailed || n === 1;
  const wdLabels = useMemo(() => {
    if (lang === 'el') {
      const base = new Date(2026, 5, 1);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        return d.toLocaleDateString('el-GR', { weekday: 'short' });
      });
    }
    return WD3_EN;
  }, [lang]);

  return (
    <div className="tg" style={{ ['--n' as string]: n }}>
      <div className="tg-scroll" ref={ref}>
        <div
          className="tg-inner"
          style={n > 3 ? { minWidth: `calc(var(--gutter, 72px) + ${n} * 128px)` } : undefined}
        >
          <div className="tg-head">
            <div className="tg-corner">
              <span>{t('time', 'Time')}</span>
            </div>
            {days.map((d) => {
              const key = toYmd(d);
              const evs = byDay[key] || [];
              const pu = evs.filter((e) => e.type === 'pickup').length;
              const dl = evs.length - pu;
              const isToday = key === todayYmd;
              return (
                <button
                  type="button"
                  key={key}
                  className={cls('tg-dayhead', isToday && 'is-today')}
                  onClick={() => onDayOpen(key)}
                  title={t('openThisDay', 'Open this day')}
                >
                  <span className="tg-wd">{wdLabels[weekdayIndex(d)]}</span>
                  <span className="tg-dnum">{d.getDate()}</span>
                  <span className="tg-sum">
                    {evs.length
                      ? `${pu} ${pu === 1 ? t('pickup', 'Pickup') : t('pickups', 'Pickups')} · ${dl} ${dl === 1 ? t('dropoff', 'Dropoff') : t('dropoffs', 'Dropoffs')}`
                      : t('noStops', 'No stops')}
                  </span>
                </button>
              );
            })}
            {hasAllDay && (
              <>
                <div className="tg-corner tg-alllabel">{t('anyTime', 'Any time')}</div>
                {days.map((d) => {
                  const key = toYmd(d);
                  return (
                    <div key={`a-${key}`} className="tg-allcell">
                      {(byDay[key] || [])
                        .filter((e) => e.allDay)
                        .map((e) => (
                          <EventChip
                            key={e.id}
                            ev={e}
                            compact
                            detailed={oneDay}
                            showTime={false}
                            onOpen={onOpen}
                            selected={selectedId === e.id}
                            t={t}
                          />
                        ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="tg-body">
            <div className="tg-gutter" aria-hidden>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="tg-hour">
                  {h > 0 && <span>{padZero(h)}:00</span>}
                </div>
              ))}
            </div>
            {days.map((d) => {
              const key = toYmd(d);
              const laid = layoutDayEvents(byDay[key] || []);
              const isToday = key === todayYmd;
              const weekend = weekdayIndex(d) >= 5;
              return (
                <div
                  key={key}
                  className={cls('tg-col', isToday && 'is-today', weekend && 'is-weekend')}
                >
                  {laid.map(({ ev, col, cols, s, e }) => (
                    <EventChip
                      key={ev.id}
                      ev={ev}
                      onOpen={onOpen}
                      selected={selectedId === ev.id}
                      detailed={oneDay}
                      showTime={false}
                      compact={!oneDay && (e - s < 50 || cols > 2)}
                      t={t}
                      style={{
                        position: 'absolute',
                        top: (s / 60) * HOUR_HEIGHT_PX + 1,
                        height: Math.max(24, ((e - s) / 60) * HOUR_HEIGHT_PX - 2),
                        left: `calc(${(col / cols) * 100}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                      }}
                    />
                  ))}
                  {isToday && (
                    <div className="tg-now" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT_PX }}>
                      <span />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
