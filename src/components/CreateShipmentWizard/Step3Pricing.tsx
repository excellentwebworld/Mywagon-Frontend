import React, { useState, useMemo, useEffect } from 'react';
import { useFormikContext } from 'formik';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { formatVehicleSelectionSummary } from './vehicleTypes';
import { useVehicleTypes } from '../../hooks/useVehicleTypes';
import {
  ArrowLeft,
  Check,
  Search,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  MapPin,
  Sparkles,
  Smartphone,
  Star,
  Users,
  Calendar,
  Layers,
  Repeat,
  Plus,
  X,
  FileText,
  Save,
  Globe,
  Settings,
} from 'lucide-react';

import { SearchableSelect } from '../ui/SearchableSelect';

// Mocks
import { PARTNERS } from '../../mocks/partnersMasterData';

const T = {
  bg: 'var(--bg)',
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
  sh: 'var(--surface-hover)',
  bd: 'var(--border)',
  bf: 'var(--border-focus)',
  t1: 'var(--text-primary)',
  t2: 'var(--text-secondary)',
  t3: 'var(--text-tertiary)',
  ac: 'var(--accent)',
  al: 'var(--accent-light)',
  ah: 'var(--accent-hover)',
  ap: 'var(--accent-light)',
};

interface Step3PricingProps {
  onBackStep: () => void;
  onSubmit: () => void;
}

