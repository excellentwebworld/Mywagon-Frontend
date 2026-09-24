import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSyncGlobalLoader } from '../../../hooks/useSyncGlobalLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { useRequireSignupComplete } from '../../../hooks/useRequireSignupComplete';
import { useShipperPermission } from '../../../hooks/useShipperPermission';
import { ACTION_RBAC } from '../../../utils/shipperRbacMap';
import { partnersService, ApiError } from '../../../api';
import type { StoreContractLanePayload } from '../../../api/types/partners';
import { syncPartnerDropdownCaches } from '../../../api/utils/masterDataCache';
import { clearCreateShipmentPartnersCache } from '../../../hooks/useCreateShipmentPartners';
import {
  inviteTypeToApi,
  kpiToFacet,
  summaryToFacetCounts,
  summaryToKpiCounts,
} from '../../../api/mappers/partnersMapper';
import type {
  ActiveFilters,
  ConfirmAction,
  FacetFilter,
  GenericModalType,
  InviteFormState,
  KpiFilter,
  OpenSections,
  Partner,
  PartnersSortField,
} from '../types';

const SEARCH_DEBOUNCE_MS = 250;
const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [10, 12, 25, 50, 100];

const EMPTY_FILTERS: ActiveFilters = { status: [], capability: [] };

const EMPTY_SECTIONS: OpenSections = {
  companyProfile: true,
  kpis: true,
  fleet: true,
  contracts: true,
  notes: true,
};

const EMPTY_INVITE: InviteFormState = {
  method: 'email',
  partnerType: 'carrier_company',
  contact: '',
  countryCode: '+30',
  relationship: null,
  sent: false,
};

