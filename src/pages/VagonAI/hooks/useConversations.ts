import { useCallback, useEffect, useState } from 'react';
import {
  clearHistory, deleteConversation, listConversations, type ConversationSummary,
} from '../api/conversationsService';
import { useTranslation } from '../../../hooks/useTranslation';

/**
 * `userId` is no longer sent to the gateway — the bearer token carries the
 * identity. It stays only as a cache key, so switching accounts refetches
 * instead of showing the previous shipper's history.
 */
export function useConversations(userId: string | number, locale?: string) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listConversations(locale)
      .then((data) => {
        if (cancelled) return;
        setConversations(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('vagonai.errors.loadHistoryFailed', 'Failed to load chat history.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, locale, reloadKey]);

  const remove = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteConversation(id, locale);
    } catch (err) {
      refetch();
      throw err;
    }
  }, [locale, refetch]);

  const clearAll = useCallback(async () => {
    const previous = conversations;
    setConversations([]);
    try {
      await clearHistory(locale);
    } catch (err) {
      setConversations(previous);
      throw err;
    }
  }, [locale, conversations]);

  return {
    conversations, loading, error, refetch, remove, clearAll,
  };
}
