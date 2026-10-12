import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  DEFAULT_RAIL_FILTERS,
  LEGEND_ORDER,
  STATUS_LABELS,
  addDays,
  cls,
  getTodayYmd,
  startOfMonth,
  startOfWeek,
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
  eventsForFacets: CalendarEvent[];
  statusTabAllowsCanceled: boolean;
  statusTabAllowsDrafts: boolean;
  onPickDate: (d: Date) => void;
  onClose: () => void;
  t: (key: string, defaultValue?: string) => string;
}

function MiniMonth({
  cursor,
  days,
  byDay,
  onPick,
  t,
}: {
  cursor: Date;
  days: Date[];
  byDay: Record<string, CalendarEvent[]>;
  onPick: (d: Date) => void;
  t: (key: string, defaultValue?: string) => string;
}) {
  const [m, setM] = useState(() => startOfMonth(cursor));
  useEffect(() => {
    setM(startOfMonth(cursor));
  }, [cursor.getFullYear(), cursor.getMonth()]);

  const start = startOfWeek(m);
  const inRange = useMemo(() => new Set(days.map(toYmd)), [days]);
  const today = getTodayYmd();
  const monthLabel = m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

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
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
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

function CheckList({
  title,
  items,
  selected,
  onChange,
  t,
}: {
  title: string;
  items: Array<[string, string, number]>;
  selected: string[];
  onChange: (v: string[]) => void;
  t: (key: string, defaultValue?: string) => string;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <fieldset className="cal-fgroup">
      <legend>
        {title}
        {selected.length > 0 && (
          <button type="button" className="cal-link" onClick={() => onChange([])}>
            {t('clear', 'Clear')}
          </button>
        )}
      </legend>
      {items.slice(0, 40).map(([v, label, count]) => (
        <label key={v} className="cal-check">
          <input
            type="checkbox"
            checked={selected.includes(v)}
            onChange={() => toggle(v)}
          />
          <span className="cal-check-label">{label}</span>
          <span className="cal-check-count">{count}</span>
        </label>
      ))}
      <span className="cal-hint">
        {selected.length
          ? `${selected.length} ${t('selected', 'selected')}`
          : t('showingAll', 'Showing all')}
      </span>
    </fieldset>
  );
}

export const FilterRail: React.FC<FilterRailProps> = ({
  cursor,
  days,
  byDay,
  filters,
  setFilters,
  eventsForFacets,
  statusTabAllowsCanceled,
  statusTabAllowsDrafts,
  onPickDate,
  onClose,
  t,
}) => {
  const set = (patch: Partial<CalendarRailFilters>) =>
    setFilters((p) => ({ ...p, ...patch }));

  const { customers, carriers } = useMemo(() => {
    const cc: Record<string, number> = {};
    const tc: Record<string, number> = {};
    eventsForFacets.forEach((e) => {
      const cust = e.companyName || '';
      if (cust) cc[cust] = (cc[cust] || 0) + 1;
      const car = e.carrierName || '__none';
      tc[car] = (tc[car] || 0) + 1;
    });
    const customersList = Object.keys(cc)
      .sort()
      .map((k) => [k, k, cc[k]] as [string, string, number]);
    const carriersList = Object.keys(tc)
      .filter((k) => k !== '__none')
      .sort()
      .map((k) => [k, k, tc[k]] as [string, string, number]);
    if (tc.__none) {
      carriersList.unshift(['__none', t('notAssignedYet', 'Not assigned yet'), tc.__none]);
    }
    return { customers: customersList, carriers: carriersList };
  }, [eventsForFacets, t]);

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

      <MiniMonth cursor={cursor} days={days} byDay={byDay} onPick={onPickDate} t={t} />

      <fieldset className="cal-fgroup">
        <legend>{t('show', 'Show')}</legend>
        <label className="cal-check">
          <input
            type="checkbox"
            checked={filters.pickup}
            onChange={(e) => set({ pickup: e.target.checked })}
          />
          <span className="cal-check-label">
            <ArrowUp size={13} /> {t('pickups', 'Pickups')}
          </span>
        </label>
        <label className="cal-check">
          <input
            type="checkbox"
            checked={filters.delivery}
            onChange={(e) => set({ delivery: e.target.checked })}
          />
          <span className="cal-check-label">
            <ArrowDown size={13} /> {t('dropoffs', 'Dropoffs')}
          </span>
        </label>
        <label className={cls('cal-check', !statusTabAllowsCanceled && 'is-disabled')}>
          <input
            type="checkbox"
            disabled={!statusTabAllowsCanceled}
            checked={filters.showCanceled}
            onChange={(e) => set({ showCanceled: e.target.checked })}
          />
          <span className="cal-check-label">{t('canceledLoads', 'Canceled loads')}</span>
        </label>
        <label className={cls('cal-check', !statusTabAllowsDrafts && 'is-disabled')}>
          <input
            type="checkbox"
            disabled={!statusTabAllowsDrafts}
            checked={filters.showDrafts}
            onChange={(e) => set({ showDrafts: e.target.checked })}
          />
          <span className="cal-check-label">{t('drafts', 'Drafts')}</span>
        </label>
        <span className="cal-hint">
          {statusTabAllowsCanceled
            ? t('canceledAppliesAll', 'Canceled applies when the All tab is selected.')
            : t('statusFromTab', 'Status comes from the tab above.')}
        </span>
      </fieldset>

      <CheckList
        title={t('customer', 'Customer')}
        items={customers}
        selected={filters.customers}
        onChange={(v) => set({ customers: v })}
        t={t}
      />
      <CheckList
        title={t('transporter', 'Transporter')}
        items={carriers}
        selected={filters.carriers}
        onChange={(v) => set({ carriers: v })}
        t={t}
      />

      <fieldset className="cal-fgroup">
        <legend>{t('channel', 'Channel')}</legend>
        <div className="cal-seg cal-seg--full" role="group" aria-label={t('channel', 'Channel')}>
          {(
            [
              ['all', t('all', 'All')],
              ['private', t('private', 'Private')],
              ['public', t('public', 'Public')],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={filters.channel === v}
              onClick={() => set({ channel: v })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="cal-fgroup">
        <legend>{t('pricing', 'Pricing')}</legend>
        <div className="cal-seg cal-seg--full" role="group" aria-label={t('pricing', 'Pricing')}>
          {(
            [
              ['all', t('all', 'All')],
              ['spot', t('spot', 'Spot')],
              ['contract', t('contract', 'Contract')],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={filters.price === v}
              onClick={() => set({ price: v })}
            >
              {label}
            </button>
          ))}
        </div>
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
              {k === 'bids'
                ? t('pendingBidsReceived', 'Pending · bids received')
                : t(`legend_${k}`, STATUS_LABELS[k])}
            </li>
          ))}
        </ul>
        <div className="cal-mini-label">{t('marks', 'Marks')}</div>
        <ul className="cal-marks">
          <li>
            <span className="cal-mk cal-mk--dash" />
            {t('markNoCarrier', 'No carrier assigned yet')}
          </li>
          <li>
            <span className="ev__risk">!</span>
            {t('markNeedsAttention', 'Needs attention (overdue or <48 h without carrier)')}
          </li>
          <li>
            <ArrowUp size={13} /> PU {t('pickup', 'Pickup')} · <ArrowDown size={13} /> DL{' '}
            {t('dropoff', 'Dropoff')}
          </li>
          <li>
            <s>SID-000000</s>&nbsp;{t('canceled', 'Canceled')}
          </li>
        </ul>
      </div>
    </aside>
  );
};
