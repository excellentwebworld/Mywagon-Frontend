import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, Check, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { ApiError, partnersService } from '../../../../api';
import { buildLaneFingerprint, buildLaneFingerprintFromEntry } from '../../../../api/utils/laneMetricDisplay';
import { findLaneConflict, resolveConflictEffectiveFrom } from '../../../../api/utils/laneConflict';
import { resolveCity, calculateRouteTotals } from '../../../../mocks/priceListsData';
import { DatePicker } from '../../../../components/ui/DatePicker';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import { loadGoogleMaps } from '../../../../components/AddressBook/GoogleMapAddressField';
import { SearchVehicleCargoPicker } from '../../../../components/SearchTrucks/SearchVehicleCargoPicker';
import LanePlacePicker from '../LanePlacePicker';
import {
  isValidLaneStop,
  isDisplayableLaneStop,
  stopsAreSamePlace,
  normalizeLoadedLaneStop,
  sanitizeStopForSave,
  isLegacyLaneStop,
} from '../mapLocationToLaneStop';

const WEIGHT_UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
];

const METRICS = [
  { key: 'weight', labelKey: 'priceLists.phase2.metric.weight', fallback: 'Weight' },
  { key: 'unit_transport', labelKey: 'priceLists.phase2.metric.unitTransport', fallback: 'Unit of transport' },
  { key: 'ftl_truck_type', labelKey: 'priceLists.phase2.metric.ftlTruckType', fallback: 'FTL truck type' },
  { key: 'load_any_size', labelKey: 'priceLists.phase2.metric.loadAnySize', fallback: 'Load (any size)' },
];

/** Max digits in the price amount (before decimal). Prevents absurd values like 560000000. */
const MAX_PRICE_DIGITS = 8;
const MAX_PRICE_DECIMALS = 2;
const MAX_PRICE_VALUE = 10 ** MAX_PRICE_DIGITS - 1; // 99_999_999

function clampPriceInput(raw) {
  const value = String(raw ?? '');
  if (value === '' || value === '.') return value;

  // Allow intermediate typing: "12.", "0.5"
  if (!/^\d*\.?\d*$/.test(value)) return null;

  const [intPart = '', decPart] = value.split('.');
  if (intPart.length > MAX_PRICE_DIGITS) {
    const clippedInt = intPart.slice(0, MAX_PRICE_DIGITS);
    if (decPart != null) {
      return `${clippedInt}.${decPart.slice(0, MAX_PRICE_DECIMALS)}`;
    }
    return clippedInt;
  }
  if (decPart != null && decPart.length > MAX_PRICE_DECIMALS) {
    return `${intPart}.${decPart.slice(0, MAX_PRICE_DECIMALS)}`;
  }
  return value;
}

function isPriceWithinLimit(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return false;
  const digitCount = String(Math.floor(Math.abs(n))).replace(/^0+/, '') || '0';
  return digitCount.length <= MAX_PRICE_DIGITS && n <= MAX_PRICE_VALUE;
}

const UNIT_TRANSPORT_OPTIONS = [
  { value: 'eur_pallet', labelKey: 'priceLists.phase2.unit.eurPallet', fallback: 'EUR pallets' },
  { value: 'us_pallet', labelKey: 'priceLists.phase2.unit.usPallet', fallback: 'US pallets' },
  { value: 'box', labelKey: 'priceLists.phase2.unit.box', fallback: 'Boxes' },
  { value: 'unit', labelKey: 'priceLists.phase2.unit.unit', fallback: 'Units' },
  { value: 'big_bag', labelKey: 'priceLists.phase2.unit.bigBag', fallback: 'Big Bags' },
];

