import React, { useState } from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  formatEuro,
  formatRelativeAgo,
} from '../../pages/ManageShipments/utils/listingUtils';
import {
  CompactLoadMeta,
  OrdersBlock,
  ProgressTimeline,
  QuickActions,
  ordersHeaderMeta,
} from './ExpansionShared';

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

function OfferRow({
  offer,
  onAccept,
  onReject,
  onCounter,
  t,
}: {
  offer: NonNullable<Shipment['offers']>[number];
  onAccept: () => void;
  onReject: () => void;
  onCounter: (amount: number) => void;
  t: RowExpansionPendingProps['t'];
}) {
  const [counterOpen, setCounterOpen] = useState(false);
  const prefill = offer.price != null ? Math.round(offer.price * 0.95 * 100) / 100 : 0;
  const [amount, setAmount] = useState(String(prefill || ''));
  const hasCounter = Boolean(offer.counter);
  const roleLabel = offer.role === 'freelancer' ? t('freelancer') : t('company');

  return (
    <div className="bid-row">
      <div className="bid-top">
        <div className="bid-name">
          <span className="carrier-av" style={{ width: 24, height: 24, fontSize: 10 }}>
            {offer.initials || offer.name.substring(0, 2).toUpperCase()}
          </span>
          {offer.name}
          {offer.rating != null && (
            <span className="star">★ {offer.rating.toFixed(1)}</span>
          )}
          <span className="badge badge-gray" style={{ fontSize: 9 }}>
            {roleLabel}
          </span>
          {hasCounter && <span className="bid-status bs-counter">↩</span>}
        </div>
        {offer.price != null && <div className="bid-price">{formatEuro(offer.price)}</div>}
      </div>

      {offer.respondedAt && (
        <div className="bid-meta">
          {t('respondedAgo', { time: formatRelativeAgo(offer.respondedAt) })}
        </div>
      )}

      {hasCounter && offer.counter ? (
        <div className="co-line">
          <div className="co-prices">
            <span className="co-yours">{formatEuro(offer.counter.yours)}</span>
            <span className="co-arr">→</span>
            <span className="co-theirs">{formatEuro(offer.counter.theirs)}</span>
          </div>
          <span className={`co-pct ${offer.counter.dir === 'up' ? 'up' : 'down'}`}>
            {offer.counter.dir === 'up' ? '↑' : '↓'}
            {offer.counter.pct > 0 ? '+' : ''}
            {offer.counter.pct}%
          </span>
          <div className="co-acts-inline">
            <button type="button" className="co-ok" onClick={onAccept}>
              ✓ {t('accept')}
            </button>
            <button type="button" className="co-cnt" onClick={() => setCounterOpen(true)}>
              ↩ {t('counter')}
            </button>
            <button type="button" className="co-no" onClick={onReject}>
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="bid-acts">
          <button type="button" className="bid-accept" onClick={onAccept}>
            {t('accept')}
          </button>
          <button type="button" className="bid-reject" onClick={onReject}>
            {t('reject')}
          </button>
          <button type="button" className="bid-counter" onClick={() => setCounterOpen((v) => !v)}>
            {t('counter')}
          </button>
        </div>
      )}

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
  onAcceptOffer,
  onRejectOffer,
  onCounterOffer,
  onRemindInvitee,
  onRemoveInvitee,
  onInviteMore,
  t,
}) => {
  const [invOpen, setInvOpen] = useState(true);
  const offers = shipment.offers ?? [];
  const invitees = shipment.invitees ?? [];
  const invitedCount = invitees.length || shipment.invited || 0;
  const ordersMeta = ordersHeaderMeta(shipment, t);
  const bidLabel =
    offers.length === 1 ? t('bid') : offers.length > 1 ? t('bids') : '';

  return (
    <div className="exp-inner">
      {/* Col 1 — Progress + Orders + compact meta (HTML) */}
      <div className="exp-section">
        <h4>{t('progress')}</h4>
        <ProgressTimeline shipment={shipment} t={t} loading={detailLoading} />

        <h4 style={{ marginTop: 12 }}>{ordersMeta.label}</h4>
        <OrdersBlock shipment={shipment} t={t} />
        <CompactLoadMeta shipment={shipment} t={t} />
      </div>

      {/* Col 2 — Responses */}
      <div className="exp-section">
        <h4>
          {t('responses')} ({offers.length}
          {bidLabel ? ` ${bidLabel}` : ''})
        </h4>
        {offers.length > 0 ? (
          offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              onAccept={() => onAcceptOffer(offer.id)}
              onReject={() => onRejectOffer(offer.id)}
              onCounter={(amount) => onCounterOffer(offer.id, amount)}
              t={t}
            />
          ))
        ) : (
          <div className="sub" style={{ padding: '12px 0', fontSize: 13 }}>
            {t('noBidsYet')}
          </div>
        )}
      </div>

      {/* Col 3 — Invited carriers (private + public) + Quick Actions */}
      <div className="exp-section">
        <h4
          className="inv-toggle-h"
          role="button"
          tabIndex={0}
          onClick={() => setInvOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setInvOpen((v) => !v);
            }
          }}
        >
          <span className={`cust-chev${invOpen ? ' open' : ''}`}>▶</span>
          {t('invitedTransporters')} ({invitedCount})
        </h4>
        <div className={`inv-section${invOpen ? ' open' : ''}`}>
          {invitees.length > 0
            ? invitees.map((inv) => (
                <div key={inv.id} className="inv-row">
                  <span className="inv-name">
                    <span className="carrier-av" style={{ width: 20, height: 20, fontSize: 8 }}>
                      {inv.initials || inv.name.substring(0, 2).toUpperCase()}
                    </span>
                    {inv.name}
                  </span>
                  {inv.invitedAt && (
                    <span className="ago">
                      {t('invitedAgo', { time: formatRelativeAgo(inv.invitedAt) })}
                    </span>
                  )}
                  <div className="inv-acts">
                    <button
                      type="button"
                      className="inv-btn"
                      onClick={() => onRemindInvitee(inv.id)}
                    >
                      {t('remind')}
                    </button>
                    <button
                      type="button"
                      className="inv-btn"
                      onClick={() => onRemoveInvitee(inv.id)}
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              ))
            : null}
          <button type="button" className="f-pill inv-more" onClick={onInviteMore}>
            {t('inviteMoreCarriers')}
          </button>
        </div>

        <h4 style={{ marginTop: 16 }}>{t('quickActions')}</h4>
        <QuickActions onEdit={onEdit} onView={onViewNewTab} onCancel={onCancel} t={t} />
      </div>
    </div>
  );
};
