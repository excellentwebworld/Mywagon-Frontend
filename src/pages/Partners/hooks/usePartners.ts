import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSyncGlobalLoader } from '../../../hooks/useSyncGlobalLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { partnersService, ApiError } from '../../../api';
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

  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

  const [facetFilter, setFacetFilter] = useState<FacetFilter>('all');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<PartnersSortField>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | ''>('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [openFilterDropdown, setOpenFilterDropdown] = useState('');

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<OpenSections>(EMPTY_SECTIONS);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(EMPTY_INVITE);
  const [genericModal, setGenericModal] = useState<GenericModalType>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
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
    queryClient.invalidateQueries({ queryKey: ['partners'] });
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
      setSelectedPartnerId(null);
      showToast(t('partnerDeclined'));
    },
    onError: (err) => handleApiError(err, t('actionFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partnersService.delete(id),
    onSuccess: () => {
      invalidatePartners();
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
    mutationFn: ({ id, payload }: { id: string; payload: { origin_city: string; destination_city: string; price: number; unit: 'load' | 'pallet' } }) =>
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

  const selectFacet = useCallback((filter: FacetFilter) => {
    setFacetFilter((prev) => (prev === filter ? 'all' : filter));
    setKpiFilter('');
    setSelectedPartnerId(null);
  }, []);

  const selectKpi = useCallback((key: KpiFilter) => {
    const next = kpiFilter === key ? '' : key;
    setKpiFilter(next);
    const facet = kpiToFacet(next);
    if (facet) setFacetFilter(facet);
    else if (next === '') setFacetFilter('all');
    setSelectedPartnerId(null);
  }, [kpiFilter]);

  const toggleFilterDropdown = useCallback((key: string) => {
    setOpenFilterDropdown((prev) => (prev === key ? '' : key));
  }, []);

  const toggleBarFilter = useCallback(<K extends keyof ActiveFilters>(category: K, value: ActiveFilters[K][number]) => {
    setActiveFilters((prev) => {
      const arr = prev[category] as unknown[];
      const idx = arr.indexOf(value);
      const next = idx >= 0 ? arr.filter((_, i) => i !== idx) : [...arr, value];
      return { ...prev, [category]: next };
    });
    setSelectedPartnerId(null);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setKpiFilter('');
    setFacetFilter('all');
    setActiveFilters(EMPTY_FILTERS);
    setSelectedPartnerId(null);
    showToast(t('partnerFiltersCleared'));
  }, [showToast, t]);

  const openDetailPanel = useCallback((p: Partner) => {
    setSelectedPartnerId(p.id);
    setOpenSections(EMPTY_SECTIONS);
  }, []);

  const closeDetailPanel = useCallback(() => setSelectedPartnerId(null), []);

  const toggleSection = useCallback((key: keyof OpenSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const openInviteModal = useCallback(() => {
    setInviteForm(EMPTY_INVITE);
    setIsInviteOpen(true);
  }, []);

  const closeInviteModal = useCallback(() => setIsInviteOpen(false), []);

  const sendInvite = useCallback((values: InviteFormState) => {
    inviteMutation.mutate(values);
  }, [inviteMutation]);

  const openGenericModal = useCallback((type: GenericModalType) => {
    setGenericModal(type);
  }, []);

  const closeGenericModal = useCallback(() => setGenericModal(null), []);

  const saveContractLane = useCallback((values: { origin_city: string; destination_city: string; price: number; unit: 'load' | 'pallet' }) => {
    if (!selectedPartner) return;
    laneMutation.mutate({
      id: selectedPartner.id,
      payload: values,
    });
  }, [selectedPartner, laneMutation]);

  const executeConfirm = useCallback(() => {
    if (!confirmAction) return;
    const { type, partner } = confirmAction;
    if (type === 'suspend' || type === 'reactivate') toggleStatusMutation.mutate(partner.id);
    else if (type === 'remove') deleteMutation.mutate(partner.id);
    else if (type === 'decline') declineMutation.mutate(partner.id);
    else if (type === 'deleteLane' && confirmAction.type === 'deleteLane') {
      deleteLaneMutation.mutate({ partnerId: partner.id, laneId: confirmAction.laneId });
    }
    setConfirmAction(null);
  }, [confirmAction, toggleStatusMutation, deleteMutation, declineMutation, deleteLaneMutation]);

  const suspendPartner = useCallback((p: Partner) => setConfirmAction({ type: 'suspend', partner: p }), []);
  const reactivatePartner = useCallback((p: Partner) => setConfirmAction({ type: 'reactivate', partner: p }), []);
  const permanentlyRemovePartner = useCallback((p: Partner) => setConfirmAction({ type: 'remove', partner: p }), []);
  const declinePartner = useCallback((p: Partner) => setConfirmAction({ type: 'decline', partner: p }), []);
  const cancelInvite = useCallback((p: Partner) => setConfirmAction({ type: 'remove', partner: p }), []);
  const acceptPartner = useCallback((p: Partner) => acceptMutation.mutate(p.id), [acceptMutation]);
  const togglePreferred = useCallback((p: Partner) => togglePreferredMutation.mutate(p.id), [togglePreferredMutation]);
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

  const goToPage = useCallback((page: number) => setCurrentPage(page), []);
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
    toggleBarFilter,
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
    inviteLoading: inviteMutation.isPending,
    openGenericModal,
    closeGenericModal,
    saveContractLane,
    deleteContractLane,
    laneLoading: laneMutation.isPending,
  };
}

export type PartnersState = ReturnType<typeof usePartners>;
