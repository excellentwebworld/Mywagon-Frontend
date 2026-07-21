import React, { useState } from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  formatEuro,
  formatRelativeAgo,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ExpHeading } from './ExpHeading';
import { ExpRefreshButton } from './ExpRefreshButton';
import { ItineraryPreview } from './ItineraryPreview';
import {
  CompactLoadMeta,
  OrdersBlock,
  ProgressTimeline,
  QuickActions,
  ordersHeaderMeta,
} from './ExpansionShared';

type ExpTranslate = (key: string, opts?: Record<string, unknown>) => string;

interface RowExpansionPendingProps {
  shipment: Shipment;
  detailLoading?: boolean;
  onRefresh?: () => void;
  onEdit: () => void;
  onViewNewTab: () => void;
  onCancel: () => void;
  onMessage: (offerId?: string) => void | Promise<void>;
  onAcceptOffer: (offerId: string) => void | Promise<void>;
  onRejectOffer: (offerId: string) => void | Promise<void>;
  onCounterOffer: (offerId: string, amount: number) => void | Promise<void>;
  onRemindInvitee: (inviteeId: number) => void | Promise<void>;
  onRemoveInvitee: (inviteeId: number) => void | Promise<void>;
  onInviteMore: () => void;
  t: ExpTranslate;
}

function ExpBtnSpin() {
  return <span className="exp-btn-spin" aria-hidden />;
}

