import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DEFAULT_FILTERS,
  filtersToApiParams,
  isShipmentEditable,
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
  const {
    carriersList: invitePartners,
    loading: invitePartnersLoading,
    error: invitePartnersError,
  } = useCreateShipmentPartners();

  const [direction, setDirectionState] = useState<LoadsDirection>('outbound');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeKpi, setActiveKpiState] = useState<KpiKey | null>(null);
  const [activeTab, setActiveTabState] = useState<StatusTabKey>('active');
  const [sortKey, setSortKey] = useState<SortKey>('');
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<ShipmentsFilterState>(DEFAULT_FILTERS);
  const [productTypeNames, setProductTypeNames] = useState<Record<string, string>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, Shipment>>({});
  const [detailLoadingIds, setDetailLoadingIds] = useState<Set<string>>(new Set());
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

  const setDirection = useCallback((next: LoadsDirection) => {
    setDirectionState(next);
    setPage(1);
    if (next === 'inbound') {
      setExpandedId(null);
      setSelectedIds(new Set());
      setIsFilterOpen(false);
      setIsSortOpen(false);
      setIsInviteOpen(false);
      setCancelTarget(null);
      setBulkCancelIds(null);
    }
  }, []);

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
      direction: isOutbound ? 'outbound' : 'inbound',
    };
  }, [filterParams, debouncedSearch, isOutbound]);

  const listParams = useMemo((): ListShipmentsParams => {
    const status = statusTabToApiStatus(activeTab);
    return {
      ...summaryParams,
      page,
      per_page: PER_PAGE,
      ...(activeKpi ? { kpi: activeKpi } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(sortKey ? { sort: sortKey } : {}),
    };
  }, [summaryParams, page, activeKpi, activeTab, sortKey]);

  const { shipments, meta, summary, loading, error } = useShipmentsList(
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

  const setActiveKpi = useCallback((key: KpiKey | null) => {
    setActiveKpiState(key);
    setPage(1);
  }, []);

  const setActiveTab = useCallback((tab: StatusTabKey) => {
    setActiveTabState(tab);
    setPage(1);
  }, []);

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
  }, []);

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

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        setDetailCache((cache) => {
          if (cache[next]) return cache;
          setDetailLoadingIds((loadingSet) => {
            if (loadingSet.has(next)) return loadingSet;
            return new Set(loadingSet).add(next);
          });
          void shipmentsService
            .getMapped(next)
            .then((detail) => {
              setDetailCache((c) => ({ ...c, [next]: detail }));
            })
            .catch(() => undefined)
            .finally(() => {
              setDetailLoadingIds((loadingSet) => {
                const copy = new Set(loadingSet);
                copy.delete(next);
                return copy;
              });
            });
          return cache;
        });
      }
      return next;
    });
  }, []);

  const mergedShipment = useCallback(
    (s: Shipment): Shipment => {
      const detail = detailCache[s.id];
      if (!detail) return s;
      return {
        ...s,
        ...detail,
        bids: Math.max(s.bids || 0, detail.bids || 0),
        bidsReceived: s.bidsReceived ?? detail.bidsReceived,
        bidsSent: s.bidsSent ?? detail.bidsSent,
        best_bid: s.best_bid ?? detail.best_bid,
        carrier: s.carrier ?? detail.carrier,
        carrier_init: s.carrier_init ?? detail.carrier_init,
        quotedPrice: s.quotedPrice ?? detail.quotedPrice,
        agreedPrice: s.agreedPrice ?? detail.agreedPrice,
        channel: s.channel ?? detail.channel,
        invited: detail.invited ?? s.invited,
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

  const handleCancelled = useCallback(() => {
    showToast(t('shipmentCancelled'), 'success');
    setRefreshKey((k) => k + 1);
    setCancelTarget(null);
    setExpandedId(null);
  }, [showToast, t]);

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

  const refreshAfterMutation = useCallback((shipmentId?: string) => {
    if (shipmentId) {
      setDetailCache((cache) => {
        const next = { ...cache };
        delete next[shipmentId];
        return next;
      });
    }
    setRefreshKey((k) => k + 1);
  }, []);

  const handleMessage = useCallback((s: Shipment, offerId?: string) => {
    const q = offerId ? `?offer=${encodeURIComponent(offerId)}` : '';
    window.open(`/shipments/${s.id}${q}`, '_blank', 'noopener,noreferrer');
  }, []);

  const handleAcceptOffer = useCallback(
    async (s: Shipment, offerId: string) => {
      try {
        await shipmentsService.acceptOffer(s.id, offerId);
        showToast(t('offerAccepted') || 'Offer accepted', 'success');
        refreshAfterMutation(s.id);
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [refreshAfterMutation, showToast, t]
  );

  const handleRejectOffer = useCallback(
    async (s: Shipment, offerId: string) => {
      try {
        await shipmentsService.rejectOffer(s.id, offerId);
        showToast(t('offerRejected') || 'Offer rejected', 'success');
        refreshAfterMutation(s.id);
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [refreshAfterMutation, showToast, t]
  );

  const handleCounterOffer = useCallback(
    async (s: Shipment, offerId: string, amount: number) => {
      try {
        await shipmentsService.counterOffer(s.id, offerId, { amount });
        showToast(t('counterSent') || 'Counter-offer sent', 'success');
        refreshAfterMutation(s.id);
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [refreshAfterMutation, showToast, t]
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
        refreshAfterMutation(s.id);
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [refreshAfterMutation, showToast, t]
  );

  const handleInviteMore = useCallback((s: Shipment) => {
    setInviteTargetId(s.id);
    setIsInviteOpen(true);
  }, []);

  const handleBulkAction = useCallback(
    async (action: string) => {
      const ids = Array.from(selectedIds).map((id) => Number(id)).filter((n) => Number.isFinite(n));
      if (ids.length === 0) return;

      if (action === 'invite') {
        const first = pagination.items.find((s) => selectedIds.has(s.id) && s.channel !== 'public');
        if (!first) {
          showToast(t('invitePrivateOnly') || 'Select a private load to invite transporters', 'warning');
          return;
        }
        setInviteTargetId(first.id);
        setIsInviteOpen(true);
        return;
      }

      try {
        if (action === 'extend') {
          await shipmentsService.bulkExtendBid(ids, EXTEND_BID_HOURS);
          showToast(t('bidExtended', { hours: EXTEND_BID_HOURS }) || `Bid time extended by ${EXTEND_BID_HOURS} hours`, 'success');
        } else if (action === 'export') {
          await shipmentsService.exportShipments({ ...summaryParams, ids });
          setSelectedIds(new Set());
          setRefreshKey((k) => k + 1);
        } else if (action === 'cancel') {
          setBulkCancelIds(ids);
        }
        if (action === 'extend') {
          setSelectedIds(new Set());
          setRefreshKey((k) => k + 1);
        }
      } catch (err: unknown) {
        showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
      }
    },
    [pagination.items, selectedIds, showToast, summaryParams, t]
  );

  const handleSendInvites = useCallback(async () => {
    if (invitedCarriers.size === 0) {
      showToast(t('selectAtLeastOneCarrier'), 'warning');
      return;
    }
    const targetId = inviteTargetId || Array.from(selectedIds)[0];
    if (!targetId) {
      showToast(t('somethingWentWrong') || 'No shipment selected', 'warning');
      return;
    }
    const partnerIds = Array.from(invitedCarriers)
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (partnerIds.length === 0) {
      showToast(t('selectAtLeastOneCarrier'), 'warning');
      return;
    }
    try {
      await shipmentsService.invitePartners(targetId, partnerIds);
      showToast(t('invitesSent', { count: partnerIds.length }), 'success');
      setIsInviteOpen(false);
      setInvitedCarriers(new Set());
      setInviteTargetId(null);
      refreshAfterMutation(String(targetId));
    } catch (err: unknown) {
      showToast(err instanceof ApiError ? err.message : t('somethingWentWrong') || 'Failed', 'error');
    }
  }, [inviteTargetId, invitedCarriers, refreshAfterMutation, selectedIds, showToast, t]);

  const handleToggleInviteCarrier = useCallback((id: string) => {
    setInvitedCarriers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkCancelled = useCallback(() => {
    setBulkCancelIds(null);
    setSelectedIds(new Set());
    setCancelTarget(null);
    setRefreshKey((k) => k + 1);
  }, []);

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
    mergedShipment,
    handleSelectAll,
    handleSelectRow,
    handleToggleExpand,
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
    inviteQuery,
    setInviteQuery,
    invitedCarriers,
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
    filtersActive: filterChips.length > 0,
  };
}
