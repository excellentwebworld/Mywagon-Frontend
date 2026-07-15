import React, { useState } from 'react';
import type { Shipment } from '../../context/AppContext';
import { formatEuro } from '../../pages/ManageShipments/utils/listingUtils';
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
      {!offer.counter && (
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
  const offers = shipment.offers ?? [];
  const invitees = shipment.invitees ?? [];
  const ordersMeta = ordersHeaderMeta(shipment, t);
  const bidLabel =
    offers.length === 1 ? t('bid') : offers.length > 1 ? t('bids') : '';

  return (
    <div className="exp-inner">
      <div className="exp-section">
        <h4>{t('progress')}</h4>
        <ProgressTimeline shipment={shipment} t={t} loading={detailLoading} />

        <h4 style={{ marginTop: 12 }}>{ordersMeta.label}</h4>
        <OrdersBlock shipment={shipment} t={t} />
        <CompactLoadMeta shipment={shipment} t={t} />
      </div>

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

      <div className="exp-section">
        {!isPublic && (
          <>
            <h4>
              {t('invitedTransporters')} ({invitees.length})
            </h4>
            <div className="inv-section open">
              {invitees.length > 0 ? (
                invitees.map((inv) => (
                  <div key={inv.id} className="inv-row">
                    <span className="carrier-av">
                      {inv.initials || inv.name.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="inv-name">{inv.name}</span>
                    {inv.invitedAt && (
                      <span className="sub">
                        {t('invitedAgo', {
                          time: new Date(inv.invitedAt).toLocaleString(),
                        })}
                      </span>
                    )}
                    <span className="inv-acts">
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
                    </span>
                  </div>
                ))
              ) : (
                <div className="sub">{t('noInvitedTransporters')}</div>
              )}
              <button
                type="button"
                className="f-pill inv-more"
                onClick={onInviteMore}
              >
                {t('inviteMoreCarriers')}
              </button>
            </div>
          </>
        )}

        <h4 style={{ marginTop: isPublic ? 0 : 16 }}>{t('quickActions')}</h4>
        <QuickActions onEdit={onEdit} onView={onViewNewTab} onCancel={onCancel} t={t} />
      </div>
    </div>
  );
};
