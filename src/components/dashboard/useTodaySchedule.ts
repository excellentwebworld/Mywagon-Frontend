import { useEffect, useState } from 'react';
import { shipmentsService } from '../../api';
import type { ApiShipmentListItem } from '../../api/types/shipments';
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

    Promise.all([
      shipmentsService.list({
        direction: 'outbound',
        kpi: 'pickup_today',
        per_page: 100,
        page: 1,
      }),
      shipmentsService.list({
        direction: 'outbound',
        status: ['ready', 'on_trip', 'scheduled'],
        per_page: 100,
        page: 1,
      }),
    ])
      .then(([todayRes, activeRes]) => {
        if (cancelled) return;
        const itemMap = new Map<number, ApiShipmentListItem>();
        (todayRes.items || []).forEach((item) => itemMap.set(item.id, item));
        (activeRes.items || []).forEach((item) => itemMap.set(item.id, item));

        const combined = Array.from(itemMap.values());
        const built = buildTodayScheduleEvents(combined);
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

