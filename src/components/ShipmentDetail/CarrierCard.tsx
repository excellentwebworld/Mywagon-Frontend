import React from 'react';
import type { CarrierDetail } from '../../pages/ShipmentDetail/detailViewModel';
import { CarrierDriverCard } from './CarrierDriverCard';

interface CarrierCardProps {
  carrier: CarrierDetail | null;
  expanded: boolean;
  onToggle: () => void;
  onToast: (msg: string) => void;
  onRate?: () => void;
  onOpenProfile?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const CarrierCard: React.FC<CarrierCardProps> = (props) => {
  return <CarrierDriverCard {...props} />;
};
