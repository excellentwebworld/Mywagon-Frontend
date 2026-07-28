import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiError, availabilitiesService, SAT_PREFILL_KEY } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import type { SatFilterDraft } from '../../../components/SearchTrucks/SatFilterModal';
import { resolveTripType } from '../../../components/SearchTrucks/SatFilterModal';
import { toApiPickupDate } from '../../../api/mappers/availabilitiesMapper';
import { MOCK_PENDING, MOCK_TRUCKS } from '../mockData';
import type {
  AvailableTruck,
  BookingDraft,
  DrawerMode,
  MapPickupBounds,
  PendingShipment,
  QuickFilterKey,
  SearchCriteria,
  SortKey,
  VisibilityFilter,
} from '../types';

const PER_PAGE = 12;
const MAP_PER_PAGE = 100;
const MAP_PIN_CAP = 500;
const LOAD_MATCH_THRESHOLD = 70;
const SEARCH_DEBOUNCE_MS = 300;
const USE_MOCK = import.meta.env.VITE_USE_SEARCH_TRUCKS_MOCK === 'true';
const GATE_REMIND_SESSION_KEY = 'sat_subscription_gate_dismissed';

function defaultSubscriptionUpgradeUrl(): string {
  const base =
    (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  return `${base}/shipper/subscription/plan`;
}

function resolveUpgradeUrl(fromApi?: string): string {
  if (fromApi && fromApi.length > 0) return fromApi;
  return defaultSubscriptionUpgradeUrl();
}

function parsePostedMinutes(posted: string): number {
  const m = posted.match(/^(\d+)m/);
  if (m) return Number(m[1]);
  const h = posted.match(/^(\d+)h/);
  if (h) return Number(h[1]) * 60;
  return 9999;
}

function parseStartKey(t: AvailableTruck): number {
  if (t.startAt) {
    const d = new Date(t.startAt.replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  const [d, mo, y] = t.startDt.split('/').map(Number);
  const [hh, mm] = t.startTm.split(':').map(Number);
  return new Date(y, mo - 1, d, hh, mm).getTime();
}

function parseEndKey(t: AvailableTruck): number {
  if (t.endDt && t.endDt !== '—') {
    const [d, mo, y] = t.endDt.split('/').map(Number);
    const [hh, mm] = (t.endTm || '23:59').split(':').map(Number);
    if (y && mo && d) return new Date(y, mo - 1, d, hh || 23, mm || 59).getTime();
  }
  return parseStartKey(t) + 24 * 60 * 60 * 1000;
}

/** Mock parity with backend: availability window overlaps local calendar day. */
function truckCoversLocalDate(t: AvailableTruck, ymd: string): boolean {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return true;
  const dayStart = new Date(y, m - 1, d, 0, 0, 0).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return parseStartKey(t) < dayEnd && parseEndKey(t) >= dayStart;
}

function criteriaSearchSignature(c: SearchCriteria): string {
  return JSON.stringify({
    pickupCity: c.pickupCity.trim(),
    pickupDate: c.pickupDate.trim(),
    dropoffCity: c.dropoffCity.trim(),
    dropoffDate: (c.dropoffDate || '').trim(),
    vehicleType: c.vehicleType.trim(),
    pickupLat: c.pickupLat,
    pickupLng: c.pickupLng,
    pickupRadius: c.pickupRadius ?? 50,
    dropoffLat: c.dropoffLat,
    dropoffLng: c.dropoffLng,
    dropoffRadius: c.dropoffRadius ?? 50,
    truckTypeIds: c.truckTypeIds,
    vehicleSpecs: c.vehicleSpecs,
    tripType: c.tripType,
    availableFromStart: c.availableFromStart,
    availableFromEnd: c.availableFromEnd,
    stopsMulti: c.stopsMulti,
    stopsDirect: c.stopsDirect,
    providerNames: c.providerNames,
    minPrice: c.minPrice,
    maxPrice: c.maxPrice,
    mapBounds: c.mapBounds,
  });
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

export const emptyCriteria = (): SearchCriteria => ({
  pickupCity: '',
  pickupDate: '',
  dropoffCity: '',
  dropoffDate: '',
  vehicleType: '',
  pickupLat: null,
  pickupLng: null,
  pickupRadius: 50,
  dropoffLat: null,
  dropoffLng: null,
  dropoffRadius: 50,
  truckTypeIds: [],
  vehicleSpecs: {},
  mapBounds: null,
  tripType: 'any',
  availableFromStart: '',
  availableFromEnd: '',
  stopsMulti: true,
  stopsDirect: false,
  providerNames: [],
  minPrice: '',
  maxPrice: '',
});

function filterMockTrucks(
  trucks: AvailableTruck[],
  opts: {
    visibility: VisibilityFilter;
    quickFilters: Set<QuickFilterKey>;
    appliedCriteria: SearchCriteria;
    searchQuery: string;
    sortKey: SortKey;
  }
): AvailableTruck[] {
  let data = [...trucks];
  const { visibility, quickFilters, appliedCriteria: ac, searchQuery, sortKey } =
    opts;

  if (visibility === 'public') data = data.filter((x) => x.vis === 'public');
  if (visibility === 'private') data = data.filter((x) => x.vis === 'private');

  if (quickFilters.has('today')) {
    const today = new Date();
    const key = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    data = data.filter((x) => x.startDt === key);
  }
  if (quickFilters.has('soon8h')) {
    const until = Date.now() + 8 * 60 * 60 * 1000;
    data = data.filter((x) => {
      const start = parseStartKey(x);
      return start >= Date.now() && start <= until;
    });
  }
  if (quickFilters.has('has_bids')) data = data.filter((x) => Boolean(x.hasBids));
  if (quickFilters.has('load_match')) {
    data = data.filter((x) => (x.loadMatchScore ?? 0) >= LOAD_MATCH_THRESHOLD);
  }

  const bounds = ac.mapBounds;
  const hasPickupBounds =
    Boolean(bounds) &&
    Number.isFinite(bounds!.neLat) &&
    Number.isFinite(bounds!.neLng) &&
    Number.isFinite(bounds!.swLat) &&
    Number.isFinite(bounds!.swLng);
  const hasPickupGeo =
    ac.pickupLat != null &&
    ac.pickupLng != null &&
    Number.isFinite(ac.pickupLat) &&
    Number.isFinite(ac.pickupLng);
  const hasDropoffGeo =
    ac.dropoffLat != null &&
    ac.dropoffLng != null &&
    Number.isFinite(ac.dropoffLat) &&
    Number.isFinite(ac.dropoffLng);

  if (hasPickupBounds && bounds) {
    data = data.filter(
      (x) =>
        x.pickupLat <= bounds.neLat &&
        x.pickupLat >= bounds.swLat &&
        x.pickupLng <= bounds.neLng &&
        x.pickupLng >= bounds.swLng
    );
  } else if (hasPickupGeo && ac.pickupLat != null && ac.pickupLng != null) {
    const radiusKm = ac.pickupRadius ?? 50;
    data = data.filter((x) => {
      const dLat = (x.pickupLat - ac.pickupLat!) * 111;
      const dLng =
        (x.pickupLng - ac.pickupLng!) * 111 * Math.cos((ac.pickupLat! * Math.PI) / 180);
      return Math.hypot(dLat, dLng) <= radiusKm;
    });
  } else if (ac.pickupCity.trim()) {
    const q = ac.pickupCity.trim().toLowerCase();
    data = data.filter((x) => x.pickup.toLowerCase().includes(q));
  }

  if (ac.pickupDate.trim()) {
    const apiPickup = toApiPickupDate(ac.pickupDate);
    if (apiPickup) {
      data = data.filter((x) => truckCoversLocalDate(x, apiPickup));
    }
  }

  if (hasDropoffGeo && ac.dropoffLat != null && ac.dropoffLng != null) {
    const radiusKm = ac.dropoffRadius ?? 50;
    data = data.filter((x) => {
      if (x.destLat == null || x.destLng == null) return x.dest === 'Any';
      const dLat = (x.destLat - ac.dropoffLat!) * 111;
      const dLng =
        (x.destLng - ac.dropoffLng!) * 111 * Math.cos((ac.dropoffLat! * Math.PI) / 180);
      return Math.hypot(dLat, dLng) <= radiusKm;
    });
  } else if (ac.dropoffCity.trim()) {
    const q = ac.dropoffCity.trim().toLowerCase();
    data = data.filter((x) => x.dest.toLowerCase().includes(q) || x.dest === 'Any');
  }
  if (ac.dropoffDate?.trim()) {
    const apiDrop = ac.dropoffDate.trim();
    // Accept YYYY-MM-DD in criteria; mock endDt is DD/MM/YYYY
    const m = apiDrop.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const displayKey = m ? `${m[3]}/${m[2]}/${m[1]}` : apiDrop;
    data = data.filter((x) => x.endDt === displayKey || x.endDt === apiDrop);
  }
  if (ac.vehicleType.trim() || ac.truckTypeIds.length) {
    const q = ac.vehicleType.trim().toLowerCase();
    data = data.filter(
      (x) =>
        (!q || x.truckType.toLowerCase().includes(q) || x.specs.toLowerCase().includes(q))
    );
  }

  const q = searchQuery.trim().toLowerCase().replace(/^#+\s*/, '');
  if (q) {
    data = data.filter(
      (x) =>
        x.carrier.toLowerCase().includes(q) ||
        x.pickup.toLowerCase().includes(q) ||
        x.dest.toLowerCase().includes(q) ||
        x.truckType.toLowerCase().includes(q) ||
        x.specs.toLowerCase().includes(q) ||
        x.id.toLowerCase().includes(q) ||
        x.label.toLowerCase().includes(q)
    );
  }

  if (ac.tripType === 'multi_stop') data = data.filter((x) => x.multiStop);
  else if (ac.tripType === 'direct') data = data.filter((x) => !x.multiStop);

  if (ac.availableFromStart?.trim()) {
    const start = new Date(ac.availableFromStart).getTime();
    data = data.filter((x) => {
      const t = x.startAt ? new Date(x.startAt).getTime() : parseStartKey(x);
      return t >= start;
    });
  }
  if (ac.availableFromEnd?.trim()) {
    const end = new Date(ac.availableFromEnd).getTime();
    data = data.filter((x) => {
      const t = x.startAt ? new Date(x.startAt).getTime() : parseStartKey(x);
      return t <= end;
    });
  }

  if (ac.providerNames?.length) {
    const names = ac.providerNames.map((n) => n.toLowerCase());
    data = data.filter((x) => names.some((n) => x.carrier.toLowerCase().includes(n)));
  }

  const minP = parseFloat(ac.minPrice || '');
  if (Number.isFinite(minP)) {
    data = data.filter((x) => x.price == null || x.price >= minP);
  }
  const maxP = parseFloat(ac.maxPrice || '');
  if (Number.isFinite(maxP)) {
    data = data.filter((x) => x.price == null || x.price <= maxP);
  }

  // Recurring entries stay grouped (UI toggle removed).

  data.sort((a, b) => {
    switch (sortKey) {
      case 'truck_asc':
        return a.truckType.localeCompare(b.truckType);
      case 'truck_desc':
        return b.truckType.localeCompare(a.truckType);
      case 'availability_desc':
        return parseStartKey(b) - parseStartKey(a);
      case 'availability_asc':
      case '':
        return parseStartKey(a) - parseStartKey(b);
      case 'earliest_posting_date':
        return parsePostedMinutes(a.posted) - parsePostedMinutes(b.posted);
      case 'latest_posting_date':
        return parsePostedMinutes(b.posted) - parsePostedMinutes(a.posted);
      case 'pickup_asc':
        return a.pickup.localeCompare(b.pickup);
      case 'pickup_desc':
        return b.pickup.localeCompare(a.pickup);
      case 'dropoff_asc':
        return a.dest.localeCompare(b.dest);
      case 'dropoff_desc':
        return b.dest.localeCompare(a.dest);
      case 'carrier_asc':
        return a.carrier.localeCompare(b.carrier);
      case 'carrier_desc':
        return b.carrier.localeCompare(a.carrier);
      case 'price_asc':
        return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
      case 'price_desc':
        return (b.price ?? Number.NEGATIVE_INFINITY) - (a.price ?? Number.NEGATIVE_INFINITY);
      default:
        return parseStartKey(a) - parseStartKey(b);
    }
  });

  return data;
}

export function useSearchTrucks() {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mockTrucks, setMockTrucks] = useState<AvailableTruck[]>(() =>
    MOCK_TRUCKS.map((x) => ({ ...x }))
  );
  const [bidSentIds, setBidSentIds] = useState<Set<string>>(new Set());

  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilterKey>>(new Set());
  const [criteria, setCriteria] = useState<SearchCriteria>(emptyCriteria);
  const [appliedCriteria, setAppliedCriteria] = useState<SearchCriteria>(emptyCriteria);
  const [sortKey, setSortKey] = useState<SortKey>('');
  const [mockVisibleCount, setMockVisibleCount] = useState(PER_PAGE);

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
  const [pending, setPending] = useState<PendingShipment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingFetchingMore, setPendingFetchingMore] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingHasMore, setPendingHasMore] = useState(false);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingSearch, setPendingSearch] = useState('');
  const pendingTruckIdRef = useRef<string | null>(null);
  const pendingReqSeqRef = useRef(0);
  const [confirming, setConfirming] = useState(false);
  const [creatingShipmentId, setCreatingShipmentId] = useState<string | null>(null);

  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState(defaultSubscriptionUpgradeUrl);
  const [gateModalOpen, setGateModalOpen] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const quickFilterKey = useMemo(
    () => Array.from(quickFilters).sort().join(','),
    [quickFilters]
  );

  const handleListQueryError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 403) {
        const premiumActive =
          quickFilters.has('has_bids') || quickFilters.has('load_match');
        if (premiumActive) {
          setQuickFilters((prev) => {
            const next = new Set(prev);
            next.delete('has_bids');
            next.delete('load_match');
            return next;
          });
          showToast(err.message || t('satUpgradePlan'), 'error');
        } else {
          const url = resolveUpgradeUrl(err.upgradeUrl);
          setUpgradeUrl(url);
          setSubscriptionBlocked(true);
          setError(err.message);
          try {
            if (sessionStorage.getItem(GATE_REMIND_SESSION_KEY) !== '1') {
              setGateModalOpen(true);
            }
          } catch {
            setGateModalOpen(true);
          }
        }
      } else if (err instanceof ApiError) {
        setSubscriptionBlocked(false);
        setError(err.message);
      } else {
        setSubscriptionBlocked(false);
        setError(t('satLoadError') || 'Failed to load availabilities');
      }
    },
    [quickFilters, showToast, t]
  );

  const listQuery = useInfiniteQuery({
    queryKey: [
      'availabilities',
      'list',
      visibility,
      debouncedSearch,
      sortKey,
      appliedCriteria,
      quickFilterKey,
    ],
    enabled: !USE_MOCK,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      try {
        const result = await availabilitiesService.listMapped({
          page: pageParam,
          perPage: PER_PAGE,
          visibility,
          search: debouncedSearch,
          sort: sortKey,
          criteria: appliedCriteria,
          quickFilters,
        });
        setSubscriptionBlocked(false);
        setError(null);
        return result;
      } catch (err) {
        handleListQueryError(err);
        throw err;
      }
    },
    getNextPageParam: (last) => {
      const current = last.meta.current_page ?? 1;
      const lastPage = last.meta.last_page ?? 1;
      return current < lastPage ? current + 1 : undefined;
    },
  });

  const mapQuery = useQuery({
    queryKey: [
      'availabilities',
      'map',
      visibility,
      debouncedSearch,
      sortKey,
      appliedCriteria,
      quickFilterKey,
    ],
    enabled: !USE_MOCK && !subscriptionBlocked,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        const result = await availabilitiesService.listAllMappedForMap(
          {
            visibility,
            search: debouncedSearch,
            sort: sortKey,
            criteria: appliedCriteria,
            quickFilters,
          },
          { perPage: MAP_PER_PAGE, maxPins: MAP_PIN_CAP }
        );
        return result;
      } catch (err) {
        handleListQueryError(err);
        throw err;
      }
    },
  });

  const mockFiltered = useMemo(() => {
    if (!USE_MOCK) return [];
    return filterMockTrucks(mockTrucks, {
      visibility,
      quickFilters,
      appliedCriteria,
      searchQuery: debouncedSearch,
      sortKey,
    });
  }, [
    mockTrucks,
    visibility,
    quickFilters,
    appliedCriteria,
    debouncedSearch,
    sortKey,
  ]);

  useEffect(() => {
    if (!USE_MOCK) return;
    setMockVisibleCount(PER_PAGE);
  }, [
    visibility,
    debouncedSearch,
    sortKey,
    appliedCriteria,
    quickFilters,
  ]);

  const liveTrucks = useMemo(() => {
    const pages = listQuery.data?.pages ?? [];
    const caps = pages[0]?.meta.capabilities;
    const allowBidsCount = caps?.can_view_bids_count === true;
    const allowBestBid = caps?.can_view_best_bid === true;
    const items = pages.flatMap((p) => p.trucks);
    return items.map((x) => {
      const patched = bidSentIds.has(x.id) ? { ...x, bidSent: true } : x;
      if (allowBidsCount && allowBestBid) return patched;
      return {
        ...patched,
        hasBids: allowBidsCount ? patched.hasBids : undefined,
        bidsCount: allowBidsCount ? patched.bidsCount : null,
        bestBid: allowBestBid ? patched.bestBid : null,
      };
    });
  }, [listQuery.data?.pages, bidSentIds]);

  const filtered = USE_MOCK ? mockFiltered : liveTrucks;

  const totalFromApi = listQuery.data?.pages[0]?.meta.total ?? 0;
  const listCapabilities = listQuery.data?.pages[0]?.meta.capabilities;
  // Opt-in: only show bid features when API explicitly grants them.
  const canViewBidsCount = USE_MOCK
    ? true
    : listCapabilities?.can_view_bids_count === true;
  const canViewBestBid = USE_MOCK
    ? true
    : listCapabilities?.can_view_best_bid === true;

  useEffect(() => {
    if (canViewBidsCount) return;
    setQuickFilters((prev) => {
      if (!prev.has('has_bids')) return prev;
      const next = new Set(prev);
      next.delete('has_bids');
      return next;
    });
  }, [canViewBidsCount]);

  const pageItems = useMemo(() => {
    if (!USE_MOCK) return filtered;
    return filtered.slice(0, mockVisibleCount);
  }, [filtered, mockVisibleCount]);

  const liveMapTrucks = useMemo(() => {
    const items = mapQuery.data?.trucks ?? [];
    return items.map((x) => (bidSentIds.has(x.id) ? { ...x, bidSent: true } : x));
  }, [mapQuery.data?.trucks, bidSentIds]);

  const mapTrucks = USE_MOCK ? filtered : liveMapTrucks;
  const mapPinsCapped = USE_MOCK ? false : Boolean(mapQuery.data?.capped);
  const mapPinCount = USE_MOCK
    ? filtered.length
    : mapPinsCapped
      ? mapTrucks.length
      : (mapQuery.data?.meta.total ?? mapTrucks.length);

  const selectedTruckInList = useMemo(
    () =>
      pageItems.find((x) => x.id === selectedId) ??
      mapTrucks.find((x) => x.id === selectedId) ??
      null,
    [pageItems, mapTrucks, selectedId]
  );

  const hasNextPage = USE_MOCK
    ? mockVisibleCount < filtered.length
    : Boolean(listQuery.hasNextPage);

  const fetchingMore = USE_MOCK ? false : listQuery.isFetchingNextPage;

  const fetchNextPage = useCallback(() => {
    if (USE_MOCK) {
      setMockVisibleCount((prev) => Math.min(prev + PER_PAGE, mockFiltered.length));
      return;
    }
    if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
      void listQuery.fetchNextPage();
    }
  }, [listQuery, mockFiltered.length]);

  const toggleQuickFilter = useCallback((key: QuickFilterKey) => {
    setQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setVisibility('all');
    setQuickFilters(new Set());
    setCriteria(emptyCriteria());
    setAppliedCriteria(emptyCriteria());
    setSelectedId(null);
    showToast(t('satFiltersCleared') || 'Filters cleared', 'info');
  }, [showToast, t]);

  const applyPanelFilters = useCallback((draft: SatFilterDraft) => {
    const nextQuick = new Set(draft.quickFilters);
    setQuickFilters(nextQuick);
    const tripType = resolveTripType(draft.stopsMulti, draft.stopsDirect);
    const patch: Partial<SearchCriteria> = {
      truckTypeIds: draft.truckTypeIds,
      availableFromStart: draft.availableFromStart,
      availableFromEnd: draft.availableFromEnd,
      pickupCity: draft.pickupCity,
      pickupLat: draft.pickupLat,
      pickupLng: draft.pickupLng,
      pickupRadius: draft.pickupRadius,
      dropoffCity: draft.dropoffCity,
      dropoffLat: draft.dropoffLat,
      dropoffLng: draft.dropoffLng,
      dropoffRadius: draft.dropoffRadius,
      stopsMulti: draft.stopsMulti,
      stopsDirect: draft.stopsDirect,
      tripType,
      providerNames: draft.providerNames,
      minPrice: draft.minPrice,
      maxPrice: draft.maxPrice,
    };
    setCriteria((prev) => ({ ...prev, ...patch }));
    setAppliedCriteria((prev) => ({ ...prev, ...patch }));
    setSelectedId(null);
  }, []);

  const resetPanelFilters = useCallback(() => {
    const patch: Partial<SearchCriteria> = {
      truckTypeIds: [],
      availableFromStart: '',
      availableFromEnd: '',
      pickupRadius: 50,
      dropoffRadius: 50,
      stopsMulti: true,
      stopsDirect: false,
      tripType: 'any',
      providerNames: [],
      minPrice: '',
      maxPrice: '',
    };
    setQuickFilters(new Set());
    setCriteria((prev) => ({ ...prev, ...patch }));
    setAppliedCriteria((prev) => ({ ...prev, ...patch }));
    setSelectedId(null);
  }, []);

  const applySearch = useCallback(() => {
    if (!criteria.pickupCity.trim()) {
      showToast(t('satPickupCityRequired') || 'Pickup city is required', 'warning');
      return false;
    }
    if (!criteria.pickupDate.trim()) {
      showToast(t('satPickupDateRequired') || 'Pickup date is required', 'warning');
      return false;
    }
    const hasCargo =
      criteria.truckTypeIds.length > 0 ||
      Object.values(criteria.vehicleSpecs || {}).some((ids) => ids.length > 0);
    if (!criteria.vehicleType.trim() && !hasCargo) {
      showToast(t('satVehicleTypeRequired') || 'Vehicle type is required', 'warning');
      return false;
    }
    // Pill search is authority: clear map bounds mode.
    const next = { ...criteria, mapBounds: null };
    setCriteria(next);
    setAppliedCriteria(next);
    setSelectedId(null);
    showToast(t('satSearchApplied') || 'Search applied', 'success');
    return true;
  }, [criteria, showToast, t]);

  const searchPending = useMemo(
    () => criteriaSearchSignature(criteria) !== criteriaSearchSignature(appliedCriteria),
    [criteria, appliedCriteria]
  );

  const applyMapBoundsSearch = useCallback(
    (bounds: MapPickupBounds) => {
      const next = { ...appliedCriteria, mapBounds: bounds };
      setCriteria((prev) => ({ ...prev, mapBounds: bounds }));
      setAppliedCriteria(next);
      setSelectedId(null);
    },
    [appliedCriteria]
  );

  const selectTruck = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const PENDING_PAGE_SIZE = 10;

  const loadPendingMatches = useCallback(
    async (
      truck: AvailableTruck,
      opts: {
        page?: number;
        append?: boolean;
        search?: string;
      } = {}
    ) => {
      const page = opts.page ?? 1;
      const append = Boolean(opts.append);
      const search = opts.search ?? pendingSearch;
      const reqId = ++pendingReqSeqRef.current;
      pendingTruckIdRef.current = truck.id;

      if (append) setPendingFetchingMore(true);
      else {
        setPendingLoading(true);
        setPending([]);
        setSelectedPendingIdx(null);
        setPendingPage(1);
        setPendingHasMore(false);
      }

      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, append ? 280 : 400));
          if (reqId !== pendingReqSeqRef.current || pendingTruckIdRef.current !== truck.id) return;

          const q = search.trim().toLowerCase();
          const filtered = MOCK_PENDING.filter((p) => {
            if (!q) return true;
            return `${p.sid} ${p.lane} ${p.pickup} ${p.weight}`.toLowerCase().includes(q);
          });
          const start = (page - 1) * PENDING_PAGE_SIZE;
          const slice = filtered.slice(start, start + PENDING_PAGE_SIZE);
          setPending((prev) => (append ? [...prev, ...slice] : slice));
          setPendingPage(page);
          setPendingTotal(filtered.length);
          setPendingHasMore(start + slice.length < filtered.length);
          return;
        }

        // Skip unused proceed() — it duplicated work and blocked the drawer open.
        // Pending list is loaded directly via pending-matches.
        const result = await availabilitiesService.pendingMatches(Number(truck.id), {
          page,
          perPage: PENDING_PAGE_SIZE,
          search,
          filter: 'all',
        });
        if (reqId !== pendingReqSeqRef.current || pendingTruckIdRef.current !== truck.id) return;

        setPending((prev) => (append ? [...prev, ...result.items] : result.items));
        setPendingPage(result.meta.current_page);
        setPendingTotal(result.meta.total);
        setPendingHasMore(
          result.meta.current_page < (result.meta.last_page ?? result.meta.current_page)
        );
      } catch (err) {
        if (reqId !== pendingReqSeqRef.current) return;
        if (!append) setPending([]);
        setPendingHasMore(false);
        const msg =
          err instanceof ApiError
            ? err.message
            : t('satPendingLoadError') || 'Failed to load pending shipments';
        showToast(msg, 'error');
      } finally {
        if (reqId === pendingReqSeqRef.current) {
          setPendingLoading(false);
          setPendingFetchingMore(false);
        }
      }
    },
    [pendingSearch, showToast, t]
  );

  const setPendingSearchQuery = useCallback(
    (search: string) => {
      setPendingSearch(search);
      if (!selectedTruck) return;
      void loadPendingMatches(selectedTruck, {
        page: 1,
        append: false,
        search,
      });
    },
    [loadPendingMatches, selectedTruck]
  );

  const fetchMorePending = useCallback(() => {
    if (!selectedTruck || pendingLoading || pendingFetchingMore || !pendingHasMore) return;
    void loadPendingMatches(selectedTruck, {
      page: pendingPage + 1,
      append: true,
      search: pendingSearch,
    });
  }, [
    loadPendingMatches,
    pendingFetchingMore,
    pendingHasMore,
    pendingLoading,
    pendingPage,
    pendingSearch,
    selectedTruck,
  ]);

  const goToCreateShipment = useCallback(
    async (truck: AvailableTruck) => {
      setCreatingShipmentId(truck.id);
      try {
        if (USE_MOCK) {
          navigate(`/shipments/create/step/1?availability_id=${truck.id}`);
          return;
        }
        const result = await availabilitiesService.proceed(
          Number(truck.id),
          'create_shipment'
        );
        sessionStorage.setItem(SAT_PREFILL_KEY, JSON.stringify(result));
        navigate(`/shipments/create/step/1?availability_id=${truck.id}`);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : t('satCreateNavigateError') || 'Could not start create shipment';
        showToast(msg, 'error');
        setCreatingShipmentId(null);
      }
      // Keep loading state on success until create-shipment route unmounts this page.
    },
    [navigate, showToast, t]
  );

  const openDrawer = useCallback(
    (truck: AvailableTruck, mode: DrawerMode = 'pending', occurrence?: string) => {
      // Create-new skips the booking drawer — Create Shipment sticky bar holds context.
      if (mode === 'new') {
        void goToCreateShipment(truck);
        return;
      }

      setSelectedTruck(truck);
      setDrawerStep(1);
      setDrawerMode('pending');
      setSelectedPendingIdx(null);
      setPendingSearch('');
      const d = createDraft(truck);
      if (occurrence) d.occurrence = occurrence;
      setDraft(d);
      setDrawerOpen(true);
      void loadPendingMatches(truck, { page: 1, append: false, search: '' });
    },
    [goToCreateShipment, loadPendingMatches]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedTruck(null);
    setDraft(null);
    setSelectedPendingIdx(null);
    setDrawerStep(1);
    setPending([]);
    setPendingSearch('');
    setPendingHasMore(false);
    setPendingTotal(0);
    pendingTruckIdRef.current = null;
  }, []);

  const updateDraft = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const setDrawerModeAndLoad = useCallback(
    (mode: DrawerMode) => {
      if (mode === 'new' && selectedTruck) {
        const truck = selectedTruck;
        closeDrawer();
        void goToCreateShipment(truck);
        return;
      }
      setDrawerMode('pending');
      setSelectedPendingIdx(null);
      setPendingSearch('');
      if (selectedTruck) {
        void loadPendingMatches(selectedTruck, {
          page: 1,
          append: false,
          search: '',
        });
      }
    },
    [closeDrawer, goToCreateShipment, loadPendingMatches, selectedTruck]
  );

  const placeBidMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTruck || !draft) throw new Error('missing draft');
      if (selectedPendingIdx == null || !pending[selectedPendingIdx]) {
        throw new ApiError(t('satSelectPendingFirst') || 'Select a pending shipment', 422);
      }
      const shipment = pending[selectedPendingIdx];
      const shipmentId = shipment.id;
      if (!shipmentId) throw new ApiError('Invalid shipment', 422);

      const showPrice = selectedTruck.price != null && !selectedTruck.priceBlurred;
      const offerRequired = !showPrice || !draft.acceptStartingPrice;
      const offerAmount = Number(String(draft.offerPrice).trim());
      if (offerRequired && (!Number.isFinite(offerAmount) || offerAmount <= 0)) {
        throw new ApiError(t('satOfferRequired') || 'Your offer is required.', 422);
      }

      return availabilitiesService.placeBid(Number(selectedTruck.id), {
        shipment_id: shipmentId,
        quote: draft.offerPrice || undefined,
        notes: draft.notes || undefined,
      });
    },
    onSuccess: () => {
      if (!selectedTruck) return;
      setBidSentIds((prev) => new Set(prev).add(selectedTruck.id));
      if (USE_MOCK) {
        setMockTrucks((prev) =>
          prev.map((x) => (x.id === selectedTruck.id ? { ...x, bidSent: true } : x))
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['availabilities'] });
      closeDrawer();
      showToast(
        t('satOfferSent', { carrier: selectedTruck.carrier }) ||
          `Offer sent to ${selectedTruck.carrier}!`,
        'success'
      );
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : t('satBidError') || 'Failed to send booking request';
      showToast(msg, 'error');
    },
  });

  const confirmBooking = useCallback(async () => {
    if (!selectedTruck) return;

    if (USE_MOCK) {
      const rootId = selectedTruck.id.replace(/-\d+$/, '');
      setMockTrucks((prev) =>
        prev.map((x) =>
          x.id === rootId || x.id === selectedTruck.id ? { ...x, bidSent: true } : x
        )
      );
      closeDrawer();
      showToast(
        t('satOfferSent', { carrier: selectedTruck.carrier }) ||
          `Offer sent to ${selectedTruck.carrier}!`,
        'success'
      );
      return;
    }

    setConfirming(true);
    try {
      await placeBidMutation.mutateAsync();
    } finally {
      setConfirming(false);
    }
  }, [selectedTruck, placeBidMutation, closeDrawer, showToast, t]);

  const dismissGateReminder = useCallback(() => {
    try {
      sessionStorage.setItem(GATE_REMIND_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setGateModalOpen(false);
  }, []);

  const retryLoad = useCallback(() => {
    setError(null);
    void listQuery.refetch();
    void mapQuery.refetch();
  }, [listQuery, mapQuery]);

  const handleExport = useCallback(async () => {
    if (subscriptionBlocked) {
      showToast(t('satUpgradeBody') || t('satUpgradePlan'), 'error');
      return;
    }
    if (!USE_MOCK && listQuery.isLoading) {
      showToast(t('satLoading'), 'info');
      return;
    }

    if (!USE_MOCK) {
      try {
        await availabilitiesService.exportCsv({
          visibility,
          search: debouncedSearch,
          sort: sortKey,
          criteria: appliedCriteria,
          quickFilters,
        });
        showToast(t('satExported') || 'Exported CSV', 'success');
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : t('satLoadError') || 'Export failed';
        showToast(message, 'error');
      }
      return;
    }

    if (filtered.length === 0) {
      showToast(t('satExportEmpty') || 'Nothing to export', 'info');
      return;
    }
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
  }, [
    filtered,
    subscriptionBlocked,
    listQuery.isLoading,
    visibility,
    debouncedSearch,
    sortKey,
    appliedCriteria,
    quickFilters,
    showToast,
    t,
  ]);

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
    pendingLoading,
    pendingFetchingMore,
    pendingHasMore,
    pendingTotal,
    pendingSearch,
    setPendingSearchQuery,
    fetchMorePending,
    confirming: confirming || placeBidMutation.isPending,
    creatingShipment: Boolean(creatingShipmentId),
    creatingShipmentId,
    filtered,
    pageItems,
    mapTrucks,
    mapPinCount,
    mapPinsCapped,
    mapLoading: !USE_MOCK && mapQuery.isLoading,
    hasNextPage,
    fetchingMore,
    fetchNextPage,
    total: USE_MOCK ? filtered.length : totalFromApi,
    loading: !USE_MOCK && listQuery.isLoading,
    fetching: !USE_MOCK && listQuery.isFetching,
    error,
    subscriptionBlocked,
    upgradeUrl,
    gateModalOpen,
    dismissGateReminder,
    retryLoad,
    applyMapBoundsSearch,
    visibility,
    setVisibility,
    searchQuery,
    setSearchQuery: (v: string) => {
      setSearchQuery(v);
    },
    quickFilters,
    toggleQuickFilter,
    canViewBidsCount,
    canViewBestBid,
    criteria,
    setCriteria,
    appliedCriteria,
    applySearch,
    searchPending,
    applyPanelFilters,
    resetPanelFilters,
    clearFilters,
    sortKey,
    setSortKey,
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
    setDrawerMode: setDrawerModeAndLoad,
    selectedTruck,
    selectedPendingIdx,
    setSelectedPendingIdx,
    draft,
    updateDraft,
    openDrawer,
    closeDrawer,
    confirmBooking,
    goToCreateShipment,
    handleExport,
    useMock: USE_MOCK,
  };
}

