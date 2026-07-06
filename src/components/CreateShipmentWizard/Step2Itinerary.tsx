import React, { useEffect, useMemo, useState } from 'react';
import { useFormikContext } from 'formik';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Save,
} from 'lucide-react';
import { useItineraryStats } from './itinerary/useItineraryStats';
import { useRouteLegs } from './itinerary/useRouteLegs';
import { RouteMap } from './itinerary/RouteMap';
import { OrdersCard } from './itinerary/OrdersCard';
import { VehicleSelector } from './VehicleSelector';
import {
  formatDurationMin,
  formatWeightDisplay,
  formatWeightKg,
  TRUCK_WEIGHT_CAP_KG,
} from './itinerary/cargoUtils';
import { buildOrdersCardData } from './itinerary/stopGrouping';
import { formatAppointmentLabel } from './itinerary/scheduleWarnings';
import { computeItineraryFingerprint } from './itineraryFingerprint';
import { hasVehicleSelection } from './vehicleTypes';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';

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
  onSaveDraft: () => Promise<void>;
  onContinue: (routeSummary: { totalDistKm: number; totalDriveMin: number }) => Promise<void>;
  isSaving?: boolean;
}

export const Step2Itinerary: React.FC<Step2ItineraryProps> = ({
  onBackStep,
  onSaveDraft,
  onContinue,
  isSaving = false,
}) => {
  const { t } = useTranslation();
  const { locations } = useApp();
  const { values, setFieldValue } = useFormikContext<WizardFormValues>();
  const stops = values.stops || [];

  const [expandedStop, setExpandedStop] = useState<number | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const { enrichedStops, totals, runningWeights } = useItineraryStats(stops, locations);
  const route = useRouteLegs(enrichedStops);
  const ordersCardData = useMemo(
    () => buildOrdersCardData(stops, enrichedStops),
    [stops, enrichedStops]
  );

  const missingLocations = enrichedStops.some((s) => !s.locationId);
  const vehicleSelected = hasVehicleSelection(values.vehicleSpecs);
  const canContinue =
    !missingLocations && vehicleSelected && values.itineraryConfirmed && !isSaving;

  const handleConfirmAndContinue = async () => {
    if (!canContinue) return;
    await onContinue({
      totalDistKm: route.totalDistKm,
      totalDriveMin: route.totalDriveMin,
    });
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    await onSaveDraft();
  };

  const confirmItinerary = () => {
    const snapshot = computeItineraryFingerprint(stops);
    setFieldValue('itineraryConfirmSnapshot', snapshot);
    setFieldValue('itineraryConfirmed', true);
  };

  useEffect(() => {
    if (!values.itineraryConfirmed) return;

    const currentFingerprint = computeItineraryFingerprint(stops);
    const snapshot = values.itineraryConfirmSnapshot;

    if (!snapshot) {
      setFieldValue('itineraryConfirmSnapshot', currentFingerprint);
      return;
    }

    if (snapshot !== currentFingerprint) {
      setFieldValue('itineraryConfirmed', false);
      setFieldValue('itineraryConfirmSnapshot', '');
    }
  }, [stops, values.itineraryConfirmed, values.itineraryConfirmSnapshot, setFieldValue]);

  const showCustomerStats = totals.uniqueCustomers.size > 0;

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

      {!vehicleSelected && !missingLocations && values.itineraryConfirmed && (
        <div className="wizard-validation-banner mb-4" role="alert">
          {t('step2SelectVehicleRequired')}
        </div>
      )}

      <div className="wizard-grid mt-4">
        <div className="min-w-0">
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: `1px solid ${T.bd}` }}
            >
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: T.t2 }} />
                <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                  {t('step2RouteStops')}
                </span>
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

            <div className="px-4 py-3">
              {enrichedStops.map((stop, si) => {
                const isExp = expandedStop === si;
                const rw = runningWeights[si] || 0;

                return (
                  <div key={stop.id || si}>
                    <div
                      className="flex gap-3 pb-4"
                      style={{
                        borderLeft:
                          si < enrichedStops.length - 1 ? `2px solid ${T.ac}` : '2px solid transparent',
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
                                style={{
                                  background: '#F0FDF9',
                                  color: '#059669',
                                  border: '1px solid #A7F3D0',
                                }}
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
                            {t('step2OnTruck')}: {formatWeightKg(rw)}
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
                      <div
                        className="ml-12 mb-3 p-3 rounded-lg"
                        style={{ background: T.sa, border: `1px solid ${T.bd}` }}
                      >
                        <div
                          className="text-[10px] font-bold uppercase mb-2"
                          style={{ color: T.t3 }}
                        >
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
                              {formatWeightDisplay(l.weight, l.wtUnit)}
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

            <div
              className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2"
              style={{ borderTop: `1px solid ${T.bd}`, background: T.sa }}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  border: `1px solid ${T.bd}`,
                  background: T.sf,
                  color: T.t2,
                  fontFamily: 'inherit',
                }}
                onClick={onBackStep}
              >
                {t('step2GoBackEdit')}
              </button>
              {!values.itineraryConfirmed ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-white border-none"
                  style={{ background: '#059669', fontFamily: 'inherit' }}
                  onClick={confirmItinerary}
                >
                  <Check size={13} /> {t('step2ConfirmItinerary')}
                </button>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold"
                  style={{ color: '#059669' }}
                >
                  <Check size={14} /> {t('step2ItineraryConfirmed')}
                </span>
              )}
            </div>
          </div>

          {values.itineraryConfirmed && <VehicleSelector />}
        </div>

        <div className="right-panel">
          <div className="card">
            <div className="map-tabs">
              <button
                type="button"
                className={`map-tab${mapType === 'roadmap' ? ' act' : ''}`}
                onClick={() => setMapType('roadmap')}
              >
                {t('step2MapTitle') || 'Map'}
              </button>
              <button
                type="button"
                className={`map-tab${mapType === 'satellite' ? ' act' : ''}`}
                onClick={() => setMapType('satellite')}
              >
                {t('step2MapSatellite') || 'Satellite'}
              </button>
            </div>
            <RouteMap
              stops={enrichedStops}
              polylinePath={route.polylinePath}
              directionsResult={route.directionsResult}
              loading={route.loading}
              mapType={mapType}
              t={t}
            />
          </div>

          <div className="card">
            <div className="ch" style={{ cursor: 'default' }}>
              <Clock size={18} />
              <span>{t('step2TripSummary')}</span>
            </div>
            <div className={`ts-grid${showCustomerStats ? ' ts-grid-6' : ''}`}>
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
                ...(showCustomerStats
                  ? [
                      {
                        label: t('customers') || t('step2UniqueCustomers'),
                        value: `${totals.uniqueCustomers.size} 🏪`,
                      },
                      { label: t('orders') || t('step2OrdersCount'), value: String(totals.orderCount) },
                    ]
                  : []),
              ].map((s, i) => (
                <div key={i} className="ts-cell">
                  <div className="ts-label">{s.label}</div>
                  <div className="ts-val">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <OrdersCard groups={ordersCardData} t={t} />
        </div>
      </div>

      <footer
        className="wizard-footer-bar fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 flex"
        style={{ left: 'var(--sidebar-w, 240px)', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Save size={14} />
          {t('step2AutoSaveActive') || 'Draft saves when you continue or save draft.'}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
            onClick={onBackStep}
            disabled={isSaving}
          >
            <ArrowLeft size={14} /> {t('step2Back')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            <Save size={14} /> {t('step2SaveDraft') || t('saveDraft') || 'Save Draft'}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white border-none"
            style={{
              background: canContinue ? 'var(--accent)' : 'var(--border-focus)',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
            disabled={!canContinue}
            onClick={handleConfirmAndContinue}
          >
            {isSaving ? t('saving') : t('step2ConfirmAndContinue') || t('step2Continue')}
            <ArrowRight size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Step2Itinerary;
