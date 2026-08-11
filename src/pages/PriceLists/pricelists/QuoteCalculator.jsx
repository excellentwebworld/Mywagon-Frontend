/**
 * QuoteCalculator — lane-based quote tool.
 * Origin/destination pickers use saved lane library (not free Google search).
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { X, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useVehicleTypes } from '../../../hooks/useVehicleTypes';
import { resolveCity, getDistance } from '../../../mocks/priceListsData';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import {
  normalizeLoadedLaneStop,
  stopMatchesPlace,
  stopsAreSamePlace,
} from './mapGooglePlaceToLaneStop';
import {
  formatMetricLabel,
  formatMetricValueLabel,
  resolveLanePricingRows,
} from '../../../api/utils/laneMetricDisplay';

function stopKey(stop) {
  if (!stop) return '';
  const placeId = stop.place_id ?? stop.placeId;
  if (placeId) return `pid:${placeId}`;
  if (stop.lat != null && stop.lng != null) return `coord:${stop.lat},${stop.lng}`;
  return `city:${String(stop.city || stop.value || stop.label || '').trim().toLowerCase()}`;
}

function stopLabel(stop) {
  if (!stop) return '';
  return String(stop.label || stop.city || stop.value || '').trim();
}

function stopSublabel(stop) {
  const label = stopLabel(stop);
  const city = String(stop?.city || '').trim();
  if (city && city !== label) return city;
  return undefined;
}

function isCalculatorEndpoint(stop) {
  return Boolean(String(stop?.city || stop?.value || stop?.label || '').trim());
}

function collectFtlVehicleNames(lanes) {
  const names = new Set();
  (lanes || []).forEach((lane) => {
    resolveLanePricingRows(lane).forEach((row) => {
      if (row.metric !== 'ftl_truck_type') return;
      const raw = String(row.metricValue?.vehicle_type || '').trim();
      if (!raw) return;
      raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => names.add(name));
    });
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function evaluateRow(row, { pallets, weight, vehicleType }) {
  if (!row || !row.metric || Number(row.priceEur) <= 0) return null;
  const basePrice = Number(row.priceEur);
  const metric = String(row.metric);
  const metricVal = row.metricValue || {};

  const numPallets = Number(pallets);
  const hasPallets = !isNaN(numPallets) && numPallets > 0;
  const numWeightTons = Number(weight);
  const hasWeight = !isNaN(numWeightTons) && numWeightTons > 0;
  const selectedVt = String(vehicleType || '').trim().toLowerCase();

  if (metric === 'ftl_truck_type') {
    const laneVt = String(metricVal.vehicle_type || '').trim().toLowerCase();
    const laneVtList = laneVt.split(',').map((s) => s.trim()).filter(Boolean);

    let score = 20;
    if (selectedVt) {
      if (laneVt === selectedVt || laneVtList.includes(selectedVt)) {
        score = 100;
      } else {
        score = 5;
      }
    } else if (laneVt) {
      score = 40;
    }

    return {
      score,
      price: basePrice,
      unit: 'load',
      matchedMetric: metric,
      matchedValue: metricVal.vehicle_type || vehicleType || 'FTL Truck',
    };
  }

  if (metric === 'unit_transport') {
    const palletQty = hasPallets ? numPallets : 1;
    const score = hasPallets ? 90 : 15;
    return {
      score,
      price: basePrice * palletQty,
      unit: palletQty > 1 ? 'pallets' : 'pallet',
      matchedMetric: metric,
      matchedValue: metricVal.type || 'eur_pallet',
    };
  }

  if (metric === 'weight') {
    const isKg = metricVal.unit === 'kg';
    const weightTons = hasWeight ? numWeightTons : 1;
    const price = isKg ? basePrice * (weightTons * 1000) : basePrice * weightTons;
    const score = hasWeight ? 80 : 15;
    return {
      score,
      price,
      unit: isKg ? 'kg' : 'ton',
      matchedMetric: metric,
      matchedValue: metricVal.unit || 'ton',
    };
  }

  if (metric === 'load_any_size') {
    return {
      score: 30,
      price: basePrice,
      unit: 'load',
      matchedMetric: metric,
      matchedValue: metricVal.type || 'per_load',
    };
  }

  return {
    score: 10,
    price: basePrice,
    unit: 'load',
    matchedMetric: metric,
    matchedValue: 'custom',
  };
}

function formatEur(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '€0.00';
  return `€${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateShort(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function metricApplicability(row, { pallets, weight, vehicleType }) {
  if (!row) return { applicable: false, reason: '—' };
  if (row.metric === 'ftl_truck_type') {
    if (!vehicleType) return { applicable: false, reason: 'noVehicle' };
    const vt = String(row.metricValue?.vehicle_type || '');
    const match = vt === vehicleType || vt.split(',').map((s) => s.trim()).includes(vehicleType);
    return { applicable: match, reason: match ? 'vehicleMatch' : 'vehicleMismatch' };
  }
  if (row.metric === 'unit_transport') {
    const qty = Number(pallets || 0);
    return qty > 0
      ? { applicable: true, reason: 'palletsEntered' }
      : { applicable: false, reason: 'noPallets' };
  }
  if (row.metric === 'weight') {
    const qty = Number(weight || 0);
    return qty > 0
      ? { applicable: true, reason: 'weightEntered' }
      : { applicable: false, reason: 'noWeight' };
  }
  if (row.metric === 'load_any_size') {
    return { applicable: true, reason: 'perLoadFallback' };
  }
  return { applicable: false, reason: 'unsupported' };
}

function selectionReasonKey(reason) {
  const map = {
    vehicleMatch: 'priceLists.calculator.reasonVehicle',
    palletsEntered: 'priceLists.calculator.reasonPallets',
    weightEntered: 'priceLists.calculator.reasonWeight',
    perLoadFallback: 'priceLists.calculator.reasonPerLoad',
  };
  return map[reason] || 'priceLists.calculator.reasonDefault';
}

function priceFromPricingRows(lane, inputs, t) {
  const { pallets, weight, vehicleType } = inputs;
  const rows = resolveLanePricingRows(lane);
  if (!rows || rows.length === 0) return null;

  const scored = rows
    .map((row) => ({ row, eval: evaluateRow(row, { pallets, weight, vehicleType }) }))
    .filter((item) => item.eval);
  if (scored.length === 0) return null;

  scored.sort((a, b) => b.eval.score - a.eval.score);
  const selected = scored[0].row;

  const unitRate = Number(selected.priceEur || 0);
  const metricLabel = formatMetricLabel(selected.metric, t);
  const valueLabel = formatMetricValueLabel(selected.metric, selected.metricValue, t);
  let price = unitRate;
  let quantity = null;
  let quantityUnit = '';
  let formula = '';
  let unit = 'load';

  if (selected.metric === 'ftl_truck_type') {
    unit = 'load';
    quantity = 1;
    quantityUnit = t('priceLists.calculator.oneLoad', '1 load');
    formula = `${formatEur(unitRate)} × ${quantityUnit}`;
  } else if (selected.metric === 'unit_transport') {
    const qty = Number(pallets || 0);
    unit = valueLabel;
    quantity = qty;
    quantityUnit = `${qty} ${valueLabel}`;
    price = unitRate * qty;
    formula = `${formatEur(unitRate)} × ${qty} ${valueLabel}`;
  } else if (selected.metric === 'weight') {
    const qtyTonnes = Number(weight || 0);
    const isKgRate = selected.metricValue?.unit === 'kg';
    unit = isKgRate ? 'kg' : 'ton';
    if (isKgRate) {
      const kg = qtyTonnes * 1000;
      quantity = kg;
      quantityUnit = `${qtyTonnes} t (${kg.toLocaleString()} kg)`;
      price = unitRate * kg;
      formula = `${formatEur(unitRate)}/kg × ${kg.toLocaleString()} kg`;
    } else {
      quantity = qtyTonnes;
      quantityUnit = `${qtyTonnes} t`;
      price = unitRate * qtyTonnes;
      formula = `${formatEur(unitRate)}/t × ${qtyTonnes} t`;
    }
  } else {
    unit = valueLabel;
    quantity = 1;
    quantityUnit = t('priceLists.calculator.oneLoad', '1 load');
    formula = `${formatEur(unitRate)} ${valueLabel}`;
  }

  const selectedApplicability = metricApplicability(selected, inputs);

  const allLaneRates = rows.map((row) => {
    const { applicable, reason } = metricApplicability(row, inputs);
    return {
      metric: row.metric,
      metricLabel: formatMetricLabel(row.metric, t),
      valueLabel: formatMetricValueLabel(row.metric, row.metricValue, t),
      rateEur: Number(row.priceEur || 0),
      selected: row === selected,
      applicable,
      reason,
    };
  });

  return {
    price,
    unit,
    unitRate,
    quantity,
    quantityUnit,
    formula,
    matchedMetric: selected.metric,
    matchedValue: selected.metricValue?.vehicle_type
      || selected.metricValue?.type
      || selected.metricValue?.unit
      || 'per_load',
    matchedMetricLabel: metricLabel,
    matchedValueLabel: valueLabel,
    selectionReason: selectedApplicability.reason,
    allLaneRates,
  };
}

function distinctEndpointStops(lanes, endpoint) {
  const out = [];
  (lanes || []).forEach((lane) => {
    const stops = lane?.stops || [];
    if (stops.length < 2) return;

    const first = normalizeLoadedLaneStop(stops[0]);
    const last = normalizeLoadedLaneStop(stops[stops.length - 1]);
    const isRound = Boolean(lane.isRoundTrip || lane.tripType === 'roundtrip');

    if (endpoint === 'origin') {
      if (isCalculatorEndpoint(first) && !out.some((s) => stopsAreSamePlace(s, first))) {
        out.push(first);
      }
      if (isRound && isCalculatorEndpoint(last) && !out.some((s) => stopsAreSamePlace(s, last))) {
        out.push(last);
      }
    } else {
      if (isCalculatorEndpoint(last) && !out.some((s) => stopsAreSamePlace(s, last))) {
        out.push(last);
      }
      if (isRound && isCalculatorEndpoint(first) && !out.some((s) => stopsAreSamePlace(s, first))) {
        out.push(first);
      }
    }
  });
  return out.sort((a, b) => stopLabel(a).localeCompare(stopLabel(b), undefined, { sensitivity: 'base' }));
}

function buildRoutePresets(lanes) {
  const seen = new Set();
  const out = [];
  (lanes || []).forEach((lane) => {
    const stops = lane?.stops || [];
    if (stops.length < 2) return;
    const origin = normalizeLoadedLaneStop(stops[0]);
    const destination = normalizeLoadedLaneStop(stops[stops.length - 1]);
    if (!isCalculatorEndpoint(origin) || !isCalculatorEndpoint(destination)) return;

    const key = `${stopKey(origin)}|${stopKey(destination)}|${lane.tripType || (lane.isRoundTrip ? 'roundtrip' : 'direct')}`;
    if (seen.has(key)) return;
    seen.add(key);

    const arrow = lane.isRoundTrip || lane.tripType === 'roundtrip' ? ' ↔ ' : ' → ';
    out.push({
      value: key,
      label: lane.routeLabel || `${stopLabel(origin)}${arrow}${stopLabel(destination)}`,
      origin,
      destination,
    });
  });
  return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export default function QuoteCalculator({ open, onClose, lanes }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { vehicleTypes, loading: vehicleTypesLoading } = useVehicleTypes();

  const [originStop, setOriginStop] = useState(null);
  const [destinationStop, setDestinationStop] = useState(null);
  const [routePresetKey, setRoutePresetKey] = useState('');
  const [pallets, setPallets] = useState('');
  const [weight, setWeight] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const activeLanes = useMemo(
    () => (Array.isArray(lanes) ? lanes.filter((l) => !l.status || l.status === 'active') : []),
    [lanes],
  );

  const routePresets = useMemo(() => buildRoutePresets(activeLanes), [activeLanes]);

  const originStops = useMemo(
    () => distinctEndpointStops(activeLanes, 'origin'),
    [activeLanes],
  );

  const destinationStops = useMemo(() => {
    if (!isCalculatorEndpoint(originStop)) {
      return [];
    }
    const picks = [];
    activeLanes.forEach((lane) => {
      const stops = lane?.stops || [];
      if (stops.length < 2) return;
      const first = normalizeLoadedLaneStop(stops[0]);
      const last = normalizeLoadedLaneStop(stops[stops.length - 1]);
      const isRound = Boolean(lane.isRoundTrip || lane.tripType === 'roundtrip');

      if (stopMatchesPlace(first, originStop)) {
        if (isCalculatorEndpoint(last) && !picks.some((s) => stopsAreSamePlace(s, last))) {
          picks.push(last);
        }
      } else if (isRound && stopMatchesPlace(last, originStop)) {
        if (isCalculatorEndpoint(first) && !picks.some((s) => stopsAreSamePlace(s, first))) {
          picks.push(first);
        }
      }
    });
    return picks.sort((a, b) => stopLabel(a).localeCompare(stopLabel(b), undefined, { sensitivity: 'base' }));
  }, [activeLanes, originStop]);

  const originOptions = useMemo(
    () => originStops.map((stop) => ({
      value: stopKey(stop),
      label: stopLabel(stop),
      sublabel: stopSublabel(stop),
    })),
    [originStops],
  );

  const destinationOptions = useMemo(
    () => destinationStops.map((stop) => ({
      value: stopKey(stop),
      label: stopLabel(stop),
      sublabel: stopSublabel(stop),
    })),
    [destinationStops],
  );

  const originByKey = useMemo(() => {
    const map = new Map();
    originStops.forEach((stop) => map.set(stopKey(stop), stop));
    return map;
  }, [originStops]);

  const destinationByKey = useMemo(() => {
    const map = new Map();
    destinationStops.forEach((stop) => map.set(stopKey(stop), stop));
    return map;
  }, [destinationStops]);

  const matchingOdLanes = useMemo(() => {
    if (!isCalculatorEndpoint(originStop) || !isCalculatorEndpoint(destinationStop)) return [];
    return activeLanes.filter((l) => {
      const stops = l.stops || [];
      if (stops.length < 2) return false;
      const o = normalizeLoadedLaneStop(stops[0]);
      const d = normalizeLoadedLaneStop(stops[stops.length - 1]);
      const directMatch = stopMatchesPlace(o, originStop) && stopMatchesPlace(d, destinationStop);
      const isRound = Boolean(l.isRoundTrip || l.tripType === 'roundtrip');
      const reverseMatch = isRound && stopMatchesPlace(d, originStop) && stopMatchesPlace(o, destinationStop);
      return directMatch || reverseMatch;
    });
  }, [originStop, destinationStop, activeLanes]);

  const vehicleOptions = useMemo(() => {
    const laneSource = matchingOdLanes.length > 0 ? matchingOdLanes : activeLanes;
    const fromLanes = collectFtlVehicleNames(laneSource);

    const fromCatalog = (vehicleTypes || [])
      .map((vt) => String(vt.name || '').trim())
      .filter(Boolean);

    const combined = Array.from(new Set([...fromLanes, ...fromCatalog]));
    return combined.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [matchingOdLanes, activeLanes, vehicleTypes]);

  useEffect(() => {
    if (!open) return;
    setOriginStop(null);
    setDestinationStop(null);
    setRoutePresetKey('');
    setPallets('');
    setWeight('');
    setVehicleType('');
    setResult(null);
    setExpanded(false);
  }, [open]);

  useEffect(() => {
    setResult(null);
    setDestinationStop((current) => {
      if (!isCalculatorEndpoint(originStop)) return null;
      if (!current) return null;
      const stillValid = destinationStops.some((s) => stopsAreSamePlace(s, current));
      return stillValid ? current : null;
    });
    if (!isCalculatorEndpoint(originStop)) {
      setRoutePresetKey('');
    }
  }, [originStop, destinationStops]);

  const handleRoutePreset = useCallback((key) => {
    setRoutePresetKey(key);
    const preset = routePresets.find((r) => r.value === key);
    if (!preset) return;
    setOriginStop(preset.origin);
    setDestinationStop(preset.destination);
    setResult(null);
  }, [routePresets]);

  const calculate = useCallback(() => {
    if (!isCalculatorEndpoint(originStop) || !isCalculatorEndpoint(destinationStop)
      || stopsAreSamePlace(originStop, destinationStop)) {
      setResult({ error: 'invalid' });
      return;
    }

    const oCity = (originStop.city || originStop.value || '').trim();
    const dCity = (destinationStop.city || destinationStop.value || '').trim();
    const km = getDistance(resolveCity(oCity) || oCity, resolveCity(dCity) || dCity);

    const candidates = matchingOdLanes.length > 0
      ? matchingOdLanes
      : activeLanes.filter((l) => {
        const stops = l.stops || [];
        if (stops.length < 2) return false;
        const o = normalizeLoadedLaneStop(stops[0]);
        const d = normalizeLoadedLaneStop(stops[stops.length - 1]);
        const directMatch = stopMatchesPlace(o, originStop) && stopMatchesPlace(d, destinationStop);
        const isRound = Boolean(l.isRoundTrip || l.tripType === 'roundtrip');
        const reverseMatch = isRound && stopMatchesPlace(d, originStop) && stopMatchesPlace(o, destinationStop);
        return directMatch || reverseMatch;
      });

    const sorted = [...candidates].sort((a, b) => {
      if (a.scope !== 'default' && b.scope === 'default') return -1;
      if (a.scope === 'default' && b.scope !== 'default') return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const matched = sorted[0] || null;
    if (!matched) {
      setResult({ error: 'noMatch' });
      return;
    }

    const pricingFromRows = priceFromPricingRows(matched, { pallets, weight, vehicleType }, t);
    if (!pricingFromRows) {
      setResult({ error: 'noPricing' });
      return;
    }

    const price = Math.round(pricingFromRows.price * 100) / 100;
    setExpanded(true);
    setResult({
      type: 'match',
      lane: matched,
      km: matched.totalKm || km || 0,
      price,
      total: price,
      unit: pricingFromRows.unit,
      matchedMetric: pricingFromRows.matchedMetric,
      matchedMetricLabel: pricingFromRows.matchedMetricLabel,
      detail: pricingFromRows,
      inputs: {
        pallets: pallets ? Number(pallets) : null,
        weightTonnes: weight ? Number(weight) : null,
        vehicleType: vehicleType || null,
      },
    });
  }, [originStop, destinationStop, matchingOdLanes, pallets, weight, vehicleType, activeLanes, t]);

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
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.t2, marginBottom: 3, display: 'block' };
  const canCalculate = isCalculatorEndpoint(originStop) && isCalculatorEndpoint(destinationStop);
  const hasLibrary = activeLanes.length > 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-[520px] flex flex-col rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
            <Calculator size={18} style={{ color: T.ac }} />
            {t('priceLists.calculator.title', 'Quote Calculator')}
          </h3>
          <button onClick={onClose} className="p-1 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {!hasLibrary ? (
            <div
              className="rounded-lg px-3 py-3"
              style={{ background: T.bg, border: `1px solid ${T.bd}`, fontSize: 12, color: T.t2, lineHeight: 1.45 }}
            >
              {t(
                'priceLists.calculator.noLanesHint',
                'No active lanes in your library yet. Add lanes on the Price Lists page, then return here to calculate quotes.',
              )}
            </div>
          ) : (
            <>
              {routePresets.length > 0 && (
                <div>
                  <label style={labelStyle}>
                    {t('priceLists.calculator.savedRoute', 'Saved route')}
                  </label>
                  <SearchableSelect
                    options={routePresets}
                    value={routePresetKey}
                    onChange={handleRoutePreset}
                    placeholder={t('priceLists.calculator.pickSavedRoute', 'Pick a route from your lanes…')}
                    searchPlaceholder={t('priceLists.calculator.searchRoutes', 'Search routes…')}
                    menuFixed
                    direction="auto"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label style={labelStyle}>{t('priceLists.modal.origin', 'Pickup Location (Origin)')}</label>
                  <SearchableSelect
                    options={originOptions}
                    value={originStop ? stopKey(originStop) : ''}
                    onChange={(key) => {
                      setOriginStop(originByKey.get(key) || null);
                      setRoutePresetKey('');
                    }}
                    placeholder={t('priceLists.calculator.pickOrigin', 'Select pickup location from your lanes…')}
                    searchPlaceholder={t('priceLists.calculator.searchOrigin', 'Search origins…')}
                    menuFixed
                    direction="auto"
                    disabled={originOptions.length === 0}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('priceLists.modal.destination', 'Dropoff Location (Destination)')}</label>
                  <SearchableSelect
                    options={destinationOptions}
                    value={destinationStop ? stopKey(destinationStop) : ''}
                    onChange={(key) => {
                      setDestinationStop(destinationByKey.get(key) || null);
                      setRoutePresetKey('');
                      setResult(null);
                    }}
                    placeholder={
                      !isCalculatorEndpoint(originStop)
                        ? t('priceLists.calculator.pickOriginFirst', 'Select pickup location first…')
                        : t('priceLists.calculator.pickDestination', 'Select dropoff location for this pickup…')
                    }
                    searchPlaceholder={t('priceLists.calculator.searchDestination', 'Search destinations…')}
                    menuFixed
                    direction="auto"
                    disabled={!isCalculatorEndpoint(originStop) || destinationOptions.length === 0}
                  />
                  {isCalculatorEndpoint(originStop) && destinationOptions.length === 0 && (
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                      {t('priceLists.calculator.noDestForOrigin', 'No destination locations found for this pickup in your lane library.')}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>{t('priceLists.calculator.pallets', 'Pallets')}</label>
              <input type="number" min="0" value={pallets} onChange={(e) => setPallets(e.target.value)} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('priceLists.calculator.weight', 'Weight (t)')}</label>
              <input type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('priceLists.calculator.vehicle', 'Vehicle Type')}</label>
              <SearchableSelect
                options={[
                  { value: '', label: '—' },
                  ...vehicleOptions.map((v) => ({ value: v, label: v })),
                ]}
                value={vehicleType}
                onChange={setVehicleType}
                searchable={vehicleOptions.length > 8}
                menuFixed
                direction="auto"
                disabled={vehicleTypesLoading && vehicleOptions.length === 0}
                placeholder="—"
              />
            </div>
          </div>

          <button
            onClick={calculate}
            disabled={!canCalculate || !hasLibrary}
            className="w-full py-2.5 rounded-lg cursor-pointer border-none text-white"
            style={{ background: T.ac, fontSize: 13, fontWeight: 600, opacity: canCalculate && hasLibrary ? 1 : 0.55 }}
          >
            {t('priceLists.calculator.calculate', 'Calculate Quote')}
          </button>

          {result && (
            <div className="rounded-xl px-4 py-3 mt-2" style={{ background: T.bg, border: `1px solid ${T.bd}` }}>
              {result.error === 'invalid' && (
                <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>
                  {t('priceLists.calculator.invalidRoute', 'Please select valid, different pickup and dropoff locations')}
                </div>
              )}
              {result.error === 'noMatch' && (
                <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>
                  {t('priceLists.calculator.noMatch', 'No active lane found for this route')}
                </div>
              )}
              {result.error === 'noPricing' && (
                <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>
                  {t('priceLists.calculator.noPricing', 'Matched lane has no applicable pricing for the entered data')}
                </div>
              )}
              {!result.error && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.t3 }}>
                      {t('priceLists.calculator.laneMatch', 'Lane match')}: {result.lane.id}
                    </span>
                    <span style={{ fontSize: 11, color: T.t3 }}>{result.km} km</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: T.ac, marginBottom: 4 }}>
                    {formatEur(result.total)}
                  </div>
                  {result.detail?.formula && (
                    <div style={{ fontSize: 10, color: T.t3, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                      {result.detail.formula}
                    </div>
                  )}
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 border-none cursor-pointer bg-transparent mt-2"
                    style={{ fontSize: 11, color: T.ac, fontWeight: 600 }}
                  >
                    {t('priceLists.calculator.breakdown', 'Breakdown')}
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expanded && result.detail && (
                    <div className="mt-3 space-y-3" style={{ fontSize: 11 }}>
                      {/* Route & lane */}
                      <div className="rounded-lg px-3 py-2" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
                        <div style={{ fontWeight: 600, color: T.t1, marginBottom: 6 }}>
                          {t('priceLists.calculator.breakdownRoute', 'Route & lane')}
                        </div>
                        <div className="space-y-1" style={{ color: T.t2 }}>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.breakdownRouteLabel', 'Route')}</span>
                            <span style={{ textAlign: 'right', color: T.t1 }}>{result.lane?.routeLabel || '—'}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.breakdownTrip', 'Trip type')}</span>
                            <span style={{ color: T.t1 }}>
                              {result.lane?.isRoundTrip || result.lane?.tripType === 'roundtrip'
                                ? t('priceLists.modal.roundTrip', 'Round trip')
                                : t('directTrip', 'Direct trip')}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.breakdownDistance', 'Distance')}</span>
                            <span style={{ color: T.t1 }}>{result.km} km</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.breakdownValidity', 'Valid')}</span>
                            <span style={{ color: T.t1, textAlign: 'right' }}>
                              {formatDateShort(result.lane?.effectiveFrom)}
                              {' — '}
                              {result.lane?.effectiveTo ? formatDateShort(result.lane.effectiveTo) : t('priceLists.calculator.openEnded', 'Open')}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.col.scope', 'Scope')}</span>
                            <span style={{ color: T.t1 }}>{result.lane?.scopeLabel || result.lane?.scope || 'Default'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Inputs used */}
                      <div className="rounded-lg px-3 py-2" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
                        <div style={{ fontWeight: 600, color: T.t1, marginBottom: 6 }}>
                          {t('priceLists.calculator.breakdownInputs', 'Your inputs')}
                        </div>
                        <div className="space-y-1" style={{ color: T.t2 }}>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.pallets', 'Pallets')}</span>
                            <span style={{ color: T.t1 }}>{result.inputs?.pallets ?? '—'}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.weight', 'Weight (t)')}</span>
                            <span style={{ color: T.t1 }}>{result.inputs?.weightTonnes ?? '—'}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.vehicle', 'Vehicle')}</span>
                            <span style={{ color: T.t1 }}>{result.inputs?.vehicleType || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Selected rate calculation */}
                      <div className="rounded-lg px-3 py-2" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
                        <div style={{ fontWeight: 600, color: T.t1, marginBottom: 6 }}>
                          {t('priceLists.calculator.breakdownCalculation', 'Price calculation')}
                        </div>
                        <div className="space-y-1" style={{ color: T.t2 }}>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.breakdownSelectedMetric', 'Pricing rule used')}</span>
                            <span style={{ color: T.t1, textAlign: 'right' }}>
                              {result.detail.matchedMetricLabel} · {result.detail.matchedValueLabel}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>{t('priceLists.calculator.breakdownLaneRate', 'Lane rate')}</span>
                            <span style={{ color: T.t1 }}>{formatEur(result.detail.unitRate)}</span>
                          </div>
                          {result.detail.quantity != null && (
                            <div className="flex justify-between gap-2">
                              <span>{t('priceLists.calculator.breakdownQuantity', 'Quantity')}</span>
                              <span style={{ color: T.t1 }}>{result.detail.quantityUnit}</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-2 pt-1" style={{ borderTop: `1px dashed ${T.bd}` }}>
                            <span>{t('priceLists.calculator.breakdownFormula', 'Formula')}</span>
                            <span style={{ color: T.t1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                              {result.detail.formula}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 pt-1 font-semibold" style={{ borderTop: `1px solid ${T.bd}`, color: T.t1 }}>
                            <span>{t('priceLists.calculator.breakdownTotal', 'Quote total')}</span>
                            <span style={{ color: T.ac }}>{formatEur(result.total)}</span>
                          </div>
                          <div style={{ fontSize: 10, color: T.t3, marginTop: 4 }}>
                            {t(
                              selectionReasonKey(result.detail.selectionReason),
                              'Rate selected based on your inputs and lane pricing priority.',
                            )}
                          </div>
                        </div>
                      </div>

                      {/* All lane rates */}
                      {result.detail.allLaneRates?.length > 0 && (
                        <div className="rounded-lg px-3 py-2" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
                          <div style={{ fontWeight: 600, color: T.t1, marginBottom: 6 }}>
                            {t('priceLists.calculator.breakdownAllRates', 'All rates on this lane')}
                          </div>
                          <div className="space-y-1.5">
                            {result.detail.allLaneRates.map((row, idx) => (
                              <div
                                key={`${row.metric}-${idx}`}
                                className="flex items-start justify-between gap-2 py-1"
                                style={{
                                  borderTop: idx > 0 ? `1px solid ${T.bd}` : undefined,
                                  opacity: row.applicable || row.selected ? 1 : 0.55,
                                }}
                              >
                                <div className="min-w-0">
                                  <div style={{ color: row.selected ? T.ac : T.t1, fontWeight: row.selected ? 600 : 500 }}>
                                    {row.metricLabel} · {row.valueLabel}
                                    {row.selected && (
                                      <span style={{ marginLeft: 6, fontSize: 9, color: T.ac }}>
                                        ({t('priceLists.calculator.breakdownUsed', 'used')})
                                      </span>
                                    )}
                                  </div>
                                  {!row.applicable && !row.selected && (
                                    <div style={{ fontSize: 9, color: T.t3, marginTop: 2 }}>
                                      {row.reason === 'noPallets' && t('priceLists.calculator.notApplicableNoPallets', 'Enter pallets to use this rate')}
                                      {row.reason === 'noWeight' && t('priceLists.calculator.notApplicableNoWeight', 'Enter weight to use this rate')}
                                      {row.reason === 'noVehicle' && t('priceLists.calculator.notApplicableNoVehicle', 'Select vehicle to use this rate')}
                                      {row.reason === 'vehicleMismatch' && t('priceLists.calculator.notApplicableVehicle', 'Vehicle does not match lane rate')}
                                    </div>
                                  )}
                                </div>
                                <span style={{ color: T.t1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, whiteSpace: 'nowrap' }}>
                                  {formatEur(row.rateEur)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-3 shrink-0" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg cursor-pointer border-none"
            style={{ background: T.bg, color: T.t2, fontSize: 13, fontWeight: 500 }}
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
