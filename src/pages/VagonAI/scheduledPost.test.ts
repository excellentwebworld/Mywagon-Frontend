import { describe, expect, it } from 'vitest';
import type { ShipmentDraft } from './createShipmentDraft';
import type { BatchSummary, ScheduledPost } from './api/scheduledPostsService';
import {
  SCHEDULE_LIMITS,
  batchTitle,
  batchTotal,
  cargoFact,
  countdown,
  durationLabel,
  negotiability,
  priceFact,
  routeFact,
  effectivePostInstant,
  emptyScheduleForm,
  postsImmediately,
  groupOf,
  postingCaveat,
  progressLabel,
  scheduleIssues,
  wallClock,
  type ScheduleFormState,
} from './scheduledPost';

/**
 * The drawer's blocked-reason logic and its date arithmetic.
 *
 * Node environment, pure functions, no rendering — the only kind of test this
 * repo can currently run (`vitest.config.ts` sets `environment: 'node'` and
 * there is no `@testing-library/react`), which is why the logic lives outside
 * the card in the first place.
 */

const NOW = Date.parse('2026-09-02T09:00:00.000Z');

const draft = {
  customerReference: 'PO-4821',
  stops: [],
  lines: [],
  vehicleTypeIds: [],
  vehicleCategoryIds: [],
  broadcast: { channels: [], carrierPartnerIds: [], driverId: null },
  pricing: { negotiable: true, startingPrice: 520, negotiableFloor: null, currency: 'EUR' },
  requireTracking: false,
  responseWindow: '48h',
  settlement: 'direct',
  bulk: { mode: 'single' },
  trackingOrderIds: [],
} as ShipmentDraft;

/** A form that would arm cleanly, so each case below breaks exactly one thing. */
function form(overrides: Partial<ScheduleFormState> = {}): ScheduleFormState {
  return {
    ...emptyScheduleForm(),
    loadCount: 5,
    pickupDate: '2026-09-10',
    pickupTime: '06:00',
    dropoffDate: '2026-09-10',
    dropoffTime: '18:00',
    ...overrides,
  };
}

/** Comfortably before the pickup, and later than NOW. */
const GOOD_POST_AT = Date.parse('2026-09-09T05:00:00.000Z');

const fields = (f: ScheduleFormState, postAt: number | null = GOOD_POST_AT) =>
  scheduleIssues(f, NOW, postAt).map((i) => i.field);

describe('wallClock', () => {
  it('joins a date and a time with no offset — MYVAGON re-materializes these', () => {
    expect(wallClock('2026-09-10', '06:00')).toBe('2026-09-10T06:00');
  });

  it('refuses a malformed date rather than inventing one', () => {
    expect(wallClock('', '06:00')).toBeNull();
    expect(wallClock('10/09/2026', '06:00')).toBeNull();
  });

  it('falls back to midnight only when the TIME is malformed, never the date', () => {
    expect(wallClock('2026-09-10', 'nonsense')).toBe('2026-09-10T00:00');
  });
});

