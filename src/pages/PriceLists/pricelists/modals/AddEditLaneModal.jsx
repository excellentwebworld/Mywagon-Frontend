/**
 * AddEditLaneModal — Create or edit a lane price entry.
 *
 * Used by: Shipper, Forwarder, Carrier.
 *
 * 6 collapsible sections:
 * 1. Route — Multi-stop picker (2-10), round trip toggle, auto-calculated legs/km
 * 2. Pricing — 5 methods (perLoad, perPallet, perKm, perKg, perTonne), auto-derive perKm
 * 3. Vehicle Rates — Optional per-vehicle pricing
 * 4. Weight Breaks — Optional tiered pricing
 * 5. Lane Costs — Tolls (auto-fill), ferry, other (carrier+forwarder only)
 * 6. Validity & Scope — Dates, status, scope dropdown, direction (forwarder), notes
 *
 * @API: POST /api/v1/price-lists
 * @API: PATCH /api/v1/price-lists/:id
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, RotateCw, AlertTriangle, Search, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import {
  CITIES, CURRENCIES, resolveCity, cityLabel,
  getDistance, getTollEstimate, calculateRouteTotals, getScopeLabels,
} from '../../../../mocks/priceListsData';
import { PARTNERS as MOCK_PARTNERS } from '../../../../mocks/partnersMasterData';
import LaneLocationPicker from '../../../../components/Partners/LaneLocationPicker';

const VEHICLE_TYPES = ['van', 'rigid', 'semi'];

export default function AddEditLaneModal({ open, onClose, onSave, lane, role, allLanes, forwarderTab }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = i18n.language;
  const isEdit = !!lane;

  // ─── Section collapse ───
  const [sections, setSections] = useState({
    route: true, pricing: true, vehicleRates: false, weightBreaks: false,
    laneCosts: false, validity: true,
  });
  const toggle = (key) => setSections(p => ({ ...p, [key]: !p[key] }));

  // ─── Form state ───
  const [stops, setStops] = useState([null, null]); // LaneLocationPicker format: { type, value, label, countryCode } | null
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [pricing, setPricing] = useState({ perLoad: '', perPallet: '', perKm: '', perKg: '', perTonne: '', currency: 'EUR', minimumCharge: '' });
  const [vehicleRates, setVehicleRates] = useState(null);
  const [weightBreaks, setWeightBreaks] = useState(null);
  const [laneCosts, setLaneCosts] = useState({ tollCost: '', ferryCost: '', otherCosts: '', otherCostsLabel: '' });
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [scope, setScope] = useState('default');
  const [scopePartnerIds, setScopePartnerIds] = useState([]);
  const [scopeDirection, setScopeDirection] = useState('');
  const [scopeSearch, setScopeSearch] = useState('');
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [dupeWarn, setDupeWarn] = useState(false);

  // ─── Populate on edit ───
  useEffect(() => {
    if (!open) return;
    if (lane) {
      // Convert old stop format { city, label } to LaneLocationPicker format
      setStops(lane.stops.map(s => s.type ? s : ({
        type: 'city', value: s.city, label: s.label || s.city, countryCode: 'GR',
      })));
      setIsRoundTrip(lane.isRoundTrip);
      setPricing({
        perLoad: lane.pricing.perLoad ?? '', perPallet: lane.pricing.perPallet ?? '',
        perKm: lane.pricing.perKm ?? '', perKg: lane.pricing.perKg ?? '',
        perTonne: lane.pricing.perTonne ?? '', currency: lane.pricing.currency || 'EUR',
        minimumCharge: lane.pricing.minimumCharge ?? '',
      });
      setVehicleRates(lane.vehicleRates ? JSON.parse(JSON.stringify(lane.vehicleRates)) : null);
      setWeightBreaks(lane.weightBreaks ? JSON.parse(JSON.stringify(lane.weightBreaks)) : null);
      setLaneCosts({
        tollCost: lane.laneCosts?.tollCost ?? '', ferryCost: lane.laneCosts?.ferryCost ?? '',
        otherCosts: lane.laneCosts?.otherCosts ?? '', otherCostsLabel: lane.laneCosts?.otherCostsLabel ?? '',
      });
      setEffectiveFrom(lane.effectiveFrom || '');
      setEffectiveTo(lane.effectiveTo || '');
      setScope(lane.scope || 'default');
      setScopePartnerIds(lane.scopePartnerIds || []);
      setScopeDirection(lane.scopeDirection || '');
      setNotes(lane.notes || '');
    } else {
      setStops([null, null]);
      setIsRoundTrip(false);
      setPricing({ perLoad: '', perPallet: '', perKm: '', perKg: '', perTonne: '', currency: 'EUR', minimumCharge: '' });
      setVehicleRates(null);
      setWeightBreaks(null);
      setLaneCosts({ tollCost: '', ferryCost: '', otherCosts: '', otherCostsLabel: '' });
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
      setEffectiveTo('');
      setScope('default');
      setScopePartnerIds([]);
      setScopeDirection(role === 'forwarder' ? (forwarderTab === 'carrier' ? 'buy' : 'sell') : '');
      setScopeSearch('');
      setScopeDropdownOpen(false);
    }
    setErrors({});
    setDupeWarn(false);
  }, [open, lane]);

  // ─── Route calculations ───
  const routeCalc = useMemo(() => {
    const validStops = stops.filter(s => s && s.value);
    if (validStops.length < 2) return null;
    // Try city-based distance lookup for Greek cities
    const cityStops = validStops.map(s => {
      if (s.type === 'city') {
        const resolved = resolveCity(s.value);
        return resolved ? { city: resolved, label: s.label } : { city: s.value, label: s.label };
      }
      return { city: null, label: s.label };
    });
    const hasCities = cityStops.every(s => s.city);
    if (hasCities) {
      return calculateRouteTotals(cityStops, isRoundTrip);
    }
    // Non-city stops — route label only, no distance
    const arrow = isRoundTrip ? ' ↔ ' : ' → ';
    return {
      legs: [],
      totalKm: 0,
      totalTolls: 0,
      routeLabel: validStops.map(s => s.label || s.value).join(arrow),
      manualKm: true,
    };
  }, [stops, isRoundTrip]);

  // ─── Auto-fill tolls ───
  useEffect(() => {
    if (routeCalc && routeCalc.totalTolls > 0 && !laneCosts.tollCost) {
      setLaneCosts(p => ({ ...p, tollCost: routeCalc.totalTolls }));
    }
  }, [routeCalc]);

  // ─── Duplicate detection ───
  useEffect(() => {
    if (!allLanes || stops.length < 2 || !stops[0] || !stops[stops.length - 1]) { setDupeWarn(false); return; }
    const firstVal = stops[0].value;
    const lastVal = stops[stops.length - 1].value;
    if (!firstVal || !lastVal) { setDupeWarn(false); return; }
    const dup = allLanes.some(l =>
      l.id !== lane?.id && l.status === 'active' &&
      (l.stops[0]?.city === firstVal || l.stops[0]?.value === firstVal) &&
      (l.stops[l.stops.length - 1]?.city === lastVal || l.stops[l.stops.length - 1]?.value === lastVal)
    );
    setDupeWarn(dup);
  }, [stops, allLanes, lane]);

  // ─── Auto-derive perKm ───
  const derivedPerKm = useMemo(() => {
    if (pricing.perLoad && routeCalc?.totalKm) {
      return Math.round((Number(pricing.perLoad) / routeCalc.totalKm) * 100) / 100;
    }
    return null;
  }, [pricing.perLoad, routeCalc]);

  // ─── Stops management ───
  const updateStop = (idx, location) => {
    setStops(p => p.map((s, i) => i === idx ? location : s));
  };
  const addStop = () => {
    if (stops.length < 10) setStops(p => [...p, null]);
  };
  const removeStop = (idx) => {
    if (stops.length > 2) setStops(p => p.filter((_, i) => i !== idx));
  };

  // ─── Vehicle Rates management ───
  const initVehicleRates = () => setVehicleRates(VEHICLE_TYPES.map(t => ({ vehicleType: t, perLoad: '', perKm: '' })));
  const updateVR = (idx, key, val) => setVehicleRates(p => p.map((r, i) => i === idx ? { ...r, [key]: val } : r));

  // ─── Weight Breaks management ───
  const initWeightBreaks = () => setWeightBreaks([{ minQty: 1, maxQty: '', perPallet: '', perTonne: '' }]);
  const addBreak = () => setWeightBreaks(p => [...p, { minQty: '', maxQty: '', perPallet: '', perTonne: '' }]);
  const updateWB = (idx, key, val) => setWeightBreaks(p => p.map((b, i) => i === idx ? { ...b, [key]: val } : b));
  const removeBreak = (idx) => setWeightBreaks(p => p.filter((_, i) => i !== idx));

  // ─── Validate & save ───
  const handleSave = useCallback(() => {
    const errs = {};
    // Validate stops: each must be a valid LaneLocationPicker value
    const validStops = stops.filter(s => s && s.value);
    if (validStops.length < 2) errs.stops = true;
    if (validStops.length >= 2 && validStops[0]?.value === validStops[validStops.length - 1]?.value && validStops[0]?.type === validStops[validStops.length - 1]?.type) errs.sameCity = true;

    const hasPrice = ['perLoad', 'perPallet', 'perKm', 'perKg', 'perTonne'].some(k => pricing[k] !== '' && Number(pricing[k]) > 0);
    if (!hasPrice) errs.pricing = true;
    if (!effectiveFrom) errs.effectiveFrom = true;
    if (effectiveTo && effectiveTo < effectiveFrom) errs.dateOrder = true;

    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Convert stops to storage format (keep LaneLocationPicker data + derive city for distance)
    const stopsForStorage = validStops.map(s => {
      const cityResolved = s.type === 'city' ? resolveCity(s.value) : null;
      return {
        city: cityResolved || s.value,
        label: s.label || s.value,
        type: s.type,
        value: s.value,
        countryCode: s.countryCode || 'GR',
      };
    });

    // Route calculations
    const arrow = isRoundTrip ? ' ↔ ' : ' → ';
    const routeLabel = stopsForStorage.map(s => s.label || s.city).join(arrow);
    const hasCityStops = stopsForStorage.every(s => resolveCity(s.city));
    let totalKm = 0;
    let legs = [];
    if (hasCityStops) {
      const calc = calculateRouteTotals(stopsForStorage, isRoundTrip);
      totalKm = calc.totalKm;
      legs = calc.legs;
    }

    const entry = {
      stops: stopsForStorage,
      isRoundTrip,
      routeLabel,
      totalKm,
      legs,
      pricing: {
        perLoad: pricing.perLoad ? Number(pricing.perLoad) : null,
        perPallet: pricing.perPallet ? Number(pricing.perPallet) : null,
        perKm: pricing.perKm ? Number(pricing.perKm) : null,
        perKg: pricing.perKg ? Number(pricing.perKg) : null,
        perTonne: pricing.perTonne ? Number(pricing.perTonne) : null,
        currency: pricing.currency,
        minimumCharge: pricing.minimumCharge ? Number(pricing.minimumCharge) : null,
      },
      vehicleRates: vehicleRates?.some(r => r.perLoad || r.perKm)
        ? vehicleRates.map(r => ({ vehicleType: r.vehicleType, perLoad: r.perLoad ? Number(r.perLoad) : null, perKm: r.perKm ? Number(r.perKm) : null }))
        : null,
      weightBreaks: weightBreaks?.length
        ? weightBreaks.map(b => ({ minQty: Number(b.minQty) || 0, maxQty: b.maxQty ? Number(b.maxQty) : null, perPallet: b.perPallet ? Number(b.perPallet) : null, perTonne: b.perTonne ? Number(b.perTonne) : null }))
        : null,
      laneCosts: (laneCosts.tollCost || laneCosts.ferryCost || laneCosts.otherCosts)
        ? { tollCost: laneCosts.tollCost ? Number(laneCosts.tollCost) : null, ferryCost: laneCosts.ferryCost ? Number(laneCosts.ferryCost) : null, otherCosts: laneCosts.otherCosts ? Number(laneCosts.otherCosts) : null, otherCostsLabel: laneCosts.otherCostsLabel }
        : null,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      scope: scopePartnerIds.length > 0 ? 'specific' : 'default',
      scopePartnerIds: scopePartnerIds,
      scopeLabel: scopePartnerIds.length > 0 ? getScopeLabels(scopePartnerIds).join(', ') : (
        role === 'shipper' ? t('priceLists.scope.allCarriers', 'All carriers')
          : role === 'carrier' ? t('priceLists.scope.allShippers', 'All shippers')
          : t('priceLists.scope.allPartners', 'All partners')
      ),
      scopeDirection: role === 'forwarder' && scopeDirection ? scopeDirection : null,
      notes,
    };
    onSave(entry, lane?.id);
  }, [stops, isRoundTrip, pricing, vehicleRates, weightBreaks, laneCosts, effectiveFrom, effectiveTo, scopePartnerIds, scopeDirection, notes, lane, role, onSave, t]);

  if (!open) return null;

  const inputStyle = { fontSize: 13, padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, outline: 'none', width: '100%' };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.t2, marginBottom: 3, display: 'block' };
  const sectionBtn = (key, label) => (
    <button onClick={() => toggle(key)} className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer border-none"
      style={{ background: 'transparent', color: T.t1, fontSize: 13, fontWeight: 600 }}>
      {label}
      {sections[key] ? <ChevronUp size={14} style={{ color: T.t3 }} /> : <ChevronDown size={14} style={{ color: T.t3 }} />}
    </button>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[640px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
            {isEdit ? t('priceLists.modal.editTitle', 'Edit Lane Price') : t('priceLists.modal.addTitle', 'Add Lane Price')}
          </h3>
          <button onClick={onClose} className="p-1 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Dupe warning */}
          {dupeWarn && (
            <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 12 }}>
              <AlertTriangle size={14} /> {t('priceLists.modal.dupeWarn', 'A similar active lane already exists for this route.')}
            </div>
          )}

          {/* §1 Route */}
          <div style={{ borderBottom: `1px solid ${T.bd}` }}>
            {sectionBtn('route', `📍 ${t('priceLists.modal.routeSection', 'Route')}`)}
            {sections.route && (
              <div className="px-4 pb-4 space-y-3">
                {stops.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, width: 16, textAlign: 'center', paddingTop: 6 }}>{i + 1}</span>
                    <div className="flex-1">
                      <LaneLocationPicker
                        value={s}
                        onChange={(loc) => updateStop(i, loc)}
                        label={i === 0 ? t('priceLists.modal.origin', 'Origin') : i === stops.length - 1 ? t('priceLists.modal.destination', 'Destination') : t('priceLists.modal.stopN', 'Stop {{n}}').replace('{{n}}', i + 1)}
                        required={i === 0 || i === stops.length - 1}
                      />
                    </div>
                    {stops.length > 2 && (
                      <button onClick={() => removeStop(i)} className="p-1 cursor-pointer border-none mt-1" style={{ background: 'transparent', color: T.t3 }}><Trash2 size={13} /></button>
                    )}
                  </div>
                ))}
                {errors.sameCity && <div style={{ fontSize: 11, color: '#EF4444' }}>{t('priceLists.modal.sameCity', 'Origin and destination must be different')}</div>}

                <div className="flex items-center gap-3">
                  {stops.length < 10 && (
                    <button onClick={addStop} className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer border-none"
                      style={{ background: 'transparent', color: T.ac, fontSize: 11, fontWeight: 600 }}>
                      <Plus size={12} /> {t('priceLists.modal.addStop', 'Add stop')}
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 11, color: T.t2 }}>
                    <input type="checkbox" checked={isRoundTrip} onChange={e => setIsRoundTrip(e.target.checked)} />
                    <RotateCw size={11} /> {t('priceLists.modal.roundTrip', 'Round trip')}
                  </label>
                </div>

                {routeCalc && (
                  <div className="rounded-lg px-3 py-2 mt-1" style={{ background: T.bg, fontSize: 11, color: T.t2 }}>
                    <span style={{ fontWeight: 600 }}>{routeCalc.routeLabel}</span> — {routeCalc.totalKm} km
                    {routeCalc.legs.length > 1 && (
                      <div className="mt-1 space-y-0.5" style={{ fontSize: 10, color: T.t3 }}>
                        {routeCalc.legs.map((l, i) => (
                          <div key={i}>{l.isReturn ? '↩' : '→'} {cityLabel(l.from, lang)} → {cityLabel(l.to, lang)}: {l.km ?? '?'} km{l.toll ? ` (toll: €${l.toll})` : ''}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* §2 Pricing */}
          <div style={{ borderBottom: `1px solid ${T.bd}` }}>
            {sectionBtn('pricing', `💰 ${t('priceLists.modal.pricingSection', 'Pricing')}`)}
            {sections.pricing && (
              <div className="px-4 pb-4">
                {errors.pricing && <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 6 }}>{t('priceLists.modal.priceRequired', 'At least one pricing method is required')}</div>}
                <div className="grid grid-cols-2 gap-3">
                  {[['perLoad', 'Per Load (€)'], ['perPallet', 'Per Pallet (€)'], ['perKm', 'Per Km (€)'], ['perKg', 'Per Kg (€)'], ['perTonne', 'Per Tonne (€)']].map(([key, label]) => (
                    <div key={key}>
                      <label style={labelStyle}>{t(`priceLists.pricing.${key}`, label)}</label>
                      <input type="number" min="0" step="0.01" value={pricing[key]}
                        onChange={e => setPricing(p => ({ ...p, [key]: e.target.value }))}
                        placeholder="—" style={inputStyle} />
                      {key === 'perKm' && derivedPerKm && !pricing.perKm && (
                        <div style={{ fontSize: 10, color: T.t3, fontStyle: 'italic', marginTop: 2 }}>
                          {t('priceLists.pricing.derivedPerKm', 'Derived')}: €{derivedPerKm}/km
                        </div>
                      )}
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle}>{t('priceLists.pricing.minimumCharge', 'Minimum Charge')}</label>
                    <input type="number" min="0" step="0.01" value={pricing.minimumCharge}
                      onChange={e => setPricing(p => ({ ...p, minimumCharge: e.target.value }))}
                      placeholder="—" style={inputStyle} />
                  </div>
                </div>
                <div className="mt-3" style={{ maxWidth: 120 }}>
                  <label style={labelStyle}>{t('priceLists.modal.currency', 'Currency')}</label>
                  <select value={pricing.currency} onChange={e => setPricing(p => ({ ...p, currency: e.target.value }))} style={inputStyle}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* §3 Vehicle Rates */}
          <div style={{ borderBottom: `1px solid ${T.bd}` }}>
            {sectionBtn('vehicleRates', `🚛 ${t('priceLists.modal.vehicleRatesSection', 'Vehicle Rates')}`)}
            {sections.vehicleRates && (
              <div className="px-4 pb-4">
                {!vehicleRates ? (
                  <button onClick={initVehicleRates} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                    style={{ background: T.al, color: T.ac, fontSize: 12, fontWeight: 600 }}>
                    <Plus size={12} /> {t('priceLists.modal.addVehicleRates', 'Add vehicle rates')}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {vehicleRates.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.t2, width: 40 }}>{r.vehicleType}</span>
                        <input type="number" min="0" step="0.01" value={r.perLoad} onChange={e => updateVR(i, 'perLoad', e.target.value)}
                          placeholder="€/load" style={{ ...inputStyle, flex: 1 }} />
                        <input type="number" min="0" step="0.01" value={r.perKm} onChange={e => updateVR(i, 'perKm', e.target.value)}
                          placeholder="€/km" style={{ ...inputStyle, flex: 1 }} />
                      </div>
                    ))}
                    <button onClick={() => setVehicleRates(null)} className="border-none cursor-pointer bg-transparent"
                      style={{ fontSize: 11, color: '#EF4444' }}>{t('priceLists.modal.removeSection', 'Remove section')}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* §4 Weight Breaks */}
          <div style={{ borderBottom: `1px solid ${T.bd}` }}>
            {sectionBtn('weightBreaks', `⚖️ ${t('priceLists.modal.weightBreaksSection', 'Weight Breaks')}`)}
            {sections.weightBreaks && (
              <div className="px-4 pb-4">
                {!weightBreaks ? (
                  <button onClick={initWeightBreaks} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                    style={{ background: T.al, color: T.ac, fontSize: 12, fontWeight: 600 }}>
                    <Plus size={12} /> {t('priceLists.modal.addWeightBreaks', 'Add weight breaks')}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2" style={{ fontSize: 10, fontWeight: 600, color: T.t3 }}>
                      <span style={{ flex: 1 }}>Min</span><span style={{ flex: 1 }}>Max</span>
                      <span style={{ flex: 1 }}>€/pallet</span><span style={{ flex: 1 }}>€/tonne</span>
                      <span style={{ width: 24 }} />
                    </div>
                    {weightBreaks.map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="number" min="0" value={b.minQty} onChange={e => updateWB(i, 'minQty', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                        <input type="number" min="0" value={b.maxQty} onChange={e => updateWB(i, 'maxQty', e.target.value)} placeholder="∞" style={{ ...inputStyle, flex: 1 }} />
                        <input type="number" min="0" step="0.01" value={b.perPallet} onChange={e => updateWB(i, 'perPallet', e.target.value)} placeholder="—" style={{ ...inputStyle, flex: 1 }} />
                        <input type="number" min="0" step="0.01" value={b.perTonne} onChange={e => updateWB(i, 'perTonne', e.target.value)} placeholder="—" style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => removeBreak(i)} className="p-1 cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button onClick={addBreak} className="border-none cursor-pointer bg-transparent" style={{ fontSize: 11, color: T.ac, fontWeight: 600 }}>
                        <Plus size={11} /> {t('priceLists.modal.addTier', 'Add tier')}
                      </button>
                      <button onClick={() => setWeightBreaks(null)} className="border-none cursor-pointer bg-transparent" style={{ fontSize: 11, color: '#EF4444' }}>
                        {t('priceLists.modal.removeSection', 'Remove section')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* §5 Lane Costs — hidden for shipper */}
          {role !== 'shipper' && (
            <div style={{ borderBottom: `1px solid ${T.bd}` }}>
              {sectionBtn('laneCosts', `🛣️ ${t('priceLists.modal.laneCostsSection', 'Lane Costs')}`)}
              {sections.laneCosts && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>{t('priceLists.laneCosts.tolls', 'Tolls')} (€)</label>
                    <input type="number" min="0" step="0.01" value={laneCosts.tollCost}
                      onChange={e => setLaneCosts(p => ({ ...p, tollCost: e.target.value }))} style={inputStyle} />
                    {routeCalc?.totalTolls > 0 && (
                      <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>
                        {t('priceLists.modal.autoToll', 'Auto-estimated')}: €{routeCalc.totalTolls.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>{t('priceLists.laneCosts.ferry', 'Ferry')} (€)</label>
                    <input type="number" min="0" step="0.01" value={laneCosts.ferryCost}
                      onChange={e => setLaneCosts(p => ({ ...p, ferryCost: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('priceLists.laneCosts.other', 'Other Costs')} (€)</label>
                    <input type="number" min="0" step="0.01" value={laneCosts.otherCosts}
                      onChange={e => setLaneCosts(p => ({ ...p, otherCosts: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('priceLists.modal.otherLabel', 'Other label')}</label>
                    <input value={laneCosts.otherCostsLabel} onChange={e => setLaneCosts(p => ({ ...p, otherCostsLabel: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* §6 Validity & Scope */}
          <div>
            {sectionBtn('validity', `📅 ${t('priceLists.modal.validitySection', 'Validity & Scope')}`)}
            {sections.validity && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>{t('priceLists.modal.effectiveFrom', 'Effective from')} *</label>
                    <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                      style={{ ...inputStyle, borderColor: errors.effectiveFrom ? '#EF4444' : T.bd }} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('priceLists.modal.effectiveTo', 'Effective to')}</label>
                    <input type="date" value={effectiveTo} onChange={e => setEffectiveTo(e.target.value)} style={inputStyle} />
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{t('priceLists.modal.leaveEmpty', 'Leave empty for open-ended')}</div>
                  </div>
                </div>
                {errors.dateOrder && <div style={{ fontSize: 11, color: '#EF4444' }}>{t('priceLists.modal.dateError', 'End date must be after start date')}</div>}

                <div>
                  <label style={labelStyle}>{t('priceLists.modal.scope', 'Scope')}</label>
                  {/* Multi-select partner scope */}
                  {(() => {
                    const activePartners = (MOCK_PARTNERS || []).filter(p => p.status === 'active');
                    // Forwarder: filter based on active tab
                    const effectiveRole = role === 'forwarder'
                      ? (forwarderTab === 'carrier' ? 'shipper' : 'carrier')
                      : role;
                    const roleFiltered = effectiveRole === 'shipper'
                      ? activePartners.filter(p => p.type === 'carrier_company' || p.type === 'freelancer_driver')
                      : effectiveRole === 'carrier'
                        ? activePartners.filter(p => p.type === 'shipper' || p.type === 'forwarder' || p.type === 'customer')
                        : activePartners;
                    const searched = scopeSearch
                      ? roleFiltered.filter(p => p.name.toLowerCase().includes(scopeSearch.toLowerCase()))
                      : roleFiltered;
                    const defaultLabel = effectiveRole === 'shipper' ? t('priceLists.scope.allCarriers', 'All carriers')
                      : effectiveRole === 'carrier' ? t('priceLists.scope.allShippers', 'All shippers')
                      : t('priceLists.scope.allPartners', 'All partners');
                    const TYPE_BADGE = { carrier_company: '🚛', freelancer_driver: '🧑', shipper: '📦', forwarder: '🔀', customer: '👤' };

                    return (
                      <>
                        {/* Selected pills */}
                        {scopePartnerIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {scopePartnerIds.map(pid => {
                              const p = roleFiltered.find(x => x.id === pid);
                              return (
                                <span key={pid} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                  style={{ fontSize: 11, background: T.al, color: T.ac, border: `1px solid ${T.ac}` }}>
                                  {p?.name || pid}
                                  <button onClick={() => setScopePartnerIds(prev => prev.filter(id => id !== pid))}
                                    className="border-none cursor-pointer bg-transparent p-0" style={{ color: T.ac }}>
                                    <X size={10} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {/* Toggle: Default vs Specific */}
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 12, color: T.t2 }}>
                            <input type="radio" checked={scopePartnerIds.length === 0} onChange={() => { setScopePartnerIds([]); setScopeDropdownOpen(false); }} />
                            {defaultLabel}
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 12, color: T.t2 }}>
                            <input type="radio" checked={scopePartnerIds.length > 0} onChange={() => setScopeDropdownOpen(true)} />
                            {t('priceLists.modal.specificPartners', 'Specific partners')}
                          </label>
                        </div>
                        {/* Dropdown */}
                        {(scopeDropdownOpen || scopePartnerIds.length > 0) && (
                          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.bd}`, maxHeight: 200 }}>
                            <div className="relative px-2 py-1.5" style={{ borderBottom: `1px solid ${T.bd}` }}>
                              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
                              <input value={scopeSearch} onChange={e => setScopeSearch(e.target.value)}
                                placeholder={t('priceLists.modal.searchPartners', 'Search partners…')}
                                className="w-full pl-6 pr-2 py-1 outline-none border-none"
                                style={{ background: 'transparent', fontSize: 11, color: T.t1 }} />
                            </div>
                            <div className="overflow-y-auto" style={{ maxHeight: 150 }}>
                              {searched.map(p => {
                                const checked = scopePartnerIds.includes(p.id);
                                return (
                                  <button key={p.id}
                                    onClick={() => setScopePartnerIds(prev => checked ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 cursor-pointer border-none text-left"
                                    style={{ background: checked ? T.al : 'transparent', fontSize: 11, color: T.t1 }}
                                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = T.sh; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = checked ? T.al : 'transparent'; }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${checked ? T.ac : T.bd}`, background: checked ? T.ac : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {checked && <Check size={9} style={{ color: '#fff' }} />}
                                    </span>
                                    <span>{TYPE_BADGE[p.type] || '👤'}</span>
                                    <span className="flex-1 truncate">{p.name}</span>
                                    <span style={{ fontSize: 9, color: T.t3 }}>{p.type.replace('_', ' ')}</span>
                                  </button>
                                );
                              })}
                              {searched.length === 0 && (
                                <div className="px-3 py-3 text-center" style={{ fontSize: 11, color: T.t3 }}>{t('common.noResults', 'No results')}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {role === 'forwarder' && scopePartnerIds.length > 0 && (
                  <div>
                    <label style={labelStyle}>{t('priceLists.modal.direction', 'Direction')}</label>
                    <select value={scopeDirection} onChange={e => setScopeDirection(e.target.value)} style={inputStyle}>
                      <option value="">{t('priceLists.modal.noDirection', 'No direction')}</option>
                      <option value="sell">{t('priceLists.modal.sell', 'Sell (to customer)')}</option>
                      <option value="buy">{t('priceLists.modal.buy', 'Buy (from carrier)')}</option>
                    </select>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>{t('priceLists.detail.notes', 'Notes')}</label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder={t('priceLists.modal.notesPlaceholder', 'Optional notes…')}
                    style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.bg, color: T.t2, fontSize: 13, fontWeight: 500 }}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg cursor-pointer border-none text-white" style={{ background: T.ac, fontSize: 13, fontWeight: 600 }}>
            {isEdit ? t('priceLists.modal.saveChanges', 'Save Changes') : t('priceLists.modal.createLane', 'Create Lane')}
          </button>
        </div>
      </div>
    </div>
  );
}
