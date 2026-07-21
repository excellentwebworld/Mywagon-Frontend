import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { formatVehicleSelectionSummary, findSpecLabel } from './vehicleTypes';
import { useVehicleTypes } from '../../hooks/useVehicleTypes';
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Smartphone,
  Star,
  Users,
  X,
  FileText,
  Save,
  Globe,
  Settings,
  Navigation,
  Truck,
  Loader2,
} from 'lucide-react';

import { SearchableSelect } from '../ui/SearchableSelect';
import { useCreateShipmentPartners } from '../../hooks/useCreateShipmentPartners';
import { usePublicLoadQuota } from '../../hooks/usePublicLoadQuota';
import { useTrackingEmailLookup } from '../../hooks/useTrackingEmailLookup';
import { useStep3OrderDetails, EMPTY_STEP3_ORDERS } from '../../hooks/useStep3OrderDetails';
import { useAiSuggestedPrice } from '../../hooks/useAiSuggestedPrice';
import { matchContractLane } from '../../api/utils/matchContractLane';
import type { Step3Carrier } from '../../api/mappers/mapPartnerToStep3Carrier';
import { enrichStops } from './itinerary/stopEnrichment';
import { buildStopSummaryLabels, buildTrackingGroups } from './itinerary/buildTrackingGroups';
import { computeTripTotals, formatDurationMin, formatWeightKg, formatWeightDisplay, formatTripQtySummary, formatQtyWithUnit, normalizeQtyUnit } from './itinerary/cargoUtils';
import type { TrackingOrderItem } from './itinerary/buildTrackingGroups';
import {
  extractTrackingOrderIds,
  isUninitializedTrackingEmails,
  normalizeTrackingEmails,
  normalizeVehicleSpecs,
  vehicleSpecsNeedRematch,
  type WizardFormValues,
} from '../../api/mappers/createShipmentMapper';
import { useRouteLegs } from './itinerary/useRouteLegs';
import { RouteMap } from './itinerary/RouteMap';
import { actionChipStyle, badgeStyle, pinColors } from './itinerary/stopColors';
import { formatAppointmentLabel } from './itinerary/scheduleWarnings';
import { groupStopLinesByCustomer } from './itinerary/stopGrouping';
import { CarrierListSkeleton } from '../skeletons/CarrierListSkeleton';
import { RhsVehicleTypesSkeleton } from '../skeletons/RhsVehicleTypesSkeleton';

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
  onSaveDraft?: (values: WizardFormValues) => Promise<void>;
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
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const orderValuePrefilledRef = useRef(false);
  const trackingEmailsInitializedRef = useRef('');
  const trackingEmailsRepairRef = useRef('');
  const trackingOrderIds = useMemo(() => extractTrackingOrderIds(stops), [stops]);

  const trackingEmailsRecord = useMemo((): Record<string, string[]> => {
    const raw = values.trackingEmails;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, string[]>;
    }
    return normalizeTrackingEmails(raw, trackingOrderIds);
  }, [values.trackingEmails, trackingOrderIds]);
  const { byCustomerId } = useTrackingEmailLookup();

  const orderIdsKey = useMemo(() => {
    const ids = new Set<string>();
    stops.forEach((s: any) => {
      (s.lines || []).forEach((l: any) => {
        if (l.orderId) ids.add(String(l.orderId));
      });
    });
    return [...ids].sort().join(',');
  }, [stops]);

  const { data: step3Orders = EMPTY_STEP3_ORDERS } = useStep3OrderDetails(orderIdsKey);

  const byOrderId = useMemo(() => {
    const next: Record<string, string> = {};
    step3Orders.forEach((order) => {
      const email =
        order.companyEntityId != null
          ? byCustomerId[String(order.companyEntityId)]
          : undefined;
      if (email) {
        next[order.id] = email;
      }
    });
    return next;
  }, [step3Orders, byCustomerId]);

  const emailLookup = useMemo(
    () => ({ byCustomerId, byOrderId }),
    [byCustomerId, byOrderId]
  );

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
      setFieldValue('targetPrice', String(price));
    },
  });

  const applyAiSuggestedPrice = (price: number) => {
    if (!(price > 0)) return;
    setFieldValue('targetPrice', String(price));
  };
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

  const selectStop = (index: number) => {
    setActiveStopIndex(index);
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-wizard-stop="${index}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const { vehicleTypes, loading: vehicleTypesLoading } = useVehicleTypes();

  const locale = lang === 'el' ? 'el' : 'en';

  // Rematch PHP list-shaped vehicleSpecs → truck-type formKeys once catalog loads.
  useEffect(() => {
    const specs = values.vehicleSpecs || {};
    if (!vehicleTypes.length || !vehicleSpecsNeedRematch(specs)) return;
    const rematched = normalizeVehicleSpecs(
      Object.keys(specs).map((k) => specs[k]),
      vehicleTypes
    );
    if (Object.keys(rematched).length === 0 || vehicleSpecsNeedRematch(rematched)) return;
    setFieldValue('vehicleSpecs', rematched);
  }, [vehicleTypes, values.vehicleSpecs, setFieldValue]);

  // Dynamic selected vehicles from Step 2
  const selectedVehicleTypesStr = useMemo(() => {
    const { types, specs } = formatVehicleSelectionSummary(values.vehicleSpecs || {}, locale, vehicleTypes);
    if (types.length === 0) return '—';
    const specPart = specs.length > 0 ? ` (${specs.join(', ')})` : '';
    return types.join(', ') + specPart;
  }, [values.vehicleSpecs, locale, vehicleTypes]);

  const hasVehicleSelection = useMemo(() => {
    const specs = values.vehicleSpecs || {};
    return Object.values(specs).some(
      (ids) => Array.isArray(ids) && ids.length > 0,
    );
  }, [values.vehicleSpecs]);

  const selectedVehicleGroups = useMemo(() => {
    const specs = values.vehicleSpecs || {};
    const fromCatalog = vehicleTypes
      .map((vt) => {
        const selected = specs[vt.formKey] || [];
        if (selected.length === 0) return null;
        return {
          key: vt.formKey,
          name: locale === 'el' ? vt.nameEl : vt.name,
          specs: selected.map((id: string) => findSpecLabel(vehicleTypes, vt, id, locale)),
        };
      })
      .filter((g): g is NonNullable<typeof g> => g != null);

    // Fallback if catalog has not loaded / keys mismatch — still show selection from Formik
    if (fromCatalog.length > 0) return fromCatalog;
    return Object.entries(specs)
      .filter(([, ids]) => Array.isArray(ids) && ids.length > 0)
      .map(([key, ids]) => ({
        key,
        name: key,
        specs: (ids as string[]).map(String),
      }));
  }, [values.vehicleSpecs, locale, vehicleTypes]);

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

  const formattedQty = useMemo(() => formatTripQtySummary(stops), [stops]);

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
    if (orderValuePrefilledRef.current || values.orderValue || step3Orders.length === 0) {
      return;
    }

    const sum = step3Orders.reduce((acc, order) => acc + (order.orderValue ?? 0), 0);
    if (sum > 0) {
      orderValuePrefilledRef.current = true;
      setFieldValue('orderValue', String(Math.round(sum * 100) / 100));
    }
  }, [step3Orders, values.orderValue, setFieldValue]);

  // Override status
  const isOverride = targetPriceVal !== calculatedPrice;

  // Repair wizard_state that was stored as a nested array (keys "0", "1", …).
  useEffect(() => {
    const repairKey = trackingOrderIds.join(',');
    if (!repairKey || trackingEmailsRepairRef.current === repairKey) return;

    const raw = values.trackingEmails;
    const normalized = normalizeTrackingEmails(raw, trackingOrderIds);
    const rawIsCorrupted =
      Array.isArray(raw) ||
      (raw &&
        typeof raw === 'object' &&
        Object.keys(raw).some((key) => /^\d+$/.test(key) && !trackingOrderIds.includes(key)));

    if (rawIsCorrupted && JSON.stringify(normalized) !== JSON.stringify(raw)) {
      setFieldValue('trackingEmails', normalized);
    }

    trackingEmailsRepairRef.current = repairKey;
  }, [trackingOrderIds, values.trackingEmails, setFieldValue]);

  const setTrackingEmailsForOrder = (orderId: string, emails: string[]) => {
    setFieldValue('trackingEmails', {
      ...trackingEmailsRecord,
      [orderId]: emails,
    });
  };

  // Prefill default email lists per orderId from customer company data
  useEffect(() => {
    const initKey = `${orderIdsKey}|${Object.keys(byCustomerId).length}|${Object.keys(byOrderId).length}`;
    if (trackingEmailsInitializedRef.current === initKey) return;

    const nextEmails = { ...trackingEmailsRecord };
    let changed = false;

    Object.values(trackingGroups.groups)
      .flat()
      .concat(trackingGroups.ungrouped)
      .forEach((order) => {
        if (!isUninitializedTrackingEmails(nextEmails[order.orderId])) return;

        const prefilled = order.defaultEmail ? [order.defaultEmail] : [''];
        nextEmails[order.orderId] = prefilled;
        changed = true;
      });

    if (changed) {
      setFieldValue('trackingEmails', nextEmails);
    }

    trackingEmailsInitializedRef.current = initKey;
  }, [orderIdsKey, byCustomerId, byOrderId, trackingGroups, trackingEmailsRecord, setFieldValue]);

  // Tracking operations
  const addEmailField = (orderId: string) => {
    const cur = trackingEmailsRecord[orderId] || [''];
    setTrackingEmailsForOrder(orderId, [...cur, '']);
  };

  const updateEmailField = (orderId: string, emailIdx: number, val: string) => {
    const cur = [...(trackingEmailsRecord[orderId] || [''])];
    cur[emailIdx] = val;
    setTrackingEmailsForOrder(orderId, cur);
  };

  const removeEmailField = (orderId: string, emailIdx: number) => {
    const cur = trackingEmailsRecord[orderId] || [''];
    const next = cur.filter((_: any, idx: number) => idx !== emailIdx);
    setTrackingEmailsForOrder(orderId, next.length ? next : ['']);
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
    const emailList = trackingEmailsRecord[o.orderId] || [''];
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
    <div className="wizard-step3 pb-24 lg:pb-0">
      {/* ═══ TWO COLUMN GRID MATCHING page3-vehicle-pricing.html ═══ */}
      <div className="wizard-step3-columns grid grid-cols-1 lg:grid-cols-3 lg:items-stretch gap-6 items-start mt-0">
        {/* LEFT COLUMN: Broadcast, Tracking, Pricing, Driver Notes */}
        <div className="wizard-step3-left lg:col-span-2 space-y-4">
          
          {/* BROADCAST TYPE */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12 }}>
            <div className="ch flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: T.bd }}>
              <Globe size={18} style={{ color: T.t2 }} />
              <span className="font-semibold text-sm">{t('broadcastType') || 'Broadcast Type'}</span>
            </div>
            <div className="cb p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
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
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg text-xs mb-3 outline-none"
                    placeholder={t('searchCarrier') || 'Search carrier...'}
                    value={carrierQuery}
                    onChange={(e) => setCarrierQuery(e.target.value)}
                  />

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
                      partnersLoading ? (
                        <CarrierListSkeleton rows={4} />
                      ) : (
                      <div className="carrier-scroll-list divide-y">
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
                      )
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
                      partnersLoading ? (
                        <CarrierListSkeleton rows={2} />
                      ) : (
                      <div className="carrier-scroll-list divide-y">
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
                      )
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

          {/* TRACKING */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12 }}>
            <div
              className="ch flex items-center gap-2 px-5 py-4 border-b cursor-pointer select-none"
              style={{ borderColor: T.bd }}
              onClick={() => setTrackingExpanded(!trackingExpanded)}
            >
              <Smartphone size={18} style={{ color: T.t2 }} />
              <span className="font-semibold text-sm">{t('trackingLinks') || 'Tracking'}</span>
              <span className="text-xs text-slate-400 font-normal ml-auto flex items-center gap-1.5">
                {t('sendTrackingLink') || 'Send tracking link to customers'}
                <span className={`transform transition-transform ${trackingExpanded ? 'rotate-180' : ''}`}>▼</span>
              </span>
            </div>

            <div className="cb p-5 space-y-3">
              {/* Live Navigation at top of Tracking — always visible */}
              <div
                className="flex items-center justify-between gap-3 p-3 rounded-lg border"
                style={{ borderColor: T.bd, background: T.sa }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: T.ap, color: T.ac }}
                  >
                    <Navigation size={18} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: T.t1 }}>
                      {t('liveNavigation') || 'Live Navigation'}
                    </div>
                    <div className="text-[11px]" style={{ color: T.t3 }}>
                      {t('liveNavigationDesc') || 'Require live GPS navigation for this shipment'}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
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

              {trackingExpanded && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* PRICING */}
          <div className="card" style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 12 }}>
            <div className="ch flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: T.bd }}>
              <span className="font-semibold text-sm">{t('pricing') || 'Pricing'}</span>
              <span
                className={`ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                  contract ? 'bg-violet-100 text-indigo-700' : 'bg-amber-100 text-amber-800'
                }`}
              >
                ⚡{' '}
                {contract
                  ? `${t('contractPrice') || 'Contract'} · ${contractCarrier?.name}`
                  : t('spotPriceList') || 'Spot · Price List'}
              </span>
            </div>
            <div className="cb p-3 space-y-3">
              {/* Compact price hint */}
              <div
                className="price-hint price-hint--compact bg-sky-50 text-sky-700 px-2.5 py-1.5 rounded-md text-[11px]"
                aria-busy={aiPriceLoading && aiInsightsRequested}
              >
                {contract ? (
                  <>
                    <Info size={13} className="price-hint-icon shrink-0" aria-hidden="true" />
                    <span className="price-hint-copy">
                      {contract.unit === 'per_pallet' || contract.unit === 'PER_PALLET' ? (
                        <>
                          {t('contract') || 'Contract'}: <strong>€{contract.price} × {totalPallets} = €{calculatedPrice}</strong>
                        </>
                      ) : (
                        <>
                          {t('contractPricePerLoad') || 'Contract'}: <strong>€{calculatedPrice}</strong>
                        </>
                      )}
                    </span>
                  </>
                ) : aiPriceLoading && aiInsightsRequested ? (
                  <span className="price-hint-loading">
                    <span className="price-hint-spinner" aria-hidden="true" />
                    <span>{t('aiSuggestedPriceLoading') || 'Generating AI suggested prices...'}</span>
                  </span>
                ) : calculatedPrice > 0 ? (
                  <>
                    <Info size={13} className="price-hint-icon shrink-0" aria-hidden="true" />
                    <span className="price-hint-copy">
                      {t('spotPriceFromList') || 'Price list'}: <strong>€{calculatedPrice}</strong>
                      <span className="text-sky-600/80"> · {pickupCity || '—'}→{deliveryCity || '—'}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Info size={13} className="price-hint-icon shrink-0" aria-hidden="true" />
                    <span className="price-hint-copy">
                      {t('step3EnterTargetPrice') || 'Enter a target price, or request an AI suggestion.'}
                    </span>
                  </>
                )}
              </div>

              {/* Target price + AI */}
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center flex-1 min-w-0 border rounded-lg px-2.5 py-1.5"
                  style={{ borderColor: targetPriceVal > 0 ? T.ac : T.bd, background: T.sa }}
                >
                  <span className="text-sm font-bold mr-1.5" style={{ color: T.t3 }}>€</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full bg-transparent text-right text-lg font-bold font-mono outline-none"
                    style={{ color: T.t1 }}
                    placeholder="0.00"
                    value={values.targetPrice || ''}
                    onChange={(e) => setFieldValue('targetPrice', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="ai-suggest-btn shrink-0"
                  disabled={Boolean(contract) || !draftId || (aiPriceLoading && aiInsightsRequested)}
                  onClick={handleAiInsightsClick}
                >
                  {aiPriceLoading && aiInsightsRequested ? (
                    <>
                      <span className="price-hint-spinner" aria-hidden="true" />
                      <span>{t('aiSuggestedPriceLoading') || 'Generating...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} aria-hidden="true" />
                      <span>{t('requestAiSuggestedPrice') || 'AI Price'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span>
                  <strong>€{pricePerKm}</strong> / km
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-indigo-700 font-semibold">
                  <strong>€{pricePerPallet}</strong> / pallet
                </span>
                <span className="text-slate-400">({totalPallets})</span>
              </div>

              {isOverride && (
                <div className="flex items-center justify-between bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-md text-[11px]">
                  <span>{t('manualOverride') || 'Manual override'}</span>
                  <button
                    type="button"
                    className="bg-transparent border-none cursor-pointer font-bold text-amber-900 underline"
                    onClick={() => setFieldValue('targetPrice', String(calculatedPrice))}
                  >
                    {t('resetToPriceList') || 'Reset'}
                  </button>
                </div>
              )}

              {aiExpanded && (
                <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">
                  {aiPriceLoading ? (
                    <div className="text-[11px] text-indigo-900">
                      {t('aiSuggestedPriceLoading') || 'Generating AI suggested prices...'}
                    </div>
                  ) : aiPriceDenied ? (
                    <div className="text-[11px] text-indigo-900">
                      {aiPriceDenied.message}
                      {aiPriceDenied.upgradeUrl && (
                        <>
                          {' '}
                          <a
                            href={aiPriceDenied.upgradeUrl}
                            className="font-bold underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t('publicQuotaUpgrade') || 'Upgrade plan'}
                          </a>
                        </>
                      )}
                    </div>
                  ) : aiPriceError ? (
                    <div className="text-[11px] text-indigo-900">
                      {t('aiSuggestedPriceFailed') || 'Unable to generate AI suggested prices.'}
                    </div>
                  ) : aiPriceData ? (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: 'linear-gradient(135deg,#7B2FF7,#9B51E0)',
                          }}
                        >
                          <Sparkles size={11} color="#fff" aria-hidden />
                        </span>
                        <span className="text-xs font-semibold" style={{ color: '#2D1B69' }}>
                          {t('aiSuggestedPrices') || 'AI Suggested Prices'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-3">
                        {(
                          [
                            {
                              key: 'market_price' as const,
                              label: t('aiSuggestedPriceMarketShort') || 'Market',
                              price: aiPriceData.market_price,
                              formatted:
                                aiPriceData.formatted?.market_price ||
                                `€${aiPriceData.market_price}`,
                              iconColor: '#9B51E0',
                              bestMatch: true,
                            },
                            {
                              key: 'attractive_price' as const,
                              label: t('aiSuggestedPriceAttractiveShort') || 'Attractive',
                              price: aiPriceData.attractive_price,
                              formatted:
                                aiPriceData.formatted?.attractive_price ||
                                `€${aiPriceData.attractive_price}`,
                              iconColor: '#10b981',
                              bestMatch: false,
                            },
                            {
                              key: 'conservative_price' as const,
                              label: t('aiSuggestedPriceConservativeShort') || 'Conservative',
                              price: aiPriceData.conservative_price,
                              formatted:
                                aiPriceData.formatted?.conservative_price ||
                                `€${aiPriceData.conservative_price}`,
                              iconColor: '#6b7280',
                              bestMatch: false,
                            },
                          ] as const
                        ).map((opt) => {
                          const selected =
                            Math.abs(targetPriceVal - (opt.price || 0)) < 0.005 &&
                            (opt.price || 0) > 0;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              className="relative flex flex-col items-start text-left rounded-[10px] px-2 pt-2.5 pb-2 cursor-pointer border-2 bg-white"
                              style={{
                                borderColor: selected ? '#9B51E0' : '#e5e7eb',
                                background: selected
                                  ? 'rgba(155,81,224,0.08)'
                                  : '#fff',
                                fontFamily: 'inherit',
                              }}
                              onClick={() => applyAiSuggestedPrice(opt.price)}
                            >
                              {opt.bestMatch && (
                                <span
                                  className="absolute -top-2.5 left-1.5 text-[9px] font-semibold text-white px-1.5 rounded-full leading-[1.7] whitespace-nowrap"
                                  style={{ background: '#9B51E0' }}
                                >
                                  ★ {t('aiSuggestedPriceBestMatch') || 'Best Match'}
                                </span>
                              )}
                              <div
                                className={`flex items-center gap-1 mb-1 ${opt.bestMatch ? 'mt-1' : ''}`}
                              >
                                <Star
                                  size={10}
                                  fill={opt.iconColor}
                                  color={opt.iconColor}
                                  aria-hidden
                                />
                                <span className="text-[10px] font-medium text-slate-500">
                                  {opt.label}
                                </span>
                              </div>
                              <div
                                className="text-xs font-bold tabular-nums"
                                style={{ color: '#2D1B69' }}
                              >
                                {opt.formatted}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-indigo-900">
                      {t('aiSuggestedPriceFailed') || 'Unable to generate AI suggested prices.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ov-row ov-row--compact">
              <div className="ov-row-main">
                <div className="ov-copy">
                  <div className="ov-title">
                    {t('orderValue') || 'Order Value'}{' '}
                    <span className="ov-sub-inline">({t('orderValueOptional') || 'Optional'})</span>
                  </div>
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
              </div>
              <p className="ov-hint">
                {t('orderValueHint') || 'For your records only — not shared with the transporter.'}
              </p>
            </div>

            <div className="neg-row neg-row--compact">
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
              <span className="ov-sub-inline text-xs font-normal" style={{ color: T.t3 }}>
                ({t('orderValueOptional') || 'Optional'})
              </span>
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

        {/* RIGHT COLUMN: Map + summary — independent scroll; stays visible while left scrolls */}
        <div className="wizard-step3-right space-y-4">
          
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
                activeStopIndex={activeStopIndex}
                onStopSelect={selectStop}
                t={t}
              />
            </div>

            {vehicleTypesLoading && hasVehicleSelection ? (
              <RhsVehicleTypesSkeleton />
            ) : selectedVehicleGroups.length > 0 ? (
              <div className="csw-rhs-veh border-b" style={{ borderColor: T.bd }}>
                <div className="ch flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.bd }}>
                  <Truck size={16} style={{ color: T.ac }} />
                  <span className="font-semibold text-sm">
                    {t('vehicleTypes') || t('vehicleType') || 'Vehicle types'}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {selectedVehicleGroups.map((group) => (
                    <div key={group.key} className="csw-rhs-veh__card">
                      <div className="csw-rhs-veh__check" aria-hidden>
                        ✓
                      </div>
                      <div className="csw-rhs-veh__head">
                        <div className="csw-rhs-veh__ico">
                          <Truck size={16} strokeWidth={2} />
                        </div>
                        <div className="csw-rhs-veh__name">{group.name}</div>
                      </div>
                      {group.specs.length > 0 && (
                        <div className="csw-rhs-veh__specs">
                          {group.specs.map((spec: string) => (
                            <span key={`${group.key}-${spec}`} className="csw-rhs-veh__chip">
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

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

            {/* Route timeline list — details aligned with Step 2 */}
            <div className="p-4 space-y-4">
              {enrichedStops.map((stop, idx) => {
                const isLast = idx === enrichedStops.length - 1;
                const pin = pinColors(stop.hasPickup, stop.hasDropoff);
                const apiStop = stops[idx];
                const { orderRefs, customers } = buildStopSummaryLabels(apiStop, stop);
                const appointment = formatAppointmentLabel(apiStop || stop);
                const cargoGroups = apiStop ? groupStopLinesByCustomer(apiStop) : [];
                const locationName =
                  stop.resolvedName || stop.locationName || stop.resolvedCity || stop.locationCity || '—';
                const locationAddress = (
                  stop.resolvedAddress ||
                  (stop.resolvedCity && stop.resolvedCity !== locationName ? stop.resolvedCity : '') ||
                  ''
                ).trim();
                const showAddress =
                  !!locationAddress &&
                  locationAddress !== locationName &&
                  !locationName.startsWith(locationAddress) &&
                  !locationAddress.startsWith(locationName);
                const company = (stop.resolvedCompany || '').trim();
                const showCompany =
                  !!company &&
                  company !== locationName &&
                  company !== locationAddress &&
                  !locationName.toLowerCase().includes(company.toLowerCase());

                return (
                  <div
                    key={stop.id || idx}
                    data-wizard-stop={idx}
                    className={`wizard-stop-item flex gap-3 relative pb-4 last:pb-0${
                      activeStopIndex === idx ? ' is-active' : ''
                    }`}
                    onClick={() => selectStop(idx)}
                  >
                    <button
                      type="button"
                      className="wizard-stop-num w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 border-none cursor-pointer relative z-[1]"
                      style={{
                        background: pin.background,
                        color: pin.color,
                        boxShadow:
                          activeStopIndex === idx
                            ? '0 0 0 3px var(--accent-light), 0px 1px 3px #00000029'
                            : '0px 1px 3px #00000029',
                        outline: stop.hasDropoff ? 'none' : '1px solid #E5E7EB',
                        fontFamily: 'inherit',
                      }}
                      aria-label={`${t('summary') || 'Stop'} ${idx + 1}`}
                      aria-pressed={activeStopIndex === idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectStop(idx);
                      }}
                    >
                      {idx + 1}
                    </button>
                    {!isLast && (
                      <div className="absolute top-7 left-[11px] bottom-0 w-0.5 bg-slate-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {stop.hasPickup && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={badgeStyle('pickup')}
                          >
                            {t('pickup').toUpperCase()}
                          </span>
                        )}
                        {stop.hasDropoff && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={badgeStyle('dropoff')}
                          >
                            {t('dropoff').toUpperCase()}
                          </span>
                        )}
                        {appointment && (
                          <span className="text-[10px]" style={{ color: T.t3 }}>
                            📅 {appointment}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-xs font-bold" style={{ color: T.t1 }}>
                          {locationName}
                        </span>
                        {orderRefs && orderRefs !== '—' && (
                          <span className="text-[10px] font-mono truncate max-w-[40%]" style={{ color: T.t3 }}>
                            {orderRefs}
                          </span>
                        )}
                      </div>

                      {showAddress && (
                        <div className="text-[10px] mt-0.5 leading-snug" style={{ color: T.t3 }}>
                          {locationAddress}
                        </div>
                      )}

                      {showCompany && (
                        <div className="text-[10px] mt-0.5 truncate" style={{ color: T.t2 }}>
                          {company}
                        </div>
                      )}

                      {customers.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {customers.slice(0, 2).map((name) => (
                            <span
                              key={name}
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: '#F0FDF9',
                                color: '#059669',
                                border: '1px solid #A7F3D0',
                              }}
                            >
                              🏪 {name}
                            </span>
                          ))}
                          {customers.length > 2 && (
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: T.sa, color: T.t2, border: `1px solid ${T.bd}` }}
                            >
                              +{customers.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {cargoGroups.length > 0 && (
                        <div
                          className="mt-2 rounded-md px-2 py-1.5 space-y-1"
                          style={{ background: T.sa, border: `1px solid ${T.bd}` }}
                        >
                          {cargoGroups.map((customerGroup, gi) =>
                            customerGroup.orders.map((orderGroup, oi) =>
                              orderGroup.lines.map((line, li) => (
                                <div
                                  key={`${gi}-${oi}-${li}`}
                                  className="flex items-center gap-1.5 text-[10px] min-w-0"
                                >
                                  <span
                                    className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                                    style={actionChipStyle(line.action ?? 'pickup')}
                                  >
                                    {line.action === 'pickup' ? '↑' : '↓'}
                                  </span>
                                  <span className="font-medium truncate flex-1" style={{ color: T.t1 }}>
                                    {line.productName || '—'}
                                  </span>
                                  <span className="shrink-0 tabular-nums" style={{ color: T.t2 }}>
                                    {formatQtyWithUnit(
                                      parseFloat(String(line.qty ?? '')) || 0,
                                      normalizeQtyUnit(line.unit) || line.unit,
                                    )}
                                  </span>
                                  <span className="shrink-0 tabular-nums" style={{ color: T.t3 }}>
                                    {formatWeightDisplay(line.weight, line.wtUnit)}
                                  </span>
                                </div>
                              ))
                            )
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
                {
                  label: t('distance') || 'Distance',
                  value: displayKm > 0 ? String(Math.round(displayKm)) : '—',
                  unit: displayKm > 0 ? 'km' : '',
                  sub: '',
                },
                {
                  label: t('time') || 'Time',
                  value: formattedDriveTime !== '—' ? formattedDriveTime : '—',
                  unit: '',
                  sub: '',
                },
                {
                  label: t('stops') || 'Stops',
                  value: String(stops.length),
                  unit: '',
                  sub: '',
                },
                {
                  label: t('weight') || 'Weight',
                  value: formattedWeight,
                  unit: '',
                  sub: formattedQty !== '—' ? formattedQty : '',
                },
                {
                  label: t('customers') || 'Customers',
                  value: customerCount > 0 ? String(customerCount) : '—',
                  unit: '',
                  sub: '',
                },
                {
                  label: t('orders') || 'Orders',
                  value: orderCount > 0 ? String(orderCount) : '—',
                  unit: '',
                  sub: '',
                },
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
                  {st.sub ? (
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5 tabular-nums">
                      {st.sub}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM BAR MATCHING page3-vehicle-pricing.html ═══ */}
      <footer
        className="wizard-footer-bar fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 flex"
        style={{ background: T.sf, borderTop: `1px solid ${T.bd}` }}
      >
        {/* Total cost */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-xs flex items-center gap-1.5" style={{ color: T.t2 }}>
            {t('totalCost') || 'Total cost'}:
            <strong className="text-lg font-bold font-mono" style={{ color: T.t1 }}>
              {targetPriceVal > 0 ? `€${targetPriceVal.toLocaleString()}` : '—'}
            </strong>
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
            onClick={async () => {
              await onSaveDraft?.({ ...values, trackingEmails: trackingEmailsRecord });
            }}
            disabled={isSubmitting || isSaving}
          >
            <Save size={13} /> {t('saveDraft') || 'Save Draft'}
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white border-none disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: T.ac,
              fontFamily: 'inherit',
            }}
            disabled={isSubmitting || isSaving || publicQuotaBlocked}
            aria-busy={isSubmitting}
            onClick={() => onSubmit()}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                {t('creatingShipment') || 'Creating…'}
              </>
            ) : (
              t('createLoadBtn') || 'Create Shipment'
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};
export default Step3Pricing;
