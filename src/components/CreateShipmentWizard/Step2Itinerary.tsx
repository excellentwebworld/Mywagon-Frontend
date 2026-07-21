import React, { useEffect, useMemo, useState } from 'react';
import { useFormikContext } from 'formik';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Save,
} from 'lucide-react';
import { useItineraryStats } from './itinerary/useItineraryStats';
import { useRouteLegs } from './itinerary/useRouteLegs';
import { RouteMap } from './itinerary/RouteMap';
import { VehicleSelector } from './VehicleSelector';
import { computeFitCargoTotals } from './vehicleCapacity';
import {
  formatDurationMin,
  formatWeightDisplay,
  formatWeightKg,
  formatTripQtySummary,
  formatQtyWithUnit,
  normalizeQtyUnit,
  TRUCK_WEIGHT_CAP_KG,
} from './itinerary/cargoUtils';
import { groupStopLinesByCustomer } from './itinerary/stopGrouping';
import { formatAppointmentLabel } from './itinerary/scheduleWarnings';
import { actionChipStyle, badgeStyle, pinColors } from './itinerary/stopColors';
import { computeItineraryFingerprint } from './itineraryFingerprint';
import { hasVehicleSelection } from './vehicleTypes';
import { scrollToStep2Validation } from './validation';
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
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [showVehicleRequired, setShowVehicleRequired] = useState(false);

  const { enrichedStops, totals, runningWeights } = useItineraryStats(stops, locations);
  const route = useRouteLegs(enrichedStops);
  const fitCargo = useMemo(() => computeFitCargoTotals(stops), [stops]);


  const missingLocations = enrichedStops.some((s) => !s.locationId);
  const vehicleSelected = hasVehicleSelection(values.vehicleSpecs);
  const canContinue =
    !missingLocations &&
    vehicleSelected &&
    values.vehicleSelectionConfirmed &&
    values.itineraryConfirmed &&
    !isSaving;

  useEffect(() => {
    if (vehicleSelected) setShowVehicleRequired(false);
  }, [vehicleSelected]);

  const selectStop = (index: number) => {
    setActiveStopIndex(index);
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-wizard-stop="${index}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const handleConfirmAndContinue = async () => {
    if (isSaving) return;

    if (missingLocations) {
      scrollToStep2Validation('step2-missing-locations');
      return;
    }

    if (!values.itineraryConfirmed) {
      scrollToStep2Validation('step2-itinerary-confirm');
      return;
    }

    if (!vehicleSelected) {
      setShowVehicleRequired(true);
      scrollToStep2Validation('step2-vehicle-required');
      return;
    }

    if (!values.vehicleSelectionConfirmed) {
      scrollToStep2Validation('step2-vehicle-selector');
      return;
    }

    try {
      await onContinue({
        totalDistKm: route.totalDistKm,
        totalDriveMin: route.totalDriveMin,
      });
    } catch {
      if (!vehicleSelected) {
        setShowVehicleRequired(true);
        scrollToStep2Validation('step2-vehicle-required');
      } else if (!values.itineraryConfirmed) {
        scrollToStep2Validation('step2-itinerary-confirm');
      }
    }
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    await onSaveDraft();
  };

  const confirmItinerary = () => {
    const snapshot = computeItineraryFingerprint(stops);
    setFieldValue('itineraryConfirmSnapshot', snapshot);
    setFieldValue('itineraryConfirmed', true);
    // Wait for VehicleSelector to mount, then scroll into view
    window.setTimeout(() => {
      scrollToStep2Validation('step2-vehicle-selector');
    }, 80);
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
        <div
          className="wizard-validation-banner mb-4"
          role="alert"
          data-validation-anchor="step2-missing-locations"
        >
          {t('step2MissingLocations')}{' '}
          <button type="button" className="underline font-semibold" onClick={onBackStep}>
            {t('step2EditItinerary')}
          </button>
        </div>
      )}

      {showVehicleRequired && !vehicleSelected && !missingLocations && values.itineraryConfirmed && (
        <div
          className="wizard-validation-banner mb-4"
          role="alert"
          data-validation-anchor="step2-vehicle-required"
        >
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
                const pin = pinColors(stop.hasPickup, stop.hasDropoff);

                return (
                  <div
                    key={stop.id || si}
                    data-wizard-stop={si}
                    className={`wizard-stop-item relative${activeStopIndex === si ? ' is-active' : ''}`}
                    onClick={() => selectStop(si)}
                  >
                    {/* Connector to next stop — grows/shrinks with cargo expand/collapse */}
                    {si < enrichedStops.length - 1 && (
                      <div
                        aria-hidden
                        className="wizard-stop-connector"
                        style={{
                          position: 'absolute',
                          left: 17,
                          top: 28,
                          bottom: 0,
                          width: 2,
                          background: T.ac,
                          pointerEvents: 'none',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <div className="flex gap-3 pb-2 relative" style={{ marginLeft: 14, zIndex: 1 }}>
                      <button
                        type="button"
                        className="wizard-stop-num w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 -ml-[15px] border-none cursor-pointer"
                        style={{
                          background: pin.background,
                          color: pin.color,
                          boxShadow:
                            activeStopIndex === si
                              ? '0 0 0 3px var(--accent-light), 0px 3px 6px #00000029'
                              : '0px 3px 6px #00000029',
                          outline: stop.hasDropoff ? 'none' : '1px solid #E5E7EB',
                          fontFamily: 'inherit',
                        }}
                        aria-label={`${t('step2RouteStops') || 'Stop'} ${si + 1}`}
                        aria-pressed={activeStopIndex === si}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectStop(si);
                        }}
                      >
                        {si + 1}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {stop.hasPickup && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={badgeStyle('pickup')}
                            >
                              {t('pickup').toUpperCase()}
                            </span>
                          )}
                          {stop.hasDropoff && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={badgeStyle('dropoff')}
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
                            {stop.customers.slice(0, 2).map((c, ci) => (
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
                            {stop.customers.length > 2 && (
                              <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{ background: T.sa, color: T.t2, border: `1px solid ${T.bd}` }}
                              >
                                +{stop.customers.length - 2}
                              </span>
                            )}
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

                        <button
                          type="button"
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase cursor-pointer border-none bg-transparent p-0"
                          style={{ color: T.t3, fontFamily: 'inherit' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedStop(isExp ? null : si);
                          }}
                          aria-expanded={isExp}
                        >
                          {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {t('step2CargoAtStop')}
                        </button>
                      </div>
                    </div>

                    {isExp && (
                      <div
                        className="ml-12 mb-3 p-3 rounded-lg relative"
                        style={{ background: T.sa, border: `1px solid ${T.bd}`, zIndex: 1 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {groupStopLinesByCustomer(stop).map((customerGroup, gi) => (
                          <div key={gi} className="mb-3 last:mb-0">
                            {customerGroup.name && (
                              <div className="text-[10px] font-semibold mb-1" style={{ color: '#059669' }}>
                                🏪 {customerGroup.name}
                              </div>
                            )}
                            {customerGroup.orders.map((orderGroup, oi) => (
                              <div key={oi} className="mb-2 last:mb-0">
                                {(orderGroup.orderRef || orderGroup.orderId) && (
                                  <div className="text-[10px] font-mono mb-1" style={{ color: T.t2 }}>
                                    {orderGroup.orderRef || orderGroup.orderId}
                                  </div>
                                )}
                                {orderGroup.lines.map((l, li) => (
                                  <div
                                    key={li}
                                    className="flex items-center gap-3 py-1.5 text-xs flex-wrap"
                                    style={{
                                      borderBottom:
                                        li < orderGroup.lines.length - 1 ? `0.5px solid ${T.bd}` : 'none',
                                    }}
                                  >
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                      style={actionChipStyle(l.action ?? 'pickup')}
                                    >
                                      {l.action === 'pickup' ? '↑' : '↓'}
                                    </span>
                                    <span className="font-medium flex-1 min-w-[80px]" style={{ color: T.t1 }}>
                                      {l.productName || '—'}
                                    </span>
                                    <span style={{ color: T.t2 }}>
                                      {formatQtyWithUnit(
                                        parseFloat(String(l.qty ?? '')) || 0,
                                        normalizeQtyUnit(l.unit) || l.unit,
                                      )}
                                    </span>
                                    <span style={{ color: T.t3 }}>
                                      {formatWeightDisplay(l.weight, l.wtUnit)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ))}
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
              data-validation-anchor="step2-itinerary-confirm"
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

          {values.itineraryConfirmed && (
            <div data-validation-anchor="step2-vehicle-selector">
              <VehicleSelector totalWeightKg={fitCargo.totalWeightKg} />

            </div>
          )}
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
              activeStopIndex={activeStopIndex}
              onStopSelect={selectStop}
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
                {
                  label: t('step2TotalWeight'),
                  value: formatWeightKg(totals.totalWeightKg),
                  sub: formatTripQtySummary(stops),
                },
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
                  {'sub' in s && s.sub && s.sub !== '—' ? (
                    <div className="text-[11px] font-semibold mt-0.5" style={{ color: T.t2 }}>
                      {s.sub}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer
        className="wizard-footer-bar fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 flex"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
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
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
            disabled={isSaving}
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