export function usePartners() {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const queryClient = useQueryClient();
  const { requireSignupComplete } = useRequireSignupComplete();
  const { canAction, requirePermission: requireRbac } = useShipperPermission();

  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const setSearchParamsRef = useRef(setSearchParams);
  const searchParamsRef = useRef(searchParams);
  setSearchParamsRef.current = setSearchParams;
  searchParamsRef.current = searchParams;

  const [facetFilter, setFacetFilter] = useState<FacetFilter>(() => (searchParams.get('facet') as FacetFilter) || 'all');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>(() => (searchParams.get('kpi') as KpiFilter) || '');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '');
  const [sortField, setSortField] = useState<PartnersSortField>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | ''>('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [openFilterDropdown, setOpenFilterDropdown] = useState('');

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(() => {
    const fromUrl = searchParams.get('partner_id');
    return fromUrl && /^\d+$/.test(fromUrl) ? fromUrl : null;
  });
  const [openSections, setOpenSections] = useState<OpenSections>(EMPTY_SECTIONS);

  const [currentPage, setCurrentPage] = useState(
    () => Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  );
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const lastUrlSearchRef = useRef(searchParams.get('search') || '');

  // Synchronize state changes to URL query parameters
  useEffect(() => {
    const prev = searchParamsRef.current;
    const next = new URLSearchParams(prev);

    if (facetFilter === 'all') next.delete('facet');
    else next.set('facet', facetFilter);

    if (!kpiFilter) next.delete('kpi');
    else next.set('kpi', kpiFilter);

    if (!debouncedSearch) next.delete('search');
    else next.set('search', debouncedSearch);

    if (currentPage <= 1) next.delete('page');
    else next.set('page', String(currentPage));

    const unchanged =
      (prev.get('facet') ?? null) === (next.get('facet') ?? null) &&
      (prev.get('kpi') ?? null) === (next.get('kpi') ?? null) &&
      (prev.get('search') ?? null) === (next.get('search') ?? null) &&
      (prev.get('page') ?? null) === (next.get('page') ?? null);
    if (unchanged) return;

    lastUrlSearchRef.current = debouncedSearch || '';
    setSearchParamsRef.current(next, { replace: true });
  }, [facetFilter, kpiFilter, debouncedSearch, currentPage]);

  // Synchronize URL query parameters back to state (for back/forward navigation)
  useEffect(() => {
    const nextFacet = (searchParams.get('facet') as FacetFilter) || 'all';
    setFacetFilter((prev) => (prev === nextFacet ? prev : nextFacet));

    const nextKpi = (searchParams.get('kpi') as KpiFilter) || '';
    setKpiFilter((prev) => (prev === nextKpi ? prev : nextKpi));

    const q = searchParams.get('search') || '';
    if (q !== lastUrlSearchRef.current) {
      lastUrlSearchRef.current = q;
      setSearchQuery(q);
      setDebouncedSearch(q);
    }

    const partnerFromUrl = searchParams.get('partner_id');
    const nextPartnerId = partnerFromUrl && /^\d+$/.test(partnerFromUrl) ? partnerFromUrl : null;
    setSelectedPartnerId((prev) => (prev === nextPartnerId ? prev : nextPartnerId));

    const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    setCurrentPage((prev) => (prev === pageFromUrl ? prev : pageFromUrl));
  }, [searchParams]);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(EMPTY_INVITE);
  const [genericModal, setGenericModal] = useState<GenericModalType>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFilterPageResetRef = useRef(true);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (searchQuery === debouncedSearch) return;
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    if (skipFilterPageResetRef.current) {
      skipFilterPageResetRef.current = false;
      return;
    }
    setCurrentPage(1);
  }, [facetFilter, activeFilters, perPage, kpiFilter, sortField, sortDir]);

  const handleApiError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setSubscriptionBlocked(true);
          setError(err.message);
          showToast(err.message, 'error');
          return err.message;
        }
        showToast(err.message, 'error');
        return err.message;
      }
      showToast(fallback, 'error');
      return fallback;
    },
    [showToast]
  );

  const invalidatePartners = useCallback(() => {
    syncPartnerDropdownCaches(queryClient, clearCreateShipmentPartnersCache);
  }, [queryClient]);

  const summaryQuery = useQuery({
    queryKey: ['partners', 'summary'],
    queryFn: () => partnersService.getSummary(),
  });

  const truckCategoriesQuery = useQuery({
    queryKey: ['partners', 'reference', 'truck-categories'],
    queryFn: () => partnersService.getTruckCategories(),
  });

  const listQuery = useQuery({
    queryKey: [
      'partners',
      'list',
      facetFilter,
      activeFilters,
      debouncedSearch,
      currentPage,
      perPage,
      sortField,
      sortDir,
    ],
    queryFn: () =>
      partnersService.listPartnersMapped(
        facetFilter,
        activeFilters.status,
        activeFilters.capability,
        debouncedSearch,
        currentPage,
        perPage,
        sortField,
        sortDir
      ),
  });

  const detailQuery = useQuery({
    queryKey: ['partners', 'detail', selectedPartnerId],
    queryFn: () => partnersService.getPartner(selectedPartnerId!),
    enabled: !!selectedPartnerId,
  });

  const listPartners = listQuery.data?.partners ?? [];
  const listMeta = listQuery.data?.meta ?? { current_page: 1, per_page: perPage, total: 0, last_page: 1 };

  const selectedPartner: Partner | null = useMemo(() => {
    if (!selectedPartnerId) return null;
    if (detailQuery.data) return detailQuery.data;
    return listPartners.find((p) => p.id === selectedPartnerId) ?? null;
  }, [selectedPartnerId, detailQuery.data, listPartners]);

  const toggleSort = useCallback((field: PartnersSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir(field === 'created_at' ? 'desc' : 'asc');
  }, [sortField]);

  const kpiCounts = useMemo(
    () => (summaryQuery.data ? summaryToKpiCounts(summaryQuery.data) : {
      total: 0, active: 0, carriers: 0, freelancers: 0, shippers: 0, invited: 0, suspended: 0,
    }),
    [summaryQuery.data]
  );

  const facetCounts = useMemo(
    () => (summaryQuery.data ? summaryToFacetCounts(summaryQuery.data) : { all: 0 }),
    [summaryQuery.data]
  );

  const truckCategories = truckCategoriesQuery.data ?? [];

  const inviteMutation = useMutation({
    mutationFn: (form: InviteFormState) => {
      const type = inviteTypeToApi(form.partnerType);
      const payload: Parameters<typeof partnersService.invite>[0] = { type };
      if (form.relationship) payload.relationship = form.relationship;
      if (form.method === 'email') payload.email = form.contact.trim();
      else if (form.method === 'phone') {
        payload.phone = form.contact.trim();
        payload.country_code = form.countryCode;
      } else {
        payload.unique_id = form.contact.trim().toUpperCase();
      }
      return partnersService.invite(payload);
    },
    onSuccess: () => {
      setInviteForm((prev) => ({ ...prev, sent: true }));
      invalidatePartners();
      showToast(t('inviteSent'));
    },
    onError: (err) => handleApiError(err, t('inviteFailed')),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => partnersService.accept(id),
    onSuccess: () => { invalidatePartners(); showToast(t('partnerAccepted')); },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => partnersService.decline(id),
    onSuccess: () => {
      invalidatePartners();
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('partner_id');
          return next;
        },
        { replace: true }
      );
      setSelectedPartnerId(null);
      showToast(t('partnerDeclined'));
    },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partnersService.delete(id),
    onSuccess: () => {
      invalidatePartners();
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('partner_id');
          return next;
        },
        { replace: true }
      );
      setSelectedPartnerId(null);
      showToast(t('partnerRemoved'));
    },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => partnersService.toggleStatus(id),
    onSuccess: (data) => {
      invalidatePartners();
      showToast(data.is_suspended ? t('partnerSuspended') : t('partnerReactivated'));
    },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const togglePreferredMutation = useMutation({
    mutationFn: (id: string) => partnersService.togglePreferred(id),
    onSuccess: (data) => {
      invalidatePartners();
      showToast(data.is_preferred ? t('markedPreferred') : t('relationshipStandard'));
    },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => partnersService.updateNotes(id, notes),
    onSuccess: () => { invalidatePartners(); showToast(t('partnerNoteSaved')); },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const tagsMutation = useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) => partnersService.updateTags(id, tags),
    onSuccess: () => { invalidatePartners(); showToast(t('tagsUpdated')); },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const laneMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StoreContractLanePayload }) =>
      partnersService.storeContractLane(id, payload),
    onSuccess: () => {
      invalidatePartners();
      closeGenericModal();
      showToast(t('laneAdded'));
    },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const deleteLaneMutation = useMutation({
    mutationFn: ({ partnerId, laneId }: { partnerId: string; laneId: string }) =>
      partnersService.destroyContractLane(partnerId, laneId),
    onSuccess: () => { invalidatePartners(); showToast(t('laneDeleted')); },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const clearPartnerSelection = useCallback(() => {
    setSelectedPartnerId(null);
    setSearchParams(
      (prev) => {
        if (!prev.get('partner_id')) return prev;
        const next = new URLSearchParams(prev);
        next.delete('partner_id');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const selectFacet = useCallback((filter: FacetFilter) => {
    setFacetFilter((prev) => (prev === filter ? 'all' : filter));
    setKpiFilter('');
    clearPartnerSelection();
  }, [clearPartnerSelection]);

  const selectKpi = useCallback((key: KpiFilter) => {
    const next = kpiFilter === key ? '' : key;
    setKpiFilter(next);
    const facet = kpiToFacet(next);
    if (facet) setFacetFilter(facet);
    else if (next === '') setFacetFilter('all');
    clearPartnerSelection();
  }, [clearPartnerSelection, kpiFilter]);

  const toggleFilterDropdown = useCallback((key: string) => {
    setOpenFilterDropdown((prev) => (prev === key ? '' : key));
  }, []);

  const closeFilterDropdown = useCallback(() => {
    setOpenFilterDropdown('');
  }, []);

  const applyFilters = useCallback((filters: ActiveFilters) => {
    setActiveFilters(filters);
    clearPartnerSelection();
  }, [clearPartnerSelection]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setKpiFilter('');
    setFacetFilter('all');
    setActiveFilters(EMPTY_FILTERS);
    setOpenFilterDropdown('');
    clearPartnerSelection();
    showToast(t('partnerFiltersCleared'));
  }, [clearPartnerSelection, showToast, t]);

  const openDetailPanel = useCallback((p: Partner) => {
    setSelectedPartnerId(p.id);
    setOpenSections(EMPTY_SECTIONS);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('partner_id', p.id);
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const closeDetailPanel = useCallback(() => {
    clearPartnerSelection();
  }, [clearPartnerSelection]);

  const toggleSection = useCallback((key: keyof OpenSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const openInviteModal = useCallback(() => {
    if (!requireSignupComplete()) return;
    if (!requireRbac(ACTION_RBAC.invitePartner)) return;
    setInviteForm(EMPTY_INVITE);
    setIsInviteOpen(true);
  }, [requireSignupComplete, requireRbac]);

  const closeInviteModal = useCallback(() => setIsInviteOpen(false), []);

  const sendInvite = useCallback((values: InviteFormState) => {
    if (!requireRbac(ACTION_RBAC.invitePartner)) return;
    inviteMutation.mutate(values);
  }, [inviteMutation, requireRbac]);

  const openGenericModal = useCallback((type: GenericModalType) => {
    if (!requireSignupComplete()) return;
    setGenericModal(type);
  }, [requireSignupComplete]);

  const closeGenericModal = useCallback(() => setGenericModal(null), []);

  const saveContractLane = useCallback((values: StoreContractLanePayload) => {
    if (!requireSignupComplete()) return;
    if (!selectedPartner) return;
    laneMutation.mutate({
      id: selectedPartner.id,
      payload: values,
    });
  }, [selectedPartner, laneMutation, requireSignupComplete]);

  const executeConfirm = useCallback(() => {
    if (!requireSignupComplete()) return;
    if (!confirmAction) return;
    const { type, partner } = confirmAction;
    if (type === 'decline' && !requireRbac(ACTION_RBAC.acceptDeclinePartner)) return;
    if (type === 'suspend' || type === 'reactivate') toggleStatusMutation.mutate(partner.id);
    else if (type === 'remove') deleteMutation.mutate(partner.id);
    else if (type === 'decline') declineMutation.mutate(partner.id);
    else if (type === 'deleteLane' && confirmAction.type === 'deleteLane') {
      deleteLaneMutation.mutate({ partnerId: partner.id, laneId: confirmAction.laneId });
    }
    setConfirmAction(null);
  }, [confirmAction, toggleStatusMutation, deleteMutation, declineMutation, deleteLaneMutation, requireSignupComplete, requireRbac]);

  const suspendPartner = useCallback((p: Partner) => setConfirmAction({ type: 'suspend', partner: p }), []);
  const reactivatePartner = useCallback((p: Partner) => setConfirmAction({ type: 'reactivate', partner: p }), []);
  const permanentlyRemovePartner = useCallback((p: Partner) => setConfirmAction({ type: 'remove', partner: p }), []);
  const declinePartner = useCallback((p: Partner) => {
    if (!requireRbac(ACTION_RBAC.acceptDeclinePartner)) return;
    setConfirmAction({ type: 'decline', partner: p });
  }, [requireRbac]);
  const cancelInvite = useCallback((p: Partner) => setConfirmAction({ type: 'remove', partner: p }), []);
  const acceptPartner = useCallback((p: Partner) => {
    if (!requireSignupComplete()) return;
    if (!requireRbac(ACTION_RBAC.acceptDeclinePartner)) return;
    acceptMutation.mutate(p.id);
  }, [acceptMutation, requireSignupComplete, requireRbac]);
  const togglePreferred = useCallback((p: Partner) => {
    if (!requireSignupComplete()) return;
    togglePreferredMutation.mutate(p.id);
  }, [togglePreferredMutation, requireSignupComplete]);
  const saveNote = useCallback((noteText: string) => {
    if (!selectedPartner) return;
    notesMutation.mutate({ id: selectedPartner.id, notes: noteText });
  }, [selectedPartner, notesMutation]);
  const saveTags = useCallback((tags: string[]) => {
    if (!selectedPartner) return;
    tagsMutation.mutate({ id: selectedPartner.id, tags });
  }, [selectedPartner, tagsMutation]);
  const deleteContractLane = useCallback((laneId: string) => {
    if (!selectedPartner) return;
    setConfirmAction({ type: 'deleteLane', partner: selectedPartner, laneId });
  }, [selectedPartner]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);
  const setPageSize = useCallback((size: number) => {
    if (PAGE_SIZE_OPTIONS.includes(size)) setPerPage(size);
  }, []);

  const listLoading = listQuery.isLoading || listQuery.isFetching;
  const detailLoading = detailQuery.isLoading && !!selectedPartnerId;

  const actionLoading =
    inviteMutation.isPending ||
    acceptMutation.isPending ||
    declineMutation.isPending ||
    deleteMutation.isPending ||
    toggleStatusMutation.isPending ||
    togglePreferredMutation.isPending ||
    notesMutation.isPending ||
    tagsMutation.isPending ||
    laneMutation.isPending ||
    deleteLaneMutation.isPending;

  useSyncGlobalLoader(actionLoading);

  return {
    t,
    showToast,
    error,
    subscriptionBlocked,
    filteredPartners: listPartners,
    kpiCounts,
    facetCounts,
    truckCategories,
    listMeta,
    listLoading,
    detailLoading,
    facetFilter,
    kpiFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDir,
    toggleSort,
    activeFilters,
    openFilterDropdown,
    selectedPartner,
    selectedPartnerId,
    openSections,
    currentPage,
    perPage,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    goToPage,
    setPageSize,
    isInviteOpen,
    inviteForm,
    setInviteForm,
    genericModal,
    confirmAction,
    setConfirmAction,
    executeConfirm,
    selectFacet,
    selectKpi,
    toggleFilterDropdown,
    closeFilterDropdown,
    applyFilters,
    clearAllFilters,
    openDetailPanel,
    closeDetailPanel,
    toggleSection,
    suspendPartner,
    reactivatePartner,
    permanentlyRemovePartner,
    declinePartner,
    cancelInvite,
    acceptPartner,
    togglePreferred,
    saveNote,
    saveTags,
    openInviteModal,
    closeInviteModal,
    sendInvite,
    canInvitePartner: canAction('invitePartner'),
    canAcceptDeclinePartner: canAction('acceptDeclinePartner'),
    inviteLoading: inviteMutation.isPending,
    openGenericModal,
    closeGenericModal,
    saveContractLane,
    deleteContractLane,
    laneLoading: laneMutation.isPending,
  };
}

export type PartnersState = ReturnType<typeof usePartners>;
