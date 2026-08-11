import { useCallback, useEffect, useMemo, useState } from 'react';
import { supportService } from '../../../api/services/supportService';
import type { SupportCallType, SupportMeetingOptions, SupportMeetingPrefill } from '../types';

const HUBSPOT_EMBED_SCRIPT = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';

interface UseBookCallOptions {
  callType: SupportCallType;
  active: boolean;
  disabled?: boolean;
}

function buildEmbedUrl(baseUrl: string, prefill: SupportMeetingPrefill): string {
  if (!baseUrl) return '';

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('embed', 'true');

    if (prefill.email) {
      url.searchParams.set('email', prefill.email);
    }
    if (prefill.first_name) {
      url.searchParams.set('firstName', prefill.first_name);
    }
    if (prefill.last_name) {
      url.searchParams.set('lastName', prefill.last_name);
    }

    return url.toString();
  } catch {
    return '';
  }
}

export function useBookCall({ callType, active, disabled = false }: UseBookCallOptions) {
  const [options, setOptions] = useState<SupportMeetingOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || disabled) {
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await supportService.getMeetingOptions();
        if (!cancelled) {
          setOptions(result);
        }
      } catch {
        if (!cancelled) {
          setError('load_failed');
          setOptions(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, disabled]);

  const activeMeetingUrl = useMemo(() => {
    const match = options?.callTypes.find((item) => item.id === callType);
    return match?.meeting_url ?? '';
  }, [callType, options]);

  const embedUrl = useMemo(() => {
    if (!activeMeetingUrl || !options?.prefill) {
      return activeMeetingUrl ? buildEmbedUrl(activeMeetingUrl, { email: '', first_name: '', last_name: '' }) : '';
    }
    return buildEmbedUrl(activeMeetingUrl, options.prefill);
  }, [activeMeetingUrl, options?.prefill]);

  const hasMeetingUrl = Boolean(activeMeetingUrl);

  const refetch = useCallback(async () => {
    if (disabled || !active) return;

    setLoading(true);
    setError(null);
    try {
      const result = await supportService.getMeetingOptions();
      setOptions(result);
    } catch {
      setError('load_failed');
      setOptions(null);
    } finally {
      setLoading(false);
    }
  }, [active, disabled]);

  return {
    options,
    loading,
    error,
    activeMeetingUrl,
    embedUrl,
    hasMeetingUrl,
    refetch,
  };
}

export { HUBSPOT_EMBED_SCRIPT };
