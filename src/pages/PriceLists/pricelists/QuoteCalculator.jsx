/**
 * QuoteCalculator — Rate lookup / quote resolution tool.
 *
 * Used by: Shipper, Forwarder, Carrier.
 *
 * Enter origin/destination, pallets, weight, vehicle type.
 * Resolves: lane match → pricing → fuel surcharge → minimum charge → weight breaks.
 * Carrier gets fleet vehicle picker for per-vehicle profitability.
 *
 * @API: GET /api/v1/price-lists/quote?stops=A,B&pallets=N&weight=W&vehicle=V
 */

import { useCallback, useMemo, useState } from 'react';
import { X, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import {
  CITIES, resolveCity, cityLabel, getDistance,
  calcFuelSurchargePerKm, getPrimaryUnit, getPrimaryPrice,
} from '../../../mocks/priceListsData';

const VEHICLE_TYPES = ['van', 'rigid', 'semi'];

export default function QuoteCalculator({ open, onClose, lanes, defaults, role }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = i18n.language;

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [pallets, setPallets] = useState('');
  const [weight, setWeight] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const cityOptions = CITIES.map(c => lang === 'el' ? `${c.el} (${c.en})` : c.en);

  const calculate = useCallback(() => {
    const oCity = resolveCity(origin);
    const dCity = resolveCity(destination);
    if (!oCity || !dCity || oCity === dCity) { setResult({ error: 'invalid' }); return; }

    const km = getDistance(oCity, dCity);

    // Quote resolution order per spec
    // 1. Exact lane match (origin → destination)
    const candidates = lanes.filter(l =>
      l.status === 'active' &&
      l.stops[0]?.city === oCity &&
      l.stops[l.stops.length - 1]?.city === dCity
    );

    // 2. Prefer customer-specific over default; most recent first
    const sorted = [...candidates].sort((a, b) => {
      if (a.scope !== 'default' && b.scope === 'default') return -1;
      if (a.scope === 'default' && b.scope !== 'default') return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const matched = sorted[0] || null;

    if (!matched) {
      // No match → company default rates
      const defRate = defaults?.defaultRates;
      if (!defRate) { setResult({ error: 'noMatch' }); return; }
      const estKm = km || 0;
      const price = estKm * defRate.perKm;
      const surcharge = calcFuelSurchargePerKm(defaults) * estKm;
      const total = Math.max(price + surcharge, defRate.minimumCharge);
      setResult({
        type: 'default',
        lane: null,
        km: estKm,
        price: Math.round(price * 100) / 100,
        surcharge: Math.round(surcharge * 100) / 100,
        total: Math.round(total * 100) / 100,
        rate: defRate.perKm,
        unit: 'km',
        breakdown: { base: price, surcharge, minimum: defRate.minimumCharge },
      });
      return;
    }

    // Matched lane
    const laneKm = matched.totalKm || km || 0;
    let price = 0;
    let unit = getPrimaryUnit(matched);

    // Vehicle-specific rate
    if (vehicleType && matched.vehicleRates) {
      const vr = matched.vehicleRates.find(v => v.vehicleType === vehicleType);
      if (vr) {
        price = vr.perLoad || (vr.perKm ? vr.perKm * laneKm : 0);
        unit = vr.perLoad ? 'load' : 'km';
      }
    }

    // Weight breaks
    if (!price && pallets && matched.weightBreaks) {
      const qty = Number(pallets);
      const tier = matched.weightBreaks.find(b => qty >= b.minQty && (!b.maxQty || qty <= b.maxQty));
      if (tier?.perPallet) {
        price = tier.perPallet * qty;
        unit = 'pallet';
      } else if (tier?.perTonne && weight) {
        price = tier.perTonne * Number(weight);
        unit = 'tonne';
      }
    }

    // Primary pricing fallback
    if (!price) {
      const p = matched.pricing;
      if (p.perLoad) { price = p.perLoad; unit = 'load'; }
      else if (p.perPallet && pallets) { price = p.perPallet * Number(pallets); unit = 'pallet'; }
      else if (p.perKm) { price = p.perKm * laneKm; unit = 'km'; }
      else if (p.perTonne && weight) { price = p.perTonne * Number(weight); unit = 'tonne'; }
      else if (p.perKg && weight) { price = p.perKg * Number(weight) * 1000; unit = 'kg'; }
      else { price = getPrimaryPrice(matched); }
    }

    // Fuel surcharge
    const surcharge = defaults?.fuelSurcharge?.enabled ? calcFuelSurchargePerKm(defaults) * laneKm : 0;

    // Minimum charge
    const minCharge = matched.pricing.minimumCharge || defaults?.defaultRates?.minimumCharge || 0;
    const total = Math.max(price + surcharge, minCharge);

    setResult({
      type: 'match',
      lane: matched,
      km: laneKm,
      price: Math.round(price * 100) / 100,
      surcharge: Math.round(surcharge * 100) / 100,
      total: Math.round(total * 100) / 100,
      unit,
      minApplied: price + surcharge < minCharge,
      breakdown: { base: price, surcharge, minimum: minCharge },
    });
  }, [origin, destination, pallets, weight, vehicleType, lanes, defaults]);

  if (!open) return null;

  const inputStyle = { fontSize: 13, padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, outline: 'none', width: '100%' };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.t2, marginBottom: 3, display: 'block' };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] flex flex-col rounded-2xl shadow-2xl"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
            <Calculator size={18} style={{ color: T.ac }} />
            {t('priceLists.calculator.title', 'Quote Calculator')}
          </h3>
          <button onClick={onClose} className="p-1 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{t('priceLists.modal.origin', 'Origin')}</label>
              <input list="calc-cities-o" value={origin} onChange={e => setOrigin(e.target.value)} style={inputStyle} />
              <datalist id="calc-cities-o">{cityOptions.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label style={labelStyle}>{t('priceLists.modal.destination', 'Destination')}</label>
              <input list="calc-cities-d" value={destination} onChange={e => setDestination(e.target.value)} style={inputStyle} />
              <datalist id="calc-cities-d">{cityOptions.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>{t('priceLists.calculator.pallets', 'Pallets')}</label>
              <input type="number" min="0" value={pallets} onChange={e => setPallets(e.target.value)} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('priceLists.calculator.weight', 'Weight (t)')}</label>
              <input type="number" min="0" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('priceLists.calculator.vehicle', 'Vehicle')}</label>
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <button onClick={calculate} className="w-full py-2.5 rounded-lg cursor-pointer border-none text-white"
            style={{ background: T.ac, fontSize: 13, fontWeight: 600 }}>
            {t('priceLists.calculator.calculate', 'Calculate Quote')}
          </button>

          {/* Result */}
          {result && (
            <div className="rounded-xl px-4 py-3 mt-2" style={{ background: T.bg, border: `1px solid ${T.bd}` }}>
              {result.error === 'invalid' && (
                <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>{t('priceLists.calculator.invalidRoute', 'Please enter valid, different cities')}</div>
              )}
              {result.error === 'noMatch' && (
                <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>{t('priceLists.calculator.noMatch', 'No lane or default rate found')}</div>
              )}
              {!result.error && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.t3 }}>
                      {result.type === 'match'
                        ? `${t('priceLists.calculator.laneMatch', 'Lane match')}: ${result.lane.id}`
                        : t('priceLists.calculator.defaultRate', 'Company default rate')}
                    </span>
                    <span style={{ fontSize: 11, color: T.t3 }}>{result.km} km</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: T.ac, marginBottom: 4 }}>
                    €{result.total.toFixed(2)}
                  </div>
                  {result.minApplied && (
                    <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 500 }}>
                      {t('priceLists.calculator.minApplied', 'Minimum charge applied')}
                    </div>
                  )}

                  <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 border-none cursor-pointer bg-transparent mt-2"
                    style={{ fontSize: 11, color: T.ac, fontWeight: 600 }}>
                    {t('priceLists.calculator.breakdown', 'Breakdown')}
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {expanded && (
                    <div className="mt-2 space-y-1" style={{ fontSize: 11 }}>
                      <div className="flex justify-between" style={{ color: T.t2 }}>
                        <span>{t('priceLists.calculator.basePrice', 'Base price')} ({result.unit})</span>
                        <span>€{result.price.toFixed(2)}</span>
                      </div>
                      {result.surcharge > 0 && (
                        <div className="flex justify-between" style={{ color: T.t2 }}>
                          <span>{t('priceLists.pricing.fuelSurcharge', 'Fuel surcharge')}</span>
                          <span>+€{result.surcharge.toFixed(2)}</span>
                        </div>
                      )}
                      {result.type === 'match' && result.lane?.routeLabel && (
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

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 shrink-0" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer border-none"
            style={{ background: T.bg, color: T.t2, fontSize: 13, fontWeight: 500 }}>{t('common.close', 'Close')}</button>
        </div>
      </div>
    </div>
  );
}
