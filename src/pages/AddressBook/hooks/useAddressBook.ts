import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import type { LocationItem } from '../../../context/AppContext';
import { addressBookService, ApiError } from '../../../api';
import type { ApiAddressBookSummary, ApiAmenity, ApiCompanyLookup, ApiListMeta } from '../../../api';
import { directoryToListParams } from '../../../api/mappers/addressBookMapper';
import {
  EMPTY_COMPANY_DATA,
  EMPTY_CREATE_DATA,
  EMPTY_SERVER_FILTERS,
  type CompanyFormData,
  type CreateLocationData,
  type DirectoryItem,
  type FilterKey,
  type ServerFilterValues,
  type SortOption,
} from '../types';
import {
  applyTemplate,
  findPotentialDuplicates,
} from '../utils/locationUtils';
import { loadCustomDirectories, saveCustomDirectories } from '../utils/directoryStorage';
import { downloadCsv, locationsToCsv } from '../utils/exportCsv';

const PER_PAGE = 25;

export function useAddressBook() {
  const { lang, t, showToast, refreshLocationsFromApi } = useApp();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [listMeta, setListMeta] = useState<ApiListMeta>({ current_page: 1, per_page: PER_PAGE, total: 0, last_page: 1 });
  const [summary, setSummary] = useState<ApiAddressBookSummary | null>(null);
  const [amenities, setAmenities] = useState<ApiAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

  const [directories, setDirectories] = useState<DirectoryItem[]>(() => loadCustomDirectories(lang));
  const [activeNode, setActiveNode] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoc, setSelectedLoc] = useState<LocationItem | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<FilterKey, boolean>>({
    role: false,
    type: false,
    city: false,
    appt: false,
    hours: false,
    active: false,
  });
  const [serverFilters, setServerFilters] = useState<ServerFilterValues>(EMPTY_SERVER_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>('Name A–Z');

  const [addingDir, setAddingDir] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [newDirIcon, setNewDirIcon] = useState('folder');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

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

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    setDirectories((prev) => {
      const updated = prev.map((d) => {
        if (d.id === 'all') return { ...d, name: lang === 'el' ? 'Όλες οι Τοποθεσίες' : 'All Locations' };
        if (d.id === 'my') return { ...d, name: lang === 'el' ? 'Οι Τοποθεσίες μου' : 'My Locations' };
        if (d.id === 'customer') return { ...d, name: lang === 'el' ? 'Τοποθεσίες Πελατών' : 'Customer Locations' };
        if (d.id === 'archived') return { ...d, name: lang === 'el' ? 'Αρχειοθετημένα' : 'Archived' };
        return d;
      });
      saveCustomDirectories(updated);
      return updated;
    });
  }, [lang]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeNode, sortBy, serverFilters]);

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

  const refreshSummary = useCallback(async () => {
    try {
      const data = await addressBookService.getSummary();
      setSummary(data);
    } catch {
      // Non-blocking
    }
  }, []);

  const refreshLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = directoryToListParams(
        activeNode,
        debouncedSearch,
        sortBy,
        currentPage,
        PER_PAGE,
        serverFilters
      );
      const result = await addressBookService.listLocations(params);
      setLocations(result.items);
      setListMeta(result.meta);
      setSubscriptionBlocked(false);
    } catch (err) {
      const message = handleApiError(err, 'Failed to load locations');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeNode, debouncedSearch, sortBy, currentPage, serverFilters, handleApiError]);

  const syncGlobalLocations = useCallback(async () => {
    await refreshLocationsFromApi();
  }, [refreshLocationsFromApi]);

  const afterMutation = useCallback(async () => {
    await Promise.all([refreshLocations(), refreshSummary(), syncGlobalLocations()]);
  }, [refreshLocations, refreshSummary, syncGlobalLocations]);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  useEffect(() => {
    refreshSummary();
    addressBookService.listAmenities().then(setAmenities).catch(() => {});
  }, [refreshSummary]);

  useEffect(() => {
    if (!companyDropdownOpen) return;
    const q = companyQuery.trim();
    const timer = setTimeout(() => {
      addressBookService
        .listCompanies(q || undefined)
        .then(setApiCompanies)
        .catch(() => setApiCompanies([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [companyQuery, companyDropdownOpen]);

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
        const existing = await addressBookService.getLocation(String(result.existing_id));
        if (!cancelled) setPotentialDuplicates([existing]);
      })
      .catch(() => {
        if (!cancelled) setPotentialDuplicates(findPotentialDuplicates(locations, createData));
      });

    return () => {
      cancelled = true;
    };
  }, [createStep, createData, locations]);

  const filteredLocations = useMemo(() => {
    const dir = directories.find((d) => d.id === activeNode);
    if (activeNode.startsWith('custom-') && dir?.filter) {
      return locations.filter((l) => dir.filter!(l));
    }
    return locations;
  }, [locations, directories, activeNode]);

  const activeDirectory = directories.find((d) => d.id === activeNode);

  const openCreateModal = useCallback(() => {
    setCreateStep(1);
    setCreateData(EMPTY_CREATE_DATA);
    setIsCreateOpen(true);
  }, []);

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

  const setServerFilter = useCallback(<K extends keyof ServerFilterValues>(key: K, value: ServerFilterValues[K]) => {
    setServerFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleFilter = useCallback(
    (key: FilterKey) => {
      setActiveFilters((prev) => {
        const next = !prev[key];
        const updated = { ...prev, [key]: next };
        if (!next) {
          if (key === 'role') setServerFilter('role', '');
          if (key === 'type') setServerFilter('type', '');
          if (key === 'city') setServerFilter('city', '');
          if (key === 'appt') setServerFilter('appt', false);
          if (key === 'hours') setServerFilter('hours', false);
        } else {
          if (key === 'role') setServerFilter('role', 'both');
          if (key === 'type') setServerFilter('type', 'Warehouse');
          if (key === 'appt') setServerFilter('appt', true);
          if (key === 'hours') setServerFilter('hours', true);
        }
        return updated;
      });
      showToast(lang === 'el' ? 'Φίλτρο άλλαξε' : 'Filter updated');
    },
    [lang, setServerFilter, showToast]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveFilters({ role: false, type: false, city: false, appt: false, hours: false, active: false });
    setServerFilters(EMPTY_SERVER_FILTERS);
    setSelectedLoc(null);
    setCurrentPage(1);
    showToast(t('filtersCleared'));
  }, [showToast, t]);

  const saveNewDir = useCallback(() => {
    if (!newDirName.trim()) {
      showToast('Enter a directory name', 'warning');
      return;
    }
    const id = `custom-${Date.now()}`;
    const newDir: DirectoryItem = {
      id,
      name: newDirName.trim(),
      icon: newDirIcon,
      system: false,
      filter: null,
    };
    const archIdx = directories.findIndex((d) => d.id === 'archived');
    const updated = [...directories];
    updated.splice(archIdx, 0, newDir);
    setDirectories(updated);
    saveCustomDirectories(updated);
    setNewDirName('');
    setAddingDir(false);
    showToast(`Directory "${newDir.name}" created`, 'success');
  }, [directories, newDirIcon, newDirName, showToast]);

  const deleteDirectory = useCallback(
    (id: string, name: string) => {
      if (window.confirm(`Delete directory "${name}"? Locations will remain in All Locations.`)) {
        setDirectories((prev) => {
          const updated = prev.filter((d) => d.id !== id);
          saveCustomDirectories(updated);
          return updated;
        });
        if (activeNode === id) {
          setActiveNode('all');
          setSelectedLoc(null);
        }
        showToast(`Directory "${name}" deleted`, 'info');
      }
    },
    [activeNode, showToast]
  );

  const handleCopy = useCallback(
    (txt: string, msg: string) => {
      navigator.clipboard.writeText(txt);
      showToast(msg, 'success');
    },
    [showToast]
  );

  const handleDuplicate = useCallback(
    async (l: LocationItem) => {
      setSaving(true);
      try {
        const full = await addressBookService.getLocation(l.id);
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
        const created = await addressBookService.createLocation(duplicateData);
        await afterMutation();
        setSelectedLoc(created);
        showToast(`Duplicated as "${created.name}"`, 'success');
      } catch (err) {
        handleApiError(err, 'Failed to duplicate location');
      } finally {
        setSaving(false);
      }
    },
    [afterMutation, handleApiError, showToast]
  );

  const handleApplyTemplate = useCallback((tpl: string) => {
    setCreateData((prev) => applyTemplate(tpl, prev));
  }, []);

  const submitNewLocation = useCallback(async () => {
    if (!createData.name.trim()) {
      showToast('Location name is required', 'error');
      setCreateStep(2);
      return;
    }
    if (!createData.company.trim() || !createData.companyVat.trim()) {
      showToast('Company name and VAT are required', 'error');
      setCreateStep(createData.context === 'customer' ? 1 : 2);
      return;
    }
    if (!createData.address.trim() || !createData.city.trim() || !createData.postal.trim()) {
      showToast('Address, city, and postal code are required', 'error');
      setCreateStep(2);
      return;
    }
    if (!createData.lat.trim() || !createData.lng.trim()) {
      showToast('Latitude and longitude are required', 'error');
      setCreateStep(2);
      return;
    }

    setSaving(true);
    try {
      const created = await addressBookService.createLocation(createData);
      setIsCreateOpen(false);
      await afterMutation();
      setSelectedLoc(created);
      showToast(`"${created.name}" created`, 'success');
    } catch (err) {
      handleApiError(err, 'Failed to create location');
    } finally {
      setSaving(false);
    }
  }, [afterMutation, createData, handleApiError, showToast]);

  const saveEditedLocation = useCallback(async () => {
    if (!editData) return;
    if (!editData.name.trim()) {
      showToast('Location name is required', 'error');
      return;
    }
    if (!editData.companyVat?.trim()) {
      showToast('Company VAT is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const updated = await addressBookService.updateLocation(editData.id, editData);
      setSelectedLoc(updated);
      setIsEditOpen(false);
      await afterMutation();
      showToast(`"${updated.name}" updated`, 'success');
    } catch (err) {
      handleApiError(err, 'Failed to update location');
    } finally {
      setSaving(false);
    }
  }, [afterMutation, editData, handleApiError, showToast]);

  const handleApplyCompany = useCallback(() => {
    if (!companyData.name.trim() || !companyData.vat.trim()) {
      showToast('Name and VAT are required', 'error');
      return;
    }
    setCreateData((prev) => ({
      ...prev,
      company: companyData.name.trim(),
      companyVat: companyData.vat.trim(),
      phone: companyData.phone || prev.phone,
      email: companyData.email || prev.email,
    }));
    setIsCompanyOpen(false);
    setCompanyData(EMPTY_COMPANY_DATA);
    showToast(`Company "${companyData.name.trim()}" applied to form`, 'success');
  }, [companyData, showToast]);

  const openEditModal = useCallback(
    async (loc: LocationItem) => {
      try {
        const full = await addressBookService.getLocation(loc.id);
        setEditData(JSON.parse(JSON.stringify(full)) as LocationItem);
        setIsEditOpen(true);
      } catch (err) {
        handleApiError(err, 'Failed to load location for editing');
      }
    },
    [handleApiError]
  );

  const handleArchive = useCallback(
    async (loc: LocationItem) => {
      if (!window.confirm(`Archive "${loc.name}"? It will be moved to the Archived directory.`)) return;

      setSaving(true);
      try {
        await addressBookService.deleteLocation(loc.id);
        setSelectedLoc(null);
        await afterMutation();
        showToast(`"${loc.name}" archived`);
      } catch (err) {
        handleApiError(err, 'Failed to archive location');
      } finally {
        setSaving(false);
      }
    },
    [afterMutation, handleApiError, showToast]
  );

  const handleRestore = useCallback(
    async (loc: LocationItem) => {
      setSaving(true);
      try {
        const restored = await addressBookService.restoreLocation(loc.id);
        setSelectedLoc(restored);
        await afterMutation();
        showToast(`"${restored.name}" restored`, 'success');
      } catch (err) {
        handleApiError(err, 'Failed to restore location');
      } finally {
        setSaving(false);
      }
    },
    [afterMutation, handleApiError, showToast]
  );

  const goToCreateShipment = useCallback(
    (loc: LocationItem) => {
      navigate('/shipments/create', { state: { prefillLocationId: loc.id } });
    },
    [navigate]
  );

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const params = directoryToListParams(activeNode, debouncedSearch, sortBy, 1, 100, serverFilters);
      const { type, status, search, sort, location_role, location_subtype, city, appointment_required, has_receiving_hours } = params;
      const all = await addressBookService.listAllLocations({
        type,
        status,
        search,
        sort,
        location_role,
        location_subtype,
        city,
        appointment_required,
        has_receiving_hours,
      });
      const dir = directories.find((d) => d.id === activeNode);
      const rows = dir?.filter ? all.filter((l) => dir.filter!(l)) : all;
      downloadCsv(`address-book_${new Date().toISOString().slice(0, 10)}.csv`, locationsToCsv(rows));
      showToast(lang === 'el' ? 'Εξαγωγή CSV ολοκληρώθηκε' : 'CSV exported', 'success');
    } catch (err) {
      handleApiError(err, 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }, [activeNode, debouncedSearch, directories, handleApiError, lang, serverFilters, showToast, sortBy]);

  const handleSelectLocation = useCallback(
    async (loc: LocationItem | null) => {
      if (!loc) {
        setSelectedLoc(null);
        return;
      }
      setSelectedLoc(loc);
      setDetailLoading(true);
      try {
        const full = await addressBookService.getLocation(loc.id);
        setSelectedLoc(full);
      } catch (err) {
        handleApiError(err, 'Failed to load location details');
      } finally {
        setDetailLoading(false);
      }
    },
    [handleApiError]
  );

  const filteredCompanies = useMemo(() => apiCompanies, [apiCompanies]);

  const pageStart = listMeta.total === 0 ? 0 : (listMeta.current_page - 1) * listMeta.per_page + 1;
  const pageEnd = Math.min(listMeta.current_page * listMeta.per_page, listMeta.total);

  return {
    lang,
    t,
    showToast,
    locations,
    summary,
    amenities,
    loading,
    detailLoading,
    saving,
    exporting,
    error,
    subscriptionBlocked,
    listMeta,
    currentPage,
    setCurrentPage,
    pageStart,
    pageEnd,
    directories,
    activeNode,
    activeDirectory,
    searchQuery,
    selectedLoc,
    setSelectedLoc: handleSelectLocation,
    activeFilters,
    serverFilters,
    setServerFilter,
    sortBy,
    setSortBy,
    filteredLocations,
    addingDir,
    setAddingDir,
    newDirName,
    setNewDirName,
    newDirIcon,
    setNewDirIcon,
    iconPickerOpen,
    setIconPickerOpen,
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
    toggleFilter,
    clearFilters,
    saveNewDir,
    deleteDirectory,
    handleCopy,
    handleDuplicate,
    handleApplyTemplate,
    submitNewLocation,
    saveEditedLocation,
    handleApplyCompany,
    openEditModal,
    handleArchive,
    handleRestore,
    goToCreateShipment,
    exportCsv,
    refreshLocations,
  };
}

export type AddressBookState = ReturnType<typeof useAddressBook>;
