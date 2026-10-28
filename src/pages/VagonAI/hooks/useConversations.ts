import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearHistory, deleteConversation, listConversations, type ConversationSummary,
} from '../api/conversationsService';
import { useTranslation } from '../../../hooks/useTranslation';
import { recentConversations } from '../historyGrouping';

/**
 * `userId` is no longer sent to the gateway — the bearer token carries the
 * identity. It stays only as a cache key, so switching accounts refetches
 * instead of showing the previous shipper's history.
 *
 * Only the most recent few are exposed (see HISTORY_LIMIT); `hiddenCount` says
 * how many older ones exist so the panel can say why they are not listed.
 */
export function useConversations(userId: string | number, locale?: string) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /**
   * Chats shown before the gateway lists them. A new chat used to appear only
   * after its first reply settled, and a bulk-draft chat sometimes not at all
   * (QA 2026-10-08). Kept across refetches until the server's list includes the
   * id, so a refetch that races the gateway's write does not drop the row again.
   */
  const optimisticRef = useRef<Map<string, ConversationSummary>>(new Map());

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listConversations(locale)
      .then((data) => {
        if (cancelled) return;
        const listed = new Set(data.map((c) => c.id));
        for (const id of [...optimisticRef.current.keys()]) {
          if (listed.has(id)) optimisticRef.current.delete(id);
        }
        setConversations([...optimisticRef.current.values(), ...data]);
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

  /**
   * Puts a chat at the top of the list now, or bumps one already there, without
   * waiting for the gateway. `title` is only used for a row not yet listed.
   */
  const upsert = useCallback((id: string, title: string | null) => {
    const now = new Date().toISOString();
    setConversations((prev) => {
      if (prev.some((c) => c.id === id)) {
        return prev.map((c) => (c.id === id ? { ...c, updatedAt: now } : c));
      }
      const row: ConversationSummary = { id, title, createdAt: now, updatedAt: now };
      optimisticRef.current.set(id, row);
      return [row, ...prev];
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    optimisticRef.current.delete(id);
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
    optimisticRef.current.clear();
    setConversations([]);
    try {
      await clearHistory(locale);
    } catch (err) {
      setConversations(previous);
      throw err;
    }
  }, [locale, conversations]);

  const recent = useMemo(() => recentConversations(conversations), [conversations]);

  return {
    conversations: recent,
    hiddenCount: conversations.length - recent.length,
    loading, error, refetch, upsert, remove, clearAll,
  };
}
