import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import type { LocationItem } from '../../../context/AppContext';
import { addressBookService, ApiError } from '../../../api';
import type { ApiAddressBookSummary, ApiAmenity, ApiListMeta } from '../../../api';
import { directoryToListParams } from '../../../api/mappers/addressBookMapper';
import {
  EMPTY_COMPANY_DATA,
  EMPTY_CREATE_DATA,
  type AddressBookSortField,
  type CompanyFormData,
  type CreateLocationData,
} from '../types';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { useSyncGlobalLoader } from '../../../hooks/useSyncGlobalLoader';
import { useAuth } from '../../../context/AuthContext';
import { validateCreateAll } from '../validation/locationCreateValidation';
import { checkLocationDuplicate, DUPLICATE_LOCATION_MESSAGE } from '../validation/locationDuplicateValidation';
import { applyTemplate, getDefaultCreateData } from '../utils/locationUtils';
import type { ApiCompanyEntity, ApiCompanyLookup } from '../../../api/types/addressBook';
const SEARCH_DEBOUNCE_MS = 250;

export function useAddressBook() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast, refreshLocationsFromApi } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeNode, setActiveNode] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoc, setSelectedLoc] = useState<LocationItem | null>(null);
  const [sortField, setSortField] = useState<AddressBookSortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createData, setCreateData] = useState<CreateLocationData>(EMPTY_CREATE_DATA);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<LocationItem | null>(null);

  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyFormData>(EMPTY_COMPANY_DATA);

  const [companyQuery, setCompanyQuery] = useState('');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [apiCompanies, setApiCompanies] = useState<ApiCompanyLookup[]>([]);
  const [potentialDuplicates, setPotentialDuplicates] = useState<LocationItem[]>([]);
  const [archiveConfirmLoc, setArchiveConfirmLoc] = useState<LocationItem | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
  }, [activeNode, sortField, sortDir, perPage]);

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

  const syncGlobalLocations = useCallback(async () => {
    await refreshLocationsFromApi();
  }, [refreshLocationsFromApi]);

  const params = useMemo(() => {
    return directoryToListParams(activeNode, debouncedSearch, sortField, sortDir, currentPage, perPage);
  }, [activeNode, debouncedSearch, sortField, sortDir, currentPage, perPage]);

  // Queries
  const {
    data: locationsData,
    isLoading: loading,
    isFetching: listFetching,
    refetch: refreshLocations,
  } = useQuery({
    queryKey: ['locations', activeNode, debouncedSearch, sortField, sortDir, currentPage, perPage],
    queryFn: async () => {
      try {
        setError(null);
        const result = await addressBookService.listLocations(params);
        setSubscriptionBlocked(false);
        return result;
      } catch (err) {
        const message = handleApiError(err, 'Failed to load locations');
        setError(message);
        throw err;
      }
    },
  });

  const locations = useMemo(() => locationsData?.items ?? [], [locationsData]);
  const listMeta = useMemo(() => locationsData?.meta ?? { current_page: 1, per_page: perPage, total: 0, last_page: 1 }, [locationsData, perPage]);

  const {
    data: summaryData,
  } = useQuery({
    queryKey: ['addressBookSummary'],
    queryFn: async () => {
      try {
        return await addressBookService.getSummary();
      } catch {
        return null;
      }
    },
  });

  const summary = summaryData ?? null;

  const {
    data: amenitiesData,
  } = useQuery({
    queryKey: ['amenities'],
    queryFn: async () => {
      try {
        return await addressBookService.listAmenities();
      } catch {
        return [];
      }
    },
  });

  const amenities = amenitiesData ?? [];

  // Mutations
  const createLocationMutation = useMutation({
    mutationFn: (data: CreateLocationData) => addressBookService.createLocation(data),
    onSuccess: (created) => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['addressBookSummary'] });
      syncGlobalLocations();
      setSelectedLoc(created);
      showToast(`"${created.name}" created`, 'success');
    },
    onError: (err) => {
      handleApiError(err, 'Failed to create location');
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LocationItem }) => addressBookService.updateLocation(id, data),
    onSuccess: (updated) => {
      setSelectedLoc(updated);
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['addressBookSummary'] });
      syncGlobalLocations();
      showToast(`"${updated.name}" updated`, 'success');
    },
    onError: (err) => {
      handleApiError(err, 'Failed to update location');
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: string) => addressBookService.deleteLocation(id),
    onSuccess: (_, id) => {
      setSelectedLoc(null);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['addressBookSummary'] });
      syncGlobalLocations();
      const loc = locations.find((l) => l.id === id);
      showToast(`"${loc?.name || 'Location'}" archived`);
    },
    onError: (err) => {
      handleApiError(err, 'Failed to archive location');
    },
  });

  const restoreLocationMutation = useMutation({
    mutationFn: (id: string) => addressBookService.restoreLocation(id),
    onSuccess: (restored) => {
      setSelectedLoc(restored);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['addressBookSummary'] });
      syncGlobalLocations();
      showToast(`"${restored.name}" restored`, 'success');
    },
    onError: (err) => {
      handleApiError(err, 'Failed to restore location');
    },
  });

  const duplicateLocationMutation = useMutation({
    mutationFn: async (l: LocationItem) => {
      const full = await queryClient.fetchQuery({
        queryKey: ['locationDetail', l.id],
        queryFn: () => addressBookService.getLocation(l.id),
      });
      const duplicateData: CreateLocationData = {
        ...EMPTY_CREATE_DATA,
        context: full.group === 'customer' ? 'customer' : 'my',
        company: full.company,
        companyVat: full.companyVat,
        name: `${full.name} (Copy)`,
        address: full.address,
        city: full.city,
        postal: full.postalCode ?? '',
        region: full.region,
        lat: String(full.lat),
        lng: String(full.lng),
        phone: full.phone ?? '',
        email: full.email ?? '',
        role: full.role,
        type: full.type,
        appt: full.appt,
        hours: full.hours,
        dock: full.dock,
        equipment: full.equipment,
        maxTruck: full.maxTruck,
        maxWeight: full.maxWeight,
        adr: full.adr,
        palletExchange: full.palletExchange,
        loadTime: String(full.loadTime || ''),
        noteInternal: full.noteInternal,
        noteCarrier: full.noteCarrier,
        contacts: full.contacts,
        code: '',
        custCode: full.custCode,
        tags: full.tags.join(', '),
        amenityIds: full.amenityIds ?? [],
        timeRanges: full.timeRanges ?? [],
      };
      return addressBookService.createLocation(duplicateData);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['addressBookSummary'] });
      syncGlobalLocations();
      setSelectedLoc(created);
      showToast(`Duplicated as "${created.name}"`, 'success');
    },
    onError: (err) => {
      handleApiError(err, 'Failed to duplicate location');
    },
  });

  const saving =
    createLocationMutation.isPending ||
    updateLocationMutation.isPending ||
    deleteLocationMutation.isPending ||
    restoreLocationMutation.isPending ||
    duplicateLocationMutation.isPending;

  const globalLoaderActive =
    saving || actionLoading || exporting || editModalLoading || companySaving || detailLoading;

  useSyncGlobalLoader(globalLoaderActive);

  useEffect(() => {
    if (!isCreateOpen) return;
    const q = companyQuery.trim();
    const companyType = createData.context === 'customer' ? 'customers' : 'my_locations';
    const timer = setTimeout(() => {
      addressBookService
        .listCompanies(q || undefined, companyType)
        .then(setApiCompanies)
        .catch(() => setApiCompanies([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [companyQuery, isCreateOpen, createData.context]);

  useEffect(() => {
    if (createStep !== 4) {
      setPotentialDuplicates([]);
      return;
    }

    const name = createData.name.trim();
    const company = createData.company.trim();
    if (!name || !company) return;

    let cancelled = false;
    addressBookService
      .checkDuplicate(name, company)
      .then(async (result) => {
        if (cancelled || !result.duplicate || !result.existing_id) {
          if (!cancelled) setPotentialDuplicates([]);
          return;
        }
        const existing = await queryClient.fetchQuery({
          queryKey: ['locationDetail', String(result.existing_id)],
          queryFn: () => addressBookService.getLocation(String(result.existing_id)),
        });
        if (!cancelled) setPotentialDuplicates([existing]);
      })
      .catch(() => {
        if (!cancelled) setPotentialDuplicates([]);
      });

    return () => {
      cancelled = true;
    };
  }, [createStep, createData, locations, queryClient]);

  const filteredLocations = locations;

  const activeDirectoryName = useMemo(() => {
    const names: Record<string, string> = {
      my: t('abMyLocations'),
      customer: t('abCustomerLocations'),
      archived: t('abArchived'),
      all: t('abAllLocations'),
    };
    return names[activeNode] ?? t('abAllLocations');
  }, [activeNode, t]);

  const openCreateModal = useCallback(() => {
    setCreateStep(1);
    setCreateData(getDefaultCreateData(activeNode));
    setIsCreateOpen(true);
  }, [activeNode]);

  const closeCreateModal = useCallback(() => setIsCreateOpen(false), []);
  const closeEditModal = useCallback(() => setIsEditOpen(false), []);
  const closeCompanyModal = useCallback(() => setIsCompanyOpen(false), []);

  const selectNode = useCallback((nodeId: string) => {
    setActiveNode(nodeId);
    setSelectedLoc(null);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setSelectedLoc(null);
  }, []);

  const handleCopy = useCallback(
    (txt: string, msg: string) => {
      navigator.clipboard.writeText(txt);
      showToast(msg, 'success');
    },
    [showToast]
  );

  const handleDuplicate = useCallback(
    async (l: LocationItem) => {
      duplicateLocationMutation.mutate(l);
    },
    [duplicateLocationMutation]
  );

  const handleApplyTemplate = useCallback((tpl: string) => {
    setCreateData((prev) => applyTemplate(tpl, prev));
  }, []);

  const submitNewLocation = useCallback(async () => {
    const payload: CreateLocationData = {
      ...createData,
      company:
        createData.context === 'customer'
          ? createData.company
          : user?.company_name?.trim() || createData.company || 'My Company',
      companyVat:
        createData.context === 'customer' ? createData.companyVat : createData.companyVat || 'N/A',
      contacts: [],
      amenityIds: [],
      equipment: [],
      hours: '',
      tags: '',
    };

    const errors = validateCreateAll(payload);
    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      showToast(errors[firstKey] ?? 'Please fix validation errors', 'error');
      if (firstKey === 'companyEntity' || firstKey === 'type') setCreateStep(1);
      else if (['name', 'address', 'city', 'postal', 'role'].includes(firstKey)) setCreateStep(2);
      else setCreateStep(3);
      return;
    }

    try {
      setActionLoading(true);
      const isDuplicate = await checkLocationDuplicate(payload.name, payload.company);
      if (isDuplicate) {
        showToast(DUPLICATE_LOCATION_MESSAGE, 'error');
        setCreateStep(4);
        return;
      }
    } catch (err) {
      handleApiError(err, 'Could not verify location name');
      return;
    } finally {
      setActionLoading(false);
    }

    createLocationMutation.mutate(payload);
  }, [createData, createLocationMutation, showToast, handleApiError, user?.company_name]);

  const saveEditedLocation = useCallback(
    async (loc: LocationItem) => {
      await updateLocationMutation.mutateAsync({ id: loc.id, data: loc });
    },
    [updateLocationMutation]
  );

  const handleApplyCompany = useCallback(async (values: CompanyFormData) => {
    try {
      setCompanySaving(true);
      const created = await addressBookService.createCompanyEntity({
        name: values.name.trim(),
        vat_number: values.vat.trim(),
        address: values.address.trim(),
        country: values.country.trim() || 'Greece',
        phone: values.phone || undefined,
        email: values.email || undefined,
        website: values.website || undefined,
        industry: values.industry || undefined,
        primary_contact: values.contactPerson || undefined,
      });
      setCreateData((prev) => ({
        ...prev,
        company: created.name,
        companyVat: created.vat_number,
        companyEntityId: created.id,
        phone: created.phone || prev.phone,
        email: created.email || prev.email,
      }));
      setApiCompanies((prev) => [
        { company_name: created.name, company_vat: created.vat_number },
        ...prev,
      ]);
      setIsCompanyOpen(false);
      setCompanyData(EMPTY_COMPANY_DATA);
      showToast(`Company "${created.name}" created`, 'success');
    } catch (err) {
      handleApiError(err, 'Failed to create company');
      throw err;
    } finally {
      setCompanySaving(false);
    }
  }, [handleApiError, showToast]);

  const openEditModal = useCallback(
    async (loc: LocationItem) => {
      setEditModalLoading(true);
      try {
        const full = await queryClient.fetchQuery({
          queryKey: ['locationDetail', loc.id],
          queryFn: () => addressBookService.getLocation(loc.id),
        });
        setEditData(JSON.parse(JSON.stringify(full)) as LocationItem);
        setIsEditOpen(true);
      } catch (err) {
        handleApiError(err, 'Failed to load location for editing');
      } finally {
        setEditModalLoading(false);
      }
    },
    [queryClient, handleApiError]
  );

  const handleArchive = useCallback(
    async (loc: LocationItem) => {
      setArchiveConfirmLoc(loc);
    },
    []
  );

  const confirmArchive = useCallback(async () => {
    if (!archiveConfirmLoc) return;
    deleteLocationMutation.mutate(archiveConfirmLoc.id);
    setArchiveConfirmLoc(null);
  }, [archiveConfirmLoc, deleteLocationMutation]);

  const handleRestore = useCallback(
    async (loc: LocationItem) => {
      restoreLocationMutation.mutate(loc.id);
    },
    [restoreLocationMutation]
  );

  const goToCreateShipment = useCallback(
    (loc: LocationItem) => {
      navigate('/shipments/create', { state: { prefillLocationId: loc.id } });
    },
    [navigate]
  );

  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = directoryToListParams(activeNode, debouncedSearch, sortField, sortDir, 1, perPage);
      const blob = await addressBookService.exportExcel(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `address-book_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(t('abExcelExported'), 'success');
    } catch (err) {
      handleApiError(err, 'Failed to export Excel');
    } finally {
      setExporting(false);
    }
  }, [activeNode, debouncedSearch, handleApiError, perPage, showToast, sortField, sortDir, t]);

  const handleSelectLocation = useCallback(
    async (loc: LocationItem | null) => {
      if (!loc) {
        setSelectedLoc(null);
        return;
      }
      setSelectedLoc(loc);
      setDetailLoading(true);
      try {
        const full = await queryClient.fetchQuery({
          queryKey: ['locationDetail', loc.id],
          queryFn: () => addressBookService.getLocation(loc.id),
        });
        setSelectedLoc(full);
      } catch (err) {
        handleApiError(err, 'Failed to load location details');
      } finally {
        setDetailLoading(false);
      }
    },
    [queryClient, handleApiError]
  );

  const selectExistingDuplicate = useCallback(
    async (loc: LocationItem) => {
      setIsCreateOpen(false);
      setCreateStep(1);
      setCreateData(EMPTY_CREATE_DATA);
      await handleSelectLocation(loc);
      showToast(`Selected existing location "${loc.name}"`, 'success');
    },
    [handleSelectLocation, showToast]
  );

  const toggleSort = useCallback((field: AddressBookSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir('asc');
  }, [sortField]);

  const filteredCompanies = useMemo(() => apiCompanies, [apiCompanies]);

  const pageStart = listMeta.total === 0 ? 0 : (listMeta.current_page - 1) * listMeta.per_page + 1;
  const pageEnd = Math.min(listMeta.current_page * listMeta.per_page, listMeta.total);

  return {
    t,
    showToast,
    locations,
    summary,
    amenities,
    loading,
    listFetching,
    detailLoading,
    saving,
    exporting,
    error,
    subscriptionBlocked,
    listMeta,
    currentPage,
    setCurrentPage,
    perPage,
    setPerPage,
    pageStart,
    pageEnd,
    activeNode,
    activeDirectoryName,
    searchQuery,
    selectedLoc,
    setSelectedLoc: handleSelectLocation,
    sortField,
    sortDir,
    toggleSort,
    filteredLocations,
    isCreateOpen,
    createStep,
    setCreateStep,
    createData,
    setCreateData,
    isEditOpen,
    editData,
    setEditData,
    isCompanyOpen,
    setIsCompanyOpen,
    companyData,
    setCompanyData,
    companyQuery,
    setCompanyQuery,
    companyDropdownOpen,
    setCompanyDropdownOpen,
    filteredCompanies,
    potentialDuplicates,
    openCreateModal,
    closeCreateModal,
    closeEditModal,
    closeCompanyModal,
    selectNode,
    handleSearchChange,
    handleCopy,
    handleDuplicate,
    handleApplyTemplate,
    submitNewLocation,
    saveEditedLocation,
    handleApplyCompany,
    openEditModal,
    handleArchive,
    handleRestore,
    archiveConfirmLoc,
    setArchiveConfirmLoc,
    confirmArchive,
    goToCreateShipment,
    exportExcel,
    selectExistingDuplicate,
    refreshLocations,
  };
}

export type AddressBookState = ReturnType<typeof useAddressBook>;
