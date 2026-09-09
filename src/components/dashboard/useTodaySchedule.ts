import { useEffect, useState } from 'react';
import { shipmentsService } from '../../api';
import { formatDashError } from './dashErrorUtils';
import { buildTodayScheduleEvents, type ScheduleEvent, type TodayScheduleCounts } from './scheduleUtils';

const EMPTY_COUNTS: TodayScheduleCounts = { loads: 0, pickups: 0, dropoffs: 0 };

export function useTodaySchedule() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [counts, setCounts] = useState<TodayScheduleCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    shipmentsService
      .list({
        direction: 'outbound',
        status: ['pending', 'scheduled', 'ready', 'past_due', 'on_trip'],
        sort: 'earliest_first_pickup_time',
        per_page: 100,
        page: 1,
      })
      .then((result) => {
        if (cancelled) return;
        const built = buildTodayScheduleEvents(result.items);
        setEvents(built.events);
        setCounts(built.counts);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setEvents([]);
        setCounts(EMPTY_COUNTS);
        setError(formatDashError(err, 'dashScheduleLoadFailed').key);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { events, counts, loading, error };
}
