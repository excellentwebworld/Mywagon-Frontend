import React, { useMemo, useRef, useState } from 'react';
import { useFormikContext } from 'formik';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  LayoutList,
  BarChart3,
  Maximize2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useItineraryStats } from './itinerary/useItineraryStats';
import { useRouteLegs } from './itinerary/useRouteLegs';
import { enrichStops } from './itinerary/stopEnrichment';
import { RouteMap } from './itinerary/RouteMap';
import { ItineraryAiInsights } from './itinerary/ItineraryAiInsights';
import {
  formatDurationMin,
  formatWeightKg,
  TRUCK_WEIGHT_CAP_KG,
  weightToKg,
} from './itinerary/cargoUtils';
import { formatAppointmentLabel, getMockWeather } from './itinerary/scheduleWarnings';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
  bd: 'var(--border)',
  bf: 'var(--border-focus)',
  t1: 'var(--text-primary)',
  t2: 'var(--text-secondary)',
  t3: 'var(--text-tertiary)',
  ac: 'var(--accent)',
  al: 'var(--accent-light)',
};

interface Step2ItineraryProps {
  onBackStep: () => void;
  onContinue: (routeSummary: { totalDistKm: number; totalDriveMin: number }) => Promise<void>;
  isSaving?: boolean;
}

