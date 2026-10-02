/**
 * Dispatcher seats = invited/active sub-users only.
 * Main Shipper (owner) never consumes a dispatcher_users seat.
 */

export type DispatcherSeatMeta = {
  used: number;
  total: number;
  remaining: number;
  can_invite: boolean;
  plan?: string | null;
};

function toNonNegInt(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Repair inconsistent seat payloads (e.g. used < total but can_invite false).
 * Main Shipper must not block invites when dispatcher seats remain.
 */
export function normalizeDispatcherSeats(
  seats: DispatcherSeatMeta | null | undefined,
): DispatcherSeatMeta | null {
  if (!seats || typeof seats !== 'object') return null;

  const used = toNonNegInt(seats.used);
  const total = toNonNegInt(seats.total);
  const unlimited = total >= 10000;
  const remaining = unlimited
    ? Math.max(0, toNonNegInt(seats.remaining))
    : Math.max(0, total - used);
  const canInvite = unlimited || (total > 0 && used < total);

  return {
    ...seats,
    used,
    total,
    remaining,
    can_invite: canInvite,
  };
}

/**
 * True when no dispatcher seats remain for new invites.
 * Prefer live seats meta; fall back to entitlement remaining only when seats are absent.
 */
export function isDispatcherSeatLimitReached(
  seats: DispatcherSeatMeta | null | undefined,
  entitlementRemaining: number | null = null,
): boolean {
  const normalized = normalizeDispatcherSeats(seats);
  if (normalized) {
    if (normalized.total >= 10000) return false;
    if (normalized.total <= 0) return true;
    return normalized.used >= normalized.total;
  }
  return entitlementRemaining !== null && entitlementRemaining <= 0;
}
