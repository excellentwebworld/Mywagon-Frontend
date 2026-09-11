import React from 'react';
import {
  pendingBadgeStyle,
  pendingBadgeVariant,
  type PendingBadgeOpts,
} from '../../pages/ManageShipments/utils/listingUtils';

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

interface StatusBadgeProps extends PendingBadgeOpts {
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

/**
 * Normalize any API / label spelling to the canonical keys used by
 * Manage Shipments + Shipment Detail (Laravel status-box palette).
 */
export function normalizeStatusKey(status?: string | null): string {
  const raw = (status || 'draft').toString().trim().toLowerCase();
  const key = raw.replace(/[\s-]+/g, '_');

  switch (key) {
    case 'fullfilled':
    case 'fulfilled':
    case 'delivered':
      return 'fullfilled';
    case 'partially_fullfilled':
    case 'partially_fulfilled':
    case 'partial_fullfilled':
    case 'partial_fulfilled':
    case 'part_fulfilled':
    case 'part_fullfilled':
      return 'partially_fullfilled';
    case 'not_fullfilled':
    case 'not_fulfilled':
    case 'unfulfilled':
    case 'unfullfilled':
      return 'not_fullfilled';
    case 'canceled':
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return 'canceled';
    case 'on_trip':
    case 'ontrip':
      return 'on_trip';
    case 'in_progress':
    case 'inprogress':
      return 'in_progress';
    case 'past_due':
    case 'pastdue':
      return 'past_due';
    case 'scheduled':
    case 'upcoming':
    case 'awarded':
    case 'ready':
    case 'pending':
    case 'draft':
      return key;
    default:
      return key;
  }
}

/** Exact Laravel / Manage Shipments status-box hex colors */
const STATUS_CONFIG: Record<string, StatusStyleConfig> = {
  draft: {
    label: 'Draft',
    bg: 'rgba(155, 81, 224, 0.14)',
    color: '#000000',
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
  bidsReceived,
  bidsSent,
  interestedCount,
  awaitingResponse,
  needsAction,
}) => {
  const normKey = normalizeStatusKey(status);

  // Exact Laravel 2-part badge for partially_fullfilled
  if (normKey === 'partially_fullfilled') {
    const isSm = size === 'sm';
    return (
      <span
        className={`inline-flex items-center overflow-hidden font-semibold whitespace-nowrap select-none ${
          isSm ? 'text-[11px]' : 'text-xs'
        } ${className}`}
        style={{ borderRadius: 99, userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <span className={`${isSm ? 'px-2 py-0.5' : 'px-2.5 py-1'} bg-[#ECECEC] text-[#000000]`}>
          Partially
        </span>
        <span className={`${isSm ? 'px-2 py-0.5' : 'px-2.5 py-1'} bg-[#000000] text-[#FFFFFF]`}>
          Fulfilled
        </span>
      </span>
    );
  }

  const conf = STATUS_CONFIG[normKey] || {
    label: (status || '').toString().replace(/_/g, ' '),
    bg: '#F3F4F6',
    color: '#18181B',
  };

  const isSm = size === 'sm';
  const pendingStyle =
    normKey === 'pending'
      ? pendingBadgeStyle(
          pendingBadgeVariant({
            bidsReceived,
            bidsSent,
            interestedCount,
            awaitingResponse,
            needsAction,
          })
        )
      : null;

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap select-none ${
        isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      } ${className}`}
      style={{
        ...(pendingStyle || {
          backgroundColor: conf.bg,
          color: conf.color,
        }),
        border: conf.border || 'none',
        borderRadius: 99,
        lineHeight: 1.2,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {conf.label}
    </span>
  );
};
