import React, { useMemo, useState } from 'react';
import type { ShipmentCustomerOrder, ShipmentStop } from '../../context/AppContext';
import { ExpHeading } from './ExpHeading';

interface ItineraryPreviewProps {
  stops?: ShipmentStop[];
  origin?: string;
  dest?: string;
  pickDt?: string | null;
  delDt?: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

type CargoLine = {
  customerName: string;
  orderId: string;
  products: string;
  qty: number;
  qtyUnit: string;
  weight: number;
  weightUnit: string;
};

type GroupedStop = {
  key: string;
  type: 'pickup' | 'delivery';
  location: string;
  address: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  customers: string[];
  lines: CargoLine[];
};

function formatWhen(date?: string, timeStart?: string, timeEnd?: string): string {
  const parts = [date, timeStart].filter(Boolean);
  if (timeEnd && timeEnd !== timeStart) {
    parts.push(`– ${timeEnd}`);
  }
  return parts.join(' ');
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

function cargoFromStop(stop: ShipmentStop): CargoLine[] {
  const lines: CargoLine[] = [];
  (stop.customers || []).forEach((customer) => {
    (customer.orders || []).forEach((order: ShipmentCustomerOrder) => {
      if (!order.products && !order.qty && !order.weight && !order.id) return;
      lines.push({
        customerName: customer.name || '',
        orderId: order.id || '',
        products: order.products || '—',
        qty: order.qty || 0,
        qtyUnit: order.qtyUnit || '',
        weight: order.weight || 0,
        weightUnit: order.weightUnit || '',
      });
    });
  });
  return lines;
}

/** Group consecutive same location+type+schedule rows into one physical stop (create-shipment style). */
function groupStops(stops: ShipmentStop[]): GroupedStop[] {
  const groups: GroupedStop[] = [];

  stops.forEach((stop) => {
    const key = [stop.type, stop.location, stop.date, stop.timeStart].join('|');
    const last = groups[groups.length - 1];
    const lines = cargoFromStop(stop);
    const customers = (stop.customers || [])
      .map((c) => c.name)
      .filter((name) => name && name !== '—');

    if (last && last.key === key) {
      lines.forEach((line) => last.lines.push(line));
      customers.forEach((name) => {
        if (!last.customers.includes(name)) last.customers.push(name);
      });
      return;
    }

    groups.push({
      key,
      type: stop.type,
      location: stop.location || '—',
      address: stop.address || '',
      date: stop.date || '',
      timeStart: stop.timeStart || '',
      timeEnd: stop.timeEnd || '',
      customers: [...customers],
      lines,
    });
  });

  return groups;
}

function fallbackGroups(
  origin?: string,
  dest?: string,
  pickDt?: string | null,
  delDt?: string | null
): GroupedStop[] {
  return [
    {
      key: 'origin',
      type: 'pickup',
      location: origin || '—',
      address: '',
      date: pickDt || '',
      timeStart: '',
      timeEnd: '',
      customers: [],
      lines: [],
    },
    {
      key: 'dest',
      type: 'delivery',
      location: dest || '—',
      address: '',
      date: delDt || '',
      timeStart: '',
      timeEnd: '',
      customers: [],
      lines: [],
    },
  ];
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

  const groups = useMemo(() => {
    if (stops && stops.length > 0) return groupStops(stops);
    return fallbackGroups(origin, dest, pickDt, delDt);
  }, [stops, origin, dest, pickDt, delDt]);

  const collapsible = groups.length > 2;
  const visible = collapsible && !expanded ? groups.slice(0, 2) : groups;

  return (
    <div className="itinerary-preview">
      <ExpHeading icon="itinerary" className="exp-h-gap">
        {t('itinerary')}
      </ExpHeading>

      <div className="itin-stops">
        {visible.map((stop, idx) => {
          const when = formatWhen(stop.date, stop.timeStart, stop.timeEnd);
          const cargoOpen = openCargo[stop.key] ?? true;
          const hasCargo = stop.lines.length > 0;
          const isPickup = stop.type === 'pickup';

          return (
            <div key={`${stop.key}-${idx}`} className="itin-stop">
              <div className="itin-stop-main">
                <span className={`itin-pin ${isPickup ? 'itin-pin-pick' : 'itin-pin-drop'}`}>
                  {idx + 1}
                </span>
                <div className="itin-stop-body">
                  <div className="itin-stop-meta">
                    <span className={`itin-badge ${isPickup ? 'itin-badge-pick' : 'itin-badge-drop'}`}>
                      {isPickup ? t('pickup') : t('delivery')}
                    </span>
                    {when ? <span className="itin-when">{when}</span> : null}
                  </div>
                  <div className="itin-loc">{stop.location}</div>
                  {stop.address && stop.address !== stop.location ? (
                    <div className="itin-addr">{stop.address}</div>
                  ) : null}
                  {stop.customers.length > 0 && (
                    <div className="itin-custs">
                      {stop.customers.slice(0, 2).map((name) => (
                        <span key={name} className="itin-cust-pill">
                          🏪 {name}
                        </span>
                      ))}
                      {stop.customers.length > 2 && (
                        <span className="itin-cust-more">+{stop.customers.length - 2}</span>
                      )}
                    </div>
                  )}

                  {hasCargo && (
                    <button
                      type="button"
                      className="itin-cargo-toggle"
                      onClick={() =>
                        setOpenCargo((prev) => ({ ...prev, [stop.key]: !cargoOpen }))
                      }
                    >
                      {cargoOpen ? '▾' : '▸'} {t('step2CargoAtStop')}
                    </button>
                  )}
                </div>
              </div>

              {hasCargo && cargoOpen && (
                <div className="itin-cargo">
                  {stop.lines.map((line, li) => (
                    <div key={`${line.orderId}-${li}`} className="itin-cargo-row">
                      <span className={`itin-action ${isPickup ? 'pick' : 'drop'}`}>
                        {isPickup ? '↑' : '↓'}
                      </span>
                      <div className="itin-cargo-main">
                        <div className="itin-product">{line.products}</div>
                        <div className="itin-cargo-sub">
                          {line.orderId ? <span className="itin-order">{line.orderId}</span> : null}
                          {line.customerName && line.customerName !== '—' ? (
                            <span>{line.customerName}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="itin-cargo-stats">
                        {formatQty(line.qty, line.qtyUnit) ? (
                          <span>{formatQty(line.qty, line.qtyUnit)}</span>
                        ) : null}
                        {formatWeight(line.weight, line.weightUnit) ? (
                          <span>{formatWeight(line.weight, line.weightUnit)}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
