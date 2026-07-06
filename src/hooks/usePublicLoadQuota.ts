import { useEffect, useState } from 'react';
import { createShipmentService } from '../api/services/createShipmentService';

export interface PublicLoadQuota {
  status: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  message?: string;
  actions?: {
    upgrade_url?: string;
  };
}

export function usePublicLoadQuota(draftId: number | null, broadcastType: 'private' | 'public') {
  const [quota, setQuota] = useState<PublicLoadQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (broadcastType !== 'public') {
      setQuota(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadQuota() {
      setLoading(true);
      setError(null);
      try {
        const result = await createShipmentService.checkPublicLoadLimit(draftId ?? undefined);
        if (!cancelled) {
          setQuota(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load public load quota.');
          setQuota(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuota();

    return () => {
      cancelled = true;
    };
  }, [broadcastType, draftId]);

  return { quota, loading, error };
}
