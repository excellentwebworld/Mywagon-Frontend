import React, { useMemo, useState } from 'react';
import type { Shipment, ShipmentStop } from '../../context/AppContext';
import {
  findCurrentItineraryIndex,
  groupItineraryStops,
  itineraryRailFilled,
  itineraryStopVisual,
  productLineVisual,
  type ItineraryStopGroup,
  type ItineraryStopVisual,
  type ProductLineVisual,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ExpHeading } from './ExpHeading';

interface ItineraryPreviewProps {
  stops?: ShipmentStop[];
  origin?: string;
  dest?: string;
  pickDt?: string | null;
  delDt?: string | null;
  shipmentStatus?: Shipment['status'] | string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function formatWhen(date?: string, timeStart?: string): string {
  return [date, timeStart].filter(Boolean).join(' · ');
}

function formatQty(qty: number, unit: string): string {
  if (!qty && !unit) return '';
  const amount = qty > 0 ? qty.toLocaleString() : '';
  return [amount, unit].filter(Boolean).join(' ');
}

function formatWeight(weight: number, unit: string): string {
  if (!weight && !unit) return '';
  const amount = weight > 0 ? weight.toLocaleString() : '';
  return [amount, unit || 'kg'].filter(Boolean).join(' ');
}

function truncate(text: string, max = 42): string {
  const value = text.trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function cargoSummary(
  lines: ItineraryStopGroup['lines'],
  t: ItineraryPreviewProps['t']
): string {
  if (lines.length === 0) return '';
  const totalQty = lines.reduce((sum, line) => sum + (line.qty || 0), 0);
  const totalWeight = lines.reduce((sum, line) => sum + (line.weight || 0), 0);
  const qtyUnit = lines.find((line) => line.qtyUnit)?.qtyUnit || '';
  const weightUnit = lines.find((line) => line.weightUnit)?.weightUnit || 'kg';
  const parts = [
    `${lines.length} ${t('aiWizardProducts') || 'products'}`,
    totalQty > 0 ? formatQty(totalQty, qtyUnit) : '',
    totalWeight > 0 ? formatWeight(totalWeight, weightUnit) : '',
  ].filter(Boolean);
  return parts.join(' · ');
}

function showTripStatus(shipmentStatus?: string): boolean {
  return (
    shipmentStatus === 'on_trip' ||
    shipmentStatus === 'in_progress' ||
    shipmentStatus === 'fullfilled' ||
    shipmentStatus === 'partially_fullfilled' ||
    shipmentStatus === 'delivered' ||
    shipmentStatus === 'not_fullfilled'
  );
}

function StopStatusIcon({ visual }: { visual: ItineraryStopVisual }) {
  if (visual === 'done') {
    return (
      <span className="itin-stop-tick itin-stop-tick--ok" aria-hidden title="Complete">
        ✓
      </span>
    );
  }
  if (visual === 'failed') {
    return (
      <span className="itin-stop-tick itin-stop-tick--fail" aria-hidden title="Unable">
        ✕
      </span>
    );
  }
  return null;
}

function ProductStatusTick({ visual }: { visual: ProductLineVisual }) {
  if (visual === 'default') return null;
  if (visual === 'failed') {
    return (
      <span className="itin-status-tick itin-status-tick--fail" aria-hidden title="Unable">
        ✕
      </span>
    );
  }
  if (visual === 'done-pod') {
    return (
      <span className="itin-status-tick itin-status-tick--ok" aria-hidden title="POD uploaded">
        ✓✓
      </span>
    );
  }
  return (
    <span className="itin-status-tick itin-status-tick--ok" aria-hidden title="Complete">
      ✓
    </span>
  );
}

function PodChip({
  type,
  pod,
  visual,
}: {
  type: 'pickup' | 'delivery';
  pod?: string;
  visual: ProductLineVisual | ItineraryStopVisual;
}) {
  if (type !== 'delivery') return null;
  const podCode = String(pod ?? '0');
  if (podCode === '1' || visual === 'done-pod') {
    return <span className="itin-pod-chip itin-pod-chip--ok">POD</span>;
  }
  if (podCode === '3' || (visual === 'failed' && podCode === '3')) {
    return <span className="itin-pod-chip itin-pod-chip--fail">POD</span>;
  }
  if (podCode === '2') {
    return <span className="itin-pod-chip itin-pod-chip--later">POD later</span>;
  }
  return null;
}

export const ItineraryPreview: React.FC<ItineraryPreviewProps> = ({
  stops,
  origin,
  dest,
  pickDt,
  delDt,
  shipmentStatus,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [openCargo, setOpenCargo] = useState<Record<string, boolean>>({});

  const groups = useMemo(
    () => groupItineraryStops(stops, { origin, dest, pickDt, delDt }),
    [stops, origin, dest, pickDt, delDt]
  );

  const tripLive = showTripStatus(shipmentStatus);
  const currentIndex = tripLive ? findCurrentItineraryIndex(groups) : -1;

  const collapsible = groups.length > 2;
  const visible = collapsible && !expanded ? groups.slice(0, 2) : groups;

  return (
    <div className="itinerary-preview">
      <ExpHeading icon="itinerary" className="exp-h-gap">
        {t('itinerary')}
        {groups.length > 0 && <span className="itin-count">{groups.length}</span>}
      </ExpHeading>

      <div className="itin-timeline">
        {visible.map((stop, idx) => {
          const displayNumber = idx + 1;
          const when = formatWhen(stop.date, stop.timeStart);
          const hasCargo = stop.lines.length > 0;
          const cargoOpen = hasCargo && (openCargo[stop.key] ?? tripLive);
          const isPickup = stop.type === 'pickup';
          const summary = cargoSummary(stop.lines, t);
          const stopVisual = itineraryStopVisual(stop, idx, currentIndex, shipmentStatus);
          const railFilled = itineraryRailFilled(stopVisual, idx, currentIndex, shipmentStatus);
          const showAddress =
            stop.address &&
            stop.address !== stop.location &&
            !stop.location.toLowerCase().includes(stop.address.toLowerCase()) &&
            !stop.address.toLowerCase().includes(stop.location.toLowerCase());
          const hasNext = idx < visible.length - 1 || (collapsible && !expanded);

          return (
            <div
              key={`${stop.key}-${idx}`}
              className={`itin-row itin-row--${stopVisual}${cargoOpen ? ' open' : ''}`}
            >
              <div className="itin-rail" aria-hidden>
                <span
                  className={`itin-pin ${isPickup ? 'itin-pin-pick' : 'itin-pin-drop'} itin-pin--${stopVisual}`}
                >
                  {displayNumber}
                </span>
                {hasNext ? (
                  <span
                    className={`itin-rail-line${railFilled ? ' itin-rail-line--filled' : ' itin-rail-line--dashed'}`}
                  />
                ) : null}
              </div>

              <div className="itin-content">
                <button
                  type="button"
                  className={`itin-head itin-head--${stopVisual}`}
                  onClick={() => {
                    if (!hasCargo) return;
                    setOpenCargo((prev) => ({
                      ...prev,
                      [stop.key]: !(prev[stop.key] ?? tripLive),
                    }));
                  }}
                  disabled={!hasCargo}
                >
                  <div className="itin-head-top">
                    <span className={`itin-badge ${isPickup ? 'itin-badge-pick' : 'itin-badge-drop'}`}>
                      {isPickup ? t('pickup') : t('delivery')}
                    </span>
                    {when ? <span className="itin-when">{when}</span> : null}
                    <StopStatusIcon visual={stopVisual} />
                    <PodChip type={stop.type} pod={stop.pod} visual={stopVisual} />
                    {hasCargo ? (
                      <span className="itin-chev" aria-hidden>
                        {cargoOpen ? '▾' : '▸'}
                      </span>
                    ) : null}
                  </div>
                  <div className="itin-loc">{stop.location}</div>
                  {showAddress ? <div className="itin-addr">{truncate(stop.address, 56)}</div> : null}
                  <div className="itin-head-foot">
                    {stop.customers.slice(0, 1).map((name) => (
                      <span key={name} className="itin-cust-pill">
                        {name}
                      </span>
                    ))}
                    {stop.customers.length > 1 ? (
                      <span className="itin-cust-more">+{stop.customers.length - 1}</span>
                    ) : null}
                    {summary ? <span className="itin-summary">{summary}</span> : null}
                  </div>
                </button>

                {hasCargo && cargoOpen && (
                  <div className={`itin-cargo itin-cargo--${stopVisual}`}>
                    {stop.lines.map((line, li) => {
                      const qtyLabel = formatQty(line.qty, line.qtyUnit);
                      const weightLabel = formatWeight(line.weight, line.weightUnit);
                      const visual = productLineVisual(
                        stop.type,
                        line.locationStatus,
                        line.pod,
                        line.unableStatus
                      );
                      return (
                        <div
                          key={`${line.orderId}-${li}`}
                          className={`itin-cargo-row itin-cargo-row--${visual}`}
                        >
                          <span className={`itin-action ${isPickup ? 'pick' : 'drop'}`}>
                            {isPickup ? '↑' : '↓'}
                          </span>
                          <div className="itin-cargo-main">
                            <div className="itin-product" title={line.products}>
                              {truncate(line.products, 48)}
                            </div>
                            <div className="itin-cargo-sub">
                              {line.orderId ? <span className="itin-order">{line.orderId}</span> : null}
                              {line.customerName && line.customerName !== '—' ? (
                                <span>{line.customerName}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="itin-cargo-stats">
                            {qtyLabel ? <span>{qtyLabel}</span> : null}
                            {weightLabel ? <span>{weightLabel}</span> : null}
                            <PodChip type={stop.type} pod={line.pod} visual={visual} />
                            <ProductStatusTick visual={visual} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {collapsible && (
        <button type="button" className="itinerary-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t('hideStops') : t('showAllStops', { count: groups.length })}
        </button>
      )}
    </div>
  );
};
