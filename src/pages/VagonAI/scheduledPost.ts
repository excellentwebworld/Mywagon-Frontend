/**
 * The pure half of scheduled bulk posting - shared by the wizard's schedule
 * modal, which arms a batch, and the Vagon AI drawer, which lists them.
 *
 * Everything here is a plain function over plain data, deliberately free of
 * React, for the same reason `createShipmentDraft.ts` and `threadCards.ts` beside
 * it are: `vitest.config.ts` runs in a node environment with no
 * `@testing-library/react`, so logic left inside a `.tsx` card cannot be checked
 * at all. What is worth checking here is the date arithmetic and the
 * disabled-until-valid predicate, and both are checkable only out here.
 *
 * ## This validation is an affordance, not a gate
 *
 * The gateway's `evaluateScheduleGate` re-derives every one of these rules and
 * trusts nothing sent from a browser. What this is for is telling the shipper
 * *before* they press Confirm, so the answer to "why is this disabled" is on
 * screen rather than one round trip away. If the two disagree the server wins,
 * and its `missing[]` names the field to go back to.
 *
 * Every sentence here takes an optional `Tr` (see `./i18n`) defaulting to
 * English, so the drawers can hand in `useTr()` and the tests stay unchanged.
 */
import type { ShipmentDraft } from './createShipmentDraft';
import type { BatchSummary, ScheduledPost, ScheduledPostStatus, UnitTotal } from './api/scheduledPostsService';
import { englishTr, type Tr } from './i18n';

/** Mirrors the gateway's `SCHEDULE_RULES`. One definition per side; the server's wins. */
export const SCHEDULE_LIMITS = {
  minLoadCount: 1,
  maxLoadCount: 25,
  // No lead-time floor any more (MS3-347): bulk generation defaults to Now /
  // Today. See `effectivePostInstant` for how a time earlier today is read.
  maxHorizonDays: 90,
  /** How far before its own pickup a batch has to post. */
  minFirePickupGapMs: 60 * 60_000,
} as const;

/**
 * What the schedule modal collects - and notably NOT the load itself.
 *
 * The draft comes from the wizard the modal was opened from, already resolved to
 * record ids, so there is no template to choose and nothing to disambiguate.
 * That is the whole reason this form is five fields rather than a picker plus a
 * repair list.
 */
export interface ScheduleFormState {
  loadCount: number;
  /** `YYYY-MM-DD` + `HH:mm`, as the DatePicker/TimePicker pair produces them. */
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  postDate: string;
  postTime: string;
  label: string;
  referencePattern: string;
}

export function emptyScheduleForm(now: Date = new Date()): ScheduleFormState {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return {
    loadCount: 5,
    pickupDate: '',
    pickupTime: '06:00',
    dropoffDate: '',
    dropoffTime: '18:00',
    // MS3-347: default Post Now / Today
    postDate: `${yyyy}-${mm}-${dd}`,
    postTime: `${hh}:${mi}`,
    label: '',
    referencePattern: '',
  };
}

/**
 * Joins a date and a time into the zone-less wall clock the gateway expects.
 *
 * `YYYY-MM-DDTHH:mm`, with no offset, because MYVAGON materializes stop times
 * against its own zone at publish — a value carrying an offset would be shifted
 * twice. Distinct from the posting time, which IS an instant; see `postInstant`.
 */
export function wallClock(date: string, time: string): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '00:00';
  return `${date}T${hhmm}`;
}

