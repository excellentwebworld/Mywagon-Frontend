import React from 'react';
import type { TripSummary } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface TripSummaryCardProps {
  trip: TripSummary;
  expanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

export const TripSummaryCard: React.FC<TripSummaryCardProps> = ({ trip, expanded, onToggle, t }) => (
  <CollapsibleCard id="trip" title={<>⚡ {t('tripSummary')}</>} expanded={expanded} onToggle={onToggle}>
    <div className="ld-trip-grid">
      <div className="ld-trip-cell">
        <div className="val">{trip.distanceKm}</div>
        <div className="unit">{t('distance')}</div>
      </div>
      <div className="ld-trip-cell">
        <div className="val">{trip.duration}</div>
        <div className="unit">{t('duration')}</div>
      </div>
      <div className="ld-trip-cell">
        <div className="val">{trip.stops}</div>
        <div className="unit">{t('stops')}</div>
      </div>
      <div className="ld-trip-cell">
        <div className="val">{trip.weight}</div>
        <div className="unit">{t('weight')}</div>
      </div>
      <div className="ld-trip-cell">
        <div className="val" style={{ color: 'var(--cu-c, #059669)' }}>
          {trip.customers} 🏪
        </div>
        <div className="unit">{t('customers')}</div>
      </div>
      <div className="ld-trip-cell">
        <div className="val">{trip.orders}</div>
        <div className="unit">{t('orders')}</div>
      </div>
    </div>
  </CollapsibleCard>
);
