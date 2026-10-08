import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { shipmentsService } from '../../../api';
import type { CalendarShipmentsParams } from '../../../api/types/shipments';
import type { Shipment } from '../../../context/AppContext';
import {
  extractCalendarEvents,
  formatMonthYear,
  getAdjacentDay,
  getAdjacentMonth,
  getCalendarMonthGrid,
  getMonthDateRange,
  getTodayYmd,
  groupEventsByDate,
  parseYmdDate,
  toYmd,
  type CalendarEvent,
} from './calendarUtils';
import { CalendarToolbar } from './CalendarToolbar';
import { MonthView } from './MonthView';
import { DayView } from './DayView';
import { EventDetailPopover } from './EventDetailPopover';
import type { ShipmentsFilterState } from '../../../pages/ManageShipments/utils/listingUtils';
import '../../../styles/manage-calendar.css';

interface CalendarViewProps {
  direction: 'outbound' | 'inbound';
  activeTabStatus?: string;
  searchQuery: string;
  appliedFilters: ShipmentsFilterState;
  viewMode: 'list' | 'calendar';
  onViewModeChange: (mode: 'list' | 'calendar') => void;
  t: (key: string, defaultValue?: string) => string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  direction,
  activeTabStatus,
  searchQuery,
  appliedFilters,
  viewMode,
  onViewModeChange,
  t,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initial state derived from search params or today's date
  const initialDateStr = searchParams.get('cal_date') || getTodayYmd();
  const initialDate = parseYmdDate(initialDateStr);

  const [currentYear, setCurrentYear] = useState<number>(() => initialDate.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(() => initialDate.getMonth());
  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(() => initialDateStr);

  const initialPerspective = (searchParams.get('cal_view') === 'day' ? 'day' : 'month') as 'month' | 'day';
  const [viewPerspective, setViewPerspective] = useState<'month' | 'day'>(initialPerspective);

  const [calendarShipments, setCalendarShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Sync state changes with URL query parameters
  const updateUrlParams = useCallback(
    (perspective: 'month' | 'day', dateYmd: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('view', 'calendar');
          next.set('cal_view', perspective);
          next.set('cal_date', dateYmd);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Handle perspective change (Month vs Day)
  const handlePerspectiveChange = (p: 'month' | 'day') => {
    setViewPerspective(p);
    updateUrlParams(p, selectedDateYmd);
  };

  // Compute visible date range for backend query
  const dateRange = useMemo(() => {
    if (viewPerspective === 'day') {
      return { from: selectedDateYmd, to: selectedDateYmd };
    }
    return getMonthDateRange(currentYear, currentMonthIndex);
  }, [viewPerspective, selectedDateYmd, currentYear, currentMonthIndex]);

  // Fetch calendar shipments when range, direction, status, search, or filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: CalendarShipmentsParams = {
      from: dateRange.from,
      to: dateRange.to,
      direction,
      ...(activeTabStatus && activeTabStatus !== 'all' ? { status: activeTabStatus } : {}),
      ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      ...(appliedFilters.carrier_name ? { carrier_name: appliedFilters.carrier_name } : {}),
      ...(appliedFilters.customer ? { customer: appliedFilters.customer } : {}),
      ...(appliedFilters.product_type ? { product_type: appliedFilters.product_type } : {}),
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
        setError('Failed to load calendar events');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange.from, dateRange.to, direction, activeTabStatus, searchQuery, appliedFilters]);

  // Extract events and group by date
  const events = useMemo(() => extractCalendarEvents(calendarShipments), [calendarShipments]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  // Grid cells for Month view
  const monthCells = useMemo(
    () => getCalendarMonthGrid(currentYear, currentMonthIndex),
    [currentYear, currentMonthIndex]
  );

  // Counts for the active view
  const activeEvents = useMemo(() => {
    if (viewPerspective === 'day') {
      return eventsByDate[selectedDateYmd] || [];
    }
    return events;
  }, [viewPerspective, selectedDateYmd, eventsByDate, events]);

  const pickupCount = useMemo(
    () => activeEvents.filter((e) => e.type === 'pickup').length,
    [activeEvents]
  );
  const deliveryCount = useMemo(
    () => activeEvents.filter((e) => e.type === 'delivery').length,
    [activeEvents]
  );

  // Period label for toolbar
  const periodLabel = useMemo(() => {
    if (viewPerspective === 'day') {
      const d = parseYmdDate(selectedDateYmd);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return formatMonthYear(currentYear, currentMonthIndex);
  }, [viewPerspective, selectedDateYmd, currentYear, currentMonthIndex]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewPerspective === 'day') {
      const prevDay = getAdjacentDay(selectedDateYmd, -1);
      setSelectedDateYmd(prevDay);
      const parsed = parseYmdDate(prevDay);
      setCurrentYear(parsed.getFullYear());
      setCurrentMonthIndex(parsed.getMonth());
      updateUrlParams('day', prevDay);
    } else {
      const adj = getAdjacentMonth(currentYear, currentMonthIndex, -1);
      setCurrentYear(adj.year);
      setCurrentMonthIndex(adj.monthIndex);
    }
  };

  const handleNext = () => {
    if (viewPerspective === 'day') {
      const nextDay = getAdjacentDay(selectedDateYmd, 1);
      setSelectedDateYmd(nextDay);
      const parsed = parseYmdDate(nextDay);
      setCurrentYear(parsed.getFullYear());
      setCurrentMonthIndex(parsed.getMonth());
      updateUrlParams('day', nextDay);
    } else {
      const adj = getAdjacentMonth(currentYear, currentMonthIndex, 1);
      setCurrentYear(adj.year);
      setCurrentMonthIndex(adj.monthIndex);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const todayYmd = toYmd(today);
    setSelectedDateYmd(todayYmd);
    setCurrentYear(today.getFullYear());
    setCurrentMonthIndex(today.getMonth());
    updateUrlParams(viewPerspective, todayYmd);
  };

  const handleSelectDateFromMonth = (dateYmd: string) => {
    setSelectedDateYmd(dateYmd);
    const parsed = parseYmdDate(dateYmd);
    setCurrentYear(parsed.getFullYear());
    setCurrentMonthIndex(parsed.getMonth());
    setViewPerspective('day');
    updateUrlParams('day', dateYmd);
  };

  const handleNavigateToDetail = (shipmentId: number) => {
    navigate(`/shipments/${shipmentId}`);
  };

  return (
    <div className="cal-container">
      <CalendarToolbar
        viewPerspective={viewPerspective}
        onPerspectiveChange={handlePerspectiveChange}
        periodLabel={periodLabel}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        totalEvents={activeEvents.length}
        pickupCount={pickupCount}
        deliveryCount={deliveryCount}
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

      {viewPerspective === 'month' ? (
        <MonthView
          cells={monthCells}
          eventsByDate={eventsByDate}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
          onSelectDate={handleSelectDateFromMonth}
          t={t}
        />
      ) : (
        <DayView
          dateYmd={selectedDateYmd}
          events={eventsByDate[selectedDateYmd] || []}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
          onNavigateToDetail={handleNavigateToDetail}
          onBackToMonth={() => handlePerspectiveChange('month')}
          t={t}
        />
      )}

      {selectedEvent && (
        <EventDetailPopover
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onNavigateToDetail={handleNavigateToDetail}
          t={t}
        />
      )}
    </div>
  );
};