function OfferRow({
  offer,
  onAccept,
  onReject,
  onCounter,
  onMessage,
  t,
}: {
  offer: NonNullable<Shipment['offers']>[number];
  onAccept: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  onCounter: (amount: number) => void | Promise<void>;
  onMessage: () => void | Promise<void>;
  t: ExpTranslate;
}) {
  const [counterOpen, setCounterOpen] = useState(false);
  const [busy, setBusy] = useState<'accept' | 'reject' | 'counter' | 'chat' | 'send' | null>(null);
  // Prefill counter at 95% of the offer price as a starting negotiation point.
  const COUNTER_OFFER_PREFILL_RATIO = 0.95;
  const prefill = offer.price != null ? Math.round(offer.price * COUNTER_OFFER_PREFILL_RATIO * 100) / 100 : 0;
  const [amount, setAmount] = useState(String(prefill || ''));
  const hasCounter = Boolean(offer.counter);
  const roleLabel = offer.role === 'freelancer' ? t('freelancer') : t('company');
  const locked = busy != null;

  const run = async (key: NonNullable<typeof busy>, fn: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`bid-row${locked ? ' is-busy' : ''}`}>
      <div className="bid-top">
        <div className="bid-name">
          <span className="carrier-av" style={{ width: 24, height: 24, fontSize: 10 }}>
            {offer.initials || offer.name.substring(0, 2).toUpperCase()}
          </span>
          {offer.name}
          {offer.rating != null && <span className="star">★ {offer.rating.toFixed(1)}</span>}
          <span className="badge badge-gray" style={{ fontSize: 9 }}>
            {roleLabel}
          </span>
          {hasCounter && <span className="bid-status bs-counter">↩</span>}
        </div>
        {offer.price != null && <div className="bid-price">{formatEuro(offer.price)}</div>}
      </div>

      {offer.respondedAt && (
        <div className="bid-meta">
          {t('respondedAgo', { time: formatRelativeAgo(offer.respondedAt, t) })}
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
            <button
              type="button"
              className="co-ok"
              disabled={locked}
              onClick={() => void run('accept', onAccept)}
            >
              {busy === 'accept' ? <ExpBtnSpin /> : null}
              ✓ {t('accept')}
            </button>
            <button
              type="button"
              className="co-cnt"
              disabled={locked}
              onClick={() => setCounterOpen(true)}
            >
              ↩ {t('counter')}
            </button>
            <button
              type="button"
              className="co-no bid-reject-danger"
              disabled={locked}
              onClick={() => void run('reject', onReject)}
            >
              {busy === 'reject' ? <ExpBtnSpin /> : '✕'}
            </button>
            <button
              type="button"
              className="bid-chat"
              disabled={locked}
              onClick={() => void run('chat', onMessage)}
            >
              {busy === 'chat' ? <ExpBtnSpin /> : null}
              {t('chat')}
            </button>
          </div>
        </div>
      ) : (
        <div className="bid-acts">
          <button
            type="button"
            className="bid-accept"
            disabled={locked}
            onClick={() => void run('accept', onAccept)}
          >
            {busy === 'accept' ? <ExpBtnSpin /> : null}
            {t('accept')}
          </button>
          <button
            type="button"
            className="bid-reject bid-reject-danger"
            disabled={locked}
            onClick={() => void run('reject', onReject)}
          >
            {busy === 'reject' ? <ExpBtnSpin /> : null}
            {t('reject')}
          </button>
          <button
            type="button"
            className="bid-counter"
            disabled={locked}
            onClick={() => setCounterOpen((v) => !v)}
          >
            {t('counter')}
          </button>
          <button
            type="button"
            className="bid-chat"
            disabled={locked}
            onClick={() => void run('chat', onMessage)}
          >
            {busy === 'chat' ? <ExpBtnSpin /> : null}
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
            disabled={locked}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            type="button"
            className="bid-accept"
            disabled={locked}
            onClick={() => {
              const n = Number(amount);
              if (!Number.isFinite(n) || n < 0) return;
              void run('send', async () => {
                await onCounter(n);
                setCounterOpen(false);
              });
            }}
          >
            {busy === 'send' ? <ExpBtnSpin /> : null}
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
  onRefresh,
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
  const [invOpen, setInvOpen] = useState(true);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [qaBusy, setQaBusy] = useState<'edit' | 'view' | 'cancel' | null>(null);
  const offers = shipment.offers ?? [];
  const invitees = shipment.invitees ?? [];
  const invitedCount = invitees.length || shipment.invited || 0;
  const ordersMeta = ordersHeaderMeta(shipment, t);
  const bidLabel =
    offers.length === 1 ? t('bid') : offers.length > 1 ? t('bids') : '';
  const isPublic = (shipment.channel || shipment.vis) === 'public';

  const runInvite = async (key: string, fn: () => void | Promise<void>) => {
    if (inviteBusy) return;
    setInviteBusy(key);
    try {
      await fn();
    } finally {
      setInviteBusy(null);
    }
  };

  const runQa = (key: NonNullable<typeof qaBusy>, fn: () => void) => {
    if (qaBusy) return;
    setQaBusy(key);
    try {
      fn();
    } finally {
      // Sync navigation / modal open — clear on next frame so the spinner is visible.
      window.setTimeout(() => setQaBusy(null), 400);
    }
  };

  return (
    <div className={`exp-inner${detailLoading ? ' is-refreshing' : ''}`}>
      <div className="exp-section">
        <div className="exp-section-head">
          <ExpHeading icon="progress">{t('progress')}</ExpHeading>
          {onRefresh ? (
            <ExpRefreshButton loading={detailLoading} onRefresh={onRefresh} t={t} />
          ) : null}
        </div>
        <ProgressTimeline shipment={shipment} t={t} loading={false} />

        <ExpHeading icon="orders" className="exp-h-gap">
          {ordersMeta.label}
        </ExpHeading>
        <OrdersBlock shipment={shipment} t={t} />
        <ItineraryPreview
          stops={shipment.stops}
          origin={shipment.origin}
          dest={shipment.dest}
          pickDt={shipment.pickDt}
          delDt={shipment.delDt}
          t={t}
        />
        <CompactLoadMeta shipment={shipment} t={t} />
      </div>

      <div className="exp-section">
        <ExpHeading icon="responses">
          {t('responses')} ({offers.length}
          {bidLabel ? ` ${bidLabel}` : ''})
        </ExpHeading>
        {offers.length > 0 ? (
          offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              onAccept={() => onAcceptOffer(offer.id)}
              onReject={() => onRejectOffer(offer.id)}
              onCounter={(amount) => onCounterOffer(offer.id, amount)}
              onMessage={() => onMessage(offer.id)}
              t={t}
            />
          ))
        ) : (
          <div className="sub" style={{ padding: '12px 0', fontSize: 13 }}>
            {t('noBidsYet')}
          </div>
        )}
      </div>

      <div className="exp-section">
        {!isPublic && (
          <>
            <ExpHeading
              icon="invited"
              className="inv-toggle-h"
              onClick={() => setInvOpen((v) => !v)}
            >
              <span className={`cust-chev${invOpen ? ' open' : ''}`}>▶</span>
              {t('invitedTransporters')} ({invitedCount})
            </ExpHeading>
            <div className={`inv-section${invOpen ? ' open' : ''}`}>
              {invitees.map((inv) => {
                const remindKey = `remind-${inv.id}`;
                const removeKey = `remove-${inv.id}`;
                const rowBusy = inviteBusy === remindKey || inviteBusy === removeKey;
                return (
                  <div key={inv.id} className={`inv-row${rowBusy ? ' is-busy' : ''}`}>
                    <span className="inv-name">
                      <span className="carrier-av" style={{ width: 20, height: 20, fontSize: 8 }}>
                        {inv.initials || inv.name.substring(0, 2).toUpperCase()}
                      </span>
                      {inv.name}
                    </span>
                    {inv.invitedAt && (
                      <span className="ago">
                        {t('invitedAgo', { time: formatRelativeAgo(inv.invitedAt, t) })}
                      </span>
                    )}
                    <div className="inv-acts">
                      <button
                        type="button"
                        className="inv-btn"
                        disabled={inviteBusy != null}
                        onClick={() => void runInvite(remindKey, () => onRemindInvitee(inv.id))}
                      >
                        {inviteBusy === remindKey ? <ExpBtnSpin /> : null}
                        {t('remind')}
                      </button>
                      <button
                        type="button"
                        className="inv-btn"
                        disabled={inviteBusy != null}
                        onClick={() => void runInvite(removeKey, () => onRemoveInvitee(inv.id))}
                      >
                        {inviteBusy === removeKey ? <ExpBtnSpin /> : null}
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="f-pill inv-more"
                disabled={inviteBusy != null}
                onClick={onInviteMore}
              >
                {t('inviteMoreCarriers')}
              </button>
            </div>
          </>
        )}

        <ExpHeading icon="qa" className="exp-h-gap-lg">
          {t('quickActions')}
        </ExpHeading>
        <QuickActions
          busy={qaBusy}
          onEdit={() => runQa('edit', onEdit)}
          onView={() => runQa('view', onViewNewTab)}
          onCancel={() => runQa('cancel', onCancel)}
          t={t}
        />
      </div>
    </div>
  );
};
