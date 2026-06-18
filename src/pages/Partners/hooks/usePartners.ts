import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import type { Partner, ContractLane } from '../../../context/AppContext';
import { REGION_KEYS, TRUCK_TYPES } from '../constants';
import type {
  ActiveFilters,
  FacetFilter,
  GenericModalType,
  InviteFormState,
  KpiFilter,
  OpenSections,
  SortOption,
} from '../types';

// ── Helpers ────────────────────────────────────────────────

function regionName(idx: number, t: (k: string) => string): string {
  const key = REGION_KEYS[idx];
  return key ? t(key) : '—';
}

const EMPTY_FILTERS: ActiveFilters = {
  status: [],
  capability: [],
  performance: [],
  region: [],
};

const EMPTY_SECTIONS: OpenSections = {
  kpis: true,
  info: true,
  fleet: true,
  trips: false,
  billing: false,
  contracts: false,
  docs: false,
  notes: false,
};

const EMPTY_INVITE: InviteFormState = {
  method: 'email',
  partnerType: 'carrier_company',
  tags: [],
  contact: '',
  sent: false,
};

// ── Hook ───────────────────────────────────────────────────

export function usePartners() {
  const { partners, addPartner, updatePartner, removePartner, t, showToast } = useApp();

  // ── UI State ──────────────────────────────────────────
  const [facetFilter, setFacetFilter] = useState<FacetFilter>('all');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [openFilterDropdown, setOpenFilterDropdown] = useState('');

  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<OpenSections>(EMPTY_SECTIONS);

  // ── Modals ────────────────────────────────────────────
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(EMPTY_INVITE);

  const [genericModal, setGenericModal] = useState<GenericModalType>(null);
  const [capTruckType, setCapTruckType] = useState('');
  const [laneOrigin, setLaneOrigin] = useState('');
  const [laneDest, setLaneDest] = useState('');
  const [laneUnit, setLaneUnit] = useState<'PER_LOAD' | 'PER_PALLET'>('PER_LOAD');
  const [lanePrice, setLanePrice] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [bankBeneficiary, setBankBeneficiary] = useState('');

  // Add customer form
  const [custName, setCustName] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custVat, setCustVat] = useState('');
  const [custRegion, setCustRegion] = useState(0);

  // ── regionName helper bound to t ──────────────────────
  const rName = useCallback((idx: number) => regionName(idx, t), [t]);

  // ── KPI filter match ──────────────────────────────────
  const matchesKpi = useCallback(
    (p: Partner): boolean => {
      if (!kpiFilter || kpiFilter === 'all') return true;
      if (kpiFilter === 'active') return p.status === 'active';
      if (kpiFilter === 'carriers') return p.type === 'carrier_company';
      if (kpiFilter === 'freelancers') return p.type === 'freelancer_driver';
      if (kpiFilter === 'invited') return p.status === 'invited';
      if (kpiFilter === 'missingBank') return !p.iban;
      if (kpiFilter === 'suspended') return p.status === 'suspended';
      return true;
    },
    [kpiFilter]
  );

  // ── Facet filter match ────────────────────────────────
  const matchesFacet = useCallback(
    (p: Partner, override?: FacetFilter): boolean => {
      const f = override ?? facetFilter;
      if (f === 'st_suspended') return p.status === 'suspended';
      if (p.status === 'suspended') return false;
      if (f === 'all') return true;
      if (f === 'carrier_company' || f === 'freelancer_driver' || f === 'customer') return p.type === f;
      if (f === 'st_active') return p.status === 'active';
      if (f === 'st_invited') return p.status === 'invited';
      if (f === 'st_pending') return p.status === 'pending';
      if (f.startsWith('reg_')) return p.regionIdx === parseInt(f.slice(4));
      return true;
    },
    [facetFilter]
  );

  // ── Bar filters match ─────────────────────────────────
  const matchesBarFilters = useCallback(
    (p: Partner): boolean => {
      if (activeFilters.status.length && !activeFilters.status.includes(p.status as 'active' | 'invited' | 'pending' | 'suspended')) return false;
      if (activeFilters.capability.length && !activeFilters.capability.some((c) => p.trucks.includes(c))) return false;
      if (activeFilters.performance.length) {
        for (const f of activeFilters.performance) {
          if (f === 'ontime90' && p.otDelivery < 90) return false;
          if (f === 'rating4' && parseFloat(p.rating) < 4) return false;
          if (f === 'cancel5' && p.cancelRate > 5) return false;
        }
      }
      if (activeFilters.region.length && !activeFilters.region.includes(p.regionIdx)) return false;
      return true;
    },
    [activeFilters]
  );

  // ── Full filter + sort ────────────────────────────────
  const filteredPartners = useMemo(() => {
    let list = partners.filter((p) => {
      if (!matchesKpi(p)) return false;
      if (!matchesFacet(p)) return false;
      if (!matchesBarFilters(p)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [p.name, p.vat, p.email, p.phone, rName(p.regionIdx), ...p.trucks, ...p.tags].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'act') list = [...list].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
    else if (sortBy === 'ot') list = [...list].sort((a, b) => b.otDelivery - a.otDelivery);
    else if (sortBy === 'ld') list = [...list].sort((a, b) => b.loads30d - a.loads30d);

    return list;
  }, [partners, matchesKpi, matchesFacet, matchesBarFilters, searchQuery, sortBy, rName]);

  // ── KPI counts ────────────────────────────────────────
  const kpiCounts = useMemo(() => {
    const nonSuspended = partners.filter((p) => p.status !== 'suspended');
    return {
      total: nonSuspended.length,
      active: partners.filter((p) => p.status === 'active').length,
      carriers: nonSuspended.filter((p) => p.type === 'carrier_company').length,
      freelancers: nonSuspended.filter((p) => p.type === 'freelancer_driver').length,
      invited: partners.filter((p) => p.status === 'invited').length,
      missingBank: nonSuspended.filter((p) => !p.iban).length,
      suspended: partners.filter((p) => p.status === 'suspended').length,
    };
  }, [partners]);

  // ── Facet counts ─────────────────────────────────────
  const facetCounts = useMemo(() => {
    const base = (filter: FacetFilter) =>
      partners.filter((p) => matchesKpi(p) && matchesFacet(p, filter) && matchesBarFilters(p)).length;
    const counts: Record<string, number> = { all: base('all') };
    for (const type of ['carrier_company', 'freelancer_driver', 'customer'] as const) counts[type] = base(type);
    for (const st of ['st_active', 'st_invited', 'st_pending', 'st_suspended'] as const) counts[st] = base(st);
    REGION_KEYS.forEach((_, i) => { counts[`reg_${i}`] = base(`reg_${i}` as FacetFilter); });
    return counts;
  }, [partners, matchesKpi, matchesFacet, matchesBarFilters]);

  // ── Actions ───────────────────────────────────────────
  const selectFacet = useCallback((filter: FacetFilter) => {
    setFacetFilter((prev) => (prev === filter ? 'all' : filter));
    setSelectedPartner(null);
    setExpandedRowId(null);
  }, []);

  const selectKpi = useCallback(
    (key: KpiFilter) => {
      setKpiFilter((prev) => (prev === key ? '' : key));
      if (key === 'suspended') setFacetFilter('st_suspended');
      else if (facetFilter === 'st_suspended') setFacetFilter('all');
      setSelectedPartner(null);
      setExpandedRowId(null);
    },
    [facetFilter]
  );

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
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setKpiFilter('');
    setFacetFilter('all');
    setActiveFilters(EMPTY_FILTERS);
    setSelectedPartner(null);
    setExpandedRowId(null);
    showToast(t('partnerFiltersCleared'));
  }, [showToast, t]);

  const openDetailPanel = useCallback((p: Partner) => {
    setSelectedPartner(p);
    setExpandedRowId(p.id);
    setOpenSections(EMPTY_SECTIONS);
  }, []);

  const closeDetailPanel = useCallback(() => {
    setSelectedPartner(null);
    setExpandedRowId(null);
  }, []);

  const toggleSection = useCallback((key: keyof OpenSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Partner mutations ─────────────────────────────────
  const suspendPartner = useCallback(
    (p: Partner) => {
      if (!window.confirm(t('confirmSuspendPartner'))) return;
      const updated = { ...p, status: 'suspended' as const };
      updatePartner(updated);
      if (selectedPartner?.id === p.id) setSelectedPartner(updated);
      showToast(t('partnerSuspended'));
    },
    [updatePartner, selectedPartner, t, showToast]
  );

  const reactivatePartner = useCallback(
    (p: Partner) => {
      if (!window.confirm(t('confirmReactivatePartner'))) return;
      const updated = { ...p, status: 'active' as const };
      updatePartner(updated);
      if (selectedPartner?.id === p.id) setSelectedPartner(updated);
      showToast(t('partnerReactivated'));
    },
    [updatePartner, selectedPartner, t, showToast]
  );

  const permanentlyRemovePartner = useCallback(
    (p: Partner) => {
      if (!window.confirm(t('confirmRemovePartner'))) return;
      removePartner(p.id);
      if (selectedPartner?.id === p.id) closeDetailPanel();
      showToast(t('partnerRemoved'));
    },
    [removePartner, selectedPartner, closeDetailPanel, t, showToast]
  );

  // ── Notes ─────────────────────────────────────────────
  const saveNote = useCallback(
    (noteText: string) => {
      if (!selectedPartner) return;
      const updated = { ...selectedPartner, notes: noteText };
      updatePartner(updated);
      setSelectedPartner(updated);
      showToast(t('partnerNoteSaved'));
    },
    [selectedPartner, updatePartner, t, showToast]
  );

  // ── Invite modal ──────────────────────────────────────
  const openInviteModal = useCallback(() => {
    setInviteForm(EMPTY_INVITE);
    setIsInviteOpen(true);
  }, []);

  const closeInviteModal = useCallback(() => {
    setIsInviteOpen(false);
  }, []);

  const sendInvite = useCallback(() => {
    if (!inviteForm.contact.trim()) {
      showToast(t('fillRequired'), 'error');
      return;
    }
    setInviteForm((prev) => ({ ...prev, sent: true }));
    showToast(t('inviteSent'));
  }, [inviteForm, showToast, t]);

  // ── Generic modal helpers ─────────────────────────────
  const openGenericModal = useCallback((type: GenericModalType) => {
    setGenericModal(type);
    if (type === 'addCap') setCapTruckType(TRUCK_TYPES[0]);
    if (type === 'editBank' ) {
      setBankIban('');
      setBankBeneficiary('');
    }
    if (type === 'addLane') {
      setLaneOrigin(''); setLaneDest(''); setLanePrice(''); setLaneUnit('PER_LOAD');
    }
    if (type === 'addCustomer') {
      setCustName(''); setCustCompany(''); setCustEmail(''); setCustPhone(''); setCustVat(''); setCustRegion(0);
    }
  }, []);

  const closeGenericModal = useCallback(() => setGenericModal(null), []);

  const saveCapability = useCallback(() => {
    if (!selectedPartner || !capTruckType) return;
    if (selectedPartner.trucks.includes(capTruckType)) {
      showToast('Already added', 'warning');
      return;
    }
    const updated = { ...selectedPartner, trucks: [...selectedPartner.trucks, capTruckType], fleetSize: selectedPartner.fleetSize + 1 };
    updatePartner(updated);
    setSelectedPartner(updated);
    closeGenericModal();
    showToast(t('capabilityAdded'));
  }, [selectedPartner, capTruckType, updatePartner, closeGenericModal, t, showToast]);

  const saveContractLane = useCallback(() => {
    if (!selectedPartner || !laneOrigin.trim() || !laneDest.trim() || !lanePrice) {
      showToast(t('fillRequired'), 'error');
      return;
    }
    const newLane: ContractLane = {
      lane: `${laneOrigin.trim()} → ${laneDest.trim()}`,
      unit: laneUnit,
      price: parseFloat(lanePrice),
      status: 'ACTIVE',
      volume: 0,
      ot: 0,
    };
    const updated = { ...selectedPartner, contractLanes: [...selectedPartner.contractLanes, newLane] };
    updatePartner(updated);
    setSelectedPartner(updated);
    closeGenericModal();
    showToast(t('laneAdded'));
  }, [selectedPartner, laneOrigin, laneDest, laneUnit, lanePrice, updatePartner, closeGenericModal, t, showToast]);

  const deleteContractLane = useCallback(
    (laneIdx: number) => {
      if (!selectedPartner || !window.confirm(t('confirmRemoveLane'))) return;
      const updated = { ...selectedPartner, contractLanes: selectedPartner.contractLanes.filter((_, i) => i !== laneIdx) };
      updatePartner(updated);
      setSelectedPartner(updated);
      showToast(t('laneDeleted'));
    },
    [selectedPartner, updatePartner, t, showToast]
  );

  const saveBankDetails = useCallback(() => {
    if (!selectedPartner || !bankIban.trim() || !bankBeneficiary.trim()) {
      showToast(t('fillRequired'), 'error');
      return;
    }
    const updated = { ...selectedPartner, iban: bankIban.trim(), beneficiary: bankBeneficiary.trim(), bankVerified: false };
    updatePartner(updated);
    setSelectedPartner(updated);
    closeGenericModal();
    showToast(t('bankSaved'));
  }, [selectedPartner, bankIban, bankBeneficiary, updatePartner, closeGenericModal, t, showToast]);

  const saveCustomer = useCallback(() => {
    if (!custName.trim()) {
      showToast(t('fillRequired'), 'error');
      return;
    }
    const newPartner: Omit<Partner, 'id'> = {
      name: custName.trim(),
      type: 'customer',
      status: 'active',
      legalName: custCompany.trim() || custName.trim(),
      vat: custVat.trim(),
      email: custEmail.trim(),
      phone: custPhone.trim(),
      regionIdx: custRegion,
      trucks: [],
      fleetSize: 0,
      lifetimeLoads: 0,
      loads30d: 0,
      otPickup: 0,
      otDelivery: 0,
      cancelRate: 0,
      acceptRate: 0,
      avgResponse: '—',
      lastActivity: new Date().toISOString().slice(0, 10),
      rating: '0.0',
      paymentTerms: 'Net 30',
      iban: '',
      beneficiary: '',
      bankVerified: false,
      openInvoices: 0,
      disputes: 0,
      tags: [],
      missingDocs: false,
      profileCompletion: 30,
      contractLanes: [],
      trips: [],
      contacts: [],
      notes: '',
    };
    addPartner(newPartner);
    closeGenericModal();
    showToast(t('customerAdded'));
  }, [custName, custCompany, custVat, custEmail, custPhone, custRegion, addPartner, closeGenericModal, t, showToast]);

  // ── Export ────────────────────────────────────────────
  const exportCsv = useCallback(() => {
    const headers = ['ID', 'Name', 'Type', 'Status', 'Email', 'Phone', 'Region', 'Trucks', 'Loads 30d', 'On-time %', 'Cancel %', 'Rating', 'Last Activity', 'IBAN', 'Bank Verified'];
    const rows = filteredPartners.map((p) => [
      p.id, `"${p.name}"`, p.type, p.status, p.email, p.phone,
      `"${rName(p.regionIdx)}"`, `"${p.trucks.join(', ')}"`,
      p.loads30d, `${p.otDelivery}%`, `${p.cancelRate}%`, p.rating,
      p.lastActivity, p.iban || '', p.bankVerified ? 'Yes' : 'No',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partners_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('partnerExported'));
  }, [filteredPartners, rName, t, showToast]);

  return {
    // Data
    t,
    showToast,
    partners,
    filteredPartners,
    kpiCounts,
    facetCounts,
    // UI state
    facetFilter,
    kpiFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    activeFilters,
    openFilterDropdown,
    selectedPartner,
    expandedRowId,
    openSections,
    // Modals
    isInviteOpen,
    inviteForm,
    setInviteForm,
    genericModal,
    capTruckType,
    setCapTruckType,
    laneOrigin,
    setLaneOrigin,
    laneDest,
    setLaneDest,
    laneUnit,
    setLaneUnit,
    lanePrice,
    setLanePrice,
    bankIban,
    setBankIban,
    bankBeneficiary,
    setBankBeneficiary,
    custName,
    setCustName,
    custCompany,
    setCustCompany,
    custEmail,
    setCustEmail,
    custPhone,
    setCustPhone,
    custVat,
    setCustVat,
    custRegion,
    setCustRegion,
    // Helpers
    rName,
    // Actions
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
    saveNote,
    openInviteModal,
    closeInviteModal,
    sendInvite,
    openGenericModal,
    closeGenericModal,
    saveCapability,
    saveContractLane,
    deleteContractLane,
    saveBankDetails,
    saveCustomer,
    exportCsv,
  };
}

export type PartnersState = ReturnType<typeof usePartners>;
