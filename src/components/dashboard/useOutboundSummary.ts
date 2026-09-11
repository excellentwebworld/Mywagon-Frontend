import { useEffect, useState } from 'react';
import { ApiError, shipmentsService } from '../../api';
import type { ApiShipmentsSummary } from '../../api/types/shipments';
import { EMPTY_KPI_COUNTS } from '../../pages/ManageShipments/utils/listingUtils';

export const EMPTY_OUTBOUND_SUMMARY: ApiShipmentsSummary = {
  kpis: { ...EMPTY_KPI_COUNTS },
  statuses: {},
};

export function useOutboundSummary() {
  const [summary, setSummary] = useState<ApiShipmentsSummary>(EMPTY_OUTBOUND_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUpgradeUrl(undefined);
    shipmentsService
      .summary({ direction: 'outbound' })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSummary(EMPTY_OUTBOUND_SUMMARY);
        if (err instanceof ApiError && err.status === 403) {
          setError('dashSubscriptionDenied');
          setUpgradeUrl(err.upgradeUrl || '/subscription');
        } else {
          setError('dashKpiLoadFailed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { summary, loading, error, upgradeUrl };
}
