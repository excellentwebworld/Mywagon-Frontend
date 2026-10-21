import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  DEFAULT_RAIL_FILTERS,
  LEGEND_ORDER,
  STATUS_LABELS,
  addDays,
  cls,
  formatMonthYear,
  getTodayYmd,
  getWeekdayLabels,
  startOfMonth,
  startOfWeek,
  toDateLocale,
  toYmd,
  type CalendarEvent,
  type CalendarRailFilters,
} from './calendarUtils';

interface FilterRailProps {
  cursor: Date;
  days: Date[];
  byDay: Record<string, CalendarEvent[]>;
  filters: CalendarRailFilters;
  setFilters: React.Dispatch<React.SetStateAction<CalendarRailFilters>>;
  onPickDate: (d: Date) => void;
  onClose: () => void;
  lang?: string;
  t: (key: string, defaultValue?: string) => string;
}

function MiniMonth({
  cursor,
  days,
  byDay,
  onPick,
  lang = 'en',
  t,
}: {
  cursor: Date;
  days: Date[];
  byDay: Record<string, CalendarEvent[]>;
  onPick: (d: Date) => void;
  lang?: string;
  t: (key: string, defaultValue?: string) => string;
}) {
  const [m, setM] = useState(() => startOfMonth(cursor));
  useEffect(() => {
    setM(startOfMonth(cursor));
  }, [cursor.getFullYear(), cursor.getMonth()]);

  const locale = toDateLocale(lang);
  const start = startOfWeek(m);
  const inRange = useMemo(() => new Set(days.map(toYmd)), [days]);
  const today = getTodayYmd();
  const monthLabel = formatMonthYear(m.getFullYear(), m.getMonth(), locale);
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(locale, true, 'narrow'),
    [locale]
  );

  return (
    <div className="cal-mini">
      <div className="cal-mini-head">
        <button
          type="button"
          className="cal-icon-btn sm"
          onClick={() => setM(new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          aria-label={t('previousMonth', 'Previous month')}
        >
          <ChevronLeft size={15} />
        </button>
        <b>{monthLabel}</b>
        <button
          type="button"
          className="cal-icon-btn sm"
          onClick={() => setM(new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          aria-label={t('nextMonth', 'Next month')}
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="cal-mini-grid">
        {weekdayLabels.map((w, i) => (
          <span key={i} className="cal-mini-wd">
            {w}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, i) => addDays(start, i)).map((d) => {
          const k = toYmd(d);
          const c = (byDay[k] || []).length;
          return (
            <button
              type="button"
              key={k}
              onClick={() => onPick(d)}
              aria-label={`${k}, ${c} stops`}
              className={cls(
                'cal-mini-day',
                d.getMonth() !== m.getMonth() && 'is-out',
                inRange.has(k) && 'in-range',
                k === today && 'is-today'
              )}
            >
              {d.getDate()}
              {c > 0 && <i className={cls('dot', c > 4 && 'dot--busy')} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const FilterRail: React.FC<FilterRailProps> = ({
  cursor,
  days,
  byDay,
  filters,
  setFilters,
  onPickDate,
  onClose,
  lang = 'en',
  t,
}) => {
  const set = (patch: Partial<CalendarRailFilters>) =>
    setFilters((p) => ({ ...p, ...patch }));

  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_RAIL_FILTERS);

  return (
    <aside className="cal-rail" aria-label={t('calendarFilters', 'Calendar filters')}>
      <div className="cal-rail-top">
        <b>{t('calendar', 'Calendar')}</b>
        <button
          type="button"
          className="cal-icon-btn sm cal-rail-close"
          onClick={onClose}
          aria-label={t('closeFilters', 'Close filters')}
        >
          <X size={15} />
        </button>
      </div>

      <MiniMonth
        cursor={cursor}
        days={days}
        byDay={byDay}
        onPick={onPickDate}
        lang={lang}
        t={t}
      />

      <fieldset className="cal-fgroup">
        <legend>{t('show', 'Show')}</legend>
        <label className="cal-check">
          <input
            type="checkbox"
            checked={filters.pickup}
            onChange={(e) => set({ pickup: e.target.checked })}
          />
          <span className="cal-check-label">
            <span className="cal-kindtag pickup">{t('pickup', 'Pickup')}</span>
          </span>
        </label>
        <label className="cal-check">
          <input
            type="checkbox"
            checked={filters.delivery}
            onChange={(e) => set({ delivery: e.target.checked })}
          />
          <span className="cal-check-label">
            <span className="cal-kindtag delivery">{t('dropoff', 'Dropoff')}</span>
          </span>
        </label>
      </fieldset>

      {dirty && (
        <button
          type="button"
          className="cal-btn cal-btn--wide"
          onClick={() => setFilters(DEFAULT_RAIL_FILTERS)}
        >
          {t('resetFilters', 'Reset filters')}
        </button>
      )}

      <div className="cal-legend">
        <div className="cal-mini-label">{t('colourLoadStatus', 'Colour = load status')}</div>
        <ul>
          {LEGEND_ORDER.map((k) => (
            <li key={k} className={`ev--st-${k}`}>
              <i />
              {t(`legend_${k}`, STATUS_LABELS[k])}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