export const Step2Itinerary: React.FC<Step2ItineraryProps> = ({
  onBackStep,
  onContinue,
  isSaving = false,
}) => {
  const { t } = useTranslation();
  const { locations } = useApp();
  const { values, setFieldValue } = useFormikContext<any>();
  const stops = values.stops || [];

  const [leftView, setLeftView] = useState<'list' | 'timeline'>('list');
  const [fullMap, setFullMap] = useState(false);
  const [expandedStop, setExpandedStop] = useState<number | null>(null);
  const [showAI, setShowAI] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);

  const enrichedStops = useMemo(() => enrichStops(stops, locations), [stops, locations]);
  const route = useRouteLegs(enrichedStops);
  const {
    totals,
    runningWeights,
    cargoFlows,
    weekendWarnings,
    driveWarnings,
  } = useItineraryStats(stops, locations, route.legs);

  const missingLocations = enrichedStops.some((s) => !s.locationId);

  const handleContinue = async () => {
    if (!values.itineraryConfirmed) return;
    await onContinue({
      totalDistKm: route.totalDistKm,
      totalDriveMin: route.totalDriveMin,
    });
  };

  const handleShowAi = () => {
    setShowAI(true);
    window.requestAnimationFrame(() => {
      aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="animate-fade-in pb-24">
      {missingLocations && (
        <div className="wizard-validation-banner mb-4" role="alert">
          {t('step2MissingLocations')}{' '}
          <button type="button" className="underline font-semibold" onClick={onBackStep}>
            {t('step2EditItinerary')}
          </button>
        </div>
      )}

      <div className="flex gap-4 items-start flex-col lg:flex-row mt-4">
        <div className="flex-1 w-full min-w-0">
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: T.t2 }} />
                <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                  {leftView === 'list' ? t('step2RouteStops') : t('step2RouteTimeline')}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="inline-flex overflow-hidden rounded-md" style={{ border: `1px solid ${T.bd}` }}>
                  <button
                    type="button"
                    className="py-1 px-2.5 text-[10px] font-semibold cursor-pointer border-none"
                    style={{
                      background: leftView === 'list' ? T.ac : T.sf,
                      color: leftView === 'list' ? '#fff' : T.t3,
                      fontFamily: 'inherit',
                    }}
                    onClick={() => setLeftView('list')}
                  >
                    <LayoutList size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }} />
                    {t('step2Stops')}
                  </button>
                  <button
                    type="button"
                    className="py-1 px-2.5 text-[10px] font-semibold cursor-pointer border-none"
                    style={{
                      background: leftView === 'timeline' ? T.ac : T.sf,
                      color: leftView === 'timeline' ? '#fff' : T.t3,
                      fontFamily: 'inherit',
                    }}
                    onClick={() => setLeftView('timeline')}
                  >
                    <BarChart3 size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }} />
                    {t('step2Timeline')}
                  </button>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold cursor-pointer border-none px-2.5 py-1 rounded"
                  style={{ background: T.al, color: T.ac, fontFamily: 'inherit' }}
                  onClick={onBackStep}
                >
                  {t('step2EditItinerary')}
                </button>
              </div>
            </div>

            {leftView === 'list' ? (
              <div className="px-4 py-3">
                {enrichedStops.map((stop, si) => {
                  const dw = driveWarnings.find((d) => d.to === si);
                  const ww = weekendWarnings[si];
                  const isExp = expandedStop === si;
                  const rw = runningWeights[si] || 0;
                  const wx = getMockWeather(stop.resolvedCity, stop.locationId);
                  const leg = route.legs.find((d) => d.to === si);

                  return (
                    <div key={stop.id || si}>
                      {dw && dw.level !== 'ok' && (
                        <div
                          className="flex items-center gap-2 py-1.5 ml-8 text-[10px] flex-wrap"
                          style={{ color: dw.level === 'red' ? '#DC2626' : '#D97706' }}
                        >
                          <AlertTriangle size={10} />
                          <span>
                            {leg ? `${leg.label} · ${leg.distKm} km` : dw.label}
                          </span>
                          <span className="font-semibold">{dw.msg}</span>
                        </div>
                      )}
                      <div
                        className="flex gap-3 pb-4"
                        style={{
                          borderLeft: si < enrichedStops.length - 1 ? `2px solid ${T.ac}` : '2px solid transparent',
                          marginLeft: 14,
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 -ml-[15px]"
                          style={{ background: '#059669' }}
                        >
                          {si + 1}
                        </div>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setExpandedStop(isExp ? null : si)}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {stop.hasPickup && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded"
                                style={{ background: '#DBEAFE', color: '#2563EB' }}
                              >
                                {t('pickup').toUpperCase()}
                              </span>
                            )}
                            {stop.hasDropoff && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded"
                                style={{ background: '#D1FAE5', color: '#059669' }}
                              >
                                {t('dropoff').toUpperCase()}
                              </span>
                            )}
                            {formatAppointmentLabel(stop) && (
                              <span className="text-[10px]" style={{ color: T.t3 }}>
                                📅 {formatAppointmentLabel(stop)}
                              </span>
                            )}
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                              style={{
                                background: wx.alert ? '#FEF3C7' : T.sa,
                                color: wx.alert ? '#D97706' : T.t3,
                              }}
                            >
                              {wx.icon} {wx.tempC}°C
                              {wx.rain > 0 ? ` · ${wx.rain}% rain` : ''}
                            </span>
                            {ww && (
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: '#FEF3C7', color: '#D97706' }}
                              >
                                ⚠ {ww}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold" style={{ color: T.t1 }}>
                            {stop.resolvedName}
                          </div>
                          <div className="text-[11px] mb-1" style={{ color: T.t3 }}>
                            {stop.resolvedAddress || stop.resolvedCity}
                          </div>
                          {stop.customers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {stop.customers.map((c, ci) => (
                                <span
                                  key={ci}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                                  style={{ background: '#F0FDF9', color: '#059669', border: '1px solid #A7F3D0' }}
                                >
                                  🏪 {c.name}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-[9px] font-semibold"
                              style={{ color: rw > TRUCK_WEIGHT_CAP_KG ? '#DC2626' : T.t3 }}
                            >
                              {t('step2OnTruck')}: {(rw / 1000).toFixed(1)}T
                            </span>
                            <div
                              className="flex-1 rounded-full overflow-hidden"
                              style={{ height: 3, background: T.sa, maxWidth: 120 }}
                            >
                              <div
                                style={{
                                  width: `${Math.min((rw / TRUCK_WEIGHT_CAP_KG) * 100, 100)}%`,
                                  height: '100%',
                                  background:
                                    rw > TRUCK_WEIGHT_CAP_KG
                                      ? '#DC2626'
                                      : rw > 20000
                                        ? '#D97706'
                                        : '#059669',
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExp && (
                        <div className="ml-12 mb-3 p-3 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                          <div className="text-[10px] font-bold uppercase mb-2" style={{ color: T.t3 }}>
                            {t('step2CargoAtStop')}
                          </div>
                          {(stop.lines || []).map((l: any, li: number) => (
                            <div
                              key={li}
                              className="flex items-center gap-3 py-1.5 text-xs flex-wrap"
                              style={{
                                borderBottom:
                                  li < (stop.lines?.length || 0) - 1 ? `0.5px solid ${T.bd}` : 'none',
                              }}
                            >
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                  background: l.action === 'pickup' ? '#DBEAFE' : '#D1FAE5',
                                  color: l.action === 'pickup' ? '#2563EB' : '#059669',
                                }}
                              >
                                {l.action === 'pickup' ? '↑' : '↓'}
                              </span>
                              <span className="font-medium flex-1 min-w-[80px]" style={{ color: T.t1 }}>
                                {l.productName || '—'}
                              </span>
                              <span style={{ color: T.t2 }}>
                                {l.qty} {l.unit || ''}
                              </span>
                              <span style={{ color: T.t3 }}>
                                {formatWeightKg(weightToKg(l.weight, l.wtUnit))}
                              </span>
                              {l.customerName && (
                                <span className="text-[10px]" style={{ color: '#059669' }}>
                                  🏪 {l.customerName}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-6">
                <div className="flex items-center justify-end gap-3 mb-4 text-[11px] flex-wrap">
                  <span style={{ color: T.ac }}>
                    ● {t('step2PickedUp')}: <strong>{formatWeightKg(totals.totalWeightKg)}</strong>
                  </span>
                  <span style={{ color: '#059669' }}>
                    {t('step2DroppedOff')}: <strong>{formatWeightKg(totals.droppedWeightKg)}</strong> ●
                  </span>
                </div>

                <div className="flex items-start mb-6 overflow-x-auto pb-2">
                  {enrichedStops.map((stop, si) => {
                    const drive = route.legs.find((d) => d.from === si);
                    const dw = driveWarnings.find((d) => d.from === si);
                    const stopWeight = (stop.lines || []).reduce(
                      (a: number, l: any) => a + weightToKg(l.weight, l.wtUnit),
                      0
                    );
                    const stopQty = (stop.lines || []).reduce(
                      (a: number, l: any) => a + (parseFloat(String(l.qty)) || 0),
                      0
                    );

                    return (
                      <div key={stop.id || si} className="flex items-start shrink-0" style={{ flex: 1, minWidth: 90 }}>
                        <div className="flex flex-col items-center" style={{ flex: 1 }}>
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ background: '#059669', zIndex: 1 }}
                          >
                            {si + 1}
                          </div>
                          <div className="text-center mt-2">
                            <div className="text-xs font-bold" style={{ color: T.t1 }}>
                              {stop.resolvedCity || stop.resolvedName.split(' ')[0]}
                            </div>
                            <div className="text-[10px]" style={{ color: T.t3 }}>
                              {stop.dateFrom?.slice(5)} · {stop.timeFrom || '—'}
                            </div>
                            <div
                              className="text-[10px] font-bold mt-0.5"
                              style={{ color: stop.hasPickup ? '#2563EB' : '#059669' }}
                            >
                              {stop.hasPickup && stop.hasDropoff
                                ? `${t('pickup')}/${t('dropoff')}`
                                : stop.hasPickup
                                  ? t('pickup').toUpperCase()
                                  : t('dropoff').toUpperCase()}
                            </div>
                            <div className="text-[10px]" style={{ color: T.t3 }}>
                              {(stopWeight / 1000).toFixed(1)}T · {stopQty}u
                            </div>
                          </div>
                        </div>
                        {si < enrichedStops.length - 1 && (
                          <div className="flex flex-col items-center" style={{ minWidth: 70, paddingTop: 18 }}>
                            <div style={{ height: 3, background: T.ac, width: '100%', borderRadius: 2 }} />
                            {drive && (
                              <div
                                className="text-[9px] font-semibold mt-1 px-1 py-0.5 rounded text-center"
                                style={{
                                  background:
                                    dw?.level === 'red'
                                      ? '#FEE2E2'
                                      : dw?.level === 'amber'
                                        ? '#FEF3C7'
                                        : T.sa,
                                  color:
                                    dw?.level === 'red'
                                      ? '#DC2626'
                                      : dw?.level === 'amber'
                                        ? '#D97706'
                                        : T.t3,
                                }}
                              >
                                {drive.label}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 12 }}>
                  <div className="text-[10px] font-bold uppercase mb-3" style={{ color: T.t3 }}>
                    {t('step2CargoFlows')}
                  </div>
                  {cargoFlows.length === 0 && (
                    <div className="text-xs" style={{ color: T.t3 }}>
                      {t('step2NoCargoFlows')}
                    </div>
                  )}
                  {cargoFlows.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-3 mb-3">
                      <div style={{ width: 120 }}>
                        <div className="text-[10px] font-semibold truncate" style={{ color: '#059669' }}>
                          🏪 {f.customer || t('step2NoCustomer')}
                        </div>
                        <div className="text-[9px] truncate" style={{ color: T.t3 }}>
                          {f.product}
                        </div>
                      </div>
                      <div className="flex-1 relative" style={{ height: 18 }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 8,
                            height: 2,
                            background: T.sa,
                            borderRadius: 1,
                          }}
                        />
                        {f.pickup >= 0 && f.dropoff >= 0 && enrichedStops.length > 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${(f.pickup / (enrichedStops.length - 1)) * 100}%`,
                              right: `${100 - (f.dropoff / (enrichedStops.length - 1)) * 100}%`,
                              top: 3,
                              height: 12,
                              background: '#7C3AED',
                              borderRadius: 6,
                              opacity: 0.75,
                            }}
                          >
                            <span className="text-[8px] font-bold text-white px-1.5">
                              #{f.pickup + 1}→#{f.dropoff + 1}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-semibold text-right" style={{ color: T.t1, width: 75 }}>
                        {f.qty} {f.unit || 'plt'} · {formatWeightKg(f.weightKg)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2"
              style={{ borderTop: `1px solid ${T.bd}`, background: T.sa }}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t2, fontFamily: 'inherit' }}
                onClick={onBackStep}
              >
                {t('step2GoBackEdit')}
              </button>
              {!values.itineraryConfirmed ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-white border-none"
                  style={{ background: '#059669', fontFamily: 'inherit' }}
                  onClick={() => setFieldValue('itineraryConfirmed', true)}
                >
                  <Check size={13} /> {t('step2ConfirmItinerary')}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: '#059669' }}>
                  <Check size={14} /> {t('step2ItineraryConfirmed')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[360px] shrink-0" style={{ position: 'sticky', top: 16 }}>
          <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: `1px solid ${T.bd}` }}
            >
              <span className="text-[11px] font-semibold" style={{ color: T.ac }}>
                {t('step2MapTitle')}
              </span>
              <button
                type="button"
                className="border-none bg-transparent cursor-pointer p-1"
                style={{ color: T.t3 }}
                onClick={() => setFullMap(!fullMap)}
              >
                <Maximize2 size={13} />
              </button>
            </div>
            <RouteMap
              stops={enrichedStops}
              polylinePath={route.polylinePath}
              expanded={fullMap}
              loading={route.loading}
              t={t}
            />
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <Sparkles size={14} style={{ color: T.t2 }} />
              <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                {t('step2TripSummary')}
              </span>
            </div>
            <div className="grid grid-cols-2">
              {[
                {
                  label: t('step2Distance'),
                  value: route.loading ? '…' : `${route.totalDistKm} km`,
                },
                {
                  label: t('step2DriveTime'),
                  value: route.loading ? '…' : formatDurationMin(route.totalDriveMin),
                },
                { label: t('step2StopsCount'), value: String(enrichedStops.length) },
                { label: t('step2TotalWeight'), value: formatWeightKg(totals.totalWeightKg) },
                {
                  label: t('step2UniqueCustomers'),
                  value: `${totals.uniqueCustomers.size} 🏪`,
                },
                { label: t('step2OrdersCount'), value: String(totals.orderCount) },
              ].map((s, i) => (
                <div
                  key={i}
                  className="px-4 py-3"
                  style={{
                    borderBottom: i < 4 ? `1px solid ${T.bd}` : 'none',
                    borderRight: i % 2 === 0 ? `1px solid ${T.bd}` : 'none',
                  }}
                >
                  <div className="text-[9px] font-bold uppercase" style={{ color: T.t3 }}>
                    {s.label}
                  </div>
                  <div className="text-sm font-bold mt-0.5" style={{ color: T.t1 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAI && values.itineraryConfirmed && (
        <div ref={aiRef}>
          <ItineraryAiInsights
            totalDistKm={route.totalDistKm}
            totalDriveMin={route.totalDriveMin}
            totalWeightKg={totals.totalWeightKg}
            totalPallets={totals.totalPallets}
            enrichedStops={enrichedStops}
            t={t}
          />
        </div>
      )}

      <footer
        className="wizard-footer-bar fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 flex"
        style={{ left: 'var(--sidebar-w, 240px)', background: T.sf, borderTop: `1px solid ${T.bd}` }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t2, fontFamily: 'inherit' }}
            onClick={onBackStep}
            disabled={isSaving}
          >
            <ArrowLeft size={14} /> {t('step2Back')}
          </button>
          {values.itineraryConfirmed && !showAI && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ border: '1px solid #D97706', background: '#FEF3C7', color: '#D97706', fontFamily: 'inherit' }}
              onClick={handleShowAi}
            >
              <Sparkles size={13} /> {t('step2AiAnalysis')}
            </button>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white border-none"
          style={{
            background: values.itineraryConfirmed && !isSaving ? T.ac : T.bf,
            cursor: values.itineraryConfirmed && !isSaving ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
          disabled={!values.itineraryConfirmed || isSaving}
          onClick={handleContinue}
        >
          {isSaving ? t('saving') : t('step2Continue')}
          <ArrowRight size={14} />
        </button>
      </footer>
    </div>
  );
};

export default Step2Itinerary;
