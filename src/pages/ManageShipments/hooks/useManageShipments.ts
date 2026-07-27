import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, shipmentsService } from '../../../api';
import type { ListShipmentsParams } from '../../../api/types/shipments';
import { useApp } from '../../../context/AppContext';
import type { Shipment } from '../../../context/AppContext';
import { useCreateShipmentPartners } from '../../../hooks/useCreateShipmentPartners';
import { useShipmentsList } from '../../../hooks/useShipments';
import { useTranslation } from '../../../hooks/useTranslation';
import type { LoadsDirection } from '../../../components/ManageShipments/LoadsDirectionToggle';
import {
  buildFilterChips,
  clearFilterChip,
  countForStatusTab,
  DEFAULT_FILTERS,
  filtersToApiParams,
  isShipmentEditable,
  kpiLabelKey,
  parseStatusTabParam,
  resolvePreferredStatusTab,
  statusTabHasApiSupport,
  statusTabToApiStatus,
  validateFilterRanges,
  type FilterChipKey,
  type KpiKey,
  type ShipmentsFilterState,
  type SortKey,
  type StatusTabKey,
} from '../utils/listingUtils';

export const PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;
/** Hours added when bulk-extending bid windows. */
export const EXTEND_BID_HOURS = 24;

export function useManageShipments() {
  const { showToast } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    carriersList: invitePartners,
    loading: invitePartnersLoading,
    error: invitePartnersError,
  } = useCreateShipmentPartners();

  const [direction, setDirectionState] = useState<LoadsDirection>('outbound');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeKpi, setActiveKpiState] = useState<KpiKey | null>(() => {
    const raw = searchParams.get('kpi');
    if (
      raw === 'needs_action' ||
      raw === 'awaiting_response' ||
      raw === 'at_risk' ||
      raw === 'pickup_today' ||
      raw === 'awaiting_pod'
    ) {
      return raw;
    }
    return null;
  });
  const [activeTab, setActiveTabState] = useState<StatusTabKey>(() =>
    parseStatusTabParam(searchParams.get('status'))
  );
  const [sortKey, setSortKey] = useState<SortKey>('');
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<ShipmentsFilterState>(DEFAULT_FILTERS);
  const [productTypeNames, setProductTypeNames] = useState<Record<string, string>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, Shipment>>({});
  /** First-load only — drives expansion skeleton. */
  const [detailLoadingIds, setDetailLoadingIds] = useState<Set<string>>(new Set());
  /** Background refetch while cached panel stays visible. */
  const [detailRefreshingIds, setDetailRefreshingIds] = useState<Set<string>>(new Set());
  const detailCacheRef = useRef(detailCache);
  detailCacheRef.current = detailCache;
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [invitedCarriers, setInvitedCarriers] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<Shipment | null>(null);
  const [bulkCancelIds, setBulkCancelIds] = useState<number[] | null>(null);

  const isOutbound = direction === 'outbound';

  const setDirection = useCallback(
    (next: LoadsDirection) => {
      setDirectionState(next);
      setPage(1);
      setActiveKpiState(null);
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          nextParams.delete('kpi');
          return nextParams;
        },
        { replace: true }
      );
      if (next === 'inbound') {
        setExpandedId(null);
        setSelectedIds(new Set());
        setIsFilterOpen(false);
        setIsSortOpen(false);
        setIsInviteOpen(false);
        setCancelTarget(null);
        setBulkCancelIds(null);
      }
    },
    [setSearchParams]
  );

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, activeKpi, appliedFilters, debouncedSearch, page]);

  const filterParams = useMemo(() => filtersToApiParams(appliedFilters), [appliedFilters]);
  const tabSupported = statusTabHasApiSupport(activeTab);

  const summaryParams = useMemo((): Omit<ListShipmentsParams, 'page' | 'per_page'> => {
    return {
      ...filterParams,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(activeKpi ? { kpi: activeKpi } : {}),
      direction: isOutbound ? 'outbound' : 'inbound',
    };
  }, [filterParams, debouncedSearch, activeKpi, isOutbound]);

  const listParams = useMemo((): ListShipmentsParams => {
    const status = statusTabToApiStatus(activeTab);
    return {
      ...summaryParams,
      page,
      per_page: PER_PAGE,
      ...(status !== undefined ? { status } : {}),
      ...(sortKey ? { sort: sortKey } : {}),
    };
  }, [summaryParams, page, activeTab, sortKey]);

  const { shipments, meta, summary, loading, error, patchShipment } = useShipmentsList(
    listParams,
    summaryParams,
    tabSupported,
    refreshKey,
    true
  );

  const kpiCounts = summary.kpis;
  const statusCounts = summary.statuses;

  const pagination = useMemo(
    () => ({
      items: shipments,
      page: meta.current_page,
      totalPages: Math.max(1, meta.last_page ?? 1),
      total: meta.total,
    }),
    [shipments, meta]
  );

  const filterChips = useMemo(
    () => buildFilterChips(appliedFilters, t, productTypeNames),
    [appliedFilters, t, productTypeNames]
  );

  const kpiChip = useMemo(
    () => (activeKpi ? { label: t(kpiLabelKey(activeKpi)) } : null),
    [activeKpi, t]
  );

  const setActiveKpi = useCallback(
    (key: KpiKey | null) => {
      setActiveKpiState(key);
      setPage(1);
      setExpandedId(null);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!key) next.delete('kpi');
          else next.set('kpi', key);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setActiveTab = useCallback(
    (tab: StatusTabKey) => {
      setActiveTabState(tab);
      setPage(1);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === 'active') next.delete('status');
          else next.set('status', tab);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Keep tab + KPI in sync with URL (reload, back/forward, shared links)
  useEffect(() => {
    const fromUrl = parseStatusTabParam(searchParams.get('status'));
    setActiveTabState((prev) => (prev === fromUrl ? prev : fromUrl));

    const kpiRaw = searchParams.get('kpi');
    const kpiFromUrl: KpiKey | null =
      kpiRaw === 'needs_action' ||
      kpiRaw === 'awaiting_response' ||
      kpiRaw === 'at_risk' ||
      kpiRaw === 'pickup_today' ||
      kpiRaw === 'awaiting_pod'
        ? kpiRaw
        : null;
    setActiveKpiState((prev) => (prev === kpiFromUrl ? prev : kpiFromUrl));
  }, [searchParams]);

  /**
   * Top KPI filters (Needs Action, Awaiting POD, …) span multiple statuses.
   * If the current tab has 0 matches after the KPI is applied, jump to the
   * first status tab (priority order) that has data; otherwise stay on Active.
   *
   * Wait until we've seen loading=true for this KPI so we don't decide on
   * stale summary counts from the previous (unfiltered) request.
   */
  const needsKpiAutoNavRef = useRef<KpiKey | null>(null);
  const sawLoadingForKpiRef = useRef<KpiKey | null>(null);

  useEffect(() => {
    needsKpiAutoNavRef.current = activeKpi;
    sawLoadingForKpiRef.current = null;
  }, [activeKpi]);

  useEffect(() => {
    if (!activeKpi) return;

    if (loading) {
      if (needsKpiAutoNavRef.current === activeKpi) {
        sawLoadingForKpiRef.current = activeKpi;
      }
      return;
    }

    if (needsKpiAutoNavRef.current !== activeKpi) return;
    if (sawLoadingForKpiRef.current !== activeKpi) return;

    needsKpiAutoNavRef.current = null;

    const currentCount = countForStatusTab(statusCounts, activeTab);
    if (currentCount > 0) return;

    const preferred = resolvePreferredStatusTab(statusCounts, 'active');
    if (preferred !== activeTab) {
      setActiveTab(preferred);
    }
  }, [activeKpi, activeTab, statusCounts, loading, setActiveTab]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleApplyFilters = useCallback(
    (next: ShipmentsFilterState, names?: Record<string, string>) => {
      const rangeError = validateFilterRanges(next);
      if (rangeError) {
        showToast(t(rangeError), 'warning');
        return false;
      }
      setAppliedFilters(next);
      if (names) setProductTypeNames(names);
      setPage(1);
      return true;
    },
    [showToast, t]
  );

  const handleClearFilterChip = useCallback((key: FilterChipKey) => {
    setAppliedFilters((prev) => clearFilterChip(prev, key));
    setPage(1);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
    setActiveKpi(null);
  }, [setActiveKpi]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(pagination.items.map((s) => s.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [pagination.items]
  );

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Reload expansion detail. With cache → background update; without → blocking skeleton. */
  const refreshShipmentDetail = useCallback(
    async (shipmentId: string, opts?: { background?: boolean }) => {
      const hasCache = Boolean(detailCacheRef.current[shipmentId]);
      const background = opts?.background ?? hasCache;

      if (background) {
        setDetailRefreshingIds((ids) => new Set(ids).add(shipmentId));
      } else {
        setDetailLoadingIds((ids) => new Set(ids).add(shipmentId));
      }

      try {
        const detail = await shipmentsService.getMapped(shipmentId);
        setDetailCache((c) => ({ ...c, [shipmentId]: detail }));
        patchShipment(shipmentId, {
          invited: detail.invited,
          bids: detail.bids,
          bidsReceived: detail.bidsReceived,
          bidsSent: detail.bidsSent,
          best_bid: detail.best_bid,
          // Never wipe list transporter with a null detail payload.
          ...(detail.carrier
            ? {
                carrier: detail.carrier,
                carrier_init: detail.carrier_init,
                carrierAvatar: detail.carrierAvatar ?? null,
              }
            : {}),
          status: detail.status,
          // Never wipe list prices when detail omits them.
          ...(detail.quotedPrice != null ? { quotedPrice: detail.quotedPrice, price: detail.price } : {}),
          ...(detail.agreedPrice != null ? { agreedPrice: detail.agreedPrice } : {}),
          // Keep list at-risk when detail omits it; otherwise apply authoritative detail flag.
          ...(detail.at_risk != null
            ? { at_risk: detail.at_risk, riskReason: detail.riskReason ?? null }
            : {}),
          needsAction: detail.needsAction,
          awaitingResponse: detail.awaitingResponse,
          offers: detail.offers,
          invitees: detail.invitees,
          // Keep list-row lane/stop counts stable on expand — stops live in detailCache for the panel.
          ...(detail.createdAt ? { createdAt: detail.createdAt } : {}),
        });
      } catch {
        // Keep existing expansion data on failure
      } finally {
        if (background) {
          setDetailRefreshingIds((ids) => {
            const copy = new Set(ids);
            copy.delete(shipmentId);
            return copy;
          });
        } else {
          setDetailLoadingIds((ids) => {
            const copy = new Set(ids);
            copy.delete(shipmentId);
            return copy;
          });
        }
      }
    },
    [patchShipment]
  );

  const handleToggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => {
        const next = prev === id ? null : id;
        if (next) {
          const hasCache = Boolean(detailCacheRef.current[next]);
          // Cached → show immediately, refetch in background. Cold → skeleton then fill.
          void refreshShipmentDetail(next, { background: hasCache });
        }
        return next;
      });
    },
    [refreshShipmentDetail]
  );

  const handleRefreshExpanded = useCallback(
    (id: string) => {
      const hasCache = Boolean(detailCacheRef.current[id]);
      void refreshShipmentDetail(id, { background: hasCache });
    },
    [refreshShipmentDetail]
  );

  const isDetailCached = useCallback((id: string) => Boolean(detailCache[id]), [detailCache]);

  const isDetailBusy = useCallback(
    (id: string) => detailLoadingIds.has(id) || detailRefreshingIds.has(id),
    [detailLoadingIds, detailRefreshingIds]
  );

  const mergedShipment = useCallback(
    (s: Shipment): Shipment => {
      const detail = detailCache[s.id];
      if (!detail) return s;
      return {
        ...s,
        ...detail,
        // Prefer fresh detail over list-row snapshot for bid/offer fields.
        // Keep list transporter when detail omits carrier (do not wipe with null).
        bids: detail.bids ?? s.bids,
        bidsReceived: detail.bidsReceived ?? s.bidsReceived,
        bidsSent: detail.bidsSent ?? s.bidsSent,
        best_bid: detail.best_bid ?? s.best_bid,
        carrier: detail.carrier || s.carrier,
        carrier_init: detail.carrier_init || s.carrier_init,
        carrierAvatar: detail.carrierAvatar ?? s.carrierAvatar ?? null,
        quotedPrice: detail.quotedPrice ?? s.quotedPrice,
        agreedPrice: detail.agreedPrice ?? s.agreedPrice,
        price: detail.price ?? s.price ?? detail.quotedPrice ?? s.quotedPrice ?? null,
        channel: detail.channel ?? s.channel,
        invited: detail.invited ?? s.invited,
        offers: detail.offers ?? s.offers,
        invitees: detail.invitees ?? s.invitees,
        stops: detail.stops ?? s.stops,
        stopCount: detail.stopCount ?? s.stopCount,
        intermediateStops: detail.intermediateStops ?? s.intermediateStops,
        at_risk: detail.at_risk ?? s.at_risk,
        riskReason: detail.riskReason ?? s.riskReason,
      };
    },
    [detailCache]
  );

  const handleCopyId = useCallback(
    (id: string) => {
      navigator.clipboard.writeText(id);
      showToast(t('copiedId', { id }), 'success');
    },
    [showToast, t]
  );

  const handleDeleteRequest = useCallback((s: Shipment) => {
    setCancelTarget(s);
  }, []);

  /** Full list refresh (silent if already loaded) — for cancel / extend / accept that changes tab membership. */
  const refreshList = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCancelled = useCallback(() => {
    showToast(t('shipmentCancelled'), 'success');
    setCancelTarget(null);
    setExpandedId(null);
    refreshList();
  }, [refreshList, showToast, t]);

  const handleEditBlocked = useCallback(() => {
    showToast(t('editNotAllowed'), 'warning');
  }, [showToast, t]);

  const handleEdit = useCallback(
    (s: Shipment) => {
      if (!isShipmentEditable(s.status)) {
        handleEditBlocked();
        return;
      }
      navigate(`/shipments/create?id=${s.id}`);
    },
    [handleEditBlocked, navigate]
  );

  const handleViewNewTab = useCallback((s: Shipment) => {
    window.open(`/shipments/${s.id}`, '_blank', 'noopener,noreferrer');
  }, []);

  const [inviteTargetId, setInviteTargetId] = useState<string | null>(null);
  /** When bulk-inviting, send the same partners to every id in this list. */
  const [inviteTargetIds, setInviteTargetIds] = useState<string[]>([]);
  /** Partner ids already invited on the target shipment (auto-selected & locked in modal). */
  const [alreadyInvitedPartnerIds, setAlreadyInvitedPartnerIds] = useState<Set<string>>(new Set());

  const handleMessage = useCallback(
    (_s: Shipment, _offerId?: string) => {
      showToast(t('chatComingSoon') || 'Chat will be available soon.', 'info');
    },
    [showToast, t]
  );

  const handleAcceptOffer = useCallback(
    async (s: Shipment, offerId: string) => {
      try {
        await shipmentsService.acceptOffer(s.id, offerId);
        showToast(t('offerAccepted') || 'Offer accepted', 'success');
        await refreshShipmentDetail(s.id);
        refreshList();
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [refreshList, refreshShipmentDetail, showToast, t]
  );

  const handleRejectOffer = useCallback(
    async (s: Shipment, offerId: string) => {
      try {
        await shipmentsService.rejectOffer(s.id, offerId);
        showToast(t('offerRejected') || 'Offer rejected', 'success');
        await refreshShipmentDetail(s.id);
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [refreshShipmentDetail, showToast, t]
  );

  const handleCounterOffer = useCallback(
    async (s: Shipment, offerId: string, amount: number) => {
      try {
        await shipmentsService.counterOffer(s.id, offerId, { amount });
        showToast(t('counterSent') || 'Counter-offer sent', 'success');
        await refreshShipmentDetail(s.id);
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [refreshShipmentDetail, showToast, t]
  );

  const handleRemindInvitee = useCallback(
    async (s: Shipment, inviteeId: number) => {
      try {
        await shipmentsService.remindInvite(s.id, inviteeId);
        showToast(t('remindSent') || 'Reminder sent', 'success');
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [showToast, t]
  );

  const handleRemoveInvitee = useCallback(
    async (s: Shipment, inviteeId: number) => {
      try {
        await shipmentsService.removeInvite(s.id, inviteeId);
        showToast(t('inviteRemoved') || 'Invite removed', 'success');
        await refreshShipmentDetail(s.id);
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [refreshShipmentDetail, showToast, t]
  );

  const handleInviteMore = useCallback(
    (s: Shipment) => {
      setInviteTargetId(s.id);
      setInviteTargetIds([s.id]);
      const invitedNames = new Set(
        (s.invitees ?? []).map((inv) => inv.name.trim().toLowerCase()).filter(Boolean)
      );
      // Invitee.id is shipment_partner row id; partners list uses Partner.id — match by name.
      const already = new Set(
        invitePartners
          .filter((p) => invitedNames.has(p.name.trim().toLowerCase()))
          .map((p) => p.id)
      );
      setAlreadyInvitedPartnerIds(already);
      setInvitedCarriers(new Set(already));
      setInviteQuery('');
      setIsInviteOpen(true);
    },
    [invitePartners]
  );

  const closeInviteModal = useCallback(() => {
    setIsInviteOpen(false);
    setInviteQuery('');
    setInvitedCarriers(new Set());
    setAlreadyInvitedPartnerIds(new Set());
    setInviteTargetId(null);
    setInviteTargetIds([]);
  }, []);

  const handleBulkAction = useCallback(
    async (action: string) => {
      const ids = Array.from(selectedIds).map((id) => Number(id)).filter((n) => Number.isFinite(n));
      if (ids.length === 0) return;

      if (action === 'invite') {
        const privateLoads = pagination.items.filter(
          (s) => selectedIds.has(s.id) && (s.channel || s.vis) !== 'public'
        );
        if (privateLoads.length === 0) {
          showToast(t('invitePrivateOnly') || 'Select a private load to invite transporters', 'warning');
          return;
        }
        const targetIds = privateLoads.map((s) => s.id);
        setInviteTargetId(targetIds[0] ?? null);
        setInviteTargetIds(targetIds);
        // Bulk: don't lock "already invited" — partners differ per load; API skips duplicates.
        setAlreadyInvitedPartnerIds(new Set());
        setInvitedCarriers(new Set());
        setInviteQuery('');
        setIsInviteOpen(true);
        return;
      }

      try {
        if (action === 'extend') {
          await shipmentsService.bulkExtendBid(ids, EXTEND_BID_HOURS);
          showToast(t('bidExtended', { hours: EXTEND_BID_HOURS }) || `Bid time extended by ${EXTEND_BID_HOURS} hours`, 'success');
          setSelectedIds(new Set());
          refreshList();
        } else if (action === 'export') {
          await shipmentsService.exportShipments({ ...summaryParams, ids });
          setSelectedIds(new Set());
        } else if (action === 'cancel') {
          setBulkCancelIds(ids);
        }
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [pagination.items, refreshList, selectedIds, showToast, summaryParams, t]
  );

  const handleSendInvites = useCallback(async () => {
    const newPartnerIds = Array.from(invitedCarriers)
      .filter((id) => !alreadyInvitedPartnerIds.has(id))
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (newPartnerIds.length === 0) {
      showToast(t('selectAtLeastOneCarrier'), 'warning');
      return;
    }

    const targets =
      inviteTargetIds.length > 0
        ? inviteTargetIds
        : inviteTargetId
          ? [inviteTargetId]
          : Array.from(selectedIds).slice(0, 1);

    if (targets.length === 0) {
      showToast(t('somethingWentWrong') || 'No shipment selected', 'warning');
      return;
    }

    try {
      let ok = 0;
      let failed = 0;
      for (const shipmentId of targets) {
        try {
          await shipmentsService.invitePartners(shipmentId, newPartnerIds);
          ok += 1;
        } catch {
          failed += 1;
        }
      }

      if (ok === 0) {
        showToast(t('somethingWentWrong') || 'Failed to send invites', 'error');
        return;
      }

      if (targets.length > 1) {
        showToast(
          t('invitesSentBulk', {
            carriers: newPartnerIds.length,
            loads: ok,
          }) ||
            `Sent invites to ${newPartnerIds.length} transporter(s) on ${ok} private load(s)`,
          failed > 0 ? 'warning' : 'success'
        );
        setSelectedIds(new Set());
        closeInviteModal();
        refreshList();
      } else {
        const targetId = targets[0];
        showToast(t('invitesSent', { count: newPartnerIds.length }), 'success');
        closeInviteModal();
        setExpandedId(String(targetId));
        await refreshShipmentDetail(String(targetId));
      }
    } catch (err: unknown) {
      showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
    }
  }, [
    alreadyInvitedPartnerIds,
    closeInviteModal,
    inviteTargetId,
    inviteTargetIds,
    invitedCarriers,
    refreshList,
    refreshShipmentDetail,
    selectedIds,
    showToast,
    t,
  ]);

  const handleToggleInviteCarrier = useCallback(
    (id: string) => {
      if (alreadyInvitedPartnerIds.has(id)) return;
      setInvitedCarriers((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [alreadyInvitedPartnerIds]
  );

  const handleBulkCancelled = useCallback(() => {
    setBulkCancelIds(null);
    setSelectedIds(new Set());
    setCancelTarget(null);
    setExpandedId(null);
    refreshList();
  }, [refreshList]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { page: _page, per_page: _perPage, ...exportParams } = listParams;
      await shipmentsService.exportShipments(exportParams);
    } catch (err: unknown) {
      showToast(err instanceof ApiError ? err.message : t('exportFailed'), 'error');
    } finally {
      setExporting(false);
    }
  }, [listParams, showToast, t]);

  const handleApplySort = useCallback((key: SortKey) => {
    setSortKey(key);
    setPage(1);
  }, []);

  return {
    t,
    direction,
    setDirection,
    isOutbound,
    tabSupported,
    shipments,
    loading,
    error,
    searchQuery,
    setSearchQuery: handleSearchChange,
    activeKpi,
    setActiveKpi,
    activeTab,
    setActiveTab,
    sortKey,
    kpiCounts,
    statusCounts,
    pagination,
    page,
    setPage,
    selectedIds,
    expandedId,
    detailLoadingIds,
    detailRefreshingIds,
    isDetailCached,
    isDetailBusy,
    mergedShipment,
    handleSelectAll,
    handleSelectRow,
    handleToggleExpand,
    handleRefreshExpanded,
    handleCopyId,
    handleDeleteRequest,
    handleCancelled,
    handleEditBlocked,
    handleEdit,
    handleViewNewTab,
    handleMessage,
    handleAcceptOffer,
    handleRejectOffer,
    handleCounterOffer,
    handleRemindInvitee,
    handleRemoveInvitee,
    handleInviteMore,
    cancelTarget,
    setCancelTarget,
    bulkCancelIds,
    setBulkCancelIds,
    handleBulkCancelled,
    handleBulkAction,
    isInviteOpen,
    setIsInviteOpen,
    closeInviteModal,
    inviteTargetIds,
    inviteQuery,
    setInviteQuery,
    invitedCarriers,
    alreadyInvitedPartnerIds,
    handleToggleInviteCarrier,
    handleSendInvites,
    invitePartners,
    invitePartnersLoading,
    invitePartnersError,
    perPage: PER_PAGE,
    clearSelection: () => setSelectedIds(new Set()),
    isFilterOpen,
    setIsFilterOpen,
    isSortOpen,
    setIsSortOpen,
    handleExport,
    exporting,
    handleApplySort,
    appliedFilters,
    handleApplyFilters,
    filterChips,
    handleClearFilterChip,
    handleClearAllFilters,
    kpiChip,
    filtersActive: filterChips.length > 0 || Boolean(activeKpi),
  };
}
