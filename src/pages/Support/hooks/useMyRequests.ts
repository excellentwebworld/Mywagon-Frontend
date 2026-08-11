import { useCallback, useEffect, useState } from 'react';
import { supportService } from '../../../api/services/supportService';
import type { SupportRequestDetail, SupportRequestSummary, SupportRequestsMeta } from '../types';

interface UseMyRequestsOptions {
  lang: string;
  active: boolean;
  disabled?: boolean;
}

export function useMyRequests({ lang, active, disabled = false }: UseMyRequestsOptions) {
  const [requests, setRequests] = useState<SupportRequestSummary[]>([]);
  const [meta, setMeta] = useState<SupportRequestsMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (disabled || !active) return;

    setLoading(true);
    setError(null);
    try {
      const result = await supportService.getRequests({ lang, page, perPage: 15 });
      setRequests(result.requests);
      setMeta(result.meta);
    } catch {
      setError('load_failed');
      setRequests([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [active, disabled, lang, page]);

  useEffect(() => {
    if (!active || disabled) {
      return;
    }
    fetchList();
  }, [active, disabled, fetchList]);

  const openDrawer = useCallback(
    async (ticketNumber: string) => {
      if (disabled) return;

      setSelectedTicket(ticketNumber);
      setDrawerOpen(true);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);

      try {
        const result = await supportService.getRequest(ticketNumber, lang);
        setDetail(result);
        if (!result) {
          setDetailError('not_found');
        }
      } catch {
        setDetailError('load_failed');
      } finally {
        setDetailLoading(false);
      }
    },
    [disabled, lang]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedTicket(null);
    setDetail(null);
    setDetailError(null);
  }, []);

  const refetch = useCallback(() => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    fetchList();
  }, [fetchList, page]);

  const submitReply = useCallback(
    async (body: string) => {
      if (!selectedTicket || !detail?.can_reply) return false;

      setReplyLoading(true);
      setReplyError(null);

      try {
        const message = await supportService.postRequestReply(selectedTicket, lang, body);
        setDetail((current) => {
          if (!current) return current;
          return {
            ...current,
            thread: [...current.thread, message],
            updated_at: message.created_at,
          };
        });
        setRequests((current) =>
          current.map((request) =>
            request.ticket_number === selectedTicket
              ? { ...request, updated_at: message.created_at }
              : request
          )
        );
        return true;
      } catch {
        setReplyError('reply_failed');
        return false;
      } finally {
        setReplyLoading(false);
      }
    },
    [detail?.can_reply, lang, selectedTicket]
  );

  return {
    requests,
    meta,
    page,
    setPage,
    loading,
    error,
    drawerOpen,
    selectedTicket,
    detail,
    detailLoading,
    detailError,
    replyLoading,
    replyError,
    openDrawer,
    closeDrawer,
    refetch,
    submitReply,
  };
}
