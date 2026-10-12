import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { shipmentsService } from '../../../api';
import type { CalendarShipmentsParams } from '../../../api/types/shipments';
import type { Shipment } from '../../../context/AppContext';
import {
  DEFAULT_RAIL_FILTERS,
  applyRailFilters,
  collectOverdueEvents,
  extractCalendarEvents,
  getCalendarMonthGrid,
  getRangeDateRange,
  getTodayYmd,
  groupEventsByDate,
  loadCalPrefs,
  parseCalendarLayout,
  parseCalendarRange,
  parseYmdDate,
  rangeLabel,
  saveCalPrefs,
  cls,
  stepCursor,
  toDateLocale,
  toYmd,
  visibleDays,
  type CalendarEvent,
  type CalendarLayout,
  type CalendarRailFilters,
  type CalendarRange,
} from './calendarUtils';
import { CalendarToolbar } from './CalendarToolbar';
import { MonthView } from './MonthView';
import { TimeGrid } from './TimeGrid';
import { AgendaList } from './AgendaList';
import { EventDetailPopover } from './EventDetailPopover';
import { FilterRail } from './FilterRail';
import { DayMore } from './DayMore';
import { OverdueList } from './OverdueList';
import {
  filtersToApiParams,
  statusTabToApiStatus,
  type ShipmentsFilterState,
  type StatusTabKey,
} from '../../../pages/ManageShipments/utils/listingUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import '../../../styles/manage-calendar.css';

interface CalendarViewProps {
  direction: 'outbound' | 'inbound';
  activeTabStatus?: StatusTabKey;
  searchQuery: string;
  appliedFilters: ShipmentsFilterState;
  t: (key: string, defaultValue?: string) => string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  direction,
  activeTabStatus,
  searchQuery,
  appliedFilters,
  t,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useTranslation();
  const dateLocale = toDateLocale(lang);
  const prefs = useMemo(() => loadCalPrefs(), []);

  const initialDateStr = searchParams.get('cal_date') || getTodayYmd();
  const initialDate = parseYmdDate(initialDateStr);
  const urlRange = searchParams.get('cal_view');
  const urlLayout = searchParams.get('cal_layout');

  const [cursor, setCursor] = useState<Date>(() => initialDate);
  const [range, setRange] = useState<CalendarRange>(() =>
    parseCalendarRange(urlRange || prefs.range || 'week')
  );
  const [layout, setLayout] = useState<CalendarLayout>(() =>
    parseCalendarLayout(urlLayout || prefs.layout || 'grid')
  );
  const [railOpen, setRailOpen] = useState(
    () => prefs.railOpen ?? (typeof window !== 'undefined' ? window.innerWidth >= 1180 : true)
  );
  const [railFilters, setRailFilters] = useState<CalendarRailFilters>(DEFAULT_RAIL_FILTERS);

  const [calendarShipments, setCalendarShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pop, setPop] = useState<{ event: CalendarEvent; anchor: DOMRect | null } | null>(null);
  const [more, setMore] = useState<{ dateYmd: string; anchor: DOMRect | null } | null>(null);
  const [overdueAnchor, setOverdueAnchor] = useState<DOMRect | null>(null);

  const updateUrlParams = useCallback(
    (nextRange: CalendarRange, nextLayout: CalendarLayout, dateYmd: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('view', 'calendar');
          next.set('cal_view', nextRange);
          next.set('cal_layout', nextLayout);
          next.set('cal_date', dateYmd);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    saveCalPrefs({ range, layout, railOpen });
  }, [range, layout, railOpen]);

  useEffect(() => {
    updateUrlParams(range, layout, toYmd(cursor));
  }, [range, layout, cursor, updateUrlParams]);

