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

function metricPriority(row, vehicleType, pallets, weight) {
  if (!row) return 99;
  if (row.metric === 'ftl_truck_type' && vehicleType) {
    const vt = String(row.metricValue?.vehicle_type || '');
    if (vt === vehicleType || vt.split(',').map((s) => s.trim()).includes(vehicleType)) return 0;
  }
  if (row.metric === 'unit_transport' && pallets && Number(pallets) > 0) return 1;
  if (row.metric === 'weight' && weight && Number(weight) > 0) return row.metricValue?.unit === 'ton' ? 2 : 3;
  if (row.metric === 'load_any_size') return 4;
  return 99;
}

function priceFromPricingRows(lane, { pallets, weight, vehicleType }) {
  const rows = resolveLanePricingRows(lane);
  const ordered = [...rows].sort(
    (a, b) => metricPriority(a, vehicleType, pallets, weight) - metricPriority(b, vehicleType, pallets, weight),
  );
  const selected = ordered.find((row) => metricPriority(row, vehicleType, pallets, weight) < 99);
  if (!selected) return null;

  const base = Number(selected.priceEur || 0);

  if (selected.metric === 'ftl_truck_type') {
    return {
      price: base,
      unit: 'load',
      matchedMetric: selected.metric,
      matchedValue: selected.metricValue?.vehicle_type || vehicleType,
    };
  }
  if (selected.metric === 'unit_transport') {
    const qty = Number(pallets || 0);
    return {
      price: base * qty,
      unit: 'pallet',
      matchedMetric: selected.metric,
      matchedValue: selected.metricValue?.type || 'eur_pallet',
    };
  }
  if (selected.metric === 'weight') {
    const qty = Number(weight || 0);
    const multiplier = selected.metricValue?.unit === 'kg' ? 1000 : 1;
    return {
      price: base * qty * multiplier,
      unit: selected.metricValue?.unit || 'ton',
      matchedMetric: selected.metric,
      matchedValue: selected.metricValue?.unit || 'ton',
    };
  }
  return {
    price: base,
    unit: 'load',
    matchedMetric: selected.metric,
    matchedValue: selected.metricValue?.type || 'per_load',
  };
}

