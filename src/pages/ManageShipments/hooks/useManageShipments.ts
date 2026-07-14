import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, shipmentsService } from '../../../api';
import type { ListShipmentsParams } from '../../../api/types/shipments';
import { useApp } from '../../../context/AppContext';
import type { Shipment } from '../../../context/AppContext';
import { useShipmentsList } from '../../../hooks/useShipments';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  buildFilterChips,
  clearFilterChip,
  DEFAULT_FILTERS,
  filtersToApiParams,
  statusTabHasApiSupport,
  statusTabToApiStatus,
  validateFilterRanges,
  type FilterChipKey,
  type KpiKey,
  type ShipmentsFilterState,
  type SortKey,
  type StatusTabKey,
} from '../utils/listingUtils';

const PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function useManageShipments() {
  const { updateShipment, carriers, showToast } = useApp();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeKpi, setActiveKpiState] = useState<KpiKey | null>('needs_action');
  const [activeTab, setActiveTabState] = useState<StatusTabKey>('active');
  const [sortKey, setSortKey] = useState<SortKey>('');
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<ShipmentsFilterState>(DEFAULT_FILTERS);
  const [productTypeNames, setProductTypeNames] = useState<Record<string, string>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [invitedCarriers, setInvitedCarriers] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<Shipment | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filterParams = useMemo(() => filtersToApiParams(appliedFilters), [appliedFilters]);
  const tabSupported = statusTabHasApiSupport(activeTab);

  const summaryParams = useMemo((): Omit<ListShipmentsParams, 'page' | 'per_page'> => {
    return {
      ...filterParams,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    };
  }, [filterParams, debouncedSearch]);

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
    refreshKey
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
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCopyId = useCallback(
    (id: string) => {
      navigator.clipboard.writeText(id);
      showToast(t('copiedId', { id }), 'success');
    },
    [showToast, t]
  );

  const handleAward = useCallback(
    (s: Shipment, carrierName: string, bidPrice: number) => {
      updateShipment({
        ...s,
        status: 'awarded',
        carrier: carrierName,
        price: bidPrice,
        updated: 'Just now',
        tl_cur: 3,
      });
      showToast(t('awardedTo', { name: carrierName }), 'success');
    },
    [updateShipment, showToast, t]
  );

  const handleClone = useCallback(
    (id: string) => {
      showToast(t('shipmentCloned', { id }), 'success');
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
  }, [showToast, t]);

  const handleEditBlocked = useCallback(() => {
    showToast(t('editNotAllowed'), 'warning');
  }, [showToast, t]);

  const handleBulkAction = useCallback(
    (action: string) => {
      showToast(`${action}: ${selectedIds.size}`, 'info');
      if (action === 'invite') setIsInviteOpen(true);
      else setSelectedIds(new Set());
    },
    [selectedIds, showToast]
  );

  const handleToggleInviteCarrier = useCallback((name: string) => {
    setInvitedCarriers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleSendInvites = useCallback(() => {
    if (invitedCarriers.size === 0) {
      showToast(t('selectAtLeastOneCarrier'), 'warning');
      return;
    }
    showToast(t('invitesSent', { count: invitedCarriers.size }), 'success');
    setIsInviteOpen(false);
    setInvitedCarriers(new Set());
  }, [invitedCarriers, showToast, t]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await shipmentsService.exportShipments({
        ...listParams,
        page: undefined,
        per_page: undefined,
      });
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
    handleSelectAll,
    handleSelectRow,
    handleToggleExpand,
    handleCopyId,
    handleAward,
    handleClone,
    handleDeleteRequest,
    handleCancelled,
    handleEditBlocked,
    cancelTarget,
    setCancelTarget,
    handleBulkAction,
    isInviteOpen,
    setIsInviteOpen,
    inviteQuery,
    setInviteQuery,
    invitedCarriers,
    handleToggleInviteCarrier,
    handleSendInvites,
    carriers,
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
