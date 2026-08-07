/**
 * QuoteCalculator — lane-based quote tool.
 * Origin/destination use Address Book LocationSelect (same as Add Lane).
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { X, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useApp } from '../../../context/AppContext';
import { resolveCity, getDistance } from '../../../mocks/priceListsData';
import { LocationSelect } from '../../../components/CreateShipmentWizard/LocationSelect';
import {
  formatMetricLabel,
  resolveLanePricingRows,
} from '../../../api/utils/laneMetricDisplay';

const FALLBACK_VEHICLE_TYPES = ['van', 'rigid', 'semi'];

function getStopLocationId(stop) {
  if (!stop || typeof stop === 'string') return null;
  const id = stop.location_id ?? stop.locationId ?? null;
  return id != null && String(id).trim() !== '' ? String(id) : null;
}

function getStopRaw(stop) {
  if (!stop) return '';
  if (typeof stop === 'string') return stop.trim();
  return String(stop.city || stop.label || stop.value || '').trim();
}

function normalizePlace(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return (resolveCity(raw) || raw).toLowerCase();
}

function placesMatch(a, b) {
  if (!a || !b) return false;
  if (String(a).trim().toLowerCase() === String(b).trim().toLowerCase()) return true;
  return normalizePlace(a) === normalizePlace(b);
}

function stopMatchesLocation(stop, location) {
  if (!stop || !location) return false;
  const stopLocId = getStopLocationId(stop);
  if (stopLocId && String(location.id) === stopLocId) return true;
  const city = (location.city || location.name || '').trim();
  const name = (location.name || '').trim();
  const raw = getStopRaw(stop);
  return placesMatch(raw, city) || placesMatch(raw, name) || placesMatch(raw, `${name} · ${city}`);
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

export default function QuoteCalculator({ open, onClose, lanes }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { locations, refreshLocationsFromApi } = useApp();

  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [pallets, setPallets] = useState('');
  const [weight, setWeight] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const activeLocations = useMemo(
    () => (locations || []).filter((l) => l.status === 'active'),
    [locations],
  );

  const activeLanes = useMemo(
    () => (Array.isArray(lanes) ? lanes.filter((l) => l.status === 'active') : []),
    [lanes],
  );

  const originLocation = useMemo(
    () => activeLocations.find((l) => String(l.id) === String(originId)) || null,
    [activeLocations, originId],
  );

  const destinationLocation = useMemo(
    () => activeLocations.find((l) => String(l.id) === String(destinationId)) || null,
    [activeLocations, destinationId],
  );

  /** Prefer AB locations that appear as origins in the lane library; fall back to all active. */
  const originLocations = useMemo(() => {
    const ids = new Set();
    activeLanes.forEach((lane) => {
      const id = getStopLocationId(lane?.stops?.[0]);
      if (id) ids.add(id);
    });
    if (ids.size === 0) return activeLocations;
    const filtered = activeLocations.filter((l) => ids.has(String(l.id)));
    return filtered.length > 0 ? filtered : activeLocations;
  }, [activeLanes, activeLocations]);

  /** Destinations that exist on lanes matching the selected origin. */
  const destinationLocations = useMemo(() => {
    if (!originLocation) return [];
    const ids = new Set();
    const matchedLanes = activeLanes.filter((lane) => stopMatchesLocation(lane?.stops?.[0], originLocation));
    matchedLanes.forEach((lane) => {
      const stops = lane?.stops || [];
      const id = getStopLocationId(stops[stops.length - 1]);
      if (id) ids.add(id);
    });
    if (ids.size > 0) {
      const filtered = activeLocations.filter((l) => ids.has(String(l.id)));
      if (filtered.length > 0) return filtered;
    }
    // Legacy lanes without location_id — allow any AB location except origin
    return activeLocations.filter((l) => String(l.id) !== String(originLocation.id));
  }, [originLocation, activeLanes, activeLocations]);

  const vehicleOptions = useMemo(() => {
    const fromLanes = new Set();
    activeLanes.forEach((lane) => {
      resolveLanePricingRows(lane).forEach((row) => {
        if (row.metric !== 'ftl_truck_type') return;
        const raw = String(row.metricValue?.vehicle_type || '').trim();
        if (!raw) return;
        raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => fromLanes.add(name));
      });
    });
    const list = Array.from(fromLanes).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return list.length > 0 ? list : FALLBACK_VEHICLE_TYPES;
  }, [activeLanes]);

  useEffect(() => {
    if (!open) return;
    void refreshLocationsFromApi?.();
    setOriginId('');
    setDestinationId('');
    setPallets('');
    setWeight('');
    setVehicleType('');
    setResult(null);
    setExpanded(false);
  }, [open, refreshLocationsFromApi]);

  useEffect(() => {
    setDestinationId('');
    setResult(null);
  }, [originId]);

  useEffect(() => {
    if (destinationId && !destinationLocations.some((l) => String(l.id) === String(destinationId))) {
      setDestinationId('');
      setResult(null);
    }
  }, [destinationId, destinationLocations]);

  const calculate = useCallback(() => {
    if (!originLocation || !destinationLocation || String(originLocation.id) === String(destinationLocation.id)) {
      setResult({ error: 'invalid' });
      return;
    }

    const oCity = (originLocation.city || originLocation.name || '').trim();
    const dCity = (destinationLocation.city || destinationLocation.name || '').trim();
    const km = getDistance(oCity, dCity);

    const candidates = activeLanes.filter((l) => {
      const stops = l.stops || [];
      return stopMatchesLocation(stops[0], originLocation)
        && stopMatchesLocation(stops[stops.length - 1], destinationLocation);
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
  }, [originLocation, destinationLocation, pallets, weight, vehicleType, activeLanes, t]);

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

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-[520px] flex flex-col rounded-2xl shadow-2xl"
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label style={labelStyle}>{t('priceLists.modal.origin', 'Origin')}</label>
              <LocationSelect
                locations={originLocations}
                value={originId}
                onChange={setOriginId}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('priceLists.modal.destination', 'Destination')}</label>
              <LocationSelect
                locations={destinationLocations}
                value={destinationId}
                onChange={setDestinationId}
                disabled={!originId}
              />
            </div>
          </div>

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
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {vehicleOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={calculate}
            className="w-full py-2.5 rounded-lg cursor-pointer border-none text-white"
            style={{ background: T.ac, fontSize: 13, fontWeight: 600 }}
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
