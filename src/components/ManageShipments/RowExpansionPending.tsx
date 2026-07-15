import React, { useState } from 'react';
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
  onMessage: (offerId?: string) => void;
  onAcceptOffer: (offerId: string) => void;
  onRejectOffer: (offerId: string) => void;
  onCounterOffer: (offerId: string, amount: number) => void;
  onRemindInvitee: (inviteeId: number) => void;
  onRemoveInvitee: (inviteeId: number) => void;
  onInviteMore: () => void;
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
              {(c.orders.length ? c.orders : ['—']).map((o, oi) => (
                <div key={oi} className="ord">
                  <span className="ord-id">{typeof o === 'string' ? o : String(o)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  return <div className="sub">{t('noOrdersMapped')}</div>;
}

function OfferRow({
  offer,
  onAccept,
  onReject,
  onCounter,
  onChat,
  t,
}: {
  offer: NonNullable<Shipment['offers']>[number];
  onAccept: () => void;
  onReject: () => void;
  onCounter: (amount: number) => void;
  onChat: () => void;
  t: RowExpansionPendingProps['t'];
}) {
  const [counterOpen, setCounterOpen] = useState(false);
  const prefill = offer.price != null ? Math.round(offer.price * 0.95 * 100) / 100 : 0;
  const [amount, setAmount] = useState(String(prefill || ''));

  return (
    <div className="bid-row">
      <div className="bid-top">
        <span className="carrier-av">{offer.initials || offer.name.substring(0, 2).toUpperCase()}</span>
        <span className="bid-name">{offer.name}</span>
        {offer.rating != null && <span className="bid-rating">★ {offer.rating.toFixed(1)}</span>}
        <span className="bid-role">{offer.role === 'freelancer' ? t('freelancer') : t('company')}</span>
        {offer.price != null && <span className="bid-price">{formatEuro(offer.price)}</span>}
      </div>
      {offer.respondedAt && (
        <div className="bid-meta">
          {t('respondedAgo', { time: new Date(offer.respondedAt).toLocaleString() })}
        </div>
      )}
      {offer.counter && (
        <div className="co-line">
          <span className="co-strike">{formatEuro(offer.counter.theirs)}</span>
          <span>→</span>
          <span>{formatEuro(offer.counter.yours)}</span>
          <span className={`co-pct ${offer.counter.dir === 'up' ? 'up' : 'down'}`}>
            {offer.counter.pct > 0 ? '+' : ''}
            {offer.counter.pct}%
          </span>
          <button type="button" className="bid-accept" onClick={onAccept}>
            {t('accept')}
          </button>
          <button type="button" className="bid-counter" onClick={() => setCounterOpen(true)}>
            {t('counter')}
          </button>
          <button type="button" className="bid-reject bid-reject-danger" onClick={onReject}>
            ✕
          </button>
        </div>
      )}
      <div className="bid-acts">
        <button type="button" className="bid-accept" onClick={onAccept}>
          {t('accept')}
        </button>
        <button type="button" className="bid-reject bid-reject-danger" onClick={onReject}>
          {t('reject')}
        </button>
        <button type="button" className="bid-counter" onClick={() => setCounterOpen((v) => !v)}>
          {t('counter')}
        </button>
        <button type="button" className="bid-chat" onClick={onChat}>
          {t('chat')}
        </button>
      </div>
      {counterOpen && (
        <div className="counter-form open">
          <span>€</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            type="button"
            className="bid-accept"
            onClick={() => {
              const n = Number(amount);
              if (!Number.isFinite(n) || n < 0) return;
              onCounter(n);
              setCounterOpen(false);
            }}
          >
            {t('send')}
          </button>
        </div>
      )}
    </div>
  );
}

export const RowExpansionPending: React.FC<RowExpansionPendingProps> = ({
  shipment,
  detailLoading = false,
  onEdit,
  onViewNewTab,
  onCancel,
  onMessage,
  onAcceptOffer,
  onRejectOffer,
  onCounterOffer,
  onRemindInvitee,
  onRemoveInvitee,
  onInviteMore,
  t,
}) => {
  const isPublic = shipment.channel === 'public' || shipment.vis === 'public';
  const steps = buildStopTimelineSteps(shipment, t);
  const current = stopTimelineCurrentIndex(shipment.status, steps.length);
  const offers = shipment.offers ?? [];
  const invitees = shipment.invitees ?? [];

  return (
    <div className="exp-inner">
      <div>
        <div className="exp-section">
          <h4>{t('progress')}</h4>
          {detailLoading && !shipment.stops?.length ? (
            <div className="sub">{t('loading')}</div>
          ) : (
            <div className="tl tl-big">
              {steps.map((label, idx) => (
                <div key={`${label}-${idx}`} className={`tl-s ${idx <= current ? 'done' : ''}`}>
                  <div className="tl-dot" />
                  <div className="tl-lbl">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="exp-section">
          <h4>{t('orders')}</h4>
          <OrdersBlock shipment={shipment} t={t} />
          <ItineraryPreview
            stops={shipment.stops}
            origin={shipment.origin}
            dest={shipment.dest}
            pickDt={shipment.pickDt}
            delDt={shipment.delDt}
            t={t}
          />
        </div>

        <div className="exp-stats">
          <div className="exp-stat">
            <div className="exp-stat-v">{shipment.stopCount ?? 2}</div>
            <div className="exp-stat-l">{t('stops')}</div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-v">
              {formatStatValue(shipment.totalWeight, shipment.weightUnit)}
            </div>
            <div className="exp-stat-l">{t('weight')}</div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-v">{formatStatValue(shipment.totalQty, shipment.qtyUnit)}</div>
            <div className="exp-stat-l">{t('quantity')}</div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-v">
              {shipment.journeyDistanceKm != null ? `${shipment.journeyDistanceKm} km` : '—'}
            </div>
            <div className="exp-stat-l">{t('tripLength')}</div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-v">
              {shipment.cargoValue != null ? formatEuro(shipment.cargoValue) : '—'}
            </div>
            <div className="exp-stat-l">{t('cargoValue')}</div>
          </div>
          <div className="exp-stat">
            <div className="exp-stat-v">
              {(shipment.truckTypes || []).length ? shipment.truckTypes!.join(', ') : '—'}
            </div>
            <div className="exp-stat-l">{t('truckTypes')}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="exp-section">
          <h4>
            {t('responses')} ({offers.length})
          </h4>
          {offers.length > 0 ? (
            offers.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                onAccept={() => onAcceptOffer(offer.id)}
                onReject={() => onRejectOffer(offer.id)}
                onCounter={(amount) => onCounterOffer(offer.id, amount)}
                onChat={() => onMessage(offer.id)}
                t={t}
              />
            ))
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
              {invitees.length > 0 ? (
                invitees.map((inv) => (
                  <div key={inv.id} className="inv-row">
                    <span className="carrier-av">{inv.initials || inv.name.substring(0, 2).toUpperCase()}</span>
                    <span className="inv-name">{inv.name}</span>
                    {inv.invitedAt && (
                      <span className="sub">
                        {t('invitedAgo', {
                          time: new Date(inv.invitedAt).toLocaleString(),
                        })}
                      </span>
                    )}
                    <span className="inv-acts">
                      <button type="button" className="inv-btn" onClick={() => onRemindInvitee(inv.id)}>
                        {t('remind')}
                      </button>
                      <button type="button" className="inv-btn" onClick={() => onRemoveInvitee(inv.id)}>
                        {t('remove')}
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <div className="sub">{t('noInvitedTransporters')}</div>
              )}
              <button type="button" className="f-pill" style={{ marginTop: 8 }} onClick={onInviteMore}>
                {t('inviteMoreCarriers')}
              </button>
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
