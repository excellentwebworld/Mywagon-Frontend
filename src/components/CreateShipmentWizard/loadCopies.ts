/**
 * MS3-403 - Bulk Load Creation v1: publish N identical copies of one load.
 * Pure helpers shared by Step 3 (the "Number of copies" control), the wizard
 * publish call and the success screen. Laravel enforces the same 1..20 range
 * (CreateShipmentPublishService::MAX_COPIES).
 */
export const MIN_LOAD_COPIES = 1;
export const MAX_LOAD_COPIES = 20;

/** Clamp any input (number, string, blank) to a whole number in 1..20. */
export function normalizeLoadCopies(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(n)) return MIN_LOAD_COPIES;
  return Math.min(MAX_LOAD_COPIES, Math.max(MIN_LOAD_COPIES, Math.trunc(n)));
}

/**
 * How many loads the plan still allows when that is fewer than `copies`;
 * null when the plan has room (or is unlimited / unknown).
 */
export function loadCopiesQuotaShortfall(
  quota: { status?: boolean; remaining?: number | null; is_unlimited?: boolean } | null | undefined,
  copies: number
): number | null {
  if (!quota || quota.is_unlimited || quota.remaining == null) return null;
  const remaining = Number(quota.remaining);
  if (!Number.isFinite(remaining)) return null;
  return remaining < copies ? Math.max(0, remaining) : null;
}

export interface PublishedLoad {
  id: number;
  auto_id: string;
  status?: string;
  type?: string;
}

/**
 * Every load a publish created. Laravel returns `copies` (the first load
 * included); an older backend without it returns just the one load.
 */
export function publishedLoadsFromResponse(
  response: (PublishedLoad & { copies?: PublishedLoad[] | null }) | null | undefined
): PublishedLoad[] {
  if (!response) return [];
  if (Array.isArray(response.copies) && response.copies.length > 0) {
    return response.copies.filter((load) => load && load.id != null);
  }
  return response.id != null ? [{ id: response.id, auto_id: response.auto_id, status: response.status, type: response.type }] : [];
}
