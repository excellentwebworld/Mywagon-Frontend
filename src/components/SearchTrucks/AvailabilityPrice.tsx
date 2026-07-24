import React from 'react';
import type { AvailableTruck } from '../../pages/SearchTrucks/types';
import { formatMoney } from '../../pages/SearchTrucks/utils/money';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Posted-truck price: original strikethrough + best bid when subscription allows. */
export function AvailabilityPrice({
  truck,
  canViewBestBid = false,
  className = 'sat-price',
  size = 'md',
  t,
}: {
  truck: AvailableTruck;
  canViewBestBid?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  t: Translate;
}) {
  const showQuote = truck.price != null && !truck.priceBlurred;
  const showBest =
    canViewBestBid && truck.bestBid != null && !Number.isNaN(Number(truck.bestBid));

  if (!showQuote && !showBest) {
    return (
      <span className={`sat-offer-b${truck.priceBlurred ? ' sat-price-blurred' : ''}`}>
        {t('satOfferBased')}
      </span>
    );
  }

  if (showBest && showQuote && Number(truck.bestBid) !== Number(truck.price)) {
    return (
      <span className={`sat-price-stack sat-price-stack--${size}`}>
        <span className="sat-price-original" title={t('satOriginalPrice') || 'Original price'}>
          {formatMoney(truck.price, truck.currency)}
        </span>
        <span className={className} title={t('satBestBid') || 'Best bid'}>
          {formatMoney(truck.bestBid, truck.currency)}
        </span>
      </span>
    );
  }

  if (showBest && !showQuote) {
    return (
      <span className={className} title={t('satBestBid') || 'Best bid'}>
        {formatMoney(truck.bestBid, truck.currency)}
      </span>
    );
  }

  return <span className={className}>{formatMoney(truck.price, truck.currency)}</span>;
}

/** Bid count line gated by View If Posted Truck Received Bids. */
export function AvailabilityBidsMeta({
  truck,
  canViewBidsCount = false,
  t,
}: {
  truck: AvailableTruck;
  canViewBidsCount?: boolean;
  t: Translate;
}) {
  if (!canViewBidsCount) return null;

  if (truck.bidsCount != null && truck.bidsCount > 0) {
    return (
      <span className="sat-bids-meta sat-bids-meta--has">
        {t('satBidsCount', { count: truck.bidsCount })}
      </span>
    );
  }

  return (
    <span className="sat-bids-meta sat-bids-meta--none">
      {t('satNoBidsReceived') || 'No bids received'}
    </span>
  );
}
