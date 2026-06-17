import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import type { Company, LocationItem } from '../../../context/AppContext';
import {
  EMPTY_COMPANY_DATA,
  EMPTY_CREATE_DATA,
  type CompanyFormData,
  type CreateLocationData,
  type DirectoryItem,
  type FilterKey,
  type SortOption,
} from '../types';
import {
  applyTemplate,
  buildDefaultDirectories,
  filterLocations,
  findPotentialDuplicates,
  sortLocations,
} from '../utils/locationUtils';

export function useAddressBook() {
  const {
    locations,
    addLocation,
    updateLocation,
    archiveLocation,
    restoreLocation,
    companies,
    addCompany,
    lang,
    t,
    showToast,
  } = useApp();

  const [directories, setDirectories] = useState<DirectoryItem[]>(() => buildDefaultDirectories(lang));
  const [activeNode, setActiveNode] = useState('all');
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

  useEffect(() => {
    setDirectories((prev) =>
      prev.map((d) => {
        if (d.id === 'all') return { ...d, name: lang === 'el' ? 'Όλες οι Τοποθεσίες' : 'All Locations' };
        if (d.id === 'my') return { ...d, name: lang === 'el' ? 'Οι Τοποθεσίες μου' : 'My Locations' };
        if (d.id === 'customer') return { ...d, name: lang === 'el' ? 'Τοποθεσίες Πελατών' : 'Customer Locations' };
        if (d.id === 'archived') return { ...d, name: lang === 'el' ? 'Αρχειοθετημένα' : 'Archived' };
        return d;
      })
    );
  }, [lang]);

  const filteredLocations = useMemo(
    () => sortLocations(filterLocations(locations, directories, activeNode, searchQuery, activeFilters), sortBy),
    [locations, directories, activeNode, searchQuery, activeFilters, sortBy]
  );

  const potentialDuplicates = useMemo(
    () => (createStep === 4 ? findPotentialDuplicates(locations, createData) : []),
    [createStep, locations, createData]
  );

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
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setSelectedLoc(null);
  }, []);

  const toggleFilter = useCallback(
    (key: FilterKey) => {
      setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
      showToast(lang === 'el' ? 'Φίλτρο άλλαξε' : 'Filter toggled');
    },
    [lang, showToast]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveFilters({ role: false, type: false, city: false, appt: false, hours: false, active: false });
    setSelectedLoc(null);
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
    setNewDirName('');
    setAddingDir(false);
    showToast(`Directory "${newDir.name}" created`, 'success');
  }, [directories, newDirIcon, newDirName, showToast]);

  const deleteDirectory = useCallback(
    (id: string, name: string) => {
      if (window.confirm(`Delete directory "${name}"? Locations will remain in All Locations.`)) {
        setDirectories((prev) => prev.filter((d) => d.id !== id));
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
    (l: LocationItem) => {
      const { id: _id, created: _created, status: _status, ...rest } = l;
      addLocation({
        ...rest,
        name: `${l.name} (Copy)`,
      });
      showToast(`Duplicated as "${l.name} (Copy)"`, 'success');
    },
    [addLocation, showToast]
  );

  const handleApplyTemplate = useCallback((tpl: string) => {
    setCreateData((prev) => applyTemplate(tpl, prev));
  }, []);

  const submitNewLocation = useCallback(() => {
    if (!createData.name.trim()) {
      showToast('Location name is required', 'error');
      setCreateStep(2);
      return;
    }
    const payload: Omit<LocationItem, 'id' | 'created' | 'status'> = {
      name: createData.name.trim(),
      company: createData.context === 'my' ? 'ΒΙΚΟΣ Α.Ε.' : createData.company || '—',
      group: createData.context,
      city: createData.city.trim() || '—',
      region: '',
      address: createData.address.trim() || '—',
      lat: 39.643 + (Math.random() - 0.5) * 0.2,
      lng: 20.878 + (Math.random() - 0.5) * 0.2,
      geoVerified: false,
      role: createData.role,
      type: createData.type,
      appt: createData.appt,
      hours: createData.hours,
      dock: createData.dock,
      equipment: createData.equipment,
      maxTruck: createData.maxTruck,
      maxWeight: createData.maxWeight,
      adr: createData.adr,
      palletExchange: createData.palletExchange,
      loadTime: parseInt(createData.loadTime, 10) || 0,
      contacts: createData.contacts.filter((c) => c.name),
      tags: createData.tags
        ? createData.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      code: createData.code,
      custCode: '',
      lastUsed: 'Never',
      shipments30: 0,
      shipments90: 0,
      otd: 100,
      noteInternal: createData.noteInternal,
      noteCarrier: createData.noteCarrier,
    };

    addLocation(payload);
    setIsCreateOpen(false);
    showToast(`"${payload.name}" created`, 'success');
  }, [addLocation, createData, showToast]);

  const saveEditedLocation = useCallback(() => {
    if (!editData) return;
    if (!editData.name.trim()) {
      showToast('Location name is required', 'error');
      return;
    }
    updateLocation(editData);
    setSelectedLoc(editData);
    setIsEditOpen(false);
    showToast(`"${editData.name}" updated`, 'success');
  }, [editData, showToast, updateLocation]);

  const handleCreateCompany = useCallback(() => {
    if (!companyData.name.trim() || !companyData.vat.trim() || !companyData.address.trim()) {
      showToast('Name, VAT, and Address are required', 'error');
      return;
    }
    const payload: Omit<Company, 'id'> = {
      name: companyData.name.trim(),
      vat: companyData.vat.trim(),
      address: companyData.address.trim(),
      country: companyData.country,
      phone: companyData.phone,
      email: companyData.email,
      website: companyData.website,
      contactPerson: companyData.contactPerson,
      industry: companyData.industry,
    };
    addCompany(payload);
    setCreateData((prev) => ({ ...prev, company: payload.name }));
    setIsCompanyOpen(false);
    setCompanyData(EMPTY_COMPANY_DATA);
    showToast(`Company "${payload.name}" created`, 'success');
  }, [addCompany, companyData, showToast]);

  const openEditModal = useCallback((loc: LocationItem) => {
    setEditData(JSON.parse(JSON.stringify(loc)) as LocationItem);
    setIsEditOpen(true);
  }, []);

  const handleArchive = useCallback(
    (loc: LocationItem) => {
      if (window.confirm(`Archive "${loc.name}"? It will be moved to the Archived directory.`)) {
        archiveLocation(loc.id);
        setSelectedLoc(null);
        showToast(`"${loc.name}" archived`);
      }
    },
    [archiveLocation, showToast]
  );

  const handleRestore = useCallback(
    (loc: LocationItem) => {
      restoreLocation(loc.id);
      showToast(`"${loc.name}" restored`, 'success');
    },
    [restoreLocation, showToast]
  );

  const filteredCompanies = useMemo(
    () => companies.filter((c) => c.name.toLowerCase().includes(companyQuery.toLowerCase())),
    [companies, companyQuery]
  );

  return {
    lang,
    t,
    showToast,
    locations,
    companies,
    directories,
    activeNode,
    activeDirectory,
    searchQuery,
    selectedLoc,
    setSelectedLoc,
    activeFilters,
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
    handleCreateCompany,
    openEditModal,
    handleArchive,
    handleRestore,
  };
}

export type AddressBookState = ReturnType<typeof useAddressBook>;