function uid() {
  return `pr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadGoogleMapsScript() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  if (key) void loadGoogleMaps(key).catch(() => {});
}

function defaultMetricValue(metric) {
  if (metric === 'weight') return { unit: 'kg' };
  if (metric === 'unit_transport') return { type: 'eur_pallet' };
  if (metric === 'ftl_truck_type') return { vehicle_type: '', truck_type_ids: [], vehicle_specs: {} };
  return { type: 'per_load' };
}

function buildRowsFromLegacyPricing(pricing) {
  const rows = [];
  if (!pricing) return rows;

  if (pricing.perLoad) {
    rows.push({ id: uid(), metric: 'load_any_size', amount: String(pricing.perLoad), metricValue: { type: 'per_load' } });
  }
  if (pricing.perPallet) {
    rows.push({ id: uid(), metric: 'unit_transport', amount: String(pricing.perPallet), metricValue: { type: 'eur_pallet' } });
  }
  if (pricing.perKg) {
    rows.push({ id: uid(), metric: 'weight', amount: String(pricing.perKg), metricValue: { unit: 'kg' } });
  } else if (pricing.perTonne) {
    rows.push({ id: uid(), metric: 'weight', amount: String(pricing.perTonne), metricValue: { unit: 'ton' } });
  }

  return rows;
}

function normalizeRowsFromLane(lane) {
  if (Array.isArray(lane?.pricingRows) && lane.pricingRows.length > 0) {
    return lane.pricingRows.map((row) => ({
      id: uid(),
      metric: row.metric,
      amount: String(row.priceEur ?? ''),
      metricValue: row.metricValue ?? defaultMetricValue(row.metric),
    }));
  }

  const legacyRows = buildRowsFromLegacyPricing(lane?.pricing);
  return legacyRows.length > 0
    ? legacyRows
    : [{ id: uid(), metric: 'load_any_size', amount: '', metricValue: defaultMetricValue('load_any_size') }];
}

function isMetricValueValid(metric, metricValue) {
  if (metric === 'weight') return metricValue?.unit === 'kg' || metricValue?.unit === 'ton';
  if (metric === 'unit_transport') return UNIT_TRANSPORT_OPTIONS.some((o) => o.value === metricValue?.type);
  if (metric === 'ftl_truck_type') return Boolean(metricValue?.vehicle_type) && Array.isArray(metricValue?.truck_type_ids) && metricValue.truck_type_ids.length > 0;
  return true;
}

function toLegacyPricing(rows) {
  const pricing = {
    perLoad: null,
    perPallet: null,
    perKm: null,
    perKg: null,
    perTonne: null,
    currency: 'EUR',
    minimumCharge: null,
  };

  rows.forEach((row) => {
    const amount = Number(row.amount || 0);
    if (!amount) return;

    if (row.metric === 'load_any_size' && pricing.perLoad == null) pricing.perLoad = amount;
    if (row.metric === 'unit_transport' && pricing.perPallet == null) pricing.perPallet = amount;
    if (row.metric === 'weight') {
      if (row.metricValue?.unit === 'kg' && pricing.perKg == null) pricing.perKg = amount;
      if (row.metricValue?.unit === 'ton' && pricing.perTonne == null) pricing.perTonne = amount;
    }
    if (row.metric === 'ftl_truck_type' && pricing.perLoad == null) pricing.perLoad = amount;
  });

  return pricing;
}

export default function AddEditLaneModalV2({ open, onClose, onSave, lane, mode = 'add', role, allLanes, forwarderTab, isSaving = false }) {
  const { t } = useTranslation();
  const { T } = useTheme();

  const metricLabel = (metric) => {
    const item = METRICS.find((m) => m.key === metric);
    if (!item) return metric;
    return t(item.labelKey, item.fallback);
  };

  const unitLabel = (value) => {
    const item = UNIT_TRANSPORT_OPTIONS.find((u) => u.value === value);
    if (!item) return value;
    return t(item.labelKey, item.fallback);
  };

  const [truckPickerOpen, setTruckPickerOpen] = useState({});
  const [sections, setSections] = useState({ route: true, pricing: true, validity: true });
  const [stops, setStops] = useState([null, null]);
  const [tripType, setTripType] = useState('direct');
  const [pricingRows, setPricingRows] = useState([{ id: uid(), metric: 'load_any_size', amount: '', metricValue: defaultMetricValue('load_any_size') }]);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [scopePartnerIds, setScopePartnerIds] = useState([]);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [scopeDirection, setScopeDirection] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [dupeWarn, setDupeWarn] = useState(false);
  const [googleKm, setGoogleKm] = useState(null);
  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersError, setPartnersError] = useState(null);
  const [partnerSearch, setPartnerSearch] = useState('');
  const sourceLaneRef = useRef(null);

  const partnerOptions = useMemo(() => {
    const q = partnerSearch.trim().toLowerCase();
    const list = (partners || []).filter((p) => {
      const status = String(p.status || '').toLowerCase();
      return !status || status === 'active';
    });
    if (!q) return list;
    return list.filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const type = String(p.type || '').toLowerCase();
      const typeLabel = String(p.type_label || '').toLowerCase();
      return name.includes(q) || type.includes(q) || typeLabel.includes(q)
        || (q === 'carrier' && type.includes('carrier'))
        || (q === 'freelancer' && (type.includes('freelancer') || type.includes('driver')));
    });
  }, [partners, partnerSearch]);

  const partnerTypeBadge = (partner) => {
    const type = String(partner?.type || '').toLowerCase();
    if (type === 'carrier_company' || type === 'carrier') {
      return {
        label: t('priceLists.modal.partnerTypeCarrier', 'Carrier'),
        bg: '#EFF6FF',
        fg: '#2563EB',
        bd: '#BFDBFE',
      };
    }
    if (type === 'freelancer_driver' || type === 'driver' || type === 'freelancer') {
      return {
        label: t('priceLists.modal.partnerTypeFreelancer', 'Freelancer'),
        bg: 'rgba(108, 58, 237, 0.08)',
        fg: T.ac,
        bd: 'rgba(108, 58, 237, 0.2)',
      };
    }
    if (type === 'supplier' || type === 'shipper' || type === 'customer') {
      return {
        label: partner?.type_label || t('priceLists.modal.partnerTypeShipper', 'Shipper'),
        bg: '#ECFDF5',
        fg: '#059669',
        bd: '#A7F3D0',
      };
    }
    if (!partner?.type_label && !partner?.type) return null;
    return {
      label: partner.type_label || partner.type,
      bg: T.bg,
      fg: T.t3,
      bd: T.bd,
    };
  };

  const partnerNameById = useMemo(() => {
    const map = new Map();
    partners.forEach((p) => {
      map.set(String(p.id), p.name);
    });
    return map;
  }, [partners]);

  const defaultScopeLabel = role === 'shipper'
    ? t('priceLists.scope.allCarriers', 'All carriers')
    : role === 'carrier'
      ? t('priceLists.scope.allShippers', 'All shippers')
      : t('priceLists.scope.allPartners', 'All partners');

  const scopeIsSpecific = scopeDropdownOpen || scopePartnerIds.length > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPartnersLoading(true);
      setPartnersError(null);
      try {
        const result = await partnersService.listPartners({
          page: 1,
          per_page: 50,
          facet: 'all',
          statuses: ['active'],
          sort: 'name',
          sort_dir: 'asc',
        });
        if (!cancelled) {
          setPartners(Array.isArray(result?.items) ? result.items : []);
        }
      } catch (_e) {
        if (!cancelled) {
          setPartners([]);
          setPartnersError(t('priceLists.modal.partnersLoadError', 'Could not load partners.'));
        }
      } finally {
        if (!cancelled) setPartnersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const mapBackendFieldErrors = (fieldErrors = {}) => {
    const mapped = {};

    Object.entries(fieldErrors).forEach(([field, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : String(messages || '');

      if (field === 'origin_city' || field === 'destination_city' || field === 'stops') {
        // Duplicate/conflict messages should only show the form banner — not the
        // "Please add at least origin and destination" field hint.
        const isIdentityError = /already exists|conflict/i.test(message);
        if (!isIdentityError) mapped.stops = true;
        mapped.form = message;
        return;
      }

      if (field === 'effective_from' || field === 'effective_to') {
        mapped.dateOrder = true;
        mapped.form = message;
        return;
      }

      const priceMatch = field.match(/^pricing_rows\.(\d+)\.(.+)$/);
      if (priceMatch) {
        const index = Number(priceMatch[1]);
        const suffix = priceMatch[2];

        if (suffix === 'price_eur') {
          mapped[`amount_${index}`] = true;
        } else if (suffix === 'metric') {
          mapped[`metric_${index}`] = true;
        } else if (suffix.startsWith('metric_value')) {
          mapped[`metricValue_${index}`] = true;
        }
        mapped.form = mapped.form || message;
        return;
      }

      mapped.form = mapped.form || message;
    });

    return mapped;
  };

  const getErrorMessage = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    return fallback;
  };

  useEffect(() => {
    if (!open) {
      sourceLaneRef.current = null;
      setGoogleKm(null);
      return;
    }

    void loadGoogleMapsScript();

    if (lane) {
      if (mode === 'duplicate') {
        sourceLaneRef.current = JSON.parse(JSON.stringify(lane));
      } else {
        sourceLaneRef.current = null;
      }

      const loaded = (lane.stops || []).map((s) => normalizeLoadedLaneStop(s));
      setStops(loaded.length >= 2 ? loaded : [loaded[0] || null, loaded[1] || null]);
      setTripType(lane.tripType || (lane.isRoundTrip ? 'roundtrip' : 'direct'));
      setPricingRows(normalizeRowsFromLane(lane));
      setEffectiveFrom(lane.effectiveFrom || '');
      setEffectiveTo(lane.effectiveTo || '');
      setScopePartnerIds((lane.scopePartnerIds || []).map((id) => String(id)));
      setScopeDropdownOpen((lane.scopePartnerIds || []).length > 0);
      setScopeDirection(lane.scopeDirection || '');
      setNotes(lane.notes || '');
      setPartnerSearch('');
    } else {
      setStops([null, null]);
      setTripType('direct');
      setPricingRows([{ id: uid(), metric: 'load_any_size', amount: '', metricValue: defaultMetricValue('load_any_size') }]);
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
      setEffectiveTo('');
      setScopePartnerIds([]);
      setScopeDropdownOpen(false);
      setScopeDirection(role === 'forwarder' ? (forwarderTab === 'carrier' ? 'buy' : 'sell') : '');
      setNotes('');
      setPartnerSearch('');
    }

    setErrors({});
    setDupeWarn(false);
    setTruckPickerOpen({});
  }, [open, lane, role, forwarderTab, mode]);

  // Google Distance Matrix km when stop lat/lng or address is available
  useEffect(() => {
    let cancelled = false;
    const validStops = stops.filter((s) => isValidLaneStop(s));

    if (validStops.length < 2) {
      setGoogleKm(null);
      return undefined;
    }

    async function calculateGoogleKm() {
      if (typeof window === 'undefined' || !window.google?.maps?.DistanceMatrixService) {
        return;
      }

      try {
        let total = 0;
        const service = new window.google.maps.DistanceMatrixService();

        for (let i = 0; i < validStops.length - 1; i++) {
          const s1 = validStops[i];
          const s2 = validStops[i + 1];

          const orig = (s1.lat && s1.lng)
            ? new window.google.maps.LatLng(Number(s1.lat), Number(s1.lng))
            : (s1.address || s1.label || s1.city || s1.value);

          const dest = (s2.lat && s2.lng)
            ? new window.google.maps.LatLng(Number(s2.lat), Number(s2.lng))
            : (s2.address || s2.label || s2.city || s2.value);

          if (!orig || !dest) continue;

          const res = await new Promise((resolve) => {
            service.getDistanceMatrix(
              {
                origins: [orig],
                destinations: [dest],
                travelMode: window.google.maps.TravelMode.DRIVING,
                unitSystem: window.google.maps.UnitSystem.METRIC,
              },
              (response, status) => {
                if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
                  const m = response.rows[0].elements[0].distance.value;
                  resolve(Math.round(m / 1000));
                } else {
                  resolve(null);
                }
              },
            );
          });

          if (res) total += res;
        }

        if (!cancelled && total > 0) {
          setGoogleKm(total);
        }
      } catch {
        // Fallback to local Haversine / matrix via calculateRouteTotals
      }
    }

    setGoogleKm(null);
    void calculateGoogleKm();

    return () => {
      cancelled = true;
    };
  }, [stops]);

  const routeCalc = useMemo(() => {
    const validStops = stops.filter((s) => isValidLaneStop(s));
    if (validStops.length < 2) return null;

    const stopObjects = validStops.map((s) => sanitizeStopForSave(s));

    const baseCalc = calculateRouteTotals(stopObjects, tripType === 'roundtrip');
    if (googleKm && googleKm > 0) {
      return {
        ...baseCalc,
        totalKm: googleKm,
      };
    }
    return baseCalc;
  }, [stops, tripType, googleKm]);

  useEffect(() => {
    const validStops = stops.filter((s) => isValidLaneStop(s));
    if (!allLanes || validStops.length < 2) {
      setDupeWarn(false);
      return;
    }

    const first = validStops[0];
    const last = validStops[validStops.length - 1];
    if (!first || !last) {
      setDupeWarn(false);
      return;
    }

    const excludeId = lane?.id || lane?.duplicateSourceId || sourceLaneRef.current?.duplicateSourceId || sourceLaneRef.current?.id;
    const candidate = {
      stops: validStops,
      effectiveFrom: resolveConflictEffectiveFrom(effectiveFrom),
      effectiveTo: effectiveTo || null,
      scope: scopePartnerIds.length > 0 ? 'specific' : 'default',
      scopePartnerIds,
      scopeDirection: role === 'forwarder' && scopePartnerIds.length > 0 && scopeDirection ? scopeDirection : null,
    };
    const conflict = findLaneConflict(candidate, allLanes, { excludeId });
    setDupeWarn(Boolean(conflict));
  }, [stops, allLanes, lane, effectiveFrom, effectiveTo, scopePartnerIds, scopeDirection, role]);

  const toggleSection = (key) => setSections((p) => ({ ...p, [key]: !p[key] }));

  const addStop = () => { if (stops.length < 10) setStops((p) => [...p, null]); };
  const removeStop = (idx) => { if (stops.length > 2) setStops((p) => p.filter((_, i) => i !== idx)); };

  const setStopAtIndex = useCallback((idx, stop) => {
    setStops((p) => p.map((s, i) => (i === idx ? stop : s)));
  }, []);

  const addPricingRow = () => {
    if (pricingRows.length >= METRICS.length) return;
    const metric = 'load_any_size';
    setPricingRows((p) => [...p, { id: uid(), metric, amount: '', metricValue: defaultMetricValue(metric) }]);
  };

  const removePricingRow = (rowId) => setPricingRows((p) => p.filter((r) => r.id !== rowId));

  const updatePricingRow = (rowId, patch) => setPricingRows((p) => p.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));

  const updateRowMetric = (rowId, metric) => {
    updatePricingRow(rowId, { metric, metricValue: defaultMetricValue(metric) });
  };

  const scrollContainerRef = useRef(null);

  const scrollToFirstError = useCallback(() => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const errorEl = scrollContainerRef.current.querySelector('.error-msg, [data-error="true"]');
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }, 80);
  }, []);

  const handleSave = useCallback(async () => {
    const errs = {};
    const displayableStops = stops.filter((s) => isDisplayableLaneStop(s));

    if (displayableStops.length < 2) errs.stops = true;
    if (stops.some((s) => s && isLegacyLaneStop(s))) errs.stops = true;
    if (displayableStops.length >= 2 && stopsAreSamePlace(displayableStops[0], displayableStops[displayableStops.length - 1])) {
      errs.sameCity = true;
    }

    if (pricingRows.length === 0) errs.pricingRows = true;

    pricingRows.forEach((row, idx) => {
      const amount = Number(row.amount || 0);
      if (!amount || amount <= 0) errs[`amount_${idx}`] = 'required';
      else if (!isPriceWithinLimit(row.amount)) errs[`amount_${idx}`] = 'tooLong';
      if (!isMetricValueValid(row.metric, row.metricValue)) errs[`metricValue_${idx}`] = true;
    });

    if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) errs.dateOrder = true;

    if (dupeWarn) {
      errs.form = t(
        'priceLists.phase2.validation.conflictWarn',
        'An active lane already overlaps this route, validity window, and partner scope.',
      );
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setSections((prev) => ({
        ...prev,
        route: Boolean(errs.stops || errs.sameCity) || prev.route,
        pricing: Boolean(errs.pricingRows || Object.keys(errs).some((k) => k.startsWith('amount_') || k.startsWith('metricValue_'))) || prev.pricing,
        validity: Boolean(errs.dateOrder) || prev.validity,
      }));
      scrollToFirstError();
      return;
    }

    const stopsForStorage = displayableStops.map((s) => {
      const sanitized = sanitizeStopForSave(s);
      const cityKey = sanitized.city || sanitized.value;
      const cityResolved = resolveCity(cityKey) || cityKey;
      return {
        ...sanitized,
        city: cityResolved,
        value: sanitized.value || cityResolved,
        label: sanitized.label || cityResolved,
      };
    });

    const routeLabel = stopsForStorage.map((s) => s.label || s.city).join(tripType === 'roundtrip' ? ' ↔ ' : ' → ');
    const pricing = toLegacyPricing(pricingRows);
    const totalKmDirect = routeCalc?.totalKm || 0;
    const totalKmEffective = tripType === 'roundtrip' ? totalKmDirect * 2 : totalKmDirect;

    const entry = {
      stops: stopsForStorage,
      isRoundTrip: tripType === 'roundtrip',
      tripType,
      routeLabel,
      totalKm: totalKmEffective,
      totalKmDirect,
      totalKmEffective,
      legs: routeCalc?.legs || [],
      pricing,
      pricingRows: pricingRows.map((row) => ({
        metric: row.metric,
        priceEur: Number(row.amount || 0),
        metricValue: row.metricValue || {},
      })),
      vehicleRates: null,
      weightBreaks: null,
      laneCosts: null,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      scope: scopePartnerIds.length > 0 ? 'specific' : 'default',
      scopePartnerIds,
      scopeLabel: scopePartnerIds.length > 0
        ? scopePartnerIds.map((id) => partnerNameById.get(String(id)) || String(id)).join(', ')
        : t('priceLists.scope.default', 'Default'),
      scopeDirection: role === 'forwarder' && scopePartnerIds.length > 0 && scopeDirection ? scopeDirection : null,
      notes,
    };

    if (mode === 'duplicate' && sourceLaneRef.current) {
      const sourceFingerprint = buildLaneFingerprint(sourceLaneRef.current);
      const entryFingerprint = buildLaneFingerprintFromEntry(entry);
      if (sourceFingerprint === entryFingerprint) {
        setErrors({
          form: t('priceLists.phase2.validation.exactDuplicate', 'Change at least one field before saving this duplicate lane.'),
        });
        scrollToFirstError();
        return;
      }
    }

    try {
      setErrors({});
      await onSave(entry, mode === 'edit' ? lane?.id : undefined);
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = mapBackendFieldErrors(error.fieldErrors || {});
        if (error.status === 409) {
          mapped.form = t('priceLists.modal.conflictOverlap', 'A conflicting lane already exists for this route, scope, and validity window.');
        }
        setErrors((prev) => ({ ...prev, ...mapped }));
        scrollToFirstError();
        return;
      }

      setErrors((prev) => ({
        ...prev,
        form: t('genericError', 'Something went wrong'),
      }));
      scrollToFirstError();
    }
  }, [stops, pricingRows, effectiveFrom, effectiveTo, routeCalc, tripType, scopePartnerIds, scopeDirection, notes, role, onSave, lane, mode, mapBackendFieldErrors, getErrorMessage, scrollToFirstError, t, partnerNameById, dupeWarn]);
  if (!open) return null;

  const inputStyle = {
    fontSize: 13,
    padding: '7px 10px',
    borderRadius: 8,
    border: `1px solid ${T.bd}`,
    background: T.sf,
    color: T.t1,
    outline: 'none',
    width: '100%',
  };

  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.t2, marginBottom: 4, display: 'block' };
  const errorStyle = { color: '#DC2626', fontSize: 11, marginTop: 4, lineHeight: 1.4 };

  const sectionBtn = (key, label) => (
    <button
      onClick={() => toggleSection(key)}
      className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer border-none"
      style={{ background: 'transparent', color: T.t1, fontSize: 13, fontWeight: 600 }}
    >
      {label}
      {sections[key] ? <ChevronUp size={14} style={{ color: T.t3 }} /> : <ChevronDown size={14} style={{ color: T.t3 }} />}
    </button>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[760px] max-h-[88vh] flex flex-col rounded-2xl shadow-2xl" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
            {mode === 'edit'
              ? t('priceLists.modal.edit', 'Edit Lane')
              : mode === 'duplicate'
                ? t('priceLists.modal.duplicate', 'Duplicate Lane')
                : t('priceLists.modal.add', 'Add Lane')}
          </h3>
          <button onClick={onClose} className="p-1 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}>
            <X size={16} />
          </button>
        </div>

        {!!errors.form && (
          <div className="px-6 pt-4 error-msg" data-error="true">
            <div className="rounded-lg px-3 py-2" style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 12, fontWeight: 600 }}>
              {getErrorMessage(errors.form, t('genericError', 'Something went wrong'))}
            </div>
          </div>
        )}

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {sectionBtn('route', t('priceLists.modal.route', 'Route'))}
          {sections.route && (
            <div className="px-6 pb-4 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-md border-none cursor-pointer ${tripType === 'direct' ? 'text-white' : ''}`}
                  style={{ background: tripType === 'direct' ? T.ac : T.bg, color: tripType === 'direct' ? '#fff' : T.t1, fontSize: 12, fontWeight: 600 }}
                  onClick={() => setTripType('direct')}
                >
                  {t('directTrip', 'Direct Trip')}
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-md border-none cursor-pointer ${tripType === 'roundtrip' ? 'text-white' : ''}`}
                  style={{ background: tripType === 'roundtrip' ? T.ac : T.bg, color: tripType === 'roundtrip' ? '#fff' : T.t1, fontSize: 12, fontWeight: 600 }}
                  onClick={() => setTripType('roundtrip')}
                >
                  {t('priceLists.modal.roundTrip', 'Round trip')}
                </button>
              </div>

              {stops.map((stop, idx) => {
                const stopLabel = idx === 0
                  ? t('priceLists.modal.origin', 'Origin')
                  : idx === stops.length - 1
                    ? t('priceLists.modal.destination', 'Destination')
                    : t('priceLists.modal.stopN', 'Stop {{n}}').replace('{{n}}', String(idx));

                return (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <LanePlacePicker
                        key={`${mode}-${lane?.apiId ?? 'new'}-${idx}`}
                        label={stopLabel}
                        value={stop}
                        onChange={(next) => setStopAtIndex(idx, next)}
                        invalid={Boolean(
                          (errors.stops && !isDisplayableLaneStop(stop))
                          || (stop && isLegacyLaneStop(stop)),
                        )}
                      />
                    </div>
                    {idx > 0 && idx < stops.length - 1 && (
                      <button type="button" className="mt-5 p-2 rounded-md border-none cursor-pointer" style={{ background: '#FEE2E2', color: '#B91C1C' }} onClick={() => removeStop(idx)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              <button type="button" onClick={addStop} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border-none cursor-pointer" style={{ background: T.bg, color: T.ac, fontSize: 12, fontWeight: 600 }}>
                <Plus size={13} /> {t('priceLists.modal.addStop', 'Add stop')}
              </button>

              {!!errors.stops && <div className="error-msg" data-error="true" style={errorStyle}>{t('priceLists.phase2.validation.addAtLeastTwoStops', 'Please add at least origin and destination.')}</div>}
              {!!errors.sameCity && <div className="error-msg" data-error="true" style={errorStyle}>{t('priceLists.modal.sameCity', 'Origin and destination must be different')}</div>}

              {dupeWarn && (
                <div className="flex items-center gap-2 p-2 rounded-lg error-msg" data-error="true" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11 }}>
                  <AlertTriangle size={14} />
                  {t('priceLists.phase2.validation.conflictWarn', 'An active lane already overlaps this route, validity window, and partner scope.')}
                </div>
              )}

              {routeCalc && (
                <div className="p-3 rounded-lg" style={{ background: T.bg, border: `1px solid ${T.bd}`, fontSize: 12 }}>
                  <div style={{ color: T.t1, fontWeight: 600 }}>{routeCalc.routeLabel}</div>
                  <div style={{ color: T.t2, marginTop: 3 }}>
                    {t('priceLists.phase2.km.direct', 'Direct km')}: {routeCalc.totalKm || 0} · {t('priceLists.phase2.km.effective', 'Effective km')}: {tripType === 'roundtrip' ? (routeCalc.totalKm || 0) * 2 : (routeCalc.totalKm || 0)}
                  </div>
                </div>
              )}
            </div>
          )}

          {sectionBtn('pricing', t('priceLists.modal.pricing', 'Pricing'))}
          {sections.pricing && (
            <div className="px-6 pb-4 space-y-3">
              {pricingRows.map((row, idx) => {
                const rowErr = errors[`amount_${idx}`] || errors[`metricValue_${idx}`];

                return (
                  <div key={row.id} className={`p-3 rounded-lg ${rowErr ? 'error-msg' : ''}`} data-error={rowErr ? 'true' : undefined} style={{ border: `1px solid ${rowErr ? '#FCA5A5' : T.bd}`, background: T.bg }}>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <label style={labelStyle}>
                          {t('priceLists.phase2.priceEur', 'Price (EUR)')} <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          style={{
                            ...inputStyle,
                            borderColor: errors[`amount_${idx}`] ? '#EF4444' : T.bd,
                          }}
                          type="number"
                          min="0"
                          max={MAX_PRICE_VALUE}
                          step="0.01"
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(e) => {
                            const next = clampPriceInput(e.target.value);
                            if (next === null) return;
                            updatePricingRow(row.id, { amount: next });
                          }}
                          onKeyDown={(e) => {
                            // Block scientific notation / signs that bypass digit limits
                            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                          }}
                        />
                        {!!errors[`amount_${idx}`] && (
                          <div className="error-msg" data-error="true" style={errorStyle}>
                            {errors[`amount_${idx}`] === 'tooLong'
                              ? t('priceLists.phase2.validation.priceMaxDigits', {
                                defaultValue: `Price cannot exceed ${MAX_PRICE_DIGITS} digits (max ${MAX_PRICE_VALUE.toLocaleString('en-US')}).`,
                                max: MAX_PRICE_DIGITS,
                                maxValue: MAX_PRICE_VALUE,
                              })
                              : t('priceLists.phase2.validation.priceRequired', 'Enter a valid EUR amount for this row.')}
                          </div>
                        )}
                      </div>
                      <div className="col-span-4">
                        <label style={labelStyle}>
                          {t('priceLists.phase2.pricingMetric', 'Pricing metric')} <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <SearchableSelect
                          options={METRICS.map((m) => ({
                            value: m.key,
                            label: metricLabel(m.key),
                          }))}
                          value={row.metric}
                          onChange={(next) => updateRowMetric(row.id, next)}
                          searchable={false}
                          menuFixed
                          direction="auto"
                          hasError={Boolean(errors[`metric_${idx}`])}
                        />
                      </div>
                      <div className="col-span-4">
                        <label style={labelStyle}>
                          {t('priceLists.phase2.metricValue', 'Metric value')} <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        {row.metric === 'weight' && (
                          <SearchableSelect
                            options={WEIGHT_UNIT_OPTIONS}
                            value={row.metricValue?.unit || 'kg'}
                            onChange={(next) => updatePricingRow(row.id, { metricValue: { ...row.metricValue, unit: next } })}
                            searchable={false}
                            menuFixed
                            direction="auto"
                            hasError={Boolean(errors[`metricValue_${idx}`])}
                          />
                        )}
                        {row.metric === 'unit_transport' && (
                          <SearchableSelect
                            options={UNIT_TRANSPORT_OPTIONS.map((opt) => ({
                              value: opt.value,
                              label: unitLabel(opt.value),
                            }))}
                            value={row.metricValue?.type || 'eur_pallet'}
                            onChange={(next) => updatePricingRow(row.id, { metricValue: { ...row.metricValue, type: next } })}
                            searchable={false}
                            menuFixed
                            direction="auto"
                            hasError={Boolean(errors[`metricValue_${idx}`])}
                          />
                        )}
                        {row.metric === 'load_any_size' && (
                          <div className="h-[34px] px-3 flex items-center rounded-md" style={{ border: `1px solid ${T.bd}`, color: T.t2, background: T.sf, fontSize: 12 }}>
                            {t('priceLists.phase2.perLoad', 'Per load')}
                          </div>
                        )}
                        {row.metric === 'ftl_truck_type' && (
                          <div
                            className="min-h-[34px] px-3 py-1.5 flex items-center rounded-md"
                            style={{ border: `1px solid ${T.bd}`, color: T.t2, background: T.sf, fontSize: 12, lineHeight: 1.35 }}
                            title={row.metricValue?.vehicle_type || undefined}
                          >
                            {row.metricValue?.vehicle_type || t('priceLists.phase2.vehicleTypeSummary', 'Vehicle type summary')}
                          </div>
                        )}
                        {!!errors[`metricValue_${idx}`] && <div className="error-msg" data-error="true" style={errorStyle}>{t('priceLists.phase2.validation.metricValueRequired', 'Choose a valid value for this metric.')}</div>}
                      </div>
                      <div className="col-span-1 flex items-end justify-end">
                        <button
                          type="button"
                          className="p-2 rounded-md border-none cursor-pointer"
                          style={{ background: '#FEE2E2', color: '#B91C1C' }}
                          disabled={pricingRows.length === 1}
                          onClick={() => removePricingRow(row.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {row.metric === 'ftl_truck_type' && (
                      <div className="mt-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${errors[`metricValue_${idx}`] ? '#EF4444' : T.bd}` }}>
                        <button
                          type="button"
                          onClick={() => setTruckPickerOpen((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                          className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer border-none"
                          style={{ background: T.bg, color: T.t1, fontSize: 12, fontWeight: 600 }}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span>{t('priceLists.phase2.truckTypeSelection', 'Truck type selection')}</span>
                            {row.metricValue?.vehicle_type && (
                              <span className="truncate" style={{ fontWeight: 500, color: T.t3, fontSize: 11 }}>
                                {row.metricValue.vehicle_type}
                              </span>
                            )}
                          </span>
                          {(truckPickerOpen[row.id] || errors[`metricValue_${idx}`]) ? (
                            <ChevronUp size={14} style={{ color: T.t3, flexShrink: 0 }} />
                          ) : (
                            <ChevronDown size={14} style={{ color: T.t3, flexShrink: 0 }} />
                          )}
                        </button>
                        {(truckPickerOpen[row.id] || errors[`metricValue_${idx}`]) && (
                          <div className="p-3" style={{ borderTop: `1px solid ${T.bd}`, background: T.sf }}>
                            <SearchVehicleCargoPicker
                              t={(k) => t(k)}
                              vehicleSpecs={row.metricValue?.vehicle_specs || {}}
                              truckTypeIds={row.metricValue?.truck_type_ids || []}
                              onChange={(next) => {
                                updatePricingRow(row.id, {
                                  metricValue: {
                                    ...row.metricValue,
                                    vehicle_type: next.vehicleType,
                                    truck_type_ids: next.truckTypeIds,
                                    vehicle_specs: next.vehicleSpecs,
                                  },
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border-none cursor-pointer"
                style={{ background: T.bg, color: T.ac, fontSize: 12, fontWeight: 600 }}
                onClick={addPricingRow}
                disabled={pricingRows.length >= METRICS.length}
              >
                <Plus size={13} /> {t('priceLists.phase2.addPricingRow', 'Add pricing row')}
              </button>
            </div>
          )}

          {sectionBtn('validity', t('priceLists.modal.validity', 'Validity & Scope'))}
          {sections.validity && (
            <div className="px-6 pb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>{t('priceLists.modal.effectiveFrom', 'Effective from')}</label>
                  <DatePicker
                    value={effectiveFrom}
                    onChange={setEffectiveFrom}
                    hasError={Boolean(errors.dateOrder)}
                    direction="auto"
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('priceLists.modal.effectiveTo', 'Effective to')}</label>
                  <DatePicker
                    value={effectiveTo}
                    onChange={setEffectiveTo}
                    min={effectiveFrom || undefined}
                    hasError={Boolean(errors.dateOrder)}
                    direction="auto"
                  />
                </div>
              </div>
              {!!errors.dateOrder && <div className="error-msg" data-error="true" style={errorStyle}>{t('priceLists.modal.dateError', 'End date must be after start date')}</div>}

              <div>
                <label style={labelStyle}>{t('priceLists.modal.scope', 'Scope')}</label>

                {scopePartnerIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {scopePartnerIds.map((pid) => (
                      <span
                        key={pid}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ fontSize: 11, background: T.al, color: T.ac, border: `1px solid ${T.ac}` }}
                      >
                        {partnerNameById.get(String(pid)) || pid}
                        <button
                          type="button"
                          onClick={() => setScopePartnerIds((prev) => prev.filter((id) => id !== pid))}
                          className="border-none cursor-pointer bg-transparent p-0"
                          style={{ color: T.ac }}
                          aria-label={t('common.remove', 'Remove')}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 12, color: T.t2 }}>
                    <input
                      type="radio"
                      name="lane-scope-mode"
                      checked={!scopeIsSpecific}
                      onChange={() => {
                        setScopePartnerIds([]);
                        setScopeDropdownOpen(false);
                      }}
                    />
                    {defaultScopeLabel}
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 12, color: T.t2 }}>
                    <input
                      type="radio"
                      name="lane-scope-mode"
                      checked={scopeIsSpecific}
                      onChange={() => setScopeDropdownOpen(true)}
                    />
                    {t('priceLists.modal.specificPartners', 'Specific partners')}
                  </label>
                </div>

                {scopeIsSpecific && (
                  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.bd}`, maxHeight: 220 }}>
                    <div className="relative px-2 py-1.5" style={{ borderBottom: `1px solid ${T.bd}` }}>
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
                      <input
                        type="search"
                        value={partnerSearch}
                        onChange={(e) => setPartnerSearch(e.target.value)}
                        placeholder={t('priceLists.modal.searchPartners', 'Search partners…')}
                        className="w-full pl-6 pr-2 py-1 outline-none border-none"
                        style={{ background: 'transparent', fontSize: 11, color: T.t1 }}
                      />
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 170 }}>
                      {partnersLoading && (
                        <div className="px-3 py-4 text-center" style={{ fontSize: 11, color: T.t3 }}>
                          {t('common.loading', 'Loading…')}
                        </div>
                      )}
                      {!partnersLoading && partnersError && (
                        <div className="px-3 py-4 text-center" style={{ fontSize: 11, color: '#B91C1C' }}>
                          {partnersError}
                        </div>
                      )}
                      {!partnersLoading && !partnersError && partnerOptions.length === 0 && (
                        <div className="px-3 py-4 text-center" style={{ fontSize: 11, color: T.t3 }}>
                          {partnerSearch.trim()
                            ? t('priceLists.modal.noPartnersMatch', 'No partners match your search.')
                            : t('priceLists.modal.noPartners', 'No active partners found.')}
                        </div>
                      )}
                      {!partnersLoading && partnerOptions.map((p) => {
                        const pid = String(p.id);
                        const checked = scopePartnerIds.includes(pid);
                        const typeBadge = partnerTypeBadge(p);
                        return (
                          <button
                            key={pid}
                            type="button"
                            className="flex items-center gap-2 w-full px-3 py-1.5 cursor-pointer border-none text-left"
                            style={{ background: checked ? T.al : 'transparent', fontSize: 11, color: T.t1 }}
                            onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = T.sh; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = checked ? T.al : 'transparent'; }}
                            onClick={() => {
                              setScopePartnerIds((prev) => (
                                checked ? prev.filter((x) => x !== pid) : [...prev, pid]
                              ));
                            }}
                          >
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3,
                                border: `1.5px solid ${checked ? T.ac : T.bd}`,
                                background: checked ? T.ac : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {checked && <Check size={9} style={{ color: '#fff' }} />}
                            </span>
                            <span className="flex-1 truncate" title={p.name}>{p.name}</span>
                            {typeBadge && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: typeBadge.bg,
                                  color: typeBadge.fg,
                                  border: `1px solid ${typeBadge.bd}`,
                                  flexShrink: 0,
                                }}
                              >
                                {typeBadge.label}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {role === 'forwarder' && scopePartnerIds.length > 0 && (
                <div>
                  <label style={labelStyle}>{t('priceLists.modal.direction', 'Direction')}</label>
                  <SearchableSelect
                    options={[
                      { value: '', label: t('priceLists.modal.noDirection', 'No direction') },
                      { value: 'buy', label: t('priceLists.modal.buy', 'Buy (from carrier)') },
                      { value: 'sell', label: t('priceLists.modal.sell', 'Sell (to customer)') },
                    ]}
                    value={scopeDirection}
                    onChange={setScopeDirection}
                    searchable={false}
                    menuFixed
                    direction="auto"
                  />
                </div>
              )}

              <div>
                <label style={labelStyle}>{t('priceLists.detail.notes', 'Notes')}</label>
                <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button disabled={isSaving} onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: T.bg, color: T.t2, fontSize: 13, fontWeight: 500 }}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button disabled={isSaving || dupeWarn} onClick={handleSave} className="px-4 py-2 rounded-lg cursor-pointer border-none text-white disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: T.ac, fontSize: 13, fontWeight: 600 }}>
            {isSaving
              ? t('common.saving', 'Saving...')
              : mode === 'duplicate'
                ? t('common.create', 'Create')
                : mode === 'edit'
                  ? t('common.update', 'Update')
                  : t('common.create', 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}
