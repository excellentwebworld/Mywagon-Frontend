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
} from './ExpansionShared';
import { CarrierAvatar } from './CarrierAvatar';
import { NegotiationHistoryPanel } from './NegotiationHistoryPanel';

type ExpTranslate = (key: string, opts?: Record<string, unknown>) => string;
type Offer = NonNullable<Shipment['offers']>[number];

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
  onCounterOffer: (offerId: string, amount: number, notes?: string) => void | Promise<void>;
  onRemindInvitee: (inviteeId: number) => void | Promise<void>;
  onRemoveInvitee: (inviteeId: number) => void | Promise<void>;
  onInviteMore: () => void;
  t: ExpTranslate;
}

function ExpBtnSpin() {
  return <span className="exp-btn-spin" aria-hidden />;
}

/** Match old panel: availability Accept/Reject only when latest action is from transporter. */
function canShowAcceptReject(offer: Offer, isAvailability: boolean): boolean {
  if (!isAvailability) return true;
  const by = String(offer.lastActionBy || '').toLowerCase();
  return by === 'carrier' || by === 'driver';
}

function OfferCard({
  offer,
  shipmentId,
  isAvailability,
  negotiable,
  onAccept,
  onReject,
  onCounter,
  onMessage,
  t,
}: {
  offer: Offer;
  shipmentId: string | number;
  isAvailability: boolean;
  negotiable: boolean;
  onAccept: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  onCounter: (amount: number, notes?: string) => void | Promise<void>;
  onMessage: () => void | Promise<void>;
  t: ExpTranslate;
}) {
  const [counterOpen, setCounterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState<'accept' | 'reject' | 'counter' | 'chat' | 'send' | null>(null);
  const COUNTER_OFFER_PREFILL_RATIO = 0.95;
  const prefill =
    offer.price != null ? Math.round(offer.price * COUNTER_OFFER_PREFILL_RATIO * 100) / 100 : 0;
  const [amount, setAmount] = useState(String(prefill || ''));
  const [notes, setNotes] = useState('');
  const NOTES_MAX = 500;

  const awaitingTransporter = offer.lastActionBy === 'shipper';
  const showAcceptReject = canShowAcceptReject(offer, isAvailability) && !awaitingTransporter;
  const canCounter =
    (isAvailability || negotiable) &&
    !awaitingTransporter &&
    (offer.type === 'bid' || offer.type === 'interest');
  const showHistory = offer.hasHistory !== false;
  const hasCounter = Boolean(offer.counter);
  const roleLabel = offer.role === 'freelancer' ? t('freelancer') : t('company');
  const locked = busy != null;
  const rating = offer.rating ?? 0;
  const ratingCount = offer.ratingCount ?? 0;

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
    <div className={`bid-row${locked ? ' is-busy' : ''}${historyOpen ? ' has-history-open' : ''}`}>
      <div className="bid-top">
        <div className="bid-name">
          <CarrierAvatar
            name={offer.name}
            initials={offer.initials}
            avatar={offer.avatar}
            size={28}
          />
          <div className="bid-name-block">
            <div className="bid-name-line">
              <span className="bid-carrier-name">{offer.name}</span>
              {offer.isPartner ? <span className="bids-partner-badge">{t('partner')}</span> : null}
              <span className="badge badge-gray" style={{ fontSize: 9 }}>
                {roleLabel}
              </span>
              {awaitingTransporter ? (
                <span className="badge badge-info" style={{ fontSize: 9 }}>
                  {t('awaitingResponse')}
                </span>
              ) : null}
            </div>
            <div className="bid-subline">
              <span>
                {t('vatNumberLabel')} {offer.vat || t('nA')}
              </span>
              <span className="bid-rating">
                ★ {rating.toFixed(1)}/5 ({ratingCount})
              </span>
              {offer.respondedAt ? (
                <span>
                  {t('respondedAgo', { time: formatRelativeAgo(offer.respondedAt, t) })}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {offer.price != null ? <div className="bid-price">{formatEuro(offer.price)}</div> : null}
      </div>

      <div className="bid-footer">
        <div className="bid-footer-left">
          {hasCounter && offer.counter ? (
            <div className="co-chip">
              {/* from = previous (strikethrough), to = latest counter */}
              <span className="co-yours">
                {formatEuro(offer.counter.from ?? offer.counter.theirs)}
              </span>
              <span className="co-arr">→</span>
              <span className="co-theirs">
                {formatEuro(offer.counter.to ?? offer.counter.yours)}
              </span>
              <span className={`co-pct ${offer.counter.dir === 'up' ? 'up' : 'down'}`}>
                {offer.counter.dir === 'up' ? '↑' : '↓'}
                {offer.counter.pct > 0 ? '+' : ''}
                {Math.abs(offer.counter.pct)}%
              </span>
            </div>
          ) : awaitingTransporter ? (
            <span className="bid-awaiting-msg">{t('awaitingTheirResponse')}</span>
          ) : (
            <span className="bid-footer-spacer" aria-hidden />
          )}
        </div>

        <div className="bid-acts">
          {showAcceptReject ? (
            <button
              type="button"
              className="bid-accept"
              disabled={locked}
              onClick={() => void run('accept', onAccept)}
            >
              {busy === 'accept' ? <ExpBtnSpin /> : null}
              {t('accept')}
            </button>
          ) : null}
          {showAcceptReject ? (
            <button
              type="button"
              className="bid-reject bid-reject-danger"
              disabled={locked}
              onClick={() => void run('reject', onReject)}
            >
              {busy === 'reject' ? <ExpBtnSpin /> : null}
              {t('reject')}
            </button>
          ) : null}
          {canCounter ? (
            <button
              type="button"
              className="bid-counter"
              disabled={locked}
              onClick={() => setCounterOpen((v) => !v)}
            >
              {t('counter')}
            </button>
          ) : null}
          {showHistory ? (
            <button
              type="button"
              className={`bid-history${historyOpen ? ' is-open' : ''}`}
              disabled={locked}
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((v) => !v)}
            >
              <span className={`cust-chev${historyOpen ? ' open' : ''}`}>▶</span>
              {t('history')}
            </button>
          ) : null}
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

      {counterOpen && canCounter ? (
        <div className="counter-form open">
          <div className="counter-form-row">
            <label className="counter-form-label" htmlFor={`counter-price-${offer.id}`}>
              {t('counterPriceLabel')} <span className="counter-req">*</span>
            </label>
            <div className="counter-price-wrap">
              <span className="counter-currency">€</span>
              <input
                id={`counter-price-${offer.id}`}
                type="number"
                min={0}
                step="0.01"
                value={amount}
                disabled={locked}
                placeholder={t('counterPricePlaceholder')}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="counter-form-row">
            <label className="counter-form-label" htmlFor={`counter-notes-${offer.id}`}>
              {t('counterNotesLabel')} <span className="counter-opt">({t('optional')})</span>
            </label>
            <textarea
              id={`counter-notes-${offer.id}`}
              className="counter-notes"
              rows={3}
              maxLength={NOTES_MAX}
              value={notes}
              disabled={locked}
              placeholder={t('counterNotesPlaceholder')}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="counter-notes-count">
              {notes.length}/{NOTES_MAX}
            </div>
          </div>
          <div className="counter-form-actions">
            <button
              type="button"
              className="bid-chat"
              disabled={locked}
              onClick={() => {
                setCounterOpen(false);
                setNotes('');
              }}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="bid-accept counter-send"
              disabled={locked}
              onClick={() => {
                const n = Number(amount);
                if (!Number.isFinite(n) || n < 0) return;
                const trimmed = notes.trim();
                void run('send', async () => {
                  await onCounter(n, trimmed || undefined);
                  setCounterOpen(false);
                  setNotes('');
                });
              }}
            >
              {busy === 'send' ? <ExpBtnSpin /> : null}
              {t('sendCounterBid')}
            </button>
          </div>
        </div>
      ) : null}

      {showHistory ? (
        <NegotiationHistoryPanel
          open={historyOpen}
          shipmentId={shipmentId}
          offerId={offer.id}
          t={t}
        />
      ) : null}
    </div>
  );
}

function OfferList({
  offers,
  shipmentId,
  isAvailability,
  negotiable,
  onAcceptOffer,
  onRejectOffer,
  onCounterOffer,
  onMessage,
  t,
}: {
  offers: Offer[];
  shipmentId: string | number;
  isAvailability: boolean;
  negotiable: boolean;
  onAcceptOffer: (offerId: string) => void | Promise<void>;
  onRejectOffer: (offerId: string) => void | Promise<void>;
  onCounterOffer: (offerId: string, amount: number, notes?: string) => void | Promise<void>;
  onMessage: (offerId: string) => void | Promise<void>;
  t: ExpTranslate;
}) {
  return (
    <div className="bids-card-list">
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          shipmentId={shipmentId}
          isAvailability={isAvailability}
          negotiable={negotiable}
          onAccept={() => onAcceptOffer(offer.id)}
          onReject={() => onRejectOffer(offer.id)}
          onCounter={(amount, notes) => onCounterOffer(offer.id, amount, notes)}
          onMessage={() => onMessage(offer.id)}
          t={t}
        />
      ))}
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
  const isPublic = (shipment.channel || shipment.vis) === 'public';
  const receivedOffers = offers.filter((o) => (o.kind ?? 'received') !== 'sent');
  const receivedBids = receivedOffers.filter((o) => o.type === 'bid');
  const receivedInterests = receivedOffers.filter((o) => o.type === 'interest');
  const sentOffers = offers.filter((o) => o.kind === 'sent');
  const negotiable = Boolean(shipment.negotiable);
  const quotePrice = shipment.quotedPrice ?? shipment.agreedPrice ?? null;

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
      window.setTimeout(() => setQaBusy(null), 400);
    }
  };

  const priceHeader = (labelKey: string) =>
    quotePrice != null ? (
      <span className="bids-section-price">
        {t(labelKey)}: {formatEuro(quotePrice)}
      </span>
    ) : null;

  return (
    <div className={`exp-inner${detailLoading ? ' is-refreshing' : ''}`}>
      <div className="exp-section">
        <div className="exp-section-head">
          <ExpHeading icon="progress">{t('progress')}</ExpHeading>
          {onRefresh ? (
            <ExpRefreshButton loading={detailLoading} onRefresh={onRefresh} t={t} />
          ) : null}
        </div>
        <ProgressTimeline shipment={shipment} t={t} enlarged loading={false} />

        <OrdersBlock shipment={shipment} t={t} showHeading />
        <ItineraryPreview
          stops={shipment.stops}
          origin={shipment.origin}
          dest={shipment.dest}
          pickDt={shipment.pickDt}
          delDt={shipment.delDt}
          shipmentStatus={shipment.status}
          t={t}
        />
        <CompactLoadMeta shipment={shipment} t={t} />
      </div>

      <div className="exp-section">
        {sentOffers.length > 0 ? (
          <>
            <div className="bids-section-head">
              <ExpHeading icon="responses">
                {t('bidsSentPostedTruck')} ({sentOffers.length})
              </ExpHeading>
              {priceHeader('quotePriceLabel')}
            </div>
            <OfferList
              offers={sentOffers}
              shipmentId={shipment.id}
              isAvailability
              negotiable={negotiable}
              onAcceptOffer={onAcceptOffer}
              onRejectOffer={onRejectOffer}
              onCounterOffer={onCounterOffer}
              onMessage={(id) => onMessage(id)}
              t={t}
            />
          </>
        ) : null}

        {receivedBids.length > 0 ? (
          <>
            <div
              className={`bids-section-head${sentOffers.length > 0 ? ' bids-section-head--spaced' : ''}`}
            >
              <ExpHeading icon="responses">
                {t('bidsReceivedFromTransporters')} ({receivedBids.length})
              </ExpHeading>
              {priceHeader('startingPriceLabel')}
            </div>
            <OfferList
              offers={receivedBids}
              shipmentId={shipment.id}
              isAvailability={false}
              negotiable={negotiable}
              onAcceptOffer={onAcceptOffer}
              onRejectOffer={onRejectOffer}
              onCounterOffer={onCounterOffer}
              onMessage={(id) => onMessage(id)}
              t={t}
            />
          </>
        ) : null}

        {receivedInterests.length > 0 ? (
          <>
            <div
              className={`bids-section-head${
                sentOffers.length > 0 || receivedBids.length > 0 ? ' bids-section-head--spaced' : ''
              }`}
            >
              <ExpHeading icon="responses">
                {t('interestedPartners')} ({receivedInterests.length})
              </ExpHeading>
            </div>
            <OfferList
              offers={receivedInterests}
              shipmentId={shipment.id}
              isAvailability={false}
              negotiable={negotiable}
              onAcceptOffer={onAcceptOffer}
              onRejectOffer={onRejectOffer}
              onCounterOffer={onCounterOffer}
              onMessage={(id) => onMessage(id)}
              t={t}
            />
          </>
        ) : null}

        {offers.length === 0 ? (
          <>
            <ExpHeading icon="responses">{t('responses')} (0)</ExpHeading>
            <div className="sub" style={{ padding: '12px 0', fontSize: 13 }}>
              {t('noBidsYet')}
            </div>
          </>
        ) : null}
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
                      <CarrierAvatar
                        name={inv.name}
                        initials={inv.initials}
                        avatar={inv.avatar}
                        size={20}
                      />
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
          shipment={shipment}
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
