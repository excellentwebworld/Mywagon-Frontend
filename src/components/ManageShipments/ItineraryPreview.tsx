import React, { useMemo, useState } from 'react';
import type { ShipmentStop } from '../../context/AppContext';
import {
  groupItineraryStops,
  type ItineraryStopGroup,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ExpHeading } from './ExpHeading';

interface ItineraryPreviewProps {
  stops?: ShipmentStop[];
  origin?: string;
  dest?: string;
  pickDt?: string | null;
  delDt?: string | null;
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

export const ItineraryPreview: React.FC<ItineraryPreviewProps> = ({
  stops,
  origin,
  dest,
  pickDt,
  delDt,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [openCargo, setOpenCargo] = useState<Record<string, boolean>>({});

  const groups = useMemo(
    () => groupItineraryStops(stops, { origin, dest, pickDt, delDt }),
    [stops, origin, dest, pickDt, delDt]
  );

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
          const cargoOpen = Boolean(openCargo[stop.key]);
          const hasCargo = stop.lines.length > 0;
          const isPickup = stop.type === 'pickup';
          const summary = cargoSummary(stop.lines, t);
          const showAddress =
            stop.address &&
            stop.address !== stop.location &&
            !stop.location.toLowerCase().includes(stop.address.toLowerCase()) &&
            !stop.address.toLowerCase().includes(stop.location.toLowerCase());

          return (
            <div key={`${stop.key}-${idx}`} className={`itin-row${cargoOpen ? ' open' : ''}`}>
              <div className="itin-rail" aria-hidden>
                <span className={`itin-pin ${isPickup ? 'itin-pin-pick' : 'itin-pin-drop'}`}>
                  {displayNumber}
                </span>
                {idx < visible.length - 1 || (collapsible && !expanded) ? (
                  <span className="itin-rail-line" />
                ) : null}
              </div>

              <div className="itin-content">
                <button
                  type="button"
                  className="itin-head"
                  onClick={() => {
                    if (!hasCargo) return;
                    setOpenCargo((prev) => ({ ...prev, [stop.key]: !cargoOpen }));
                  }}
                  disabled={!hasCargo}
                >
                  <div className="itin-head-top">
                    <span className={`itin-badge ${isPickup ? 'itin-badge-pick' : 'itin-badge-drop'}`}>
                      {isPickup ? t('pickup') : t('delivery')}
                    </span>
                    {when ? <span className="itin-when">{when}</span> : null}
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
                  <div className="itin-cargo">
                    {stop.lines.map((line, li) => {
                      const qtyLabel = formatQty(line.qty, line.qtyUnit);
                      const weightLabel = formatWeight(line.weight, line.weightUnit);
                      return (
                        <div key={`${line.orderId}-${li}`} className="itin-cargo-row">
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
