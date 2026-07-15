import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { MOCK_PENDING, MOCK_TRUCKS } from '../mockData';
import type {
  AvailableTruck,
  BookingDraft,
  DrawerMode,
  FilterPillKey,
  KpiFilter,
  SortKey,
  VisibilityTab,
} from '../types';

const PER_PAGE = 8;

function parsePostedMinutes(posted: string): number {
  const m = posted.match(/^(\d+)m/);
  if (m) return Number(m[1]);
  const h = posted.match(/^(\d+)h/);
  if (h) return Number(h[1]) * 60;
  return 9999;
}

function parseStartKey(t: AvailableTruck): number {
  const [d, mo, y] = t.startDt.split('/').map(Number);
  const [hh, mm] = t.startTm.split(':').map(Number);
  return new Date(y, mo - 1, d, hh, mm).getTime();
}

function expandUngrouped(trucks: AvailableTruck[]): AvailableTruck[] {
  const out: AvailableTruck[] = [];
  for (const t of trucks) {
    if (!t.recurring || t.occurrences.length === 0) {
      out.push(t);
      continue;
    }
    t.occurrences.forEach((occ, idx) => {
      out.push({
        ...t,
        id: `${t.id}-${idx + 1}`,
        recurring: false,
        occurrences: [],
        recurrenceLabel: '',
        posted: t.posted,
        // Keep original display window loosely; label via start from occurrence string if possible
        startDt: occ.includes(' ') ? `${occ.split(' ')[0]}/2026` : t.startDt,
        startTm: occ.includes(' ') ? occ.split(' ')[1] : t.startTm,
      });
    });
  }
  return out;
}

function createDraft(truck: AvailableTruck): BookingDraft {
  return {
    offerPrice: truck.price != null ? String(truck.price) : '',
    notes: '',
    tripPref: truck.trip,
    occurrence: truck.occurrences[0] ?? '',
    acceptStartingPrice: truck.price != null,
    newPickup: truck.pickup,
    newPickupDt: `${truck.startDt} ${truck.startTm}`,
    newDelivery: truck.dest !== 'Any' ? truck.dest : '',
    newDeliveryDt: '',
    newWeight: '',
    newNotes: '',
    saveAsDraft: false,
  };
}

