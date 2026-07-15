import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { MOCK_PENDING, MOCK_TRUCKS } from '../mockData';
import type {
  AvailableTruck,
  BookingDraft,
  DrawerMode,
  QuickFilterKey,
  SearchCriteria,
  SortKey,
  VisibilityFilter,
} from '../types';

const PER_PAGE = 8;
const LOAD_MATCH_THRESHOLD = 70;
/** Demo "today" aligned with mock start dates */
const DEMO_TODAY = '21/02/2026';

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

const emptyCriteria = (): SearchCriteria => ({
  pickupCity: '',
  pickupDate: '',
  dropoffCity: '',
  vehicleType: '',
});

export function useSearchTrucks() {
  const { t } = useTranslation();
  const { showToast } = useApp();

  const [trucks, setTrucks] = useState<AvailableTruck[]>(() =>
    MOCK_TRUCKS.map((x) => ({ ...x }))
  );
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilterKey>>(new Set());
  const [criteria, setCriteria] = useState<SearchCriteria>(emptyCriteria);
  const [appliedCriteria, setAppliedCriteria] = useState<SearchCriteria>(emptyCriteria);
  const [sortKey, setSortKey] = useState<SortKey>('best_match');
  const [groupRecurring, setGroupRecurring] = useState(true);
  const [page, setPage] = useState(1);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(1);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('pending');
  const [selectedTruck, setSelectedTruck] = useState<AvailableTruck | null>(null);
  const [selectedPendingIdx, setSelectedPendingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  const pending = MOCK_PENDING;

  const filtered = useMemo(() => {
    let data = [...trucks];

    if (visibility === 'public') data = data.filter((x) => x.vis === 'public');
    if (visibility === 'private') data = data.filter((x) => x.vis === 'private');

    if (quickFilters.has('today')) {
      data = data.filter((x) => x.startDt === DEMO_TODAY);
    }
    if (quickFilters.has('soon8h')) {
      data = data.filter((x) => parsePostedMinutes(x.posted) <= 120 || x.startTm <= '08:00');
    }
    if (quickFilters.has('has_bids')) {
      data = data.filter((x) => Boolean(x.hasBids));
    }
    if (quickFilters.has('load_match')) {
      data = data.filter((x) => (x.loadMatchScore ?? 0) >= LOAD_MATCH_THRESHOLD);
    }

    const ac = appliedCriteria;
    if (ac.pickupCity.trim()) {
      const q = ac.pickupCity.trim().toLowerCase();
      data = data.filter((x) => x.pickup.toLowerCase().includes(q));
    }
    if (ac.dropoffCity.trim()) {
      const q = ac.dropoffCity.trim().toLowerCase();
      data = data.filter(
        (x) => x.dest.toLowerCase().includes(q) || x.dest === 'Any'
      );
    }
    if (ac.vehicleType.trim()) {
      const q = ac.vehicleType.trim().toLowerCase();
      data = data.filter(
        (x) =>
          x.truckType.toLowerCase().includes(q) ||
          x.specs.toLowerCase().includes(q)
      );
    }
    if (ac.pickupDate.trim()) {
      // Mock: loose match — keep all if date set for demo UX
    }

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

    if (!groupRecurring) data = expandUngrouped(data);

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
        default: {
          const score = (t: AvailableTruck) =>
            (t.vis === 'private' ? 100 : 0) +
            (t.preferred ? 50 : 0) +
            t.rating * 10 +
            (t.loadMatchScore ?? 0);
          return score(b) - score(a);
        }
      }
    });

    return data;
  }, [
    trucks,
    visibility,
    quickFilters,
    appliedCriteria,
    searchQuery,
    groupRecurring,
    sortKey,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const selectedTruckInList = useMemo(
    () => filtered.find((x) => x.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const toggleQuickFilter = useCallback((key: QuickFilterKey) => {
    setQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setVisibility('all');
    setQuickFilters(new Set());
    setCriteria(emptyCriteria());
    setAppliedCriteria(emptyCriteria());
    setSelectedId(null);
    setPage(1);
    showToast(t('satFiltersCleared') || 'Filters cleared', 'info');
  }, [showToast, t]);

  const applySearch = useCallback(() => {
    if (!criteria.pickupCity.trim()) {
      showToast(t('satPickupCityRequired') || 'Pickup city is required', 'warning');
      return false;
    }
    if (!criteria.pickupDate.trim()) {
      showToast(t('satPickupDateRequired') || 'Pickup date is required', 'warning');
      return false;
    }
    if (!criteria.vehicleType.trim()) {
      showToast(t('satVehicleTypeRequired') || 'Vehicle type is required', 'warning');
      return false;
    }
    setAppliedCriteria({ ...criteria });
    setPage(1);
    setSelectedId(null);
    showToast(t('satSearchApplied') || 'Search applied', 'success');
    return true;
  }, [criteria, showToast, t]);

  const selectTruck = useCallback((id: string | null) => {
    setSelectedId(id);
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
      'Vehicle Type',
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
    setPage(1);
  }, [showToast, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawerOpen) closeDrawer();
        else if (selectedId) setSelectedId(null);
        else if (mobileMapOpen) setMobileMapOpen(false);
        else if (mapExpanded) setMapExpanded(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer, selectedId, mobileMapOpen, mapExpanded]);

  return {
    t,
    pending,
    filtered,
    pageItems,
    page,
    setPage,
    totalPages,
    perPage: PER_PAGE,
    visibility,
    setVisibility: (v: VisibilityFilter) => {
      setVisibility(v);
      setPage(1);
    },
    searchQuery,
    setSearchQuery: (v: string) => {
      setSearchQuery(v);
      setPage(1);
    },
    quickFilters,
    toggleQuickFilter,
    criteria,
    setCriteria,
    appliedCriteria,
    applySearch,
    clearFilters,
    sortKey,
    setSortKey,
    groupRecurring,
    handleToggleGroup,
    hoveredId,
    setHoveredId,
    selectedId,
    selectTruck,
    selectedTruckInList,
    mapExpanded,
    setMapExpanded,
    mobileMapOpen,
    setMobileMapOpen,
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
  };
}
