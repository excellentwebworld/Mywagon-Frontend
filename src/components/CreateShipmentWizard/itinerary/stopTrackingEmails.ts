import type { ApiStop } from '../../../api/types/createShipment';

/**
 * MS3-414 — receiver tracking emails per delivery stop.
 *
 * Laravel keeps them in wizard_state.stopTrackingEmails, keyed by the stop's `id`,
 * and pre-fills each delivery stop from its Address Book location (location email,
 * else its first contact email). A key that is absent was never filled; a key with
 * an empty list was removed by the user and is never re-filled.
 * wizard_state.stopTrackingEmailsAuto marks the entries that are still the
 * location's pre-fill (used only for the "from Address Book" hint).
 */
export type StopTrackingEmails = Record<string, string[]>;

export interface StopTrackingEmailAuto {
  locationId: string;
  emails: string[];
}

export type StopTrackingEmailsAuto = Record<string, StopTrackingEmailAuto>;

/** Mirrors StopTrackingEmailService::MAX_EMAILS_PER_STOP. */
export const MAX_STOP_TRACKING_EMAILS = 10;

// Same practical shape Laravel's `email` rule + FILTER_VALIDATE_EMAIL accept.
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function isValidTrackingEmail(email: string): boolean {
  const value = email.trim();
  return value.length > 0 && value.length <= 254 && EMAIL_PATTERN.test(value);
}

function toRecord(raw: unknown): Record<string, unknown> {
  // An empty PHP map can arrive as [] — treat any array as "no entries".
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function toEmailList(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return raw.split(/[,;]+/).map((e) => e.trim()).filter(Boolean);
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => typeof e === 'string' || typeof e === 'number')
    .map((e) => String(e));
}

/** wizard_state.stopTrackingEmails → form value (keeps blank slots the user is typing in). */
export function normalizeStopTrackingEmails(raw: unknown): StopTrackingEmails {
  const out: StopTrackingEmails = {};
  for (const [stopId, emails] of Object.entries(toRecord(raw))) {
    out[stopId] = toEmailList(emails);
  }
  return out;
}

export function normalizeStopTrackingEmailsAuto(raw: unknown): StopTrackingEmailsAuto {
  const out: StopTrackingEmailsAuto = {};
  for (const [stopId, meta] of Object.entries(toRecord(raw))) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) continue;
    const row = meta as Record<string, unknown>;
    out[stopId] = {
      locationId: String(row.locationId ?? ''),
      emails: toEmailList(row.emails).map((e) => e.trim()).filter(Boolean),
    };
  }
  return out;
}

/** A delivery stop has at least one drop-off cargo line. */
export function isDeliveryStop(stop: Pick<ApiStop, 'lines'>): boolean {
  return (stop.lines || []).some((line) => line?.action === 'dropoff');
}

function foldedSet(emails: string[]): Set<string> {
  return new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean));
}

function sameEmails(a: string[], b: string[]): boolean {
  const fa = foldedSet(a);
  const fb = foldedSet(b);
  if (fa.size !== fb.size) return false;
  for (const e of fa) if (!fb.has(e)) return false;
  return true;
}

/**
 * Entries the user changed in the form: everything except an entry that still
 * equals its Address Book pre-fill.
 */
export function userEditedStopTrackingEmails(
  stopEmails: StopTrackingEmails | undefined,
  auto: StopTrackingEmailsAuto | undefined
): StopTrackingEmails {
  const out: StopTrackingEmails = {};
  for (const [stopId, emails] of Object.entries(stopEmails || {})) {
    const meta = auto?.[stopId];
    if (meta && sameEmails(emails || [], meta.emails)) continue;
    out[stopId] = [...(emails || [])];
  }
  return out;
}

export interface DeliveryStopEmailRow {
  stopId: string;
  /** 0-based position of the stop in the itinerary. */
  stopIndex: number;
  locationId: string;
  /** Emails to render (always at least one slot). */
  emails: string[];
  /** True while the entry is still the Address Book pre-fill. */
  fromAddressBook: boolean;
}

