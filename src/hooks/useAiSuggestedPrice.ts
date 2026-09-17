import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { createShipmentService } from '../api/services/createShipmentService';
import type { AiSuggestedPriceResult } from '../api/types/createShipment';

interface UseAiSuggestedPriceOptions {
  draftId: number | null;
  onRecommendedPrice?: (price: number) => void;
}

export function extractAiPriceDenied(err: unknown): { message: string; upgradeUrl: string } | null {
  if (err instanceof ApiError && err.status === 403) {
    const payload = err.data as { upgrade_url?: string } | undefined;
    const upgradeUrl =
      payload?.upgrade_url && !payload.upgrade_url.includes('/shipper/subscription')
        ? payload.upgrade_url
        : '/subscription';
    return {
      message: err.message || 'AI Suggested Price is available in Plus/Pro plans or as a paid add-on.',
      upgradeUrl,
    };
  }
  if (err && typeof err === 'object') {
    const ax = err as {
      status?: number;
      message?: string;
      data?: { upgrade_url?: string; message?: string };
      response?: { status?: number; data?: { message?: string; data?: { upgrade_url?: string }; upgrade_url?: string } };
    };
    const status = ax.status || ax.response?.status;
    if (status === 403) {
      const payloadUrl = ax.response?.data?.data?.upgrade_url || ax.response?.data?.upgrade_url || ax.data?.upgrade_url;
      const upgradeUrl =
        payloadUrl && !payloadUrl.includes('/shipper/subscription')
          ? payloadUrl
          : '/subscription';
      return {
        message:
          ax.response?.data?.message ||
          ax.message ||
          'AI Suggested Price is available in Plus/Pro plans or as a paid add-on.',
        upgradeUrl,
      };
    }
  }
  return null;
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
      const deniedInfo = extractAiPriceDenied(err);
      if (deniedInfo) {
        setDenied(deniedInfo);
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
