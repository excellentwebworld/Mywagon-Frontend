import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import {
  pendingBadgeVariant,
  type PendingBadgeOpts,
} from '../../pages/ManageShipments/utils/listingUtils';
import { LoadStatus } from '../ui/LoadStatus';

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

/**
 * Normalize any API / label spelling to the canonical keys used by
 * Manage Shipments + Shipment Detail.
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

const LABEL_KEYS: Record<string, string> = {
  draft: 'statusDraft',
  pending: 'statusPending',
  scheduled: 'statusScheduled',
  ready: 'statusReady',
  upcoming: 'statusScheduled',
  on_trip: 'statusOnTrip',
  in_progress: 'statusOnTrip',
  past_due: 'statusPastDue',
  awarded: 'statusAwarded',
  fullfilled: 'statusFulfilled',
  delivered: 'statusFulfilled',
  not_fullfilled: 'statusUnfulfilled',
  canceled: 'statusCanceled',
  cancelled: 'statusCanceled',
  partially_fullfilled: 'statusPartiallyFulfilled',
};

const LABEL_FALLBACK: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  scheduled: 'Scheduled',
  ready: 'Ready',
  upcoming: 'Scheduled',
  on_trip: 'On Trip',
  in_progress: 'On Trip',
  past_due: 'Past Due',
  awarded: 'Awarded',
  fullfilled: 'Fulfilled',
  delivered: 'Fulfilled',
  not_fullfilled: 'Unfulfilled',
  canceled: 'Canceled',
  cancelled: 'Canceled',
  partially_fullfilled: 'Partially Fulfilled',
};

/** Localized label for a load/shipment lifecycle status key. */
export function shipmentStatusLabel(
  status: string | null | undefined,
  t: (key: string, fallback?: string) => string,
): string {
  const normKey = normalizeStatusKey(status);
  const labelKey = LABEL_KEYS[normKey];
  if (labelKey) {
    return t(labelKey, LABEL_FALLBACK[normKey] || normKey);
  }
  return String(status || '')
    .replace(/_/g, ' ')
    .trim();
}

/** Load-lifecycle status — delegates to MYVAGON `LoadStatus` primitive. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  bidsReceived,
  bidsSent,
  interestedCount,
  awaitingResponse,
  needsAction,
}) => {
  const { t } = useTranslation();
  const normKey = normalizeStatusKey(status);
  const label = shipmentStatusLabel(status, t);

  const pendingVariant =
    normKey === 'pending'
      ? pendingBadgeVariant({
          bidsReceived,
          bidsSent,
          interestedCount,
          awaitingResponse,
          needsAction,
        })
      : null;

  const bids =
    pendingVariant === 'pending' || pendingVariant === 'pending-more'
      ? Math.max(Number(bidsReceived) || 0, Number(interestedCount) || 0, 1)
      : undefined;

  const loadKey =
    normKey === 'not_fullfilled'
      ? 'unfulfilled'
      : normKey === 'awarded' || normKey === 'delivered'
        ? 'fulfilled'
        : normKey;

  return (
    <span className={className}>
      <LoadStatus status={loadKey} bids={bids} label={label} />
    </span>
  );
};