export function useSearchTrucks() {
  const { t } = useTranslation();
  const { showToast } = useApp();

  const [trucks, setTrucks] = useState<AvailableTruck[]>(() =>
    MOCK_TRUCKS.map((x) => ({ ...x }))
  );
  const [activeTab, setActiveTab] = useState<VisibilityTab>('all');
  const [activeKpi, setActiveKpi] = useState<KpiFilter>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePills, setActivePills] = useState<Set<FilterPillKey>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('best_match');
  const [groupRecurring, setGroupRecurring] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(1);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('pending');
  const [selectedTruck, setSelectedTruck] = useState<AvailableTruck | null>(null);
  const [selectedPendingIdx, setSelectedPendingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  const pending = MOCK_PENDING;

  const kpiCounts = useMemo(() => {
    const privateCount = trucks.filter((x) => x.vis === 'private').length;
    const todayCount = trucks.filter((x) => x.startDt === '21/02/2026').length;
    const soonCount = trucks.filter(
      (x) => parsePostedMinutes(x.posted) <= 60 || x.startTm <= '08:00'
    ).length;
    const priceCount = trucks.filter((x) => x.price != null).length;
    return {
      all: trucks.length,
      private: privateCount,
      today: todayCount,
      soon: soonCount,
      price: priceCount,
    };
  }, [trucks]);

  const filtered = useMemo(() => {
    let data = [...trucks];

    if (activeTab === 'public') data = data.filter((x) => x.vis === 'public');
    if (activeTab === 'private') data = data.filter((x) => x.vis === 'private');

    if (activeKpi === 'private') data = data.filter((x) => x.vis === 'private');
    if (activeKpi === 'today') data = data.filter((x) => x.startDt === '21/02/2026');
    if (activeKpi === 'soon') {
      data = data.filter((x) => parsePostedMinutes(x.posted) <= 60 || x.startTm <= '08:00');
    }
    if (activeKpi === 'price') data = data.filter((x) => x.price != null);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (x) =>
          x.carrier.toLowerCase().includes(q) ||
          x.pickup.toLowerCase().includes(q) ||
          x.dest.toLowerCase().includes(q) ||
          x.truckType.toLowerCase().includes(q) ||
          x.specs.toLowerCase().includes(q) ||
          x.id.toLowerCase().includes(q)
      );
    }

    if (!groupRecurring) {
      data = expandUngrouped(data);
    }

    data.sort((a, b) => {
      switch (sortKey) {
        case 'soonest_start':
          return parseStartKey(a) - parseStartKey(b);
        case 'lowest_price':
          return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
        case 'highest_rating':
          return b.rating - a.rating;
        case 'freshest':
          return parsePostedMinutes(a.posted) - parsePostedMinutes(b.posted);
        default:
          // Best match: private + preferred + rating
          const score = (t: AvailableTruck) =>
            (t.vis === 'private' ? 100 : 0) + (t.preferred ? 50 : 0) + t.rating * 10;
          return score(b) - score(a);
      }
    });

    return data;
  }, [trucks, activeTab, activeKpi, searchQuery, groupRecurring, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const togglePill = useCallback((key: FilterPillKey) => {
    setActivePills((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveTab('all');
    setActiveKpi(null);
    setActivePills(new Set());
    setExpandedId(null);
    setPage(1);
    showToast(t('satFiltersCleared') || 'Filters cleared', 'info');
  }, [showToast, t]);

  const handleTabChange = useCallback((tab: VisibilityTab) => {
    setActiveTab(tab);
    setExpandedId(null);
    setPage(1);
  }, []);

  const handleKpiClick = useCallback((key: KpiFilter) => {
    setActiveKpi((prev) => (prev === key ? null : key));
    if (key === 'private') setActiveTab('private');
    else if (key === 'all' || key === null) setActiveTab('all');
    setExpandedId(null);
    setPage(1);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const openDrawer = useCallback(
    (truck: AvailableTruck, mode: DrawerMode = 'pending', occurrence?: string) => {
      setSelectedTruck(truck);
      setDrawerStep(1);
      setDrawerMode(mode);
      setSelectedPendingIdx(null);
      const d = createDraft(truck);
      if (occurrence) d.occurrence = occurrence;
      setDraft(d);
      setDrawerOpen(true);
    },
    []
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedTruck(null);
    setDraft(null);
    setSelectedPendingIdx(null);
    setDrawerStep(1);
  }, []);

  const updateDraft = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const confirmBooking = useCallback(() => {
    if (!selectedTruck) return;
    const rootId = selectedTruck.id.replace(/-\d+$/, '');
    setTrucks((prev) =>
      prev.map((x) => (x.id === rootId || x.id === selectedTruck.id ? { ...x, bidSent: true } : x))
    );
    closeDrawer();
    showToast(
      t('satOfferSent', { carrier: selectedTruck.carrier }) ||
        `Offer sent to ${selectedTruck.carrier}!`,
      'success'
    );
  }, [selectedTruck, closeDrawer, showToast, t]);

  const handleExport = useCallback(() => {
    const header = [
      'ID',
      'Visibility',
      'Available',
      'Pickup',
      'Destination',
      'Equipment',
      'Trip',
      'Carrier',
      'Price',
      'Posted',
    ];
    const rows = filtered.map((x) => [
      x.id,
      x.vis,
      `${x.startDt} ${x.startTm}`,
      `${x.pickup} (${x.radius}km)`,
      x.dest,
      `${x.truckType} ${x.specs} ${x.capacity}`,
      x.trip,
      x.carrier,
      x.price != null ? String(x.price) : 'Offer-based',
      x.posted,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'available-trucks.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('satExported') || 'Exported CSV', 'success');
  }, [filtered, showToast, t]);

  const handleSavedViews = useCallback(() => {
    showToast(t('satSavedViewsSoon') || 'Saved views coming soon', 'info');
  }, [showToast, t]);

  const handleToggleGroup = useCallback(() => {
    setGroupRecurring((prev) => {
      const next = !prev;
      showToast(
        next
          ? t('satGroupedOn') || 'Recurring entries grouped'
          : t('satGroupedOff') || 'Showing individual occurrences',
        'info'
      );
      return next;
    });
    setExpandedId(null);
    setPage(1);
  }, [showToast, t]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  return {
    t,
    trucks,
    pending,
    kpiCounts,
    filtered,
    pageItems,
    page,
    setPage,
    totalPages,
    perPage: PER_PAGE,
    activeTab,
    handleTabChange,
    activeKpi,
    handleKpiClick,
    searchQuery,
    setSearchQuery: (v: string) => {
      setSearchQuery(v);
      setExpandedId(null);
      setPage(1);
    },
    activePills,
    togglePill,
    clearFilters,
    sortKey,
    setSortKey,
    groupRecurring,
    handleToggleGroup,
    expandedId,
    handleToggleExpand,
    drawerOpen,
    drawerStep,
    setDrawerStep,
    drawerMode,
    setDrawerMode,
    selectedTruck,
    selectedPendingIdx,
    setSelectedPendingIdx,
    draft,
    updateDraft,
    openDrawer,
    closeDrawer,
    confirmBooking,
    handleExport,
    handleSavedViews,
  };
}
