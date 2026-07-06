import React, { useMemo, useState } from 'react';
import { useFormikContext } from 'formik';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MoreHorizontal,
  Save,
} from 'lucide-react';
import { useItineraryStats } from './itinerary/useItineraryStats';
import { useRouteLegs } from './itinerary/useRouteLegs';
import { RouteMap } from './itinerary/RouteMap';
import { OrdersCard } from './itinerary/OrdersCard';
import { VehicleSelector } from './VehicleSelector';
import { formatDurationMin, formatWeightKg } from './itinerary/cargoUtils';
import {
  buildOrdersCardData,
  formatStopDateTime,
  getStopBadgeType,
  groupStopLinesByCustomer,
} from './itinerary/stopGrouping';
import { hasVehicleSelection } from './vehicleTypes';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';

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

  const { enrichedStops, totals } = useItineraryStats(stops, locations);
  const route = useRouteLegs(enrichedStops);
  const ordersCardData = useMemo(
    () => buildOrdersCardData(stops, enrichedStops),
    [stops, enrichedStops]
  );

  const missingLocations = enrichedStops.some((s) => !s.locationId);
  const vehicleSelected = hasVehicleSelection(values.vehicleSpecs);
  const canContinue = !missingLocations && vehicleSelected && !isSaving;

  const handleConfirmAndContinue = async () => {
    if (!canContinue) return;
    setFieldValue('itineraryConfirmed', true);
    await onContinue({
      totalDistKm: route.totalDistKm,
      totalDriveMin: route.totalDriveMin,
    });
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    await onSaveDraft();
  };

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

      {!vehicleSelected && !missingLocations && (
        <div className="wizard-validation-banner mb-4" role="alert">
          {t('step2SelectVehicleRequired')}
        </div>
      )}

      <div className="wizard-grid mt-4">
        <div className="min-w-0">
          <div className="card">
            <div className="ch" style={{ cursor: 'default' }}>
              <Clock size={18} />
              <span>{t('step2RouteStops')}</span>
              <button
                type="button"
                className="ml-auto text-xs font-semibold cursor-pointer border-none px-2.5 py-1 rounded"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontFamily: 'inherit' }}
                onClick={onBackStep}
              >
                {t('step2EditItinerary')}
              </button>
            </div>

            <div className="timeline">
              {enrichedStops.map((stop, si) => {
                const isExp = expandedStop === si;
                const badge = getStopBadgeType(stop);
                const customerGroups = groupStopLinesByCustomer(stop);
                const pills = stop.customers.filter((c) => c.name);
                const visiblePills = pills.slice(0, 2);
                const overflow = pills.length - visiblePills.length;

                return (
                  <div
                    key={stop.id || si}
                    className={`stop-row${isExp ? ' expanded' : ''}`}
                    onClick={() => setExpandedStop(isExp ? null : si)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedStop(isExp ? null : si);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="stop-menu"
                      aria-hidden
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    <div className="tl-col">
                      <div className={`tl-dot ${badge === 'pickup' ? 'pk' : 'dl'}`} />
                      <div className="tl-line" />
                      <div className="tl-num">#{si + 1}</div>
                    </div>

                    <div className="stop-content">
                      <div className="stop-meta">
                        <span className={`stop-badge ${badge === 'pickup' ? 'pk' : 'dl'}`}>
                          {badge === 'pickup' ? t('pickupUpper') || 'PICKUP' : t('deliveryUpper') || 'DELIVERY'}
                        </span>
                        <span className="stop-dt">
                          <Calendar size={12} />
                          {formatStopDateTime(stop)}
                        </span>
                      </div>
                      <div className="stop-loc">{stop.resolvedCity || stop.resolvedName}</div>
                      <div className="stop-addr">{stop.resolvedAddress || stop.resolvedCompany}</div>

                      {visiblePills.length > 0 && (
                        <div className="stop-cust-summary">
                          {visiblePills.map((c, ci) => (
                            <span key={ci} className="cust-pill">
                              🏪 {c.name}
                            </span>
                          ))}
                          {overflow > 0 && (
                            <span className="cust-pill-more">+{overflow}</span>
                          )}
                        </div>
                      )}

                      <div className="stop-detail">
                        {customerGroups.length === 0 && (
                          <div className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
                            {t('step2NoCargoFlows')}
                          </div>
                        )}
                        {customerGroups.map((group, gi) => (
                          <div key={gi} className={group.name ? 'cust-group' : 'bare-order'}>
                            {group.name && (
                              <div className="cust-group-head">
                                <span>🏪</span>
                                <span className="cust-group-name">{group.name}</span>
                              </div>
                            )}
                            {group.orders.map((order) => (
                              <div key={order.orderId || order.orderRef} className="cust-order">
                                <div className="stop-chips">
                                  {order.lines.map((line, li) => (
                                    <span key={li} className="chip">
                                      {line.productName || '—'}{' '}
                                      <b>
                                        {line.qty} {line.unit || ''}
                                      </b>
                                    </span>
                                  ))}
                                </div>
                                <div className="order-link">{order.orderRef}</div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <VehicleSelector />
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