/** Compares two wall clocks. Both sides read the same way, so no zone is involved. */
function wallClockEpoch(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(`${value}:00Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

/** One blocked reason, keyed by the field the gateway would name. */
export interface ScheduleIssue {
  field: string;
  message: string;
}

/**
 * Why Confirm is disabled, in the order the form asks.
 *
 * `issues[0]` is the earliest unanswered question, matching the gateway's own
 * `missing[0]` contract, so the same "scroll to the offending field" code path
 * serves a local block and a server refusal.
 *
 * `nowMs` and `postInstantMs` are injected rather than read from the clock here,
 * so every case is assertable.
 */
/** Local midnight at the start of the day `nowMs` falls in. */
function startOfLocalDay(nowMs: number): number {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * When the batch will actually post: the chosen time, or now if that has gone.
 *
 * The form opens on Now / Today (MS3-347), and that default is stale a minute
 * later — while the shipper types a load count it slides into the past. A time
 * earlier TODAY therefore means "post now", not an error; only a day that has
 * already ended is refused (`scheduleIssues`). The drawer sends this instant,
 * so the gateway always receives a time that is now or later.
 */
export function effectivePostInstant(postInstantMs: number, nowMs: number): number {
  return Math.max(postInstantMs, nowMs);
}

/** Whether a batch armed at `postInstantMs` is due the moment it is armed. */
export function postsImmediately(postInstantMs: number, nowMs: number): boolean {
  return postInstantMs <= nowMs;
}

export function scheduleIssues(
  form: ScheduleFormState,
  nowMs: number,
  postInstantMs: number | null,
  tr: Tr = englishTr,
): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];

  // No clause about the load itself. It came from the wizard fully resolved, and
  // the mapper refuses rather than half-fills - so by the time this runs there
  // is nothing left to ask about it.
  if (!Number.isInteger(form.loadCount) || form.loadCount < SCHEDULE_LIMITS.minLoadCount) {
    issues.push({
      field: 'loadCount',
      message: tr('vagonai.scheduledPost.issues.minLoads', 'A batch needs at least one load.'),
    });
  } else if (form.loadCount > SCHEDULE_LIMITS.maxLoadCount) {
    issues.push({
      field: 'loadCount',
      message: tr(
        'vagonai.scheduledPost.issues.maxLoads',
        'At most {{max}} loads at once — split a larger run across two schedules.',
        { max: SCHEDULE_LIMITS.maxLoadCount },
      ),
    });
  }

  const pickup = wallClockEpoch(wallClock(form.pickupDate, form.pickupTime));
  const dropoff = wallClockEpoch(wallClock(form.dropoffDate, form.dropoffTime));

  if (pickup === null) {
    issues.push({
      field: 'pickup.from',
      message: tr('vagonai.scheduledPost.issues.pickupRequired', 'Set the pickup date and time.'),
    });
  }
  if (dropoff === null) {
    issues.push({
      field: 'dropoff.from',
      message: tr('vagonai.scheduledPost.issues.dropoffRequired', 'Set the drop-off date and time.'),
    });
  }
  if (pickup !== null && dropoff !== null && dropoff <= pickup) {
    issues.push({
      field: 'dropoff.from',
      message: tr('vagonai.scheduledPost.issues.dropoffAfterPickup', 'Drop-off must be after pickup.'),
    });
  }

  if (postInstantMs === null) {
    issues.push({
      field: 'fireAt',
      message: tr('vagonai.scheduledPost.issues.postAtRequired', 'Set the time to post.'),
    });
  } else {
    // Earlier today is "now" (see `effectivePostInstant`); a past day is not.
    if (postInstantMs < startOfLocalDay(nowMs)) {
      issues.push({
        field: 'fireAt',
        message: tr(
          'vagonai.scheduledPost.issues.dayPassed',
          'That day has already passed — post now, or choose a later time.',
        ),
      });
    }
    const fireMs = effectivePostInstant(postInstantMs, nowMs);
    if (postInstantMs > nowMs + SCHEDULE_LIMITS.maxHorizonDays * 86_400_000) {
      issues.push({
        field: 'fireAt',
        message: tr(
          'vagonai.scheduledPost.issues.horizon',
          'A batch cannot be scheduled more than {{days}} days ahead.',
          { days: SCHEDULE_LIMITS.maxHorizonDays },
        ),
      });
    }
    // The clause the gateway cares most about: a load whose pickup has already
    // passed cannot go on the market, so posting after it is refused rather than
    // armed and left to fail silently later.
    //
    // Compared against the pickup read as a browser-local wall clock, which is
    // the same reading the DatePicker gave it. The gateway repeats this check
    // against the batch's stored zone and its answer is the one that counts.
    const pickupLocal = form.pickupDate ? Date.parse(`${wallClock(form.pickupDate, form.pickupTime)}:00`) : NaN;
    // Graded on when it will really post, which for a time earlier today is now.
    if (Number.isFinite(pickupLocal) && fireMs > pickupLocal - SCHEDULE_LIMITS.minFirePickupGapMs) {
      issues.push({
        field: 'fireAt',
        message: tr(
          'vagonai.scheduledPost.issues.pickupGap',
          'The batch has to post at least an hour before its own pickup.',
        ),
      });
    }
  }

  // De-duplicated the way the gateway's gate does it: one missing value can fail
  // two clauses, and naming the field twice would send the shipper to the same
  // control twice.
  const seen = new Set<string>();
  return issues.filter((issue) => (seen.has(issue.field) ? false : (seen.add(issue.field), true)));
}

/** The total the summary line shows: N x the template's own price. */
export function batchTotal(draft: ShipmentDraft | null, loadCount: number): number | null {
  const price = draft?.pricing.startingPrice;
  if (price === null || price === undefined || !Number.isFinite(loadCount)) return null;
  return price * Math.max(0, loadCount);
}

/**
 * How long until a batch posts, as a short phrase.
 *
 * Returns null once the moment has passed — a negative countdown reads as a bug,
 * and a batch past its time is waiting on a visit rather than on the clock.
 */
export function countdown(fireAtIso: string, nowMs: number, tr: Tr = englishTr): string | null {
  const fireAt = Date.parse(fireAtIso);
  if (!Number.isFinite(fireAt)) return null;
  const ms = fireAt - nowMs;
  if (ms <= 0) return null;

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) {
    return tr('vagonai.scheduledPost.countdownMinutes', 'in {{m}} min', { m: Math.max(1, minutes) });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return tr('vagonai.scheduledPost.countdownHours', 'in {{h}}h {{m}}m', { h: hours, m: minutes % 60 });
  }
  const days = Math.floor(hours / 24);
  return tr('vagonai.scheduledPost.countdownDays', 'in {{d}}d {{h}}h', { d: days, h: hours % 24 });
}

/**
 * What to tell the shipper about when this batch actually goes out.
 *
 * The honest sentence, and it matters: the gateway holds no credential once a
 * request ends, so nothing fires while they are away. A batch posts on their
 * next visit after its time. Saying "at 06:00" would be a promise the system
 * cannot keep, and the bug report that follows is worse than the caveat.
 */
export function postingCaveat(post: ScheduledPost, nowMs: number, tr: Tr = englishTr): string {
  if (post.status !== 'scheduled') return '';
  const due = Date.parse(post.fire_at) <= nowMs;
  return due
    ? tr('vagonai.scheduledPost.caveatDue', 'Due now — it will post while this drawer is open.')
    : tr(
      'vagonai.scheduledPost.caveatNextVisit',
      'Posts the next time you open MYVAGON after this time, not unattended.',
    );
}

/** Which group a batch belongs to on the list. */
export type ScheduledPostGroup = 'upcoming' | 'posted' | 'attention' | 'cancelled';

export function groupOf(status: ScheduledPostStatus): ScheduledPostGroup {
  switch (status) {
    case 'scheduled':
    case 'running':
      return 'upcoming';
    case 'posted':
      return 'posted';
    case 'partial':
    case 'failed':
    case 'expired':
      // Grouped with failures on purpose. A shipper who armed ten and got seven
      // has not had a success, and burying `partial` under Posted is exactly how
      // they never find out.
      return 'attention';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'attention';
  }
}

/**
 * The CSS class for a batch's status pill.
 *
 * Reuses the `status-box` vocabulary from `listingUtils.statusBadgeClass` rather
 * than importing `STATUS_COLORS`, which is used in exactly one place in this app
 * and is not a badge system.
 */
export function scheduledPostBadgeClass(status: ScheduledPostStatus): string {
  const suffix: Record<ScheduledPostStatus, string> = {
    scheduled: 'scheduled',
    running: 'on-trip',
    posted: 'fulfilled',
    partial: 'partial',
    failed: 'not-fulfilled',
    cancelled: 'canceled',
    expired: 'past-due',
  };
  return `status-box status-box--${suffix[status] ?? 'pending'}`;
}

/** A one-line progress summary, e.g. "7 of 10 posted, 3 failed". */
export function progressLabel(post: ScheduledPost, tr: Tr = englishTr): string {
  if (post.status === 'scheduled') {
    return tr('vagonai.scheduledPost.progressQueued', '{{n}} loads queued', { n: post.load_count });
  }
  const parts = [
    tr('vagonai.scheduledPost.progressPosted', '{{posted}} of {{total}} posted', {
      posted: post.posted_count,
      total: post.load_count,
    }),
  ];
  if (post.failed_count > 0) {
    parts.push(tr('vagonai.scheduledPost.progressFailed', '{{n}} failed', { n: post.failed_count }));
  }
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// The card's facts
// ---------------------------------------------------------------------------

/**
 * Everything below turns `post.summary` — the gateway's projection of the frozen
 * draft — into the short strings a 440px card can hold.
 *
 * They all return `null` rather than a placeholder when the underlying value is
 * absent, and the card renders a row only for a non-null one. A grid of "—"
 * tells the shipper nothing and costs four lines to say it.
 *
 * Nothing here invents a value. If the batch was armed without a price, there is
 * no price row; the fix for that is arming it with one, not filling the gap in
 * the UI.
 */

/** Unit words as `CreateShipmentFlow` itself renders them, so one load reads the same in both places. */
function qtyUnitWords(tr: Tr): Record<string, string> {
  return {
    EUR_PALLET: tr('vagonai.scheduledPost.unitEurPallets', 'EUR pallets'),
    UNIT: tr('vagonai.scheduledPost.unitUnits', 'units'),
  };
}
const WEIGHT_UNIT_WORDS: Record<string, string> = { KG: 'kg', T: 't' };

function unitPhrases(totals: UnitTotal[], words: Record<string, string>): string[] {
  return totals
    .filter((total) => total.value > 0)
    .map((total) => `${total.value.toLocaleString()} ${words[total.unit] ?? total.unit.toLowerCase()}`);
}

/** `320` minutes as `5h 20m`. Null for a batch whose route was measured without one. */
export function durationLabel(minutes: number | null, tr: Tr = englishTr): string | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return hours > 0
    ? tr('vagonai.scheduledPost.durationHoursMinutes', '{{h}}h {{m}}m', { h: hours, m: String(rest).padStart(2, '0') })
    : tr('vagonai.scheduledPost.durationMinutes', '{{m}}m', { m: rest });
}

/** `447 km · 5h 20m` — the road distance MYVAGON refused to publish without. */
export function routeFact(summary: BatchSummary, tr: Tr = englishTr): string | null {
  if (summary.distance_km === null) return null;
  const drive = durationLabel(summary.drive_min, tr);
  return drive ? `${summary.distance_km.toLocaleString()} km · ${drive}` : `${summary.distance_km.toLocaleString()} km`;
}

/** `16 EUR pallets · 13 t` — per load, and picks only, exactly as the flow's own summary counts. */
export function cargoFact(summary: BatchSummary, tr: Tr = englishTr): string | null {
  const parts = [...unitPhrases(summary.qty, qtyUnitWords(tr)), ...unitPhrases(summary.weight, WEIGHT_UNIT_WORDS)];
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * A response window such as `48h`, with its unit in the shipper's language.
 *
 * The window is a code the gateway stores (`24h`, `48h`, ...); only a plain
 * hour count is reworded, and anything else is shown as it came.
 */
export function responseWindowLabel(window: string, tr: Tr = englishTr): string {
  const hours = /^(\d+)h$/.exec(window);
  return hours ? tr('vagonai.scheduledPost.responseHours', '{{n}}h', { n: hours[1]! }) : window;
}

/**
 * `520 EUR x 5 = 2,600 EUR` — what this batch offers, in total.
 *
 * The multiplication is written out rather than reduced to a total, because the
 * number that surprises a shipper is the batch one and the number they typed is
 * the per-load one. Showing only either would leave them doing the other in
 * their head.
 */
export function priceFact(post: ScheduledPost): string | null {
  const { starting_price: perLoad, batch_total: total, currency } = post.summary;
  if (perLoad === null) return null;
  const each = `${perLoad.toLocaleString()} ${currency}`;
  if (total === null || post.load_count <= 1) return each;
  return `${each} x ${post.load_count} = ${total.toLocaleString()} ${currency}`;
}

/** How the price may move, as a key the drawer translates. `floor` carries an amount. */
export function negotiability(summary: BatchSummary): { key: 'fixed' | 'negotiable' | 'floor'; amount: string | null } {
  if (!summary.negotiable) return { key: 'fixed', amount: null };
  if (summary.negotiable_floor !== null) {
    return { key: 'floor', amount: `${summary.negotiable_floor.toLocaleString()} ${summary.currency}` };
  }
  return { key: 'negotiable', amount: null };
}

/**
 * A title the shipper recognises, or null for one they never named.
 *
 * The id is the last resort and not a fallback worth reaching: `bdc01067` is the
 * primary key showing through, and it identifies the batch to the database
 * rather than to the person who armed it. The drawer wraps this in its own
 * "Batch {{id}}" string so the id at least reads as one.
 */
export function batchTitle(post: ScheduledPost): string | null {
  const label = post.label?.trim();
  if (label) return label;
  // Optional-chained against a gateway older than this bundle, which sends no
  // `summary` at all: a title falling back to the id is a worse card, where a
  // thrown TypeError is no card.
  const reference = post.summary?.customer_reference?.trim();
  if (reference) return reference;
  return post.template_ref?.trim() || null;
}
