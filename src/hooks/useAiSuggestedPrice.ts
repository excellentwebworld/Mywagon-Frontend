import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { createShipmentService } from '../api/services/createShipmentService';
import type { AiSuggestedPriceResult } from '../api/types/createShipment';

interface UseAiSuggestedPriceOptions {
  draftId: number | null;
  onRecommendedPrice?: (price: number) => void;
}

export function useAiSuggestedPrice({ draftId, onRecommendedPrice }: UseAiSuggestedPriceOptions) {
  const [data, setData] = useState<AiSuggestedPriceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState<{ message: string; upgradeUrl?: string } | null>(null);
  const inFlightRef = useRef(false);

  const fetchPrice = useCallback(async () => {
    if (!draftId || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setDenied(null);

    try {
      const result = await createShipmentService.fetchAiSuggestedPrice(draftId);
      setData(result);
      if (result.market_price > 0) {
        onRecommendedPrice?.(result.market_price);
      } else if (result.recommended_price > 0) {
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
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [draftId, onRecommendedPrice]);

  return { data, loading, error, denied, fetchPrice };
}
