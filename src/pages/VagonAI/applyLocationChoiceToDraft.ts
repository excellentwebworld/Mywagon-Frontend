/**
 * Apply a SelectionCards location pick to the open create-shipment draft seed,
 * and fill missing stop schedules so Save-as-draft can enable without waiting
 * for the model to refresh prepare_shipment.
 */
import type { FlowDraftSeed, FlowDraftStop } from '../../hooks/useChat';

export type LocationSlot = 'pickup' | 'delivery';

/** `location:1841` → `1841`; bare digits pass through; anything else → null. */
export function parseLocationOptionId(optionId: string): string | null {
  const raw = (optionId || '').trim();
  if (!raw) return null;
  const m = raw.match(/^location:(\d+)$/i);
  if (m) return m[1]!;
  if (/^\d+$/.test(raw)) return raw;
  return null;
}

/**
 * Prefer the request `slot`; fall back to title keywords when the gateway
 * omitted slot (older turns / loose wording).
 */
export function inferLocationSlot(request: {
  slot?: string | null;
  title?: string | null;
}): LocationSlot | null {
  if (request.slot === 'pickup' || request.slot === 'delivery') return request.slot;
  const title = (request.title || '').toLowerCase();
  if (/\bpick[\s-]?up\b|\bcollection\b|\borigin\b/.test(title)) return 'pickup';
  if (/\bdelivery\b|\bdrop[\s-]?off\b|\bdestination\b/.test(title)) return 'delivery';
  return null;
}

/** `YYYY-MM-DDTHH:mm` — same shape `parseLocal` / datetime-local expect. */
export function formatLocalDateTime(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

function atLocal(now: Date, dayOffset: number, hour: number, minute: number): string {
  const d = new Date(now.getTime());
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return formatLocalDateTime(d);
}

const blankSeedStop = (): FlowDraftStop => ({
  locationId: '',
  locationName: null,
  from: '',
  to: null,
  lines: [],
});

/** Parse draft `from` (`YYYY-MM-DDTHH:mm` or with seconds) into a Date, else null. */
export function parseDraftDateTime(value: string | null | undefined): Date | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  // datetime-local style — treat as local wall time
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) {
    const t = Date.parse(raw);
    return Number.isNaN(t) ? null : new Date(t);
  }
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    m[6] ? Number(m[6]) : 0,
    0,
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * For every stop that already has a `locationId`, ensure `from` is a *future*
 * local window: pickup (index 0) → tomorrow 09:00; later stops → day-after
 * (or +N days) 17:00 so delivery is after pickup.
 *
 * Overwrites empty **or past** `from` values. Order ERP dates often land in the
 * past (e.g. collection 18 Sep when today is 19 Sep), which leaves Route as
 * NEEDED via saveIssues even when sites look filled — that blocked Save draft.
 */
export function ensureStopSchedules<T extends { stops: Array<{ locationId: string; from: string; to?: string | null }> }>(
  draft: T,
  now: Date = new Date(),
): T {
  let changed = false;
  // First pass: replace empty/invalid/past times with defaults.
  let stops = draft.stops.map((stop, i) => {
    // MS3-332: bump past/empty schedules even when locationId is still empty so
    // from-order cards with ERP past dates are not stuck on a false Save gate.
    const parsed = parseDraftDateTime(stop.from);
    const needsSchedule = !stop.from?.trim() || parsed === null || parsed.getTime() < now.getTime();
    if (!needsSchedule) return stop;
    const from =
      i === 0
        ? atLocal(now, 1, 9, 0)
        : atLocal(now, Math.max(2, i + 1), 17, 0);
    changed = true;
    return { ...stop, from };
  });
  // Second pass: enforce chronological order. A still-"future" delivery that
  // sits before a bumped pickup (common with mixed ERP dates) must move forward
  // or Save stays gated on stops[n].from "scheduled before stop n".
  let previousMs: number | null = null;
  stops = stops.map((stop, i) => {
    const parsed = parseDraftDateTime(stop.from);
    const ms = parsed ? parsed.getTime() : null;
    if (previousMs !== null && (ms === null || ms <= previousMs)) {
      const prev = new Date(previousMs);
      const from = atLocal(prev, 1, 17, 0);
      changed = true;
      const nextMs = parseDraftDateTime(from)?.getTime();
      previousMs = nextMs ?? previousMs + 24 * 60 * 60 * 1000;
      return { ...stop, from };
    }
    if (ms !== null) previousMs = ms;
    return stop;
  });
  return changed ? { ...draft, stops } : draft;
}

export function applyLocationChoiceToDraft(
  draft: FlowDraftSeed,
  slot: LocationSlot,
  locationId: string,
  locationName?: string | null,
  now: Date = new Date(),
): FlowDraftSeed {
  const id = (locationId || '').trim();
  if (!id) return draft;

  const stops = draft.stops.map((s) => ({
    ...s,
    lines: s.lines.map((l) => ({ ...l })),
  }));
  while (stops.length < 2) stops.push(blankSeedStop());

  const index = slot === 'pickup' ? 0 : stops.length - 1;
  const cur = stops[index]!;
  stops[index] = {
    ...cur,
    locationId: id,
    locationName: locationName != null && locationName !== ''
      ? locationName
      : (cur.locationName ?? null),
  };

  return ensureStopSchedules({ ...draft, stops }, now);
}