function distinctEndpointStops(lanes, endpoint) {
  const out = [];
  (lanes || []).forEach((lane) => {
    const stops = lane?.stops || [];
    if (stops.length < 2) return;
    const raw = endpoint === 'origin' ? stops[0] : stops[stops.length - 1];
    const stop = normalizeLoadedLaneStop(raw);
    if (!isCalculatorEndpoint(stop)) return;
    if (!out.some((s) => stopsAreSamePlace(s, stop))) out.push(stop);
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
    () => (Array.isArray(lanes) ? lanes.filter((l) => l.status === 'active') : []),
    [lanes],
  );

  const routePresets = useMemo(() => buildRoutePresets(activeLanes), [activeLanes]);

  const originStops = useMemo(
    () => distinctEndpointStops(activeLanes, 'origin'),
    [activeLanes],
  );

  const destinationStops = useMemo(() => {
    if (!isCalculatorEndpoint(originStop)) {
      return distinctEndpointStops(activeLanes, 'destination');
    }
    const picks = [];
    activeLanes.forEach((lane) => {
      const stops = lane?.stops || [];
      if (stops.length < 2) return;
      const laneOrigin = normalizeLoadedLaneStop(stops[0]);
      if (!stopMatchesPlace(laneOrigin, originStop)) return;
      const dest = normalizeLoadedLaneStop(stops[stops.length - 1]);
      if (!isCalculatorEndpoint(dest)) return;
      if (!picks.some((s) => stopsAreSamePlace(s, dest))) picks.push(dest);
    });
    const list = picks.length > 0 ? picks : distinctEndpointStops(activeLanes, 'destination');
    return list.sort((a, b) => stopLabel(a).localeCompare(stopLabel(b), undefined, { sensitivity: 'base' }));
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
      return stopMatchesPlace(normalizeLoadedLaneStop(stops[0]), originStop)
        && stopMatchesPlace(normalizeLoadedLaneStop(stops[stops.length - 1]), destinationStop);
    });
  }, [originStop, destinationStop, activeLanes]);

  const vehicleOptions = useMemo(() => {
    const laneSource = matchingOdLanes.length > 0 ? matchingOdLanes : activeLanes;
    const fromLanes = collectFtlVehicleNames(laneSource);
    if (fromLanes.length > 0) return fromLanes;

    const fromCatalog = (vehicleTypes || [])
      .map((vt) => String(vt.name || '').trim())
      .filter(Boolean);
    return Array.from(new Set(fromCatalog)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
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

  useEffect(() => {
    if (vehicleType && !vehicleOptions.includes(vehicleType)) {
      setVehicleType('');
    }
  }, [vehicleType, vehicleOptions]);

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
        return stopMatchesPlace(normalizeLoadedLaneStop(stops[0]), originStop)
          && stopMatchesPlace(normalizeLoadedLaneStop(stops[stops.length - 1]), destinationStop);
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

    const pricingFromRows = priceFromPricingRows(matched, { pallets, weight, vehicleType });
    if (!pricingFromRows) {
      setResult({ error: 'noPricing' });
      return;
    }

    const price = Math.round(pricingFromRows.price * 100) / 100;
    setResult({
      type: 'match',
      lane: matched,
      km: matched.totalKm || km || 0,
      price,
      total: price,
      unit: pricingFromRows.unit,
      matchedMetric: pricingFromRows.matchedMetric,
      matchedMetricLabel: formatMetricLabel(pricingFromRows.matchedMetric, t),
      breakdown: { base: price },
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
                  <label style={labelStyle}>{t('priceLists.modal.origin', 'Origin')}</label>
                  <SearchableSelect
                    options={originOptions}
                    value={originStop ? stopKey(originStop) : ''}
                    onChange={(key) => {
                      setOriginStop(originByKey.get(key) || null);
                      setRoutePresetKey('');
                    }}
                    placeholder={t('priceLists.calculator.pickOrigin', 'Select origin from your lanes…')}
                    searchPlaceholder={t('priceLists.calculator.searchOrigin', 'Search origins…')}
                    menuFixed
                    direction="auto"
                    disabled={originOptions.length === 0}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('priceLists.modal.destination', 'Destination')}</label>
                  <SearchableSelect
                    options={destinationOptions}
                    value={destinationStop ? stopKey(destinationStop) : ''}
                    onChange={(key) => {
                      setDestinationStop(destinationByKey.get(key) || null);
                      setRoutePresetKey('');
                      setResult(null);
                    }}
                    placeholder={t('priceLists.calculator.pickDestination', 'Select destination from your lanes…')}
                    searchPlaceholder={t('priceLists.calculator.searchDestination', 'Search destinations…')}
                    menuFixed
                    direction="auto"
                    disabled={destinationOptions.length === 0}
                  />
                  {isCalculatorEndpoint(originStop) && destinationOptions.length === 0 && (
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                      {t('priceLists.calculator.noDestForOrigin', 'No destinations found for this origin in your lane library.')}
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
              <label style={labelStyle}>{t('priceLists.calculator.vehicle', 'Vehicle')}</label>
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
                  {t('priceLists.calculator.noPricing', 'Matched lane has no applicable pricing for the entered quantity')}
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
                    €{result.total.toFixed(2)}
                  </div>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 border-none cursor-pointer bg-transparent mt-2"
                    style={{ fontSize: 11, color: T.ac, fontWeight: 600 }}
                  >
                    {t('priceLists.calculator.breakdown', 'Breakdown')}
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expanded && (
                    <div className="mt-2 space-y-1" style={{ fontSize: 11 }}>
                      <div className="flex justify-between" style={{ color: T.t2 }}>
                        <span>
                          {t('priceLists.calculator.basePrice', 'Base price')} ({result.unit})
                          {result.matchedMetricLabel ? ` · ${result.matchedMetricLabel}` : ''}
                        </span>
                        <span>€{result.price.toFixed(2)}</span>
                      </div>
                      {result.lane?.routeLabel && (
                        <div className="flex justify-between pt-1" style={{ color: T.t3, borderTop: `1px solid ${T.bd}`, fontSize: 10 }}>
                          <span>{result.lane.routeLabel}</span>
                          <span>{result.lane.scopeLabel}</span>
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
