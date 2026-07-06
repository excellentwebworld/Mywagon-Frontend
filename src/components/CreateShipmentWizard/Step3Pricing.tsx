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
  Plus,
  X,
  FileText,
  Save,
  Globe,
  Settings,
} from 'lucide-react';

import { SearchableSelect } from '../ui/SearchableSelect';
import { useCreateShipmentPartners } from '../../hooks/useCreateShipmentPartners';
import { usePublicLoadQuota } from '../../hooks/usePublicLoadQuota';
import { useAiSuggestedPrice } from '../../hooks/useAiSuggestedPrice';
import { matchContractLane, resolveRouteCities } from '../../api/utils/matchContractLane';

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
  draftId?: number | null;
  onBackStep: () => void;
  onSubmit: () => void;
  onSaveDraft?: () => Promise<void>;
  isSaving?: boolean;
}

export const Step3Pricing: React.FC<Step3PricingProps> = ({ draftId = null, onBackStep, onSubmit, onSaveDraft, isSaving = false }) => {
  const { t, lang } = useTranslation();
  const { locations } = useApp();
  const { values, setFieldValue, isSubmitting } = useFormikContext<any>();
  const stops = values.stops || [];
  const { carriersList, loading: partnersLoading, error: partnersError } = useCreateShipmentPartners();
  const { quota: publicQuota, loading: publicQuotaLoading } = usePublicLoadQuota(
    draftId,
    values.broadcastType || 'private'
  );
  const [coOpen, setCoOpen] = useState(true);
  const [frOpen, setFrOpen] = useState(true);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [trackingExpanded, setTrackingExpanded] = useState(true);
  const [carrierQuery, setCarrierQuery] = useState('');

  const { pickupCity, deliveryCity, routeLabel } = useMemo(() => resolveRouteCities(stops), [stops]);

  const carrierCompanies = useMemo(() => {
    return carriersList.filter((c) => c.type === 'carrier_company');
  }, [carriersList]);

  const freelancerDrivers = useMemo(() => {
    return carriersList.filter((c) => c.type === 'freelancer_driver');
  }, [carriersList]);

  const selectedCarriersDetails = useMemo(() => {
    return carriersList.filter((c) => (values.selectedCarriers || []).includes(c.id));
  }, [carriersList, values.selectedCarriers]);

  const contractCarrier = useMemo(() => {
    return selectedCarriersDetails.find((c) => c.contractLanes && c.contractLanes.length > 0);
  }, [selectedCarriersDetails]);

  const contract = useMemo(() => {
    return matchContractLane(contractCarrier?.contractLanes, pickupCity, deliveryCity);
  }, [contractCarrier, pickupCity, deliveryCity]);

  const { data: aiPriceData, loading: aiPriceLoading, error: aiPriceError, denied: aiPriceDenied } =
    useAiSuggestedPrice({
      draftId,
      enabled: !contract && Boolean(draftId),
      onRecommendedPrice: (price) => {
        if (!values.targetPrice) {
          setFieldValue('targetPrice', String(price));
        }
      },
    });

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
      (s.lines || []).forEach((l: any) => {
        if (l.action === 'pickup') p += parseFloat(l.qty) || 0;
      })
    );
    return p;
  }, [stops]);

  const totalWeightKg = useMemo(() => {
    let weight = 0;
    stops.forEach((s: any) =>
      (s.lines || []).forEach((l: any) => {
        if (l.action === 'pickup') weight += parseFloat(l.weight) || 0;
      })
    );
    return weight;
  }, [stops]);

  const customerCount = useMemo(() => {
    const names = new Set<string>();
    stops.forEach((s: any) =>
      (s.lines || []).forEach((l: any) => {
        if (l.customerName) names.add(l.customerName);
      })
    );
    return names.size;
  }, [stops]);

  const orderCount = useMemo(() => {
    const orders = new Set<string>();
    stops.forEach((s: any) =>
      (s.lines || []).forEach((l: any) => {
        const key = l.orderId || l.orderRef;
        if (key) orders.add(String(key));
      })
    );
    return orders.size;
  }, [stops]);

  const formattedDriveTime = useMemo(() => {
    const minutes = values.routeSummary?.totalDriveMin || 0;
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours <= 0) return `${mins}m`;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }, [values.routeSummary?.totalDriveMin]);

  const formattedWeight = useMemo(() => {
    if (totalWeightKg <= 0) return '0';
    if (totalWeightKg >= 1000) return (totalWeightKg / 1000).toFixed(1);
    return String(Math.round(totalWeightKg));
  }, [totalWeightKg]);

  const weightUnit = totalWeightKg >= 1000 ? 'T' : 'kg';

  const totalKm = values.routeSummary?.totalDistKm || 0;
  const targetPriceVal = parseFloat(values.targetPrice) || 0;
  const pricePerKm = targetPriceVal > 0 && totalKm > 0 ? (targetPriceVal / totalKm).toFixed(2) : '0.00';
  const palletDivisor = totalPallets > 0 ? totalPallets : 1;
  const pricePerPallet = targetPriceVal > 0 ? (targetPriceVal / palletDivisor).toFixed(2) : '0.00';
  const publicQuotaBlocked = values.broadcastType === 'public' && publicQuota?.status === false;

  const calculatedPrice = useMemo(() => {
    if (contract) {
      if (contract.unit === 'per_pallet' || contract.unit === 'PER_PALLET') {
        return contract.price * (totalPallets > 0 ? totalPallets : 1);
      }
      return contract.price;
    }
    if (aiPriceData?.recommended_price && aiPriceData.recommended_price > 0) {
      return aiPriceData.recommended_price;
    }
    return 750;
  }, [contract, totalPallets, aiPriceData?.recommended_price]);

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

              {values.broadcastType === 'public' && (
                <div className="mt-4">
                  {publicQuotaLoading ? (
                    <div className="text-xs text-slate-500">{t('loading') || 'Loading...'}</div>
                  ) : publicQuota?.status === false ? (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs flex items-start justify-between gap-3">
                      <span>{publicQuota.message || t('publicQuotaExceeded') || 'You have reached your Public Load limit for this billing cycle.'}</span>
                      {publicQuota.actions?.upgrade_url && (
                        <a
                          href={publicQuota.actions.upgrade_url}
                          className="font-bold underline whitespace-nowrap"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('publicQuotaUpgrade') || 'Upgrade plan'}
                        </a>
                      )}
                    </div>
                  ) : publicQuota && publicQuota.limit !== undefined && publicQuota.limit > 0 && publicQuota.limit < 10000 ? (
                    <div className="bg-sky-50 text-sky-800 p-3 rounded-lg text-xs">
                      {`Public loads this cycle: ${publicQuota.used ?? 0} / ${publicQuota.limit ?? 0} used (${publicQuota.remaining ?? 0} remaining)`}
                    </div>
                  ) : publicQuota?.status ? (
                    <div className="bg-sky-50 text-sky-800 p-3 rounded-lg text-xs">
                      {t('publicQuotaUnlimited') || 'Unlimited public loads this billing cycle.'}
                    </div>
                  ) : null}
                </div>
              )}

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

                  {partnersLoading && (
                    <div className="text-xs text-slate-500 py-2">{t('partnersLoading') || 'Loading partners...'}</div>
                  )}
                  {partnersError && (
                    <div className="text-xs text-red-600 py-2">{t('partnersLoadFailed') || 'Failed to load partners.'}</div>
                  )}

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
                {routeLabel}
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
                { label: t('distance') || 'Distance', value: totalKm > 0 ? String(Math.round(totalKm)) : '0', unit: 'km' },
                { label: t('time') || 'Time', value: formattedDriveTime, unit: '' },
                { label: t('stops') || 'Stops', value: String(stops.length), unit: '' },
                { label: t('weight') || 'Weight', value: formattedWeight, unit: weightUnit },
                { label: t('customers') || 'Customers', value: String(customerCount), unit: customerCount > 0 ? '🏪' : '' },
                { label: t('orders') || 'Orders', value: String(orderCount), unit: '' },
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
                    {t('spotPriceFromList') || 'Spot price from Price List: per load'} <strong>€{calculatedPrice}</strong> · {pickupCity || '—'}→{deliveryCity || '—'}
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
                  {aiPriceLoading ? (
                    <div>{t('aiSuggestedPriceLoading') || 'Generating AI suggested prices...'}</div>
                  ) : aiPriceDenied ? (
                    <div>
                      {aiPriceDenied.message}
                      {aiPriceDenied.upgradeUrl && (
                        <>
                          {' '}
                          <a href={aiPriceDenied.upgradeUrl} className="font-bold underline" target="_blank" rel="noreferrer">
                            {t('publicQuotaUpgrade') || 'Upgrade plan'}
                          </a>
                        </>
                      )}
                    </div>
                  ) : aiPriceError ? (
                    <div>{t('aiSuggestedPriceFailed') || 'Unable to generate AI suggested prices.'}</div>
                  ) : aiPriceData ? (
                    <>
                      <h4 className="font-bold text-slate-900">
                        📊 {t('laneAnalysis') || 'Lane Analysis'}: {pickupCity || '—'} → {deliveryCity || '—'}
                      </h4>
                      <div>
                        {t('aiSuggestedPriceMarket') || 'Market price'}: {aiPriceData.formatted?.market_price || `€${aiPriceData.market_price}`}
                      </div>
                      <div>
                        {t('aiSuggestedPriceAttractive') || 'Attractive price'}: {aiPriceData.formatted?.attractive_price || `€${aiPriceData.attractive_price}`}
                      </div>
                      <div>
                        {t('aiSuggestedPriceConservative') || 'Conservative price'}: {aiPriceData.formatted?.conservative_price || `€${aiPriceData.conservative_price}`}
                      </div>
                      <div className="p-2 rounded bg-violet-100 text-indigo-700 font-medium">
                        {t('aiSuggestedPriceRecommended') || 'Recommended price'}: {aiPriceData.formatted?.recommended_price || `€${aiPriceData.recommended_price}`}
                      </div>
                    </>
                  ) : (
                    <div>{t('aiSuggestedPriceFailed') || 'Unable to generate AI suggested prices.'}</div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t space-y-2" style={{ borderColor: T.bd }}>
                <div>
                  <div className="text-xs font-bold text-slate-800">{t('orderValue') || 'Order Value'}</div>
                  <div className="text-[10px] text-slate-400">{t('orderValueOptional') || 'Optional'}</div>
                </div>
                <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                  <span className="px-3 text-sm font-bold text-indigo-700">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="flex-1 py-2 pr-3 text-sm font-bold outline-none"
                    placeholder="0"
                    value={values.orderValue || ''}
                    maxLength={11}
                    onChange={(e) => setFieldValue('orderValue', e.target.value.replace(/[^0-9.,]/g, ''))}
                  />
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  {t('orderValueHint') || 'Enter here for your own records the market value of the goods being shipped in this load. This information will not be shared with your transporter.'}
                </p>
              </div>

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
            onClick={() => onSaveDraft?.()}
            disabled={isSubmitting || isSaving}
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
            disabled={isSubmitting || isSaving || publicQuotaBlocked}
            onClick={onSubmit}
          >
            {t('createLoadBtn') || 'Create Shipment'}
          </button>
        </div>
      </footer>
    </div>
  );
};
export default Step3Pricing;
