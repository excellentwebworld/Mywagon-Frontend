import { useEffect, useRef, useState, useCallback } from 'react';
import { ApiError, shipmentsService } from '../api';
import type { ApiShipmentsSummary, ListShipmentsParams } from '../api/types/shipments';
import type { Shipment } from '../context/AppContext';
import type { ApiListMeta } from '../api/types/addressBook';
import { EMPTY_KPI_COUNTS } from '../pages/ManageShipments/utils/listingUtils';

export function useShipment(id?: string) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setShipment(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    shipmentsService
      .getMapped(id)
      .then((data) => {
        if (cancelled) return;
        setShipment(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setShipment(null);
        setError(err instanceof ApiError ? err.message : 'loadShipmentFailed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { shipment, loading, error };
}

const EMPTY_SUMMARY: ApiShipmentsSummary = {
  kpis: { ...EMPTY_KPI_COUNTS },
  statuses: {},
};

/**
 * Server-driven shipments list + summary.
 * When `listEnabled` is false (unsupported tabs), summary still loads for KPI/status counts
 * unless `summaryEnabled` is also false (e.g. inbound direction with no API yet).
 */
export function useShipmentsList(
  listParams: ListShipmentsParams,
  summaryParams: Omit<ListShipmentsParams, 'page' | 'per_page'>,
  listEnabled = true,
  refreshKey = 0,
  summaryEnabled = true
) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [meta, setMeta] = useState<ApiListMeta>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });
  const [summary, setSummary] = useState<ApiShipmentsSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const listKey = JSON.stringify(listParams);
  const summaryKey = JSON.stringify(summaryParams);

  // Full skeleton only when query params change — not when refreshKey alone bumps.
  useEffect(() => {
    hasLoadedOnce.current = false;
  }, [listKey, summaryKey, listEnabled, summaryEnabled]);

  useEffect(() => {
    let cancelled = false;
    const softRefresh = hasLoadedOnce.current;
    if (!softRefresh) {
      setLoading(true);
    }
    setError(null);

    const emptyList = {
      shipments: [] as Shipment[],
      meta: {
        current_page: 1,
        per_page: listParams.per_page ?? 10,
        total: 0,
        last_page: 1,
      },
    };

    if (!listEnabled && !summaryEnabled) {
      setShipments([]);
      setMeta(emptyList.meta);
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const listPromise = listEnabled
      ? shipmentsService.listMapped(listParams)
      : Promise.resolve(emptyList);

    const summaryPromise = summaryEnabled
      ? shipmentsService.summary(summaryParams)
      : Promise.resolve(EMPTY_SUMMARY);

    Promise.all([listPromise, summaryPromise])
      .then(([listResult, summaryResult]) => {
        if (cancelled) return;
        setShipments(listResult.shipments);
        setMeta(listResult.meta);
        setSummary(summaryResult);
        hasLoadedOnce.current = true;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setShipments([]);
        setSummary(EMPTY_SUMMARY);
        setError(err instanceof ApiError ? err.message : 'loadShipmentsFailed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key-based sync
  }, [listEnabled, summaryEnabled, listKey, summaryKey, refreshKey]);

  const patchShipment = useCallback((id: string, patch: Partial<Shipment>) => {
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  return { shipments, meta, summary, loading, error, patchShipment };
}
