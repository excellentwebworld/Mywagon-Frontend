/**
 * SettingsDrawer — Price Lists settings (480px right drawer).
 *
 * Sections:
 * 1. Default Rates (all roles)
 * 2. Fuel Surcharge (all roles)
 * 3. Operating Costs (carrier only, with toll auto-derive + fleet comparison)
 * 4. Quote Settings (all roles)
 */
import { useState, useMemo } from 'react';
import { X, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { calcAvgTollPerKm, calcFuelSurchargePerKm, COMPANY_DEFAULTS } from '../../../mocks/priceListsData';

export default function SettingsDrawer({ open, onClose, role, defaults, onSave, lanes }) {
  const { t } = useTranslation();
  const { T } = useTheme();

  const [formData, setFormData] = useState(() => JSON.parse(JSON.stringify(defaults)));
  const [openSections, setOpenSections] = useState({ rates: true, fuel: true, operating: true, quote: true });

  const toggle = (key) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));
  const set = (path, value) => {
    setFormData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const tollAvg = useMemo(() => calcAvgTollPerKm(lanes || []), [lanes]);
  const surchargePerKm = useMemo(() => calcFuelSurchargePerKm(formData), [formData]);

  // Operating cost breakdown
  const opCosts = useMemo(() => {
    const op = formData.operatingCosts;
    const avgSpeed = 60;
    const driverPerKm = op.driverCostPerHour / avgSpeed;
    const fuelPerKm = (op.avgConsumptionL100Km / 100) * formData.fuelSurcharge.currentFuelPricePerLitre;
    const insurancePerKm = op.insuranceCostPerDay / (op.avgDrivingHoursPerDay * avgSpeed);
    const tollPerKm = op.tollCostSource === 'manual' ? (op.tollCostPerKmManual || 0) : tollAvg.avg;
    const total = driverPerKm + fuelPerKm + op.maintenanceCostPerKm + op.depreciationPerKm + insurancePerKm + tollPerKm;
    return {
      driverPerKm: Math.round(driverPerKm * 1000) / 1000,
      fuelPerKm: Math.round(fuelPerKm * 1000) / 1000,
      maintenancePerKm: op.maintenanceCostPerKm,
      depreciationPerKm: op.depreciationPerKm,
      insurancePerKm: Math.round(insurancePerKm * 1000) / 1000,
      tollPerKm: Math.round(tollPerKm * 1000) / 1000,
      total: Math.round(total * 1000) / 1000,
    };
  }, [formData, tollAvg]);

  if (!open) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const inputStyle = {
    width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 8,
    border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, outline: 'none',
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.t2, marginBottom: 4, display: 'block' };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{ width: 480, background: T.sf, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
              {t('priceLists.settings.title', 'Price List Settings')}
            </h2>
            <p style={{ fontSize: 12, color: T.t3, margin: 0 }}>
              {t('priceLists.settings.subtitle', 'Default rates, surcharges, and cost parameters.')}
            </p>
          </div>
          <button onClick={onClose} className="border-none cursor-pointer bg-transparent p-1 rounded" style={{ color: T.t3 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Section 1: Default Rates */}
          <DrawerSection title={t('priceLists.settings.defaultRates', 'Default rates')} sectionKey="rates"
            open={openSections.rates} onToggle={toggle} T={T}
            info={t('priceLists.settings.defaultRatesInfo', 'Used when no lane-specific pricing exists.')}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('priceLists.pricing.perKm', '€/km')} value={formData.defaultRates.perKm}
                onChange={(v) => set('defaultRates.perKm', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" step="0.01" />
              <Field label={t('priceLists.pricing.perPallet', '€/pallet')} value={formData.defaultRates.perPallet}
                onChange={(v) => set('defaultRates.perPallet', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
              <Field label={t('priceLists.pricing.perTonne', '€/tonne')} value={formData.defaultRates.perTonne}
                onChange={(v) => set('defaultRates.perTonne', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
              <Field label={t('priceLists.pricing.minimumCharge', 'Minimum €')} value={formData.defaultRates.minimumCharge}
                onChange={(v) => set('defaultRates.minimumCharge', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
            </div>
          </DrawerSection>

          {/* Section 2: Fuel Surcharge */}
          <DrawerSection title={t('priceLists.settings.fuelSurcharge', 'Fuel surcharge')} sectionKey="fuel"
            open={openSections.fuel} onToggle={toggle} T={T}>
            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}>
                <input
                  type="checkbox"
                  checked={formData.fuelSurcharge.enabled}
                  onChange={(e) => set('fuelSurcharge.enabled', e.target.checked)}
                />
                {t('priceLists.settings.fuelEnabled', 'Enable fuel surcharge')}
              </label>
            </div>
            {formData.fuelSurcharge.enabled && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Field label={t('priceLists.settings.baseFuel', 'Base fuel €/L')} value={formData.fuelSurcharge.baseFuelPricePerLitre}
                    onChange={(v) => set('fuelSurcharge.baseFuelPricePerLitre', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" step="0.01" />
                  <Field label={t('priceLists.settings.currentFuel', 'Current fuel €/L')} value={formData.fuelSurcharge.currentFuelPricePerLitre}
                    onChange={(v) => set('fuelSurcharge.currentFuelPricePerLitre', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" step="0.01" />
                  <Field label={t('priceLists.settings.avgConsumption', 'Avg L/100km')} value={formData.fuelSurcharge.avgConsumptionLPer100Km}
                    onChange={(v) => set('fuelSurcharge.avgConsumptionLPer100Km', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
                </div>
                {/* Live calculation */}
                <div className="rounded-lg p-3" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                  <div style={{ fontSize: 11, color: T.t3, marginBottom: 6, fontWeight: 600 }}>
                    {t('priceLists.settings.fuelCalc', 'Live calculation')}
                  </div>
                  <div className="flex justify-between" style={{ fontSize: 12, color: T.t2 }}>
                    <span>{t('priceLists.settings.priceDiff', 'Price difference')}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.t1 }}>
                      €{(formData.fuelSurcharge.currentFuelPricePerLitre - formData.fuelSurcharge.baseFuelPricePerLitre).toFixed(2)}/L
                    </span>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: 12, color: T.t2 }}>
                    <span>{t('priceLists.settings.surchargePerKm', 'Surcharge/km')}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: T.t1 }}>
                      €{surchargePerKm.toFixed(3)}/km
                    </span>
                  </div>
                  <div className="flex justify-between mt-1" style={{ fontSize: 12, color: T.t2 }}>
                    <span>{t('priceLists.settings.example500km', 'Example (500 km)')}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: T.ac }}>
                      €{(surchargePerKm * 500).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </DrawerSection>

          {/* Section 3: Operating Costs — carrier only */}
          {role === 'carrier' && (
            <DrawerSection
              title={t('priceLists.settings.operatingCosts', 'Operating costs')}
              sectionKey="operating" open={openSections.operating} onToggle={toggle} T={T}
              info={t('priceLists.settings.operatingInfo', 'Defaults used when no specific vehicle selected. Fleet vehicle costs override these.')}
            >
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label={t('priceLists.settings.driverCostHr', 'Driver €/hr')} value={formData.operatingCosts.driverCostPerHour}
                  onChange={(v) => set('operatingCosts.driverCostPerHour', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" step="0.5" />
                <Field label={t('priceLists.settings.avgDrivingHrs', 'Avg driving hrs/day')} value={formData.operatingCosts.avgDrivingHoursPerDay}
                  onChange={(v) => set('operatingCosts.avgDrivingHoursPerDay', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
                <Field label={t('priceLists.settings.maintenanceKm', 'Maintenance €/km')} value={formData.operatingCosts.maintenanceCostPerKm}
                  onChange={(v) => set('operatingCosts.maintenanceCostPerKm', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" step="0.01" />
                <Field label={t('priceLists.settings.insuranceDay', 'Insurance €/day')} value={formData.operatingCosts.insuranceCostPerDay}
                  onChange={(v) => set('operatingCosts.insuranceCostPerDay', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
                <Field label={t('priceLists.settings.depreciationKm', 'Depreciation €/km')} value={formData.operatingCosts.depreciationPerKm}
                  onChange={(v) => set('operatingCosts.depreciationPerKm', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" step="0.01" />
                <Field label={t('priceLists.settings.avgConsumptionOp', 'Avg L/100km')} value={formData.operatingCosts.avgConsumptionL100Km}
                  onChange={(v) => set('operatingCosts.avgConsumptionL100Km', Number(v))} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
              </div>

              {/* Toll cost/km auto-derive */}
              <div className="rounded-lg p-3 mb-3" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.t2, marginBottom: 6 }}>
                  {t('priceLists.settings.tollCostKm', 'Toll cost/km')}
                </div>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}>
                    <input
                      type="radio" name="tollSource"
                      checked={formData.operatingCosts.tollCostSource === 'auto'}
                      onChange={() => set('operatingCosts.tollCostSource', 'auto')}
                      className="mt-0.5"
                    />
                    <div>
                      <div>{t('priceLists.settings.tollAuto', 'Auto-derived from lanes (recommended)')}</div>
                      {tollAvg.count > 0 ? (
                        <div style={{ fontSize: 10, color: T.t3 }}>
                          €{tollAvg.avg.toFixed(3)}/km · {tollAvg.count} {t('priceLists.settings.lanesWithTolls', 'lanes')} · €{tollAvg.totalTolls.toFixed(0)}/{tollAvg.totalKm.toLocaleString()} km
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: '#F59E0B' }}>
                          {t('priceLists.settings.noTollData', 'No toll data yet — add toll costs to lanes')}
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}>
                    <input
                      type="radio" name="tollSource"
                      checked={formData.operatingCosts.tollCostSource === 'manual'}
                      onChange={() => set('operatingCosts.tollCostSource', 'manual')}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div>{t('priceLists.settings.tollManual', 'Use custom value')}</div>
                      {formData.operatingCosts.tollCostSource === 'manual' && (
                        <input
                          type="number" step="0.001" value={formData.operatingCosts.tollCostPerKmManual || ''}
                          onChange={(e) => set('operatingCosts.tollCostPerKmManual', Number(e.target.value))}
                          placeholder="0.097"
                          style={{ ...inputStyle, width: 120, marginTop: 4 }}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Live total breakdown */}
              <div className="rounded-lg p-3 mb-3" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.t2, marginBottom: 6 }}>
                  {t('priceLists.settings.costBreakdown', 'Total cost/km breakdown')}
                </div>
                <CostLine T={T} label={t('priceLists.profitability.driver', 'Driver/km')} value={opCosts.driverPerKm} />
                <CostLine T={T} label={t('priceLists.profitability.fuel', 'Fuel/km')} value={opCosts.fuelPerKm} />
                <CostLine T={T} label={t('priceLists.profitability.maintenance', 'Maintenance/km')} value={opCosts.maintenancePerKm} />
                <CostLine T={T} label={t('priceLists.profitability.depreciation', 'Depreciation/km')} value={opCosts.depreciationPerKm} />
                <CostLine T={T} label={t('priceLists.profitability.insurance', 'Insurance/km')} value={opCosts.insurancePerKm} />
                <CostLine T={T} label={`${t('priceLists.profitability.tolls', 'Tolls/km')} ${formData.operatingCosts.tollCostSource === 'auto' ? `(${t('priceLists.settings.auto', 'auto')} · ${tollAvg.count} ${t('priceLists.settings.lanes', 'lanes')})` : ''}`}
                  value={opCosts.tollPerKm} />
                <div style={{ height: 1, background: T.bd, margin: '6px 0' }} />
                <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>
                  <span>{t('priceLists.settings.totalCostKm', 'TOTAL COST/KM')}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>€{opCosts.total.toFixed(3)}</span>
                </div>
                <div className="flex justify-between mt-1" style={{ fontSize: 12, fontWeight: 700, color: T.ac }}>
                  <span>{t('priceLists.settings.breakEven', 'BREAK-EVEN')}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>€{opCosts.total.toFixed(2)}/km</span>
                </div>
              </div>
            </DrawerSection>
          )}

          {/* Section 4: Quote Settings */}
          <DrawerSection title={t('priceLists.settings.quoteSettings', 'Quote settings')} sectionKey="quote"
            open={openSections.quote} onToggle={toggle} T={T}>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}>
                <input
                  type="checkbox"
                  checked={formData.quoteSettings.autoApplyFuelSurcharge}
                  onChange={(e) => set('quoteSettings.autoApplyFuelSurcharge', e.target.checked)}
                />
                {t('priceLists.settings.autoApplySurcharge', 'Auto-apply fuel surcharge')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}>
                <input
                  type="checkbox"
                  checked={formData.quoteSettings.showCostBreakdown}
                  onChange={(e) => set('quoteSettings.showCostBreakdown', e.target.checked)}
                />
                {t('priceLists.settings.showBreakdown', 'Show cost breakdown in quotes')}
              </label>
              <Field label={t('priceLists.settings.quoteValidityDays', 'Default quote validity (days)')}
                value={formData.quoteSettings.defaultQuoteValidityDays}
                onChange={(v) => set('quoteSettings.defaultQuoteValidityDays', Number(v))}
                inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
            </div>
          </DrawerSection>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 p-4" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button
            onClick={onClose}
            className="rounded-lg cursor-pointer border-none"
            style={{ padding: '8px 20px', fontSize: 13, background: T.sa, color: T.t1, border: `1px solid ${T.bd}` }}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg cursor-pointer border-none"
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, background: T.ac, color: '#fff' }}
          >
            {t('common.save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function DrawerSection({ title, sectionKey, open, onToggle, T, children, info }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.bd}` }}>
      <button
        onClick={() => onToggle(sectionKey)}
        className="flex items-center justify-between w-full border-none cursor-pointer bg-transparent"
        style={{ padding: '14px 16px' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = T.sh; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{title}</span>
        {open ? <ChevronDown size={14} style={{ color: T.t3 }} /> : <ChevronRight size={14} style={{ color: T.t3 }} />}
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {info && (
            <div className="flex items-start gap-2 rounded-lg p-2.5 mb-3" style={{ background: T.al, fontSize: 11, color: T.ac }}>
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, inputStyle, labelStyle, type = 'text', step, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        step={step}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function CostLine({ T, label, value }) {
  return (
    <div className="flex justify-between" style={{ fontSize: 11, color: T.t2, padding: '2px 0' }}>
      <span>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.t1 }}>€{value.toFixed(3)}</span>
    </div>
  );
}
