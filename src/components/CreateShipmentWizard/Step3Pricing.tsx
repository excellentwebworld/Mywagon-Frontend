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
import { matchContractLane } from '../../api/utils/matchContractLane';
import type { Step3Carrier } from '../../api/mappers/mapPartnerToStep3Carrier';
import { enrichStops } from './itinerary/stopEnrichment';
import { buildStopSummaryLabels, buildTrackingGroups } from './itinerary/buildTrackingGroups';
import { computeTripTotals, formatDurationMin, formatWeightKg } from './itinerary/cargoUtils';
import type { TrackingOrderItem } from './itinerary/buildTrackingGroups';
import { useRouteLegs } from './itinerary/useRouteLegs';
import { RouteMap } from './itinerary/RouteMap';
import { addressBookService, erpOrdersService } from '../../api';

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
  const [aiInsightsRequested, setAiInsightsRequested] = useState(false);
  const [trackingExpanded, setTrackingExpanded] = useState(true);
  const [carrierQuery, setCarrierQuery] = useState('');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [emailLookup, setEmailLookup] = useState<{
    byCustomerId: Record<string, string>;
    byOrderId: Record<string, string>;
  }>({ byCustomerId: {}, byOrderId: {} });

  const enrichedStops = useMemo(() => enrichStops(stops, locations), [stops, locations]);
  const route = useRouteLegs(enrichedStops);
  const tripTotals = useMemo(() => computeTripTotals(stops), [stops]);

  const { pickupCity, deliveryCity, routeLabel } = useMemo(() => {
    const firstPickup = enrichedStops.find((s) => s.hasPickup);
    const lastDropoff = [...enrichedStops].reverse().find((s) => s.hasDropoff);
    const pickup = firstPickup?.resolvedCity || firstPickup?.locationCity || undefined;
    const delivery = lastDropoff?.resolvedCity || lastDropoff?.locationCity || undefined;
    const label =
      enrichedStops
        .map((s) => s.resolvedCity || s.resolvedName || s.locationCity)
        .filter(Boolean)
        .join(' → ') || '—';
    return { pickupCity: pickup, deliveryCity: delivery, routeLabel: label };
  }, [enrichedStops]);

  const hasMatchingContract = (carrier: Step3Carrier) =>
    Boolean(matchContractLane(carrier.contractLanes, pickupCity, deliveryCity));

  const formatPartnerRating = (rating: number | null | undefined) =>
    rating != null && rating > 0 ? `${rating.toFixed(1)}★` : '—';

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
    return selectedCarriersDetails.find((c) => hasMatchingContract(c));
  }, [selectedCarriersDetails, pickupCity, deliveryCity]);

  const contract = useMemo(() => {
    return matchContractLane(contractCarrier?.contractLanes, pickupCity, deliveryCity);
  }, [contractCarrier, pickupCity, deliveryCity]);

  const {
    data: aiPriceData,
    loading: aiPriceLoading,
    error: aiPriceError,
    denied: aiPriceDenied,
    fetchPrice: fetchAiSuggestedPrice,
  } = useAiSuggestedPrice({
    draftId,
    onRecommendedPrice: (price) => {
      if (!values.targetPrice) {
        setFieldValue('targetPrice', String(price));
      }
    },
  });

  const handleAiInsightsClick = () => {
    const nextExpanded = !aiExpanded;
    setAiExpanded(nextExpanded);

    if (!nextExpanded || contract || !draftId || aiPriceLoading) {
      return;
    }

    setAiInsightsRequested(true);
    if (!aiPriceData) {
      void fetchAiSuggestedPrice();
    }
  };

  const { vehicleTypes } = useVehicleTypes();

  // Dynamic selected vehicles from Step 2
  const selectedVehicleTypesStr = useMemo(() => {
    const locale = lang === 'el' ? 'el' : 'en';
    const { types, specs } = formatVehicleSelectionSummary(values.vehicleSpecs || {}, locale, vehicleTypes);
    if (types.length === 0) return '—';
    const specPart = specs.length > 0 ? ` (${specs.join(', ')})` : '';
    return types.join(', ') + specPart;
  }, [values.vehicleSpecs, lang, vehicleTypes]);

  const totalPallets = tripTotals.totalPallets;
  const totalWeightKg = tripTotals.totalWeightKg;
  const customerCount = tripTotals.uniqueCustomers.size;
  const orderCount = tripTotals.orderCount;

  const formattedDriveTime = useMemo(() => {
    const minutes =
      route.totalDriveMin > 0 ? route.totalDriveMin : values.routeSummary?.totalDriveMin || 0;
    if (!minutes) return '—';
    return formatDurationMin(minutes);
  }, [route.totalDriveMin, values.routeSummary?.totalDriveMin]);

  const formattedWeight = useMemo(
    () => (totalWeightKg > 0 ? formatWeightKg(totalWeightKg) : '—'),
    [totalWeightKg]
  );

  const totalKm = values.routeSummary?.totalDistKm || 0;
  const displayKm = route.totalDistKm > 0 ? route.totalDistKm : totalKm;

  const targetPriceVal = parseFloat(values.targetPrice) || 0;
  const pricePerKm = targetPriceVal > 0 && displayKm > 0 ? (targetPriceVal / displayKm).toFixed(2) : '0.00';
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
    return 0;
  }, [contract, totalPallets, aiPriceData?.recommended_price]);

  // Set default price when carriers selection changes
  useEffect(() => {
    if (!values.targetPrice && calculatedPrice > 0) {
      setFieldValue('targetPrice', String(calculatedPrice));
    }
  }, [calculatedPrice, values.targetPrice, setFieldValue]);

  const trackingGroups = useMemo(
    () => buildTrackingGroups(stops, locations, emailLookup),
    [stops, locations, emailLookup]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([addressBookService.listCompanyEntities(), erpOrdersService.listCustomers()])
      .then(([entities, customers]) => {
        if (cancelled) return;
        const byCustomerId: Record<string, string> = {};
        [...entities, ...customers].forEach((entity) => {
          if (entity.id && entity.email) {
            byCustomerId[String(entity.id)] = entity.email;
          }
        });
        setEmailLookup((prev) => ({ ...prev, byCustomerId }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const orderIds = [
      ...new Set<string>(
        stops.flatMap((s: any) =>
          (s.lines || [])
            .map((l: any) => (l.orderId ? String(l.orderId) : ''))
            .filter((id: string) => id.length > 0)
        )
      ),
    ];
    if (orderIds.length === 0) return;

    let cancelled = false;

    const loadOrders = (byCustomerId: Record<string, string>) =>
      Promise.all(orderIds.map((id) => erpOrdersService.getOrder(id))).then((orders) => {
        if (cancelled) return;

        const byOrderId: Record<string, string> = {};
        orders.forEach((order) => {
          const email =
            order.companyEntityId != null
              ? byCustomerId[String(order.companyEntityId)]
              : undefined;
          if (email) {
            byOrderId[order.id] = email;
          }
        });

        setEmailLookup((prev) => ({
          ...prev,
          byCustomerId: { ...prev.byCustomerId, ...byCustomerId },
          byOrderId: { ...prev.byOrderId, ...byOrderId },
        }));

        if (!values.orderValue) {
          const sum = orders.reduce((acc, order) => acc + (order.orderValue ?? 0), 0);
          if (sum > 0) {
            setFieldValue('orderValue', String(Math.round(sum * 100) / 100));
          }
        }
      });

    Promise.all([addressBookService.listCompanyEntities(), erpOrdersService.listCustomers()])
      .then(([entities, customers]) => {
        const byCustomerId: Record<string, string> = {};
        [...entities, ...customers].forEach((entity) => {
          if (entity.id && entity.email) {
            byCustomerId[String(entity.id)] = entity.email;
          }
        });
        return loadOrders(byCustomerId);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [stops, values.orderValue, setFieldValue]);

  // Override status
  const isOverride = targetPriceVal !== calculatedPrice;

  // Collapsible tracking groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Prefill default email lists per orderId from customer company data
  useEffect(() => {
    const nextEmails = { ...values.trackingEmails };
    let changed = false;

    Object.values(trackingGroups.groups)
      .flat()
      .concat(trackingGroups.ungrouped)
      .forEach((order) => {
        if (!nextEmails[order.orderId]) {
          nextEmails[order.orderId] = order.defaultEmail ? [order.defaultEmail] : [''];
          changed = true;
        }
      });

    if (changed) {
      setFieldValue('trackingEmails', nextEmails);
    }
  }, [trackingGroups, values.trackingEmails, setFieldValue]);

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
    return c.name.toLowerCase().includes(q) || (c.region || '—').toLowerCase().includes(q);
  };

  const renderTrackingOrder = (o: TrackingOrderItem) => {
    const emailList = values.trackingEmails[o.orderId] || [''];
    return (
      <div key={o.orderId} className="pt-2 first:pt-0">
        <div className="text-xs font-bold font-mono text-indigo-600">
          {o.orderRef || o.orderId}
        </div>
        <div className="text-[10px] text-slate-400">{o.route}</div>
        <div className="text-[10px] text-slate-700 font-medium mt-0.5">{o.location}</div>

        <div className="space-y-1.5 mt-2">
          {emailList.map((em: string, emIdx: number) => {
            const isAuto = Boolean(o.defaultEmail && em === o.defaultEmail);
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
                      {t('publicQuotaBanner', {
                        used: publicQuota.used ?? 0,
                        limit: publicQuota.limit ?? 0,
                        remaining: publicQuota.remaining ?? 0,
                      })}
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
                                  {(hasMatchingContract(c)) ? (
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
                                  {(c as any).city || c.region || '—'} · {formatPartnerRating(c.rating)} · {c.loadsLifetime} {t('trips') || 'trips'}
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
                                  {(c as any).city || c.region || '—'} · {formatPartnerRating(c.rating)} · {c.loadsLifetime} {t('trips') || 'trips'}
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
                                {(hasMatchingContract(c)) && (
                                  <span className="text-[8px] font-bold px-1 rounded text-indigo-700 bg-violet-200">
                                    {t('contract') || 'CONTRACT'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {c.region || '—'} · {formatPartnerRating(c.rating)} · {c.type} · {c.trucks?.map((tr: any) => tr.type).join(', ') || selectedVehicleTypesStr}
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
                {trackingGroups.isEmpty ? (
                  <div className="text-xs text-slate-500 py-2">
                    {t('trackingLinksEmpty') || 'Add cargo lines with linked orders in Step 1 to configure tracking links.'}
                  </div>
                ) : (
                  <>
                    {Object.entries(trackingGroups.groups).map(([custName, orders]) => {
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
                              {orders.map((o) => renderTrackingOrder(o))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {trackingGroups.ungrouped.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-slate-50 text-xs font-bold text-slate-700">
                          {t('trackingUngroupedOrders') || 'Other orders'}
                        </div>
                        <div className="p-3 divide-y space-y-3">
                          {trackingGroups.ungrouped.map((o) => renderTrackingOrder(o))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Sticky): Mini Map & Summary, Pricing & Driver Notes */}
        <div className="space-y-4 lg:sticky lg:top-4">
          
          {/* MINI MAP & SUMMARY */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12, overflow: 'hidden' }}>
            <div className="relative">
              <div className="absolute top-2 left-2 z-10 flex rounded-md overflow-hidden border bg-white shadow-sm" style={{ borderColor: T.bd }}>
                <button
                  type="button"
                  className={`px-2.5 py-1 text-[10px] font-semibold ${mapType === 'roadmap' ? 'text-white' : ''}`}
                  style={{ background: mapType === 'roadmap' ? T.ac : 'transparent', color: mapType === 'roadmap' ? '#fff' : T.t2 }}
                  onClick={() => setMapType('roadmap')}
                >
                  {t('map') || 'Map'}
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 text-[10px] font-semibold ${mapType === 'satellite' ? 'text-white' : ''}`}
                  style={{ background: mapType === 'satellite' ? T.ac : 'transparent', color: mapType === 'satellite' ? '#fff' : T.t2 }}
                  onClick={() => setMapType('satellite')}
                >
                  {t('satellite') || 'Satellite'}
                </button>
              </div>
              <RouteMap
                stops={enrichedStops}
                polylinePath={route.polylinePath}
                directionsResult={route.directionsResult}
                loading={route.loading}
                routeLabel={routeLabel}
                mapType={mapType}
                height={200}
                t={t}
              />
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
              {enrichedStops.map((stop, idx) => {
                const isLast = idx === enrichedStops.length - 1;
                const dotColor = stop.hasPickup && !stop.hasDropoff ? 'bg-sky-500' : 'bg-emerald-500';
                const { orderRefs, customers } = buildStopSummaryLabels(stops[idx], stop);

                return (
                  <div key={stop.id || idx} className="flex gap-3 relative pb-4 last:pb-0">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                    {!isLast && (
                      <div className="absolute top-4 left-[4px] bottom-0 w-0.5 bg-slate-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {stop.resolvedCity || stop.resolvedName || stop.locationCity || stop.locationName || '—'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[45%]">
                          {orderRefs}
                        </span>
                      </div>

                      {customers.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-1">
                          {customers.slice(0, 2).map((name) => (
                            <span
                              key={name}
                              className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-800"
                            >
                              🏪 {name}
                            </span>
                          ))}
                          {customers.length > 2 && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                              +{customers.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary statistics grid */}
            <div className="grid grid-cols-2 bg-slate-200 gap-px border-t" style={{ borderColor: T.bd }}>
              {[
                { label: t('distance') || 'Distance', value: displayKm > 0 ? String(Math.round(displayKm)) : '—', unit: displayKm > 0 ? 'km' : '' },
                { label: t('time') || 'Time', value: formattedDriveTime !== '—' ? formattedDriveTime : '—', unit: '' },
                { label: t('stops') || 'Stops', value: String(stops.length), unit: '' },
                { label: t('weight') || 'Weight', value: formattedWeight, unit: '' },
                { label: t('customers') || 'Customers', value: customerCount > 0 ? String(customerCount) : '—', unit: '' },
                { label: t('orders') || 'Orders', value: orderCount > 0 ? String(orderCount) : '—', unit: '' },
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
              <div
                className="price-hint bg-sky-50 text-sky-700 p-2.5 rounded-lg text-xs leading-relaxed"
                aria-busy={aiPriceLoading && aiInsightsRequested}
              >
                {contract ? (
                  <>
                    ℹ{' '}
                    {contract.unit === 'per_pallet' || contract.unit === 'PER_PALLET' ? (
                      <span>
                        {t('contract') || 'Contract'}: <strong>€{contract.price} × {totalPallets} pallets = €{calculatedPrice}</strong> · {contract.origin}→{contract.destination}
                      </span>
                    ) : (
                      <span>
                        {t('contractPricePerLoad') || 'Contract price: per load'} <strong>€{calculatedPrice}</strong> · {contract.origin}→{contract.destination}
                      </span>
                    )}
                  </>
                ) : aiPriceLoading && aiInsightsRequested ? (
                  <span className="price-hint-loading">
                    <span className="price-hint-spinner" aria-hidden="true" />
                    <span>{t('aiSuggestedPriceLoading') || 'Generating AI suggested prices...'}</span>
                  </span>
                ) : calculatedPrice > 0 ? (
                  <>
                    ℹ{' '}
                    <span>
                      {t('spotPriceFromList') || 'Spot price from Price List: per load'} <strong>€{calculatedPrice}</strong> · {pickupCity || '—'}→{deliveryCity || '—'}
                    </span>
                  </>
                ) : (
                  <>
                    ℹ{' '}
                    <span>{t('step3EnterTargetPrice') || 'Enter a target price below, or open AI Insights for a suggested spot price.'}</span>
                  </>
                )}
              </div>

              {/* Input */}
              <div
                className="flex items-center border-2 rounded-xl px-3 py-2"
                style={{ borderColor: targetPriceVal > 0 ? T.ac : T.bd, background: T.sa }}
              >
                <span className="text-xl font-bold mr-2" style={{ color: T.t3 }}>€</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full bg-transparent text-right text-2xl font-bold font-mono outline-none"
                  style={{ color: T.t1 }}
                  placeholder="0.00"
                  value={values.targetPrice || ''}
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
                  className="flex items-center gap-1 px-2 py-1 border rounded bg-white hover:bg-slate-50 text-[10px] font-bold text-indigo-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={Boolean(contract) || !draftId || (aiPriceLoading && aiInsightsRequested)}
                  onClick={handleAiInsightsClick}
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
            </div>

            <div className="ov-row">
              <div>
                <div className="ov-title">{t('orderValue') || 'Order Value'}</div>
                <div className="ov-sub">{t('orderValueOptional') || 'Optional'}</div>
              </div>
              <div className="ov-input-wrap">
                <span className="ov-sym">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="ov-input"
                  placeholder={t('orderValuePlaceholder') || 'Optional'}
                  value={values.orderValue || ''}
                  maxLength={11}
                  onChange={(e) => setFieldValue('orderValue', e.target.value.replace(/[^0-9.,]/g, ''))}
                />
              </div>
              <p className="ov-hint">
                {t('orderValueHint') || 'Enter here for your own records the market value of the goods being shipped in this load. This information will not be shared with your transporter.'}
              </p>
            </div>

            <div className="neg-row">
              <div className="neg-copy">
                <div className="neg-title">{t('negotiablePrice') || 'Negotiable price'}</div>
                <div className="neg-sub">{t('negotiableSub') || 'Carriers can submit counteroffers'}</div>
              </div>
              <button
                type="button"
                className={`tog${values.negotiable ? ' on' : ''}`}
                aria-pressed={values.negotiable}
                aria-label={t('negotiablePrice') || 'Negotiable price'}
                onClick={() => setFieldValue('negotiable', !values.negotiable)}
              />
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
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-xs flex items-center gap-1.5" style={{ color: T.t2 }}>
            {t('totalCost') || 'Total cost'}:
            <strong className="text-lg font-bold font-mono" style={{ color: T.t1 }}>
              {targetPriceVal > 0 ? `€${targetPriceVal.toLocaleString()}` : '—'}
            </strong>
          </div>
          
          <div className="h-7 w-px" style={{ background: T.bd }} />
          
          <div className="flex items-center gap-2 text-xs" style={{ color: T.t2 }}>
            <span>{t('liveNavigation') || 'Live navigation'}</span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={values.gpsRequired}
                onChange={(e) => setFieldValue('gpsRequired', e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:border-gray-300"
                style={{ background: values.gpsRequired ? T.ac : '#E5E7EB' }}
              />
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
