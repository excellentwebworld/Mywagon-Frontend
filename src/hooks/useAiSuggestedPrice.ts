import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { createShipmentService } from '../api/services/createShipmentService';
import type { AiSuggestedPriceResult } from '../api/types/createShipment';

interface UseAiSuggestedPriceOptions {
  draftId: number | null;
  enabled: boolean;
  onRecommendedPrice?: (price: number) => void;
}

export function useAiSuggestedPrice({ draftId, enabled, onRecommendedPrice }: UseAiSuggestedPriceOptions) {
  const [data, setData] = useState<AiSuggestedPriceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState<{ message: string; upgradeUrl?: string } | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!draftId || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);
    setDenied(null);

    try {
      const result = await createShipmentService.fetchAiSuggestedPrice(draftId);
      setData(result);
      if (result.recommended_price > 0) {
        onRecommendedPrice?.(result.recommended_price);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        const payload = err.data as { upgrade_url?: string } | undefined;
        setDenied({
          message: err.message || 'AI Suggested Price is not available on your plan.',
          upgradeUrl: payload?.upgrade_url,
        });
        setData(null);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load AI suggested price.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [draftId, enabled, onRecommendedPrice]);

  useEffect(() => {
    if (!enabled || !draftId) {
      setData(null);
      setError(null);
      setDenied(null);
      return;
    }

    fetchPrice();
  }, [draftId, enabled, fetchPrice]);

  return { data, loading, error, denied, refetch: fetchPrice };
}