/** One row per delivery stop that has an id, in itinerary order. */
export function buildDeliveryStopEmailRows(
  stops: ApiStop[],
  stopEmails: StopTrackingEmails | undefined,
  auto: StopTrackingEmailsAuto | undefined
): DeliveryStopEmailRow[] {
  const rows: DeliveryStopEmailRow[] = [];
  (stops || []).forEach((stop, stopIndex) => {
    const stopId = stop?.id ? String(stop.id) : '';
    if (!stopId || !isDeliveryStop(stop)) return;
    const entry = stopEmails?.[stopId];
    const meta = auto?.[stopId];
    const emails = entry && entry.length > 0 ? entry : [''];
    rows.push({
      stopId,
      stopIndex,
      locationId: stop.locationId ? String(stop.locationId) : '',
      emails,
      fromAddressBook: Boolean(
        meta &&
          entry &&
          meta.emails.length > 0 &&
          meta.locationId === String(stop.locationId ?? '') &&
          sameEmails(entry, meta.emails)
      ),
    });
  });
  return rows;
}

/**
 * Step-3 `stop_tracking_emails`: one key per stop of the draft that has an entry in
 * the form (an empty list = the user removed the receiver email). Blank and
 * malformed addresses are left out; stops with no entry are not sent, so Laravel
 * can still pre-fill them.
 */
export function stopTrackingEmailsPayload(
  stops: ApiStop[],
  stopEmails: StopTrackingEmails | undefined
): Record<string, string[]> {
  const ids = new Set((stops || []).map((s) => (s?.id ? String(s.id) : '')).filter(Boolean));
  const out: Record<string, string[]> = {};
  for (const [stopId, emails] of Object.entries(stopEmails || {})) {
    if (!ids.has(stopId)) continue;
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const raw of emails || []) {
      const email = String(raw).trim();
      if (!isValidTrackingEmail(email)) continue;
      const folded = email.toLowerCase();
      if (seen.has(folded)) continue;
      seen.add(folded);
      cleaned.push(email);
      if (cleaned.length >= MAX_STOP_TRACKING_EMAILS) break;
    }
    out[stopId] = cleaned;
  }
  return out;
}

/**
 * Hide an order email that a stop already sends to: drop it from an order's list
 * when every delivery stop of that order carries it in its stop entry, so the
 * form never shows the same address twice and no drop-off loses a recipient.
 */
export function dedupeOrderEmailsAgainstStops(
  trackingEmails: Record<string, string[]>,
  stopEmails: StopTrackingEmails | undefined,
  stops: ApiStop[]
): Record<string, string[]> {
  const deliveryStopsByOrder = new Map<string, string[]>();
  (stops || []).forEach((stop) => {
    const stopId = stop?.id ? String(stop.id) : '';
    if (!stopId) return;
    (stop.lines || []).forEach((line) => {
      if (line?.action !== 'dropoff') return;
      const orderId = line.orderId ? String(line.orderId) : line.orderRef || '';
      if (!orderId) return;
      const list = deliveryStopsByOrder.get(orderId) || [];
      if (!list.includes(stopId)) list.push(stopId);
      deliveryStopsByOrder.set(orderId, list);
    });
  });

  let changed = false;
  const out: Record<string, string[]> = {};
  for (const [orderId, emails] of Object.entries(trackingEmails || {})) {
    const stopIds = deliveryStopsByOrder.get(orderId) || [];
    if (stopIds.length === 0) {
      out[orderId] = emails;
      continue;
    }
    const covered = stopIds.map((id) => foldedSet(stopEmails?.[id] || []));
    const kept = (emails || []).filter((email) => {
      const folded = String(email).trim().toLowerCase();
      if (!folded) return true;
      return !covered.every((set) => set.has(folded));
    });
    if (kept.length !== (emails || []).length) changed = true;
    out[orderId] = kept;
  }
  return changed ? out : trackingEmails;
}
