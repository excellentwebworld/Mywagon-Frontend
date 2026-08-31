import React from 'react';

export type ShipmentStatusType =
  | 'draft'
  | 'pending'
  | 'scheduled'
  | 'ready'
  | 'upcoming'
  | 'on_trip'
  | 'in_progress'
  | 'past_due'
  | 'awarded'
  | 'fullfilled'
  | 'partially_fullfilled'
  | 'not_fullfilled'
  | 'delivered'
  | 'canceled'
  | 'cancelled';

interface StatusBadgeProps {
  status: ShipmentStatusType | string;
  className?: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  draft: { label: 'DRAFT', bg: '#F3F4F6', color: '#6B7280' },
  pending: { label: 'PENDING', bg: '#FEF3C7', color: '#D97706' },
  scheduled: { label: 'SCHEDULED', bg: '#EFF6FF', color: '#2563EB' },
  ready: { label: 'READY', bg: '#EEF2FF', color: '#4F46E5' },
  upcoming: { label: 'UPCOMING', bg: '#EEF2FF', color: '#4F46E5' },
  on_trip: { label: 'ON TRIP', bg: '#F3E8FF', color: '#7C3AED' },
  in_progress: { label: 'ON TRIP', bg: '#F3E8FF', color: '#7C3AED' },
  past_due: { label: 'PAST DUE', bg: '#FEF2F2', color: '#DC2626' },
  awarded: { label: 'AWARDED', bg: '#EFF6FF', color: '#2563EB' },
  fullfilled: { label: 'FULFILLED', bg: '#ECFDF5', color: '#059669' },
  delivered: { label: 'DELIVERED', bg: '#ECFDF5', color: '#059669' },
  partially_fullfilled: { label: 'PARTIALLY FULFILLED', bg: '#FFF7ED', color: '#EA580C' },
  not_fullfilled: { label: 'UNFULFILLED', bg: '#FEF3C7', color: '#B45309' },
  canceled: { label: 'CANCELLED', bg: '#FEF2F2', color: '#DC2626' },
  cancelled: { label: 'CANCELLED', bg: '#FEF2F2', color: '#DC2626' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const normKey = (status || 'draft').toLowerCase().replace(/\s+/g, '_');
  const conf = STATUS_CONFIG[normKey] || {
    label: (status || '').toUpperCase(),
    bg: '#F3F4F6',
    color: '#6B7280',
  };

  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      } ${className}`}
      style={{ background: conf.bg, color: conf.color }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: isSm ? 5 : 6, height: isSm ? 5 : 6, background: 'currentColor' }}
        aria-hidden="true"
      />
      {conf.label}
    </span>
  );
};
