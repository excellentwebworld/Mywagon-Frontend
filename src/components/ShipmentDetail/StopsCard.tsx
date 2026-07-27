import React from 'react';
import type { ShipmentStop } from '../../context/AppContext';
import { CollapsibleCard } from './CollapsibleCard';

interface StopsCardProps {
  stops: ShipmentStop[];
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  onToast: (msg: string) => void;
  t: (key: string) => string;
}

export const StopsCard: React.FC<StopsCardProps> = ({ stops, expanded, onToggle, onCopy, onToast, t }) => (
  <CollapsibleCard
    id="stops"
    title={<>📍 {t('stopsAppointments')}</>}
    count={stops.length}
    expanded={expanded}
    onToggle={onToggle}
  >
    <div style={{ padding: '0 2px' }}>
      {stops.map((stop, idx) => {
        const isPickup = stop.type === 'pickup';
        const done = idx < 2;
        return (
          <div key={stop.id} className="ld-stop">
            <div className="ld-stop-top">
              <div className={`ld-stop-num ${isPickup ? 'pk' : 'dl'}`}>{idx + 1}</div>
              <div style={{ flex: 1 }}>
                <div>
                  <span className={`ld-stop-type ${isPickup ? 'pk' : 'dl'}`}>
                    {isPickup ? t('pickup') : t('delivery')}
                  </span>
                  <span className="ld-stop-time">
                    {stop.date} {stop.timeStart}–{stop.timeEnd}
                  </span>
                </div>
                <div className="ld-stop-name">{stop.location}</div>
                <div className="ld-stop-addr">{stop.address}</div>
                {stop.customers.flatMap((c) =>
                  c.orders.map((o) => (
                    <div key={`${c.name}-${o.id}`} className="ld-stop-tags">
                      <span className="ld-stop-tag">{o.id}</span>
                      <span className="ld-stop-tag">{o.products}</span>
                      <span className="ld-stop-tag">
                        {o.qty} {o.qtyUnit}
                      </span>
                      <span className="ld-stop-tag">
                        {o.weight} {o.weightUnit}
                      </span>
                    </div>
                  ))
                )}
                {stop.customers.map((c) => (
                  <div key={c.name} className="cust-pills" style={{ marginTop: 6 }}>
                    <span className="cust-pill">
                      <span className="ci">🏪</span>
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="ld-stop-check">{done ? '✓' : '○'}</div>
            </div>
            {done && (
              <div className="ld-stop-acts">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopy(stop.address)}>
                  📋 {t('copyAddress')}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onToast(t('message'))}>
                  💬 {t('message')}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </CollapsibleCard>
);