describe('scheduleIssues', () => {
  it('a complete form has nothing blocking it', () => {
    expect(scheduleIssues(form(), NOW, GOOD_POST_AT)).toEqual([]);
  });

  it('never asks about the load itself', () => {
    // The load came from the wizard with real record ids, and the mapper refuses
    // rather than half-fills - so by the time this runs there is nothing about it
    // left to ask. An empty form must block on its OWN fields and nothing else.
    expect(fields(form())).toEqual([]);
    expect(fields(form({ loadCount: 0 }))).toEqual(['loadCount']);
  });

  it('enforces the load count at both ends', () => {
    expect(fields(form({ loadCount: 0 }))).toContain('loadCount');
    expect(fields(form({ loadCount: SCHEDULE_LIMITS.maxLoadCount + 1 }))).toContain('loadCount');
    expect(fields(form({ loadCount: SCHEDULE_LIMITS.maxLoadCount }))).not.toContain('loadCount');
  });

  it('refuses a drop-off at or before its pickup', () => {
    expect(fields(form({ dropoffDate: '2026-09-10', dropoffTime: '06:00' }))).toContain('dropoff.from');
    expect(fields(form({ dropoffDate: '2026-09-09', dropoffTime: '18:00' }))).toContain('dropoff.from');
  });

  it('allows posting at/near now without a future buffer (MS3-347)', () => {
    expect(fields(form(), NOW)).not.toContain('fireAt');
  });

  it('a time earlier today means "post now", not an error — the Now default goes stale while the form is open', () => {
    expect(fields(form(), NOW - 60_000)).not.toContain('fireAt');
    expect(effectivePostInstant(NOW - 60_000, NOW)).toBe(NOW);
    expect(postsImmediately(NOW - 60_000, NOW)).toBe(true);
  });

  it('a later time is kept, and does not post immediately', () => {
    expect(effectivePostInstant(GOOD_POST_AT, NOW)).toBe(GOOD_POST_AT);
    expect(postsImmediately(GOOD_POST_AT, NOW)).toBe(false);
  });

  it('refuses a posting time on a day that has already passed', () => {
    expect(fields(form(), NOW - 2 * 86_400_000)).toContain('fireAt');
  });

  it('refuses a posting time past the horizon', () => {
    const far = NOW + (SCHEDULE_LIMITS.maxHorizonDays + 1) * 86_400_000;
    expect(fields(form(), far)).toContain('fireAt');
  });

  it('refuses a posting time AFTER its own pickup', () => {
    // The clause that matters most. Without it the batch arms happily and then
    // fails at posting time, hours later, with nobody watching.
    const afterPickup = Date.parse('2026-09-10T20:00:00.000Z');
    expect(fields(form(), afterPickup)).toContain('fireAt');
  });

  it('refuses a posting time inside the one-hour pickup gap', () => {
    const local = Date.parse('2026-09-10T06:00:00'); // browser-local, as the picker gave it
    expect(fields(form(), local - 30 * 60_000)).toContain('fireAt');
  });

  it('reports every failure at once, not just the first', () => {
    // Earlier today is "post now" (MS3-347), so a day that has passed is what fails fireAt.
    const blocked = fields(form({ loadCount: 0, dropoffDate: '2026-09-09' }), NOW - 2 * 86_400_000);
    expect(blocked).toEqual(expect.arrayContaining(['loadCount', 'dropoff.from', 'fireAt']));
  });

  it('never names one field twice — a client reading issues[0] must not loop', () => {
    const issues = scheduleIssues(form({ loadCount: 0, dropoffDate: '' }), NOW, null);
    const seen = issues.map((i) => i.field);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('orders issues so the first one is the earliest question', () => {
    const issues = scheduleIssues(form({ loadCount: 0, dropoffDate: '' }), NOW, null);
    expect(issues[0]?.field).toBe('loadCount');
  });
});

describe('batchTotal', () => {
  it('multiplies the template price by the count', () => {
    expect(batchTotal(draft, 5)).toBe(2600);
  });

  it('is null when the template has no price — an always-negotiable load', () => {
    expect(batchTotal({ ...draft, pricing: { ...draft.pricing, startingPrice: null } }, 5)).toBeNull();
  });

  it('is null with no template at all', () => {
    expect(batchTotal(null, 5)).toBeNull();
  });
});

describe('countdown', () => {
  it('counts minutes, then hours, then days', () => {
    expect(countdown(new Date(NOW + 30 * 60_000).toISOString(), NOW)).toBe('in 30 min');
    expect(countdown(new Date(NOW + 5 * 3_600_000).toISOString(), NOW)).toBe('in 5h 0m');
    expect(countdown(new Date(NOW + 50 * 3_600_000).toISOString(), NOW)).toBe('in 2d 2h');
  });

  it('returns null once the moment has passed — a negative countdown reads as a bug', () => {
    expect(countdown(new Date(NOW - 60_000).toISOString(), NOW)).toBeNull();
  });

  it('returns null for an unparseable time rather than NaN', () => {
    expect(countdown('not a date', NOW)).toBeNull();
  });
});

describe('postingCaveat', () => {
  const post = (overrides: Partial<ScheduledPost> = {}): ScheduledPost =>
    ({
      id: 'x',
      label: null,
      status: 'scheduled',
      template_kind: 'wizard',
      template_ref: '4821',
      load_count: 5,
      posted_count: 0,
      failed_count: 0,
      fire_at: new Date(NOW + 3_600_000).toISOString(),
      pickup_from: '2026-09-10T06:00',
      pickup_to: null,
      dropoff_from: '2026-09-10T18:00',
      dropoff_to: null,
      timezone: 'Europe/Athens',
      last_error: null,
      created_at: new Date(NOW).toISOString(),
      finished_at: null,
      ...overrides,
    }) as ScheduledPost;

  it('says plainly that nothing fires unattended', () => {
    // The gateway holds no credential once a request ends. Promising "at 06:00"
    // is a promise the system cannot keep.
    expect(postingCaveat(post(), NOW)).toMatch(/next time you open/i);
    expect(postingCaveat(post(), NOW)).not.toMatch(/automatically/i);
  });

  it('says something different once the batch is due', () => {
    expect(postingCaveat(post({ fire_at: new Date(NOW - 60_000).toISOString() }), NOW)).toMatch(/due now/i);
  });

  it('says nothing for a batch that has already finished', () => {
    expect(postingCaveat(post({ status: 'posted' }), NOW)).toBe('');
  });
});

describe('groupOf', () => {
  it('keeps partial OUT of the posted group', () => {
    // A shipper who armed ten and got seven has not had a success.
    expect(groupOf('partial')).toBe('attention');
    expect(groupOf('posted')).toBe('posted');
  });

  it('groups every failure mode together', () => {
    expect(groupOf('failed')).toBe('attention');
    expect(groupOf('expired')).toBe('attention');
  });

  it('treats a running batch as upcoming', () => {
    expect(groupOf('running')).toBe('upcoming');
    expect(groupOf('scheduled')).toBe('upcoming');
  });
});

describe('progressLabel', () => {
  const base = { load_count: 10, posted_count: 7, failed_count: 3 } as ScheduledPost;

  it('names the failures rather than only the successes', () => {
    expect(progressLabel({ ...base, status: 'partial' })).toBe('7 of 10 posted, 3 failed');
  });

  it('omits the failure clause when there are none', () => {
    expect(progressLabel({ ...base, status: 'posted', posted_count: 10, failed_count: 0 })).toBe('10 of 10 posted');
  });

  it('describes a not-yet-posted batch by what it owes', () => {
    expect(progressLabel({ ...base, status: 'scheduled' })).toBe('10 loads queued');
  });
});

/**
 * The card's facts.
 *
 * Guarded because every one of these renders a row only when it is non-null, so
 * a helper that starts returning null is not a visible error - it is a card that
 * has quietly gone back to saying "N loads, these dates", which was true of every
 * batch the shipper ever armed.
 *
 * Amounts are asserted through `toLocaleString` rather than against a literal
 * "2,600", so the suite does not depend on the machine's grouping separator.
 */
describe('the card facts', () => {
  const summary = (overrides: Partial<BatchSummary> = {}): BatchSummary => ({
    stop_count: 2,
    line_count: 1,
    qty: [{ unit: 'EUR_PALLET', value: 16 }],
    weight: [{ unit: 'T', value: 13 }],
    distance_km: 447,
    drive_min: 320,
    vehicle_type_count: 1,
    channels: ['public'],
    partner_count: 0,
    currency: 'EUR',
    starting_price: 520,
    negotiable: true,
    negotiable_floor: null,
    batch_total: 2600,
    customer_reference: 'PO-4821',
    reference_sample: 'PO-4821 #1/5',
    require_tracking: false,
    response_window: '48h',
    ...overrides,
  });

  const post = (over: Partial<BatchSummary> = {}, rest: Partial<ScheduledPost> = {}): ScheduledPost =>
    ({ id: 'bdc01067-...', label: null, template_ref: null, load_count: 5, summary: summary(over), ...rest }) as ScheduledPost;

  it('reports the measured route, with the drive time when there is one', () => {
    expect(routeFact(summary())).toBe('447 km · 5h 20m');
    expect(routeFact(summary({ drive_min: null }))).toBe('447 km');
  });

  it('renders no route row at all for a batch that was never measured', () => {
    // Rather than "0 km", which is a distance, or "-", which is a row spent
    // saying nothing.
    expect(routeFact(summary({ distance_km: null }))).toBeNull();
  });

  it('reports the cargo in the words the create-shipment flow uses', () => {
    expect(cargoFact(summary())).toBe('16 EUR pallets · 13 t');
    expect(cargoFact(summary({ qty: [], weight: [] }))).toBeNull();
  });

  it('writes the batch price out as the multiplication', () => {
    // The number that surprises a shipper is the batch total; the number they
    // typed is the per-load one. Either alone leaves them doing the other.
    expect(priceFact(post())).toBe(`520 EUR x 5 = ${(2600).toLocaleString()} EUR`);
  });

  it('does not multiply a single-load batch by one', () => {
    expect(priceFact(post({ batch_total: 520 }, { load_count: 1 }))).toBe('520 EUR');
  });

  it('has no price row for an always-negotiable load', () => {
    expect(priceFact(post({ starting_price: null, batch_total: null }))).toBeNull();
  });

  it('says how the price may move, including the floor when one was set', () => {
    expect(negotiability(summary()).key).toBe('negotiable');
    expect(negotiability(summary({ negotiable: false })).key).toBe('fixed');
    const floor = negotiability(summary({ negotiable_floor: 400 }));
    expect(floor.key).toBe('floor');
    expect(floor.amount).toBe('400 EUR');
  });

  it('formats a drive time in hours and minutes, and refuses a missing one', () => {
    expect(durationLabel(320)).toBe('5h 20m');
    expect(durationLabel(45)).toBe('45m');
    expect(durationLabel(null)).toBeNull();
    expect(durationLabel(0)).toBeNull();
  });

  it('titles a batch by what the shipper called it, then by their own reference', () => {
    expect(batchTitle(post({}, { label: 'Weekly Athens run' }))).toBe('Weekly Athens run');
    expect(batchTitle(post())).toBe('PO-4821');
    expect(batchTitle(post({ customer_reference: null }, { template_ref: '4821' }))).toBe('4821');
  });

  it('returns null rather than an id when there is no human title', () => {
    // The drawer wraps this in "Batch {{id}}" so the primary key at least reads
    // as one, instead of appearing to be the batch's name.
    expect(batchTitle(post({ customer_reference: null }))).toBeNull();
  });
});