export const Step3Pricing: React.FC<Step3PricingProps> = ({ onBackStep, onSubmit }) => {
  const { t, lang } = useTranslation();
  const { locations, showToast } = useApp();
  const { values, setFieldValue, isSubmitting } = useFormikContext<any>();
  const stops = values.stops || [];

  // Local Accordion states
  const [coOpen, setCoOpen] = useState(true);
  const [frOpen, setFrOpen] = useState(true);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [trackingExpanded, setTrackingExpanded] = useState(true);
  const [carrierQuery, setCarrierQuery] = useState('');

  // 1. CARRIERS AND CONTRACTS
  const carriersList = useMemo(() => {
    return PARTNERS.filter((p) => p.status === 'active' && (p.type === 'carrier_company' || p.type === 'freelancer_driver'));
  }, []);

  const carrierCompanies = useMemo(() => {
    return carriersList.filter((c) => c.type === 'carrier_company');
  }, [carriersList]);

  const freelancerDrivers = useMemo(() => {
    return carriersList.filter((c) => c.type === 'freelancer_driver');
  }, [carriersList]);

  const selectedCarriersDetails = useMemo(() => {
    return carriersList.filter((c) => (values.selectedCarriers || []).includes(c.id));
  }, [carriersList, values.selectedCarriers]);

  // Find first selected carrier with a contract
  const contractCarrier = useMemo(() => {
    return selectedCarriersDetails.find((c) => c.contractLanes && c.contractLanes.length > 0);
  }, [selectedCarriersDetails]);

  const contract = useMemo(() => {
    return contractCarrier?.contractLanes?.[0];
  }, [contractCarrier]);

  const { vehicleTypes } = useVehicleTypes();

  // Dynamic selected vehicles from Step 2
  const selectedVehicleTypesStr = useMemo(() => {
    const locale = lang === 'el' ? 'el' : 'en';
    const { types, specs } = formatVehicleSelectionSummary(values.vehicleSpecs || {}, locale, vehicleTypes);
    if (types.length === 0) return '—';
    const specPart = specs.length > 0 ? ` (${specs.join(', ')})` : '';
    return types.join(', ') + specPart;
  }, [values.vehicleSpecs, lang, vehicleTypes]);

  // 2. STATS & PRICING
  const totalPallets = useMemo(() => {
    let p = 0;
    stops.forEach((s: any) =>
      s.lines.forEach((l: any) => {
        if (l.action === 'pickup') p += parseFloat(l.qty) || 0;
      })
    );
    return Math.max(p, 32); // Fallback to 32 pallets if empty
  }, [stops]);

  const totalKm = 463; // Athens -> Thessaloniki -> Volos lane distance
  const targetPriceVal = parseFloat(values.targetPrice) || 0;
  const pricePerKm = targetPriceVal > 0 ? (targetPriceVal / totalKm).toFixed(2) : '0.00';
  const pricePerPallet = targetPriceVal > 0 ? (targetPriceVal / totalPallets).toFixed(2) : '0.00';

  // Calculate pricing based on contract/spot rules
  const calculatedPrice = useMemo(() => {
    if (contract) {
      if (contract.unit === 'per_pallet' || contract.unit === 'PER_PALLET') {
        return contract.price * totalPallets;
      }
      return contract.price;
    }
    return 750; // Spot price default
  }, [contract, totalPallets]);

  // Set default price when carriers selection changes
  useEffect(() => {
    if (!values.targetPrice) {
      setFieldValue('targetPrice', String(calculatedPrice));
    }
  }, [calculatedPrice, values.targetPrice, setFieldValue]);

  // Override status
  const isOverride = targetPriceVal !== calculatedPrice;

  // 3. TRACKING LINK GROUPED BY CUSTOMERS
  const orderLinesGrouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const ungrouped: any[] = [];

    stops.forEach((s: any) =>
      s.lines.forEach((l: any) => {
        if (l.productId) {
          const orderId = l.orderId || l.orderRef || `PAR-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          const route = `Ioannina → ${s.locationCity || 'Mandra'}`;
          const loc = `${s.locationName || 'MANDRA EO Elefsinas'}, ${s.locationCity || 'Attica'}`;
          const item = {
            orderId,
            route,
            location: loc,
            customerName: l.customerName,
          };

          const key = l.customerName || '__none__';
          if (key === '__none__') {
            ungrouped.push(item);
          } else {
            if (!groups[key]) groups[key] = [];
            if (!groups[key].some((x) => x.orderId === orderId)) {
              groups[key].push(item);
            }
          }
        }
      })
    );

    // Fallback if no lines added
    if (Object.keys(groups).length === 0 && ungrouped.length === 0) {
      groups['Alpha Foods Ltd'] = [
        { orderId: 'PAR-12345', route: 'Ioannina → Mandra', location: 'MANDRA EO Elefsinas, Attica', customerName: 'Alpha Foods Ltd' },
        { orderId: 'PAR-99001', route: 'Ioannina → Mandra', location: 'MANDRA EO Elefsinas, Attica', customerName: 'Gamma Logistics' }
      ];
      groups['Beta Distributors'] = [
        { orderId: 'PAR-54321', route: 'Ioannina → Kalyvia', location: 'Kalyvia Thorikou, Attica', customerName: 'Beta Distributors' }
      ];
    }

    return { groups, ungrouped };
  }, [stops]);

  // Collapsible tracking groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Prefill default email lists per orderId
  useEffect(() => {
    const nextEmails = { ...values.trackingEmails };
    let changed = false;

    // Scan groups
    Object.values(orderLinesGrouped.groups).flat().forEach((o: any) => {
      if (!nextEmails[o.orderId]) {
        // Mock emails mapping
        const defaults: Record<string, string[]> = {
          'PAR-12345': ['contact@alphafoods.com', ''],
          'PAR-99001': ['ops@gammalogistics.gr'],
          'PAR-54321': [''],
        };
        nextEmails[o.orderId] = defaults[o.orderId] || [''];
        changed = true;
      }
    });

    if (changed) {
      setFieldValue('trackingEmails', nextEmails);
    }
  }, [orderLinesGrouped, values.trackingEmails, setFieldValue]);

  // Tracking operations
  const addEmailField = (orderId: string) => {
    const cur = values.trackingEmails[orderId] || [];
    setFieldValue(`trackingEmails.${orderId}`, [...cur, '']);
  };

  const updateEmailField = (orderId: string, emailIdx: number, val: string) => {
    const cur = [...(values.trackingEmails[orderId] || [])];
    cur[emailIdx] = val;
    setFieldValue(`trackingEmails.${orderId}`, cur);
  };

  const removeEmailField = (orderId: string, emailIdx: number) => {
    const cur = values.trackingEmails[orderId] || [];
    const next = cur.filter((_: any, idx: number) => idx !== emailIdx);
    setFieldValue(`trackingEmails.${orderId}`, next.length ? next : ['']);
  };

  // 4. BULK LOAD TOTAL COMPUTATIONS
  const bulkTotal = useMemo(() => {
    if (values.bulkMode === 'qty') return values.bulkQty;
    if (values.bulkMode === 'dates') {
      return (values.bulkDates || []).reduce((sum: number, d: any) => sum + d.qty, 0);
    }
    if (values.bulkMode === 'rec') {
      return values.bulkRecQty * values.bulkRecOccurrences;
    }
    return 1;
  }, [values.bulkMode, values.bulkQty, values.bulkDates, values.bulkRecQty, values.bulkRecOccurrences]);

  // Bulk loaders adjustments
  const bqc = (d: number) => {
    setFieldValue('bulkQty', Math.max(1, Math.min(50, values.bulkQty + d)));
  };

  const rqc = (d: number) => {
    setFieldValue('bulkRecQty', Math.max(1, Math.min(50, values.bulkRecQty + d)));
  };

  const bdc = (idx: number, d: number) => {
    const list = [...(values.bulkDates || [])];
    if (list[idx]) {
      list[idx].qty = Math.max(1, Math.min(50, list[idx].qty + d));
      setFieldValue('bulkDates', list);
    }
  };

  const addBulkDate = () => {
    const list = [...(values.bulkDates || [])];
    const d = new Date();
    d.setDate(d.getDate() + list.length + 1);
    list.push({ date: d.toISOString().split('T')[0], qty: 2 });
    setFieldValue('bulkDates', list);
  };

  // 5. CARRIERS SELECTION ACTION
  const toggleCarrier = (cid: string) => {
    const cur = values.selectedCarriers || [];
    const next = cur.includes(cid) ? cur.filter((id: string) => id !== cid) : [...cur, cid];
    setFieldValue('selectedCarriers', next);
  };

  // filter match logic
  const matchesFilter = (c: any) => {
    if (!carrierQuery) return true;
    const q = carrierQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.city || c.region || 'Athens').toLowerCase().includes(q);
  };

  return (
    <div className="pb-24">
      {/* ═══ TWO COLUMN GRID MATCHING page3-vehicle-pricing.html ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-4">
        {/* LEFT COLUMN: Broadcast, Bulk Load, Tracking Links */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* BROADCAST TYPE */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12 }}>
            <div className="ch flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: T.bd }}>
              <Globe size={18} style={{ color: T.t2 }} />
              <span className="font-semibold text-sm">{t('broadcastType') || 'Broadcast Type'}</span>
            </div>
            <div className="cb p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Private Network */}
                <div
                  className={`bcc cursor-pointer border-2 p-4 rounded-xl relative transition-all ${
                    values.broadcastType === 'private' ? 'sel' : ''
                  }`}
                  style={{
                    borderColor: values.broadcastType === 'private' ? T.ac : T.bd,
                    background: values.broadcastType === 'private' ? T.ap : 'transparent',
                  }}
                  onClick={() => setFieldValue('broadcastType', 'private')}
                >
                  {values.broadcastType === 'private' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: T.ac }}>
                      ✓
                    </div>
                  )}
                  <div className="text-2xl mb-2">👥</div>
                  <div className="text-sm font-bold text-slate-800">{t('privateNetwork') || 'Private Network'}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{t('privateNetworkDesc') || 'Send only to your partner carriers.'}</div>
                </div>

                {/* Public Marketplace */}
                <div
                  className={`bcc cursor-pointer border-2 p-4 rounded-xl relative transition-all ${
                    values.broadcastType === 'public' ? 'sel' : ''
                  }`}
                  style={{
                    borderColor: values.broadcastType === 'public' ? T.ac : T.bd,
                    background: values.broadcastType === 'public' ? T.ap : 'transparent',
                  }}
                  onClick={() => setFieldValue('broadcastType', 'public')}
                >
                  {values.broadcastType === 'public' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: T.ac }}>
                      ✓
                    </div>
                  )}
                  <div className="text-2xl mb-2">🌐</div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    {t('publicMarketplace') || 'Public Marketplace'}
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white bg-indigo-600">BETA</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{t('publicMarketplaceDesc') || 'Publish to the entire carrier marketplace.'}</div>
                </div>

                {/* My Fleet (disabled) */}
                <div className="border-2 p-4 rounded-xl opacity-50 bg-slate-100 cursor-not-allowed">
                  <div className="text-2xl mb-2">🚛</div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    {t('myFleet') || 'My Fleet'}
                    <span className="text-[8px] font-bold px-1 rounded bg-slate-300 text-slate-600">SOON</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{t('myFleetDesc') || 'Assign the load to a driver of your own fleet.'}</div>
                </div>
              </div>

              {/* Private network carriers search & accordion list */}
              {values.broadcastType === 'private' && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: T.bd }}>
                  <div className="bg-sky-50 text-sky-700 p-2.5 rounded-lg text-xs flex items-center gap-2 mb-3">
                    <Check size={14} className="text-sky-600 shrink-0" />
                    <span>
                      {t('vehicleSelectionFromLoad') || 'Vehicle selection from load:'} <strong>{selectedVehicleTypesStr}</strong>
                    </span>
                  </div>

                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg text-xs mb-3 outline-none"
                    placeholder={t('searchCarrier') || 'Search carrier...'}
                    value={carrierQuery}
                    onChange={(e) => setCarrierQuery(e.target.value)}
                  />

                  <div className="text-xs font-semibold mb-2" style={{ color: T.ac, cursor: 'pointer' }}>
                    {t('invitePartner') || '＋ Invite new partner carrier'}
                  </div>

                  {/* CARRIER COMPANIES ACCORDION */}
                  <div className="border rounded-lg overflow-hidden mb-2">
                    <div
                      className="flex items-center justify-between px-3 py-2 cursor-pointer bg-slate-50 text-xs font-bold"
                      onClick={() => setCoOpen(!coOpen)}
                    >
                      <span className="flex items-center gap-1">
                        <span className={`transform transition-transform text-[9px] ${coOpen ? 'rotate-90' : ''}`}>▶</span>
                        {t('carrierCompanies') || 'CARRIER COMPANIES'}
                      </span>
                    </div>
                    {coOpen && (
                      <div className="divide-y">
                        {carrierCompanies.filter(matchesFilter).map((c) => {
                          const isSel = (values.selectedCarriers || []).includes(c.id);
                          return (
                            <div
                              key={c.id}
                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50"
                              onClick={() => toggleCarrier(c.id)}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] text-white ${
                                  isSel ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                                }`}
                              >
                                {isSel && '✓'}
                              </div>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-violet-100 text-indigo-700">
                                {(c as any).init || c.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  {c.name}
                                  {(c.contractLanes && c.contractLanes.length > 0) ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-indigo-700 bg-violet-100">
                                      {t('contract') || 'CONTRACT'}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-amber-800 bg-amber-100">
                                      {t('spot') || 'SPOT'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {(c as any).city || c.region || 'Athens'} · {c.rating}★ · {c.loadsLifetime} {t('trips') || 'trips'}
                                </div>
                                <div className="flex gap-1 mt-1">
                                  {(c.trucks || []).map((t: any, ti: number) => (
                                    <span key={ti} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {t.type}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* FREELANCER DRIVERS ACCORDION */}
                  <div className="border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between px-3 py-2 cursor-pointer bg-slate-50 text-xs font-bold"
                      onClick={() => setFrOpen(!frOpen)}
                    >
                      <span className="flex items-center gap-1">
                        <span className={`transform transition-transform text-[9px] ${frOpen ? 'rotate-90' : ''}`}>▶</span>
                        {t('freelancerDrivers') || 'FREELANCER DRIVERS'}
                      </span>
                    </div>
                    {frOpen && (
                      <div className="divide-y">
                        {freelancerDrivers.filter(matchesFilter).map((c) => {
                          const isSel = (values.selectedCarriers || []).includes(c.id);
                          return (
                            <div
                              key={c.id}
                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50"
                              onClick={() => toggleCarrier(c.id)}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] text-white ${
                                  isSel ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                                }`}
                              >
                                {isSel && '✓'}
                              </div>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-violet-100 text-indigo-700">
                                {(c as any).init || c.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800">
                                  {c.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {(c as any).city || c.region || 'Athens'} · {c.rating}★ · {c.loadsLifetime} {t('trips') || 'trips'}
                                </div>
                                <div className="flex gap-1 mt-1">
                                  {(c.trucks || []).map((t: any, ti: number) => (
                                    <span key={ti} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {t.type}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected carrier strip cards */}
                  {selectedCarriersDetails.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {selectedCarriersDetails.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg flex items-center justify-between bg-slate-100 relative"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-violet-200 text-indigo-700 shrink-0">
                              {(c as any).init || c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                {c.name}
                                {(c.contractLanes && c.contractLanes.length > 0) && (
                                  <span className="text-[8px] font-bold px-1 rounded text-indigo-700 bg-violet-200">
                                    {t('contract') || 'CONTRACT'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {(c as any).city || c.region || 'Athens'} · {c.rating}★ · {c.type} · {c.trucks?.map((t: any) => t.type).join(', ') || 'Tilt, Curtainsider'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="w-5 h-5 rounded-full flex items-center justify-center border bg-white cursor-pointer text-xs"
                            onClick={() => toggleCarrier(c.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BULK LOAD CREATION */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12 }}>
            <div className="ch flex items-center gap-2 px-5 py-4 border-b animate-fade-in" style={{ borderColor: T.bd }}>
              <Layers size={18} style={{ color: T.t2 }} />
              <span className="font-semibold text-sm">{t('bulkLoadCreation') || 'Bulk Load Creation'}</span>
              <span className="text-xs text-slate-400 font-normal ml-auto">{t('bulkLoadCreationDesc') || 'Create multiple identical loads'}</span>
            </div>
            <div className="cb p-5">
              {/* Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1 mb-4">
                {[
                  { id: 'single', label: t('singleLoad') || 'Single Load' },
                  { id: 'qty', label: t('multipleSameDay') || 'Multiple (same day)' },
                  { id: 'dates', label: t('multipleDates') || 'Multiple dates' },
                  { id: 'rec', label: t('recurring') || 'Recurring' },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    type="button"
                    className={`flex-1 py-2 px-1 text-center text-xs font-semibold rounded-md border-none cursor-pointer ${
                      values.bulkMode === tb.id ? 'bg-white shadow' : 'bg-transparent text-slate-400'
                    }`}
                    onClick={() => setFieldValue('bulkMode', tb.id)}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              {/* Single Mode Panel */}
              {values.bulkMode === 'single' && (
                <div className="text-center py-4 text-xs text-slate-400">
                  {t('singleLoadSub') || '1 load will be created. Select another tab for bulk creation.'}
                </div>
              )}

              {/* Quantity Mode Panel */}
              {values.bulkMode === 'qty' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600">{t('identicalLoadsLabel') || 'Number of identical loads'}</label>
                    <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50">
                      <button
                        type="button"
                        className="w-8 h-8 border-none bg-transparent cursor-pointer font-bold"
                        onClick={() => bqc(-1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className="w-11 h-8 border-y-0 border-x text-center text-xs font-bold font-mono outline-none"
                        value={values.bulkQty}
                        onChange={(e) => setFieldValue('bulkQty', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <button
                        type="button"
                        className="w-8 h-8 border-none bg-transparent cursor-pointer font-bold"
                        onClick={() => bqc(1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="bg-green-50 text-green-700 p-2.5 rounded-lg text-xs font-semibold">
                    ✓ <strong>{values.bulkQty}</strong> {t('loadsWillBeCreated') || 'loads will be created'}
                  </div>
                </div>
              )}

              {/* Dates Mode Panel */}
              {values.bulkMode === 'dates' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {(values.bulkDates || []).map((bd: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="date"
                          className="flex-1 p-2 border rounded-lg text-xs outline-none"
                          value={bd.date}
                          onChange={(e) => {
                            const list = [...values.bulkDates];
                            list[idx].date = e.target.value;
                            setFieldValue('bulkDates', list);
                          }}
                        />
                        <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            className="w-8 h-8 border-none bg-transparent cursor-pointer font-bold"
                            onClick={() => bdc(idx, -1)}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="w-11 h-8 border-y-0 border-x text-center text-xs font-bold font-mono outline-none"
                            value={bd.qty}
                            onChange={(e) => {
                              const list = [...values.bulkDates];
                              list[idx].qty = Math.max(1, parseInt(e.target.value) || 1);
                              setFieldValue('bulkDates', list);
                            }}
                          />
                          <button
                            type="button"
                            className="w-8 h-8 border-none bg-transparent cursor-pointer font-bold"
                            onClick={() => bdc(idx, 1)}
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400">{t('loadsLabel') || 'loads'}</span>
                        {values.bulkDates.length > 1 && (
                          <button
                            type="button"
                            className="text-xs p-1 cursor-pointer bg-transparent border-none text-slate-400 hover:text-red-500"
                            onClick={() => {
                              const list = values.bulkDates.filter((_: any, i: number) => i !== idx);
                              setFieldValue('bulkDates', list);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="w-full py-2 border border-dashed rounded-lg text-xs font-bold text-indigo-700 bg-transparent cursor-pointer"
                    onClick={addBulkDate}
                  >
                    {t('addDateBtn') || '+ Add date'}
                  </button>

                  <div className="bg-green-50 text-green-700 p-2.5 rounded-lg text-xs font-semibold">
                    ✓ <strong>{bulkTotal}</strong> {t('loadsWillBeCreated') || 'loads will be created'} ({ (values.bulkDates || []).map((x: any) => x.qty).join(' + ') })
                  </div>
                </div>
              )}

              {/* Recurring Mode Panel */}
              {values.bulkMode === 'rec' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600">{t('loadsPerRecurrence') || 'Loads per recurrence'}</label>
                    <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50">
                      <button
                        type="button"
                        className="w-8 h-8 border-none bg-transparent cursor-pointer font-bold"
                        onClick={() => rqc(-1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className="w-11 h-8 border-y-0 border-x text-center text-xs font-bold font-mono outline-none"
                        value={values.bulkRecQty}
                        onChange={(e) => setFieldValue('bulkRecQty', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <button
                        type="button"
                        className="w-8 h-8 border-none bg-transparent cursor-pointer font-bold"
                        onClick={() => rqc(1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600">{t('repeat') || 'Repeat'}</label>
                    <select
                      className="p-2 border rounded-lg text-xs outline-none w-36"
                      value={values.bulkRecType}
                      onChange={(e) => setFieldValue('bulkRecType', e.target.value)}
                    >
                      <option value="daily">{t('daily') || 'Daily'}</option>
                      <option value="weekly">{t('weekly') || 'Weekly'}</option>
                      <option value="monthly">{t('monthly') || 'Monthly'}</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600">{t('endAfter') || 'End after'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-16 p-2 border rounded-lg text-xs outline-none font-mono text-right"
                        value={values.bulkRecOccurrences}
                        onChange={(e) => setFieldValue('bulkRecOccurrences', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <span className="text-xs text-slate-400">{t('occurrences') || 'occurrences'}</span>
                    </div>
                  </div>

                  <div className="bg-indigo-50 text-indigo-700 p-2.5 rounded-lg text-xs font-semibold">
                    ✓ <strong>{bulkTotal}</strong> {t('loadsWillBeCreated') || 'loads will be created'} ({values.bulkRecQty} × {values.bulkRecOccurrences} {values.bulkRecType === 'daily' ? (t('days') || 'days') : values.bulkRecType === 'weekly' ? (t('weeks') || 'weeks') : (t('months') || 'months')})
                  </div>

                  <div className="bg-slate-100 text-slate-500 p-2 rounded-lg text-[10px] leading-relaxed">
                    ℹ️ {t('bulkRecHint') || 'Carriers see only 1 load at a time. When booked, the next one auto-publishes.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TRACKING LINKS */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12 }}>
            <div
              className="ch flex items-center gap-2 px-5 py-4 border-b cursor-pointer select-none"
              style={{ borderColor: T.bd }}
              onClick={() => setTrackingExpanded(!trackingExpanded)}
            >
              <Smartphone size={18} style={{ color: T.t2 }} />
              <span className="font-semibold text-sm">{t('trackingLinks') || 'Tracking Links'}</span>
              <span className="text-xs text-slate-400 font-normal ml-auto flex items-center gap-1.5">
                {t('sendTrackingLink') || 'Send tracking link to customers'}
                <span className={`transform transition-transform ${trackingExpanded ? 'rotate-180' : ''}`}>▼</span>
              </span>
            </div>

            {trackingExpanded && (
              <div className="cb p-5 space-y-3">
                {/* Loop grouped customer orders */}
                {Object.entries(orderLinesGrouped.groups).map(([custName, orders]) => {
                  const collapsed = collapsedGroups[custName] || false;
                  return (
                    <div key={custName} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer bg-teal-50 text-xs font-bold text-teal-800"
                        onClick={() =>
                          setCollapsedGroups((p) => ({ ...p, [custName]: !collapsed }))
                        }
                      >
                        <span className={`transform transition-transform text-[9px] ${!collapsed ? 'rotate-90' : ''}`}>▶</span>
                        <span>🏪</span>
                        <span className="flex-1 truncate">{custName}</span>
                        <span className="text-[10px] font-normal text-slate-500">
                          {orders.length} {orders.length === 1 ? (t('order') || 'order') : (t('orders') || 'orders')}
                        </span>
                      </div>

                      {!collapsed && (
                        <div className="p-3 divide-y space-y-3">
                          {orders.map((o) => {
                            const emailList = values.trackingEmails[o.orderId] || [''];
                            return (
                              <div key={o.orderId} className="pt-2 first:pt-0">
                                <div className="text-xs font-bold font-mono text-indigo-600">
                                  {o.orderId}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {o.route}
                                </div>
                                <div className="text-[10px] text-slate-700 font-medium mt-0.5">
                                  {o.location}
                                </div>

                                <div className="space-y-1.5 mt-2">
                                  {emailList.map((em: string, emIdx: number) => {
                                    const isAuto = em && em === 'contact@alphafoods.com'; // or mock checks
                                    return (
                                      <div key={emIdx}>
                                        <div className="flex gap-2">
                                          <input
                                            type="email"
                                            className="flex-1 p-2 border rounded-lg text-xs outline-none"
                                            placeholder="email@example.com"
                                            value={em}
                                            onChange={(e) => updateEmailField(o.orderId, emIdx, e.target.value)}
                                          />
                                          <button
                                            type="button"
                                            className="w-8 h-8 rounded-lg border flex items-center justify-center bg-white text-slate-400 hover:text-red-500"
                                            onClick={() => removeEmailField(o.orderId, emIdx)}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                        {isAuto && (
                                          <div className="text-[9px] font-semibold text-teal-600 mt-0.5">
                                            🏪 {t('trackingAutofill') || 'Auto-filled from customer'}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                <button
                                  type="button"
                                  className="w-full py-1.5 border border-dashed rounded-lg text-[10px] font-bold text-indigo-700 bg-transparent cursor-pointer mt-2"
                                  onClick={() => addEmailField(o.orderId)}
                                >
                                  {t('addEmail') || '+ Add email'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Sticky): Mini Map & Summary, Pricing & Driver Notes */}
        <div className="space-y-4 lg:sticky lg:top-4">
          
          {/* MINI MAP & SUMMARY */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12, overflow: 'hidden' }}>
            <div className="relative bg-slate-200 flex items-center justify-center" style={{ height: 180 }}>
              <div className="text-center text-xs text-slate-400">
                <MapPin size={32} className="mx-auto mb-1 opacity-40" />
                Ioannina → Mandra → Kalyvia
              </div>
              <button
                type="button"
                className="absolute top-2 right-2 w-7 h-7 bg-white rounded border flex items-center justify-center shadow-sm text-xs font-semibold"
              >
                ⛶
              </button>
            </div>

            <div className="ch flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.bd }}>
              <span className="font-semibold text-sm">{t('summary') || 'Summary'}</span>
              <button
                type="button"
                className="ml-auto px-2.5 py-1 text-[11px] font-semibold border rounded bg-white hover:bg-slate-50 cursor-pointer"
                onClick={onBackStep}
              >
                ✏ {t('edit') || 'Edit'}
              </button>
            </div>

            {/* Route timeline list */}
            <div className="p-4 space-y-4">
              {stops.map((s: any, idx: number) => {
                const isLast = idx === stops.length - 1;
                const dotColor = idx === 0 ? 'bg-sky-500' : 'bg-emerald-500';
                const detailStr = idx === 0 ? '2 pickups' : idx === 1 ? 'PAR-12345, PAR-99001' : 'PAR-54321';
                
                return (
                  <div key={s.id} className="flex gap-3 relative pb-4 last:pb-0">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                    {!isLast && (
                      <div className="absolute top-4 left-[4px] bottom-0 w-0.5 bg-slate-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-800">
                          {s.locationCity || s.locationName || 'Location'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {detailStr}
                        </span>
                      </div>
                      
                      {/* Customer pills */}
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {idx === 2 ? (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-800">
                            🏪 {t('customers') || 'Customers'}: Beta Distributors
                          </span>
                        ) : (
                          <>
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-800">
                              🏪 Alpha Foods Ltd
                            </span>
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-800">
                              🏪 Gamma Logistics
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary statistics grid */}
            <div className="grid grid-cols-2 bg-slate-200 gap-px border-t" style={{ borderColor: T.bd }}>
              {[
                { label: t('distance') || 'Distance', value: '463', unit: 'km' },
                { label: t('time') || 'Time', value: '4h 57m', unit: '' },
                { label: t('stops') || 'Stops', value: String(stops.length), unit: '' },
                { label: t('weight') || 'Weight', value: '24', unit: 'T' },
                { label: t('customers') || 'Customers', value: '3', unit: '🏪' },
                { label: t('orders') || 'Orders', value: '3', unit: '' },
              ].map((st, sidx) => (
                <div key={sidx} className="bg-white p-3">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">
                    {st.label}
                  </div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {st.value}{' '}
                    {st.unit && (
                      <span className="text-xs font-normal text-slate-400">
                        {st.unit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PRICING */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12 }}>
            <div className="ch flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.bd }}>
              <span className="font-semibold text-sm">{t('pricing') || 'Pricing'}</span>
            </div>
            <div className="cb p-4 space-y-4">
              
              {/* Contract vs Spot Badge */}
              <div
                className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md ${
                  contract ? 'bg-violet-100 text-indigo-700' : 'bg-amber-100 text-amber-800'
                }`}
              >
                ⚡{' '}
                <span>
                  {contract
                    ? `${t('contractPrice') || 'Contract price'} · ${contractCarrier?.name}`
                    : t('spotPriceList') || 'Spot price · Price List'}
                </span>
              </div>

              {/* Price calculation advice banner */}
              <div className="bg-sky-50 text-sky-700 p-2.5 rounded-lg text-xs leading-relaxed">
                ℹ{' '}
                {contract ? (
                  contract.unit === 'per_pallet' || contract.unit === 'PER_PALLET' ? (
                    <span>
                      {t('contract') || 'Contract'}: <strong>€{contract.price} × {totalPallets} pallets = €{calculatedPrice}</strong> · {contract.origin}→{contract.destination}
                    </span>
                  ) : (
                    <span>
                      {t('contractPricePerLoad') || 'Contract price: per load'} <strong>€{calculatedPrice}</strong> · {contract.origin}→{contract.destination}
                    </span>
                  )
                ) : (
                  <span>
                    {t('spotPriceFromList') || 'Spot price from Price List: per load'} <strong>€750</strong> · Ioannina→Athens
                  </span>
                )}
              </div>

              {/* Input */}
              <div className="flex items-center bg-slate-100 border-2 rounded-xl px-3 py-2" style={{ borderColor: T.bd }}>
                <span className="text-xl font-bold text-slate-400 mr-2">€</span>
                <input
                  type="number"
                  className="w-full bg-transparent text-right text-2xl font-bold font-mono outline-none"
                  value={values.targetPrice}
                  onChange={(e) => setFieldValue('targetPrice', e.target.value)}
                />
              </div>

              {/* Stats calculations */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  <strong>€{pricePerKm}</strong> / km
                </span>
                <span>·</span>
                <span className="text-indigo-700 font-semibold">
                  <strong>€{pricePerPallet}</strong> / pallet
                </span>
                <span className="text-slate-400">({totalPallets} pallets)</span>
                
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 border rounded bg-white hover:bg-slate-50 text-[10px] font-bold text-indigo-700 cursor-pointer"
                  onClick={() => setAiExpanded(!aiExpanded)}
                >
                  {t('aiInsights') || '✨ AI Insights'}
                </button>
              </div>

              {/* Manual Override Warning */}
              {isOverride && (
                <div className="flex items-center justify-between bg-amber-50 text-amber-800 p-2.5 rounded-lg text-xs mt-2">
                  <span>{t('manualOverride') || 'Manual override —'}</span>
                  <button
                    type="button"
                    className="bg-transparent border-none cursor-pointer font-bold text-amber-900 underline"
                    onClick={() => setFieldValue('targetPrice', String(calculatedPrice))}
                  >
                    {t('resetToPriceList') || 'Reset to Price List'}
                  </button>
                </div>
              )}

              {/* AI Insights Panel */}
              {aiExpanded && (
                <div className="bg-violet-50 text-indigo-950 p-4 rounded-lg text-xs space-y-2 border border-violet-100">
                  <h4 className="font-bold text-slate-900">📊 Lane Analysis: Ioannina → Attica</h4>
                  <div>Your quote: €{values.targetPrice} (€{pricePerKm}/km)</div>
                  <div>Average for this lane: €820 (€1.77/km)</div>
                  <div>Your last 5 loads: €750, €790, €810, €830, €800</div>
                  <div className="p-2 rounded bg-violet-100 text-indigo-700 font-medium">
                    💡 Your price is slightly below average. Consider €800–€830 for faster carrier acceptance. Rates show a slight upward trend over the last 3 months.
                  </div>
                </div>
              )}

              {/* Negotiable price toggle */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: T.bd }}>
                <div>
                  <div className="text-xs font-bold text-slate-800">{t('negotiablePrice') || 'Negotiable price'}</div>
                  <div className="text-[10px] text-slate-400">{t('negotiableSub') || 'Carriers can submit counteroffers'}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={values.negotiable}
                    onChange={(e) => setFieldValue('negotiable', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:height-4 after:width-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* DRIVER NOTES */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12 }}>
            <div className="ch flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.bd }}>
              <span className="font-semibold text-sm">{t('driverNotes') || 'Driver Notes'}</span>
            </div>
            <div className="cb p-4">
              <textarea
                rows={3}
                className="w-full p-2 border rounded-lg text-xs outline-none resize-y"
                placeholder={t('driverNotesPlaceholder') || 'e.g. Driver must wear safety equipment on arrival...'}
                value={values.driverNotes}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setFieldValue('driverNotes', e.target.value);
                  }
                }}
                maxLength={500}
              />
              <div className="text-right text-[10px] text-slate-400 mt-1">
                {(values.driverNotes || '').length} / 500
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM BAR MATCHING page3-vehicle-pricing.html ═══ */}
      <footer
        className="wizard-footer-bar fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 flex"
        style={{ left: 'var(--sidebar-w, 240px)', background: T.sf, borderTop: `1px solid ${T.bd}` }}
      >
        {/* Cost & Live Navigation */}
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            {t('totalCost') || 'Total cost'}:
            <strong className="text-lg font-bold text-slate-900 font-mono">
              €{targetPriceVal.toLocaleString()}
            </strong>
            {bulkTotal > 1 && (
              <span className="text-[11px] font-medium text-indigo-700">
                × {bulkTotal} = <strong className="font-mono">€{(targetPriceVal * bulkTotal).toLocaleString()}</strong>
              </span>
            )}
          </div>
          
          <div className="h-7 w-px bg-slate-200" />
          
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{t('liveNavigation') || 'Live navigation'}</span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={values.gpsRequired}
                onChange={(e) => setFieldValue('gpsRequired', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:height-4 after:width-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 border rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 cursor-pointer"
            onClick={onBackStep}
            disabled={isSubmitting}
          >
            <ArrowLeft size={13} /> {t('back') || 'Back'}
          </button>
          
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 border rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 cursor-pointer"
            onClick={() => showToast('Draft saved successfully!', 'success')}
            disabled={isSubmitting}
          >
            <Save size={13} /> {t('saveDraft') || 'Save Draft'}
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white border-none"
            style={{
              background: T.ac,
              fontFamily: 'inherit',
            }}
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {bulkTotal > 1 ? t('createLoadsBtn', { count: bulkTotal }) || `Create ${bulkTotal} Shipments` : t('createLoadBtn') || 'Create Shipment'}
          </button>
        </div>
      </footer>
    </div>
  );
};
export default Step3Pricing;
