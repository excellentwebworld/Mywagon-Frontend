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

interface StatusStyleConfig {
  label: string;
  bg: string;
  color: string;
  border?: string;
}

const STATUS_CONFIG: Record<string, StatusStyleConfig> = {
  draft: {
    label: 'Draft',
    bg: 'rgba(155, 81, 224, 0.14)',
    color: '#18181B',
  },
  pending: {
    label: 'Pending',
    bg: '#F3C747',
    color: '#000000',
  },
  scheduled: {
    label: 'Scheduled',
    bg: '#FFFFFF',
    color: '#000000',
    border: '1px solid #9B51E0',
  },
  ready: {
    label: 'Ready',
    bg: '#A9DBFB',
    color: '#000000',
  },
  upcoming: {
    label: 'Scheduled',
    bg: '#FFFFFF',
    color: '#000000',
    border: '1px solid #9B51E0',
  },
  on_trip: {
    label: 'On Trip',
    bg: '#3A90E5',
    color: '#FFFFFF',
  },
  in_progress: {
    label: 'On Trip',
    bg: '#3A90E5',
    color: '#FFFFFF',
  },
  past_due: {
    label: 'Past Due',
    bg: '#FC6600',
    color: '#FFFFFF',
  },
  awarded: {
    label: 'Awarded',
    bg: '#FFFFFF',
    color: '#000000',
    border: '1px solid #9B51E0',
  },
  fullfilled: {
    label: 'Fulfilled',
    bg: '#9A9AA9',
    color: '#FFFFFF',
  },
  delivered: {
    label: 'Fulfilled',
    bg: '#9A9AA9',
    color: '#FFFFFF',
  },
  not_fullfilled: {
    label: 'Not Fulfilled',
    bg: '#000000',
    color: '#FFFFFF',
  },
  canceled: {
    label: 'Canceled',
    bg: '#D56969',
    color: '#FFFFFF',
  },
  cancelled: {
    label: 'Canceled',
    bg: '#D56969',
    color: '#FFFFFF',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const normKey = (status || 'draft').toLowerCase().replace(/[\s-]+/g, '_');

  // Exact Laravel 2-part badge for partially_fullfilled
  if (normKey === 'partially_fullfilled' || normKey === 'part_fulfilled') {
    const isSm = size === 'sm';
    return (
      <span
        className={`inline-flex items-center rounded overflow-hidden font-medium whitespace-nowrap shadow-sm ${
          isSm ? 'text-[11px]' : 'text-xs'
        } ${className}`}
      >
        <span className="px-2.5 py-1 bg-[#ECECEC] text-[#000000]">Partially</span>
        <span className="px-2.5 py-1 bg-[#000000] text-[#FFFFFF]">Fulfilled</span>
      </span>
    );
  }

  const conf = STATUS_CONFIG[normKey] || {
    label: (status || '').replace(/_/g, ' '),
    bg: '#F3F4F6',
    color: '#18181B',
  };

  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-medium whitespace-nowrap ${
        isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3.5 py-1 text-xs'
      } ${className}`}
      style={{
        backgroundColor: conf.bg,
        color: conf.color,
        border: conf.border || 'none',
      }}
    >
      {conf.label}
    </span>
  );
};

