import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import type { Shipment } from '../../../context/AppContext';
import { useShipmentsList } from '../../../hooks/useShipments';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  computeKpiCounts,
  DEFAULT_FILTERS,
  filterShipments,
  paginate,
  type KpiKey,
  type SortKey,
  type StatusTabKey,
} from '../utils/listingUtils';

const PER_PAGE = 10;

export function useManageShipments() {
  const { updateShipment, carriers, showToast } = useApp();
  const { shipments, loading, error } = useShipmentsList();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>('action');
  const [activeTab, setActiveTab] = useState<StatusTabKey>('active');
  const [sortKey, setSortKey] = useState<SortKey>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [invitedCarriers, setInvitedCarriers] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const kpiCounts = useMemo(() => computeKpiCounts(shipments), [shipments]);

  const filtered = useMemo(
    () =>
      filterShipments(shipments, {
        searchQuery,
        activeKpi,
        activeTab,
        filters: DEFAULT_FILTERS,
        sortKey,
      }),
    [shipments, searchQuery, activeKpi, activeTab, sortKey]
  );

  const pagination = useMemo(() => paginate(filtered, page, PER_PAGE), [filtered, page]);

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

  const handleExport = useCallback(() => {
    showToast(t('exportComingSoon'), 'info');
  }, [showToast, t]);

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
    setSearchQuery,
    activeKpi,
    setActiveKpi,
    activeTab,
    setActiveTab,
    sortKey,
    kpiCounts,
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
    handleApplySort,
  };
}
