import React from 'react';
import type { TrackingStats, TripSummary } from '../../pages/ShipmentDetail/detailViewModel';
import { TrackingMapCard } from './TrackingMapCard';

interface TrackingCardProps {
  status?: string;
  tracking: TrackingStats;
  trip?: TripSummary;
  expanded: boolean;
  onToggle: () => void;
  onShare: () => void;
  t: (key: string, fallback?: string) => string;
}

export const TrackingCard: React.FC<TrackingCardProps> = ({
  status = 'on_trip',
  ...props
}) => {
  return <TrackingMapCard status={status} {...props} />;
};
