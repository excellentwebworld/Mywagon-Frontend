import React from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  buildStopTimelineSteps,
  formatEuro,
  formatStatValue,
  stopTimelineCurrentIndex,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ItineraryPreview } from './ItineraryPreview';

interface RowExpansionPendingProps {
  shipment: Shipment;
  detailLoading?: boolean;
  onEdit: () => void;
  onViewNewTab: () => void;
  onCancel: () => void;
  onStubAction: (key: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function OrdersBlock({ shipment, t }: { shipment: Shipment; t: RowExpansionPendingProps['t'] }) {
  const fromStops =
    shipment.stops?.flatMap((stop) =>
      stop.customers.flatMap((c) =>
        c.orders.map((o) => ({
          customer: c.name,
          id: o.id,
          products: o.products,
          qty: o.qty,
          qtyUnit: o.qtyUnit,
          weight: o.weight,
          weightUnit: o.weightUnit,
        }))
      )
    ) ?? [];

  if (fromStops.length > 0) {
    const byCustomer = new Map<string, typeof fromStops>();
    fromStops.forEach((row) => {
      const list = byCustomer.get(row.customer) || [];
      list.push(row);
      byCustomer.set(row.customer, list);
    });
    return (
      <>
        {Array.from(byCustomer.entries()).map(([name, rows]) => (
          <div key={name} className="exp-cust-group">
            <div className="exp-cust-head">
              <span>🏪</span>
              <span className="cust-name">{name}</span>
            </div>
            <div className="exp-cust-body open">
              {rows.map((o) => (
                <div key={`${o.id}-${o.products}`} className="ord">
                  <span className="ord-id">{o.id}</span>
                  {' · '}
                  {o.products}
                  {(o.qty > 0 || o.weight > 0) && (
                    <span className="sub">
                      {' '}
                      ({o.qty > 0 ? `${o.qty} ${o.qtyUnit}` : ''}
                      {o.qty > 0 && o.weight > 0 ? ', ' : ''}
                      {o.weight > 0 ? `${o.weight} ${o.weightUnit}` : ''})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  if (shipment.customer.length) {
    return (
      <>
        {shipment.customer.map((c, idx) => (
          <div key={idx} className="exp-cust-group">
            <div className="exp-cust-head">
              <span>🏪</span>
              <span className="cust-name">{c.name}</span>
            </div>
            <div className="exp-cust-body open">
              {(c.orders || []).length > 0 ? (
                (c.orders as string[]).map((o) => (
                  <div key={o} className="ord">
                    <span className="ord-id">{o}</span>
                  </div>
                ))
              ) : shipment.orderIds?.length ? (
                shipment.orderIds.map((id) => (
                  <div key={id} className="ord">
                    <span className="ord-id">{id}</span>
                  </div>
                ))
              ) : (
                <div className="sub">—</div>
              )}
            </div>
          </div>
        ))}
      </>
    );
  }

  return <div className="sub">{t('noOrdersMapped')}</div>;
}

export const RowExpansionPending: React.FC<RowExpansionPendingProps> = ({
  shipment,
  detailLoading = false,
  onEdit,
  onViewNewTab,
  onCancel,
  onStubAction,
  t,
}) => {
  const steps = buildStopTimelineSteps(shipment, t);
  const cur = stopTimelineCurrentIndex(shipment.status, steps.length);
  const channel = shipment.channel || (shipment.vis === 'public' ? 'public' : 'private');
  const isPublic = channel === 'public';
  const received = shipment.bidsReceived ?? shipment.bids ?? 0;

  return (
    <div className="exp-inner">
      <div>
        <div className="exp-section">
          <h4>{t('progress')}</h4>
          {detailLoading ? (
            <div className="sub">{t('loading')}</div>
          ) : (
            <div className="tl">
              {steps.map((lbl, idx) => (
                <React.Fragment key={`${lbl}-${idx}`}>
                  <div className="tl-step">
                    <div className={`tl-dot ${idx < cur ? 'done' : idx === cur ? 'cur' : ''}`} />
                    <div className="tl-label">{lbl}</div>
                  </div>
                  {idx < steps.length - 1 && <div className={`tl-line ${idx < cur ? 'done' : ''}`} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="exp-section" style={{ marginTop: 16 }}>
          <h4>{t('orders')}</h4>
          <OrdersBlock shipment={shipment} t={t} />
        </div>

        <ItineraryPreview
          stops={shipment.stops}
          origin={shipment.origin}
          dest={shipment.dest}
          pickDt={shipment.pickDt}
          delDt={shipment.delDt}
          t={t}
        />

        <div className="exp-stats-grid" style={{ marginTop: 16 }}>
          <div className="exp-stat">
            <div className="exp-stat-l">{t('stops')}</div>
            <div className="exp-stat-v">{formatStatValue(shipment.stopCount ?? shipment.stops?.length)}</div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-l">{t('weight')}</div>
            <div className="exp-stat-v">
              {formatStatValue(shipment.totalWeight, shipment.weightUnit)}
            </div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-l">{t('quantity')}</div>
            <div className="exp-stat-v">{formatStatValue(shipment.totalQty, shipment.qtyUnit)}</div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-l">{t('tripLength')}</div>
            <div className="exp-stat-v">
              {formatStatValue(shipment.journeyDistanceKm, shipment.journeyDistanceKm != null ? 'km' : null)}
            </div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-l">{t('cargoValue')}</div>
            <div className="exp-stat-v">{formatEuro(shipment.cargoValue) ?? '—'}</div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-l">{t('truckTypes')}</div>
            <div className="exp-stat-v">
              {shipment.truckTypes?.length ? shipment.truckTypes.join(', ') : '—'}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="exp-section">
          <h4>
            {t('responses')} ({received})
          </h4>
          {received > 0 ? (
            <div className="bid-row">
              <div className="bid-top">
                <span className="bid-name">{t('offersPendingDetail')}</span>
                {shipment.best_bid != null && <span className="bid-price">€{shipment.best_bid}</span>}
              </div>
              <div className="bid-meta">{t('bidsReceivedCount', { count: received })}</div>
              <div className="bid-acts">
                <button type="button" className="bid-accept" onClick={() => onStubAction('responsesComingSoon')}>
                  {t('accept')}
                </button>
                <button
                  type="button"
                  className="bid-reject bid-reject-danger"
                  onClick={() => onStubAction('responsesComingSoon')}
                >
                  {t('reject')}
                </button>
                <button type="button" className="bid-counter" onClick={() => onStubAction('responsesComingSoon')}>
                  {t('counter')}
                </button>
                <button type="button" className="bid-chat" onClick={() => onStubAction('responsesComingSoon')}>
                  {t('chat')}
                </button>
              </div>
            </div>
          ) : (
            <div className="sub" style={{ padding: '8px 0' }}>
              {t('noBidsYet')}
            </div>
          )}
        </div>
      </div>

      <div>
        {!isPublic && (
          <div className="exp-section">
            <h4>{t('invitedTransporters')}</h4>
            <div className="inv-section open">
              {(shipment.invited ?? 0) > 0 ? (
                <div className="inv-row">
                  <span className="inv-name">{t('invitedCount', { count: shipment.invited })}</span>
                  <span className="inv-acts">
                    <button type="button" className="inv-btn" onClick={() => onStubAction('remindComingSoon')}>
                      {t('remind')}
                    </button>
                  </span>
                </div>
              ) : (
                <div className="sub">{t('noInvitedTransporters')}</div>
              )}
            </div>
          </div>
        )}

        <div className="exp-section" style={{ marginTop: isPublic ? 0 : 16 }}>
          <h4>{t('quickActions')}</h4>
          <div className="qa-row">
            <button type="button" className="f-pill" onClick={onEdit}>
              {t('rowActionEdit')}
            </button>
            <button type="button" className="f-pill" onClick={onViewNewTab}>
              {t('rowActionView')}
            </button>
            <button type="button" className="f-pill" onClick={onCancel}>
              {t('rowActionDelete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