  const dateRange = useMemo(() => getRangeDateRange(range, cursor), [range, cursor]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const apiStatus = activeTabStatus ? statusTabToApiStatus(activeTabStatus) : undefined;

    const params: CalendarShipmentsParams = {
      from: dateRange.from,
      to: dateRange.to,
      direction,
      ...filtersToApiParams(appliedFilters),
      ...(apiStatus !== undefined ? { status: apiStatus } : {}),
      ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
    };

    shipmentsService
      .calendar(params)
      .then((items) => {
        if (cancelled) return;
        setCalendarShipments(items);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load calendar shipments:', err);
        setError(t('failedLoadCalendar', 'Failed to load calendar events'));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange.from, dateRange.to, direction, activeTabStatus, searchQuery, appliedFilters, t]);

  const allEvents = useMemo(
    () => extractCalendarEvents(calendarShipments),
    [calendarShipments]
  );

  // Canceled toggle only meaningful on Active (API may still return mixed); drafts on Active/Drafts.
  const statusTabAllowsCanceled =
    !activeTabStatus || activeTabStatus === 'active' || activeTabStatus === 'cancelled';
  const statusTabAllowsDrafts =
    !activeTabStatus || activeTabStatus === 'active' || activeTabStatus === 'drafts';

  const railFiltersEffective = useMemo(() => {
    const f = { ...railFilters };
    // Specific status tabs already scope the API — don't hide matching events client-side.
    if (
      activeTabStatus &&
      activeTabStatus !== 'active' &&
      activeTabStatus !== 'cancelled' &&
      activeTabStatus !== 'drafts'
    ) {
      f.showCanceled = true;
      f.showDrafts = true;
      return f;
    }
    if (!statusTabAllowsCanceled) f.showCanceled = false;
    if (!statusTabAllowsDrafts) f.showDrafts = false;
    if (activeTabStatus === 'cancelled') f.showCanceled = true;
    if (activeTabStatus === 'drafts') f.showDrafts = true;
    return f;
  }, [railFilters, statusTabAllowsCanceled, statusTabAllowsDrafts, activeTabStatus]);

  const filteredEvents = useMemo(
    () => applyRailFilters(allEvents, railFiltersEffective),
    [allEvents, railFiltersEffective]
  );
  const eventsByDate = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);
  const days = useMemo(() => visibleDays(range, cursor), [range, cursor]);
  const monthCells = useMemo(() => {
    if (range !== 'month') return [];
    return getCalendarMonthGrid(cursor.getFullYear(), cursor.getMonth());
  }, [range, cursor]);

  const inRangeEvents = useMemo(
    () => days.flatMap((d) => eventsByDate[toYmd(d)] || []),
    [days, eventsByDate]
  );
  const loadsInRange = useMemo(
    () => new Set(inRangeEvents.map((e) => e.shipmentId)).size,
    [inRangeEvents]
  );
  const overdue = useMemo(() => collectOverdueEvents(allEvents), [allEvents]);

  const filterCount = useMemo(() => {
    const f = railFilters;
    return (
      (f.customers.length ? 1 : 0) +
      (f.carriers.length ? 1 : 0) +
      (f.channel !== 'all' ? 1 : 0) +
      (f.price !== 'all' ? 1 : 0) +
      (!f.pickup || !f.delivery ? 1 : 0) +
      (f.showCanceled ? 1 : 0) +
      (f.showDrafts ? 1 : 0)
    );
  }, [railFilters]);

  const periodLabelText = useMemo(
    () => rangeLabel(range, days, dateLocale),
    [range, days, dateLocale]
  );

  const relatedStops = useMemo(() => {
    if (!pop) return [];
    return allEvents
      .filter((e) => e.shipmentId === pop.event.shipmentId)
      .sort((a, b) => (a.stopIndex ?? 0) - (b.stopIndex ?? 0));
  }, [pop, allEvents]);

  const openEvent = useCallback((ev: CalendarEvent, rect: DOMRect) => {
    setMore(null);
    setOverdueAnchor(null);
    setPop({ event: ev, anchor: rect });
  }, []);

  const closePop = useCallback(() => setPop(null), []);
  const closeMore = useCallback(() => setMore(null), []);
  const closeOverdue = useCallback(() => setOverdueAnchor(null), []);

  const handleRangeChange = (r: CalendarRange) => {
    setRange(r);
    setPop(null);
    setMore(null);
  };

  const handleLayoutChange = (l: CalendarLayout) => {
    setLayout(l);
    setPop(null);
  };

  const handlePrev = () => {
    setCursor((c) => stepCursor(range, c, -1));
    setPop(null);
    setMore(null);
  };

  const handleNext = () => {
    setCursor((c) => stepCursor(range, c, 1));
    setPop(null);
    setMore(null);
  };

  const handleToday = () => {
    setCursor(new Date());
    setPop(null);
    setMore(null);
  };

  const openDay = useCallback((dateYmd: string) => {
    setCursor(parseYmdDate(dateYmd));
    setRange('day');
    setPop(null);
    setMore(null);
  }, []);

  const pickDay = useCallback((d: Date) => {
    setCursor(d);
    if (typeof window !== 'undefined' && window.innerWidth < 900) setRailOpen(false);
  }, []);

  const jumpTo = useCallback((ev: CalendarEvent) => {
    setOverdueAnchor(null);
    setMore(null);
    setCursor(parseYmdDate(ev.dateYmd));
    setPop({ event: ev, anchor: null });
  }, []);

