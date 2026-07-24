import React from 'react';
import type { AvailableTruck, DrawerMode } from '../../pages/SearchTrucks/types';
import { AvailabilityBidsMeta, AvailabilityPrice } from './AvailabilityPrice';

interface AvailabilityCardProps {
  truck: AvailableTruck;
  selected: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onBook: (truck: AvailableTruck, mode?: DrawerMode, occurrence?: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  cardRef?: (el: HTMLDivElement | null) => void;
  /** View If Posted Truck Received Bids */
  canViewBidsCount?: boolean;
  /** View Best Bids On Posted Trucks */
  canViewBestBid?: boolean;
}

export const AvailabilityCard: React.FC<AvailabilityCardProps> = ({
  truck,
  selected,
  hovered,
  onHover,
  onSelect,
  onBook,
  t,
  cardRef,
  canViewBidsCount = false,
  canViewBestBid = false,
}) => (
  <div
    ref={cardRef}
    className={`sat-card ${selected ? 'selected' : ''} ${hovered ? 'hovered' : ''}`}
    onMouseEnter={() => onHover(truck.id)}
    onMouseLeave={() => onHover(null)}
    onClick={() => onSelect(truck.id)}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(truck.id);
      }
    }}
    aria-pressed={selected}
  >
    <div className="sat-card-top">
      <span className={`sat-bg ${truck.vis === 'private' ? 'sat-bg-priv' : 'sat-bg-pub'}`}>
        <span className="sat-bdot" />
        {truck.vis === 'private' ? t('satPrivate') : t('satPublic')}
      </span>
      <span className="sat-muted sat-card-posted">{truck.posted}</span>
    </div>

    <div className="sat-card-body">
      <div className="sat-card-main">
        <div className="sat-card-route-block">
          <div className="sat-card-route">
            <span className="sat-card-city">{truck.pickupAddress || truck.pickup}</span>
            <span className="sat-card-arrow" aria-hidden>
              →
            </span>
            <span className="sat-card-city sat-card-city--dest">
              {(truck.destAddress || truck.dest) === 'Any'
                ? t('satAnyDirection')
                : truck.destAddress || truck.dest}
            </span>
          </div>
          <div className="sat-card-radii">
            <span className="sat-muted sat-card-radius">+ {truck.radius}km</span>
            <span className="sat-card-arrow sat-card-arrow--spacer" aria-hidden />
            <span className="sat-muted sat-card-radius sat-card-radius--dest">
              {(truck.destAddress || truck.dest) !== 'Any' && truck.destRadius != null
                ? `+ ${truck.destRadius}km`
                : ''}
            </span>
          </div>
        </div>

        <div className="sat-card-meta">
          <strong>{truck.startDt}</strong>
          <span className="sat-muted">
            {truck.startTm} – {truck.endTm}
          </span>
          {truck.recurring && <span className="sat-grp-badge">🔁 {truck.recurrenceLabel}</span>}
        </div>

        <div className="sat-card-meta sat-card-meta--vehicle">
          <span>
            <span className="sat-muted">{t('satVehicleType')}: </span>
            {truck.truckType}
            {truck.specs ? <span className="sat-muted"> · {truck.specs}</span> : null}
          </span>
          {canViewBidsCount ? (
            <>
              <span className="sat-muted"> · </span>
              <AvailabilityBidsMeta truck={truck} canViewBidsCount t={t} />
            </>
          ) : null}
        </div>
      </div>

      <div className="sat-card-side">
        <AvailabilityPrice
          truck={truck}
          canViewBestBid={canViewBestBid}
          className="sat-price sat-card-side__price"
          t={t}
        />
        {truck.capacity && truck.capacity !== '—' ? (
          <span className="sat-card-side__cap">{truck.capacity}</span>
        ) : null}
        <span className={`sat-bg ${truck.trip === 'Direct only' ? 'sat-bg-wr' : 'sat-bg-ok'}`}>
          {truck.trip}
        </span>
        <span className="sat-muted sat-card-side__id">#{truck.label || truck.id}</span>
      </div>
    </div>

    <div className="sat-card-footer">
      <div className="sat-cr-cell">
        <div className="sat-cr-av">{truck.initials}</div>
        <div>
          <div className="sat-cr-name">{truck.carrier}</div>
          <div className="sat-cr-rate">
            ★ {truck.rating.toFixed(1)} · {truck.type}
            {truck.preferred && (
              <span className="sat-bg sat-bg-ac" style={{ fontSize: 9, marginLeft: 4 }}>
                {t('satPreferred')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="sat-card-actions">
        <button
          type="button"
          className={`sat-bid-btn ${truck.bidSent ? 'sent' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!truck.bidSent) onBook(truck);
          }}
        >
          {truck.bidSent ? `✓ ${t('satSent')}` : t('satBookBid')}
        </button>
      </div>
    </div>
  </div>
);