  const handleNavigateToDetail = (shipmentId: number) => {
    navigate(`/shipments/${shipmentId}`);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        setPop(null);
        setMore(null);
        setOverdueAnchor(null);
        if (typeof window !== 'undefined' && window.innerWidth < 900) setRailOpen(false);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 't') setCursor(new Date());
      else if (e.key === 'ArrowLeft') setCursor((c) => stepCursor(range, c, -1));
      else if (e.key === 'ArrowRight') setCursor((c) => stepCursor(range, c, 1));
      else if (k === 'd') setRange('day');
      else if (k === '3') setRange('3day');
      else if (k === 'r') setRange('workweek');
      else if (k === 'w') setRange('week');
      else if (k === 'm') setRange('month');
      else if (k === 'l') setLayout((x) => (x === 'grid' ? 'list' : 'grid'));
      else return;
      e.preventDefault();
      setPop(null);
      setMore(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [range]);

  const selectedId = pop?.event.id ?? null;

  const calendarBody =
    layout === 'list' ? (
      <AgendaList
        days={days}
        byDay={eventsByDate}
        selectedId={selectedId}
        showEmpty={range !== 'month'}
        onOpen={openEvent}
        lang={lang}
        t={t}
      />
    ) : range === 'month' ? (
      <MonthView
        cells={monthCells}
        eventsByDate={eventsByDate}
        selectedId={selectedId}
        onSelectEvent={openEvent}
        onSelectDate={openDay}
        onMore={(dateYmd, rect) => {
          setPop(null);
          setMore({ dateYmd, anchor: rect });
        }}
        lang={lang}
        t={t}
      />
    ) : (
      <TimeGrid
        key={range}
        days={days}
        byDay={eventsByDate}
        selectedId={selectedId}
        onOpen={openEvent}
        onDayOpen={openDay}
        lang={lang}
        t={t}
      />
    );

  return (
    <div className="cal-container">
      <CalendarToolbar
        range={range}
        layout={layout}
        onRangeChange={handleRangeChange}
        onLayoutChange={handleLayoutChange}
        periodLabel={periodLabelText}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        railOpen={railOpen}
        onToggleRail={() => setRailOpen((o) => !o)}
        stopsCount={inRangeEvents.length}
        loadsCount={loadsInRange}
        overdueCount={overdue.length}
        onOverdueClick={(rect) => {
          setPop(null);
          setMore(null);
          setOverdueAnchor(rect);
        }}
        filterCount={filterCount}
        loading={loading}
        t={t}
      />

      {error && <div className="cal-error-banner">{error}</div>}

      {loading && (
        <div className="cal-loading-overlay">
          <div className="cal-loading-spinner" />
          <span>{t('loadingCalendar', 'Loading scheduled loads...')}</span>
        </div>
      )}

      <div className={cls('cal-body', railOpen && 'has-rail')}>
        {railOpen && (
          <>
            <FilterRail
              cursor={cursor}
              days={days}
              byDay={eventsByDate}
              filters={railFilters}
              setFilters={setRailFilters}
              eventsForFacets={allEvents}
              statusTabAllowsCanceled={statusTabAllowsCanceled}
              statusTabAllowsDrafts={statusTabAllowsDrafts}
              onPickDate={pickDay}
              onClose={() => setRailOpen(false)}
              t={t}
            />
            <div className="cal-rail-scrim" onClick={() => setRailOpen(false)} />
          </>
        )}
        <div className="cal-main">{calendarBody}</div>
      </div>

      {pop && (
        <EventDetailPopover
          key={pop.event.id}
          event={pop.event}
          relatedStops={relatedStops}
          anchor={pop.anchor}
          onClose={closePop}
          onNavigateToDetail={handleNavigateToDetail}
          onJumpStop={(ev) => {
            setCursor(parseYmdDate(ev.dateYmd));
            setPop({ event: ev, anchor: null });
          }}
          t={t}
        />
      )}

      {more && (
        <DayMore
          key={more.dateYmd}
          dateYmd={more.dateYmd}
          anchor={more.anchor}
          events={eventsByDate[more.dateYmd] || []}
          onOpen={openEvent}
          onClose={closeMore}
          onDayOpen={openDay}
          lang={lang}
          t={t}
        />
      )}

      {overdueAnchor && (
        <OverdueList
          anchor={overdueAnchor}
          events={overdue}
          onClose={closeOverdue}
          onJump={jumpTo}
          t={t}
        />
      )}
    </div>
  );
};
