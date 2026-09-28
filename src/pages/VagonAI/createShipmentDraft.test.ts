import { describe, expect, it } from 'vitest';
import type { FlowBundle } from '../../hooks/useChat';
import {
  blockingIssues, draftFromSeed, schedulableIssues, setBroadcastChannel, setStopAt, toggleCarrier,
  toggleVehicleCategory, toggleVehicleType, type ShipmentDraft,
} from './createShipmentDraft';

/**
 * What stops a load being copied into a scheduled batch.
 *
 * `schedulableIssues` is the reason this file exists, and the distinction it
 * draws is the whole point: a batch REPLACES every date it copies, so the
 * past-stop rule that rightly blocks publishing one load must not block copying
 * it. The gateway's schedule gate makes the same distinction — it grades the
 * projected first load as of its posting time, never the template — so a client
 * check that refused a template for being in the past would refuse the entire
 * feature for any load that had already shipped.
 *
 * The other half is the price. `pricingIssues` allows a blank price on a
 * negotiable load, because "always negotiable" is a real choice for a single
 * load. A batch cannot use it: MYVAGON's own step 3 takes `target_price` as a
 * required number, so a blank one is refused once per load in the batch.
 */

function bundle(): FlowBundle {
  return {
    draft: {
      customerReference: null,
      stops: [],
      vehicleTypeIds: [],
      vehicleCategoryIds: [],
      broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null },
      pricing: { negotiable: true, startingPrice: null, negotiableFloor: null, currency: 'EUR' },
      requireTracking: false,
      responseWindow: '48h',
      settlement: 'direct',
      bulk: { mode: 'single' },
      trackingOrderIds: [],
    },
    gaps: [],
    suggestions: { vehicle: null, partner: null, partnerAlternatives: [] },
    orders: [],
    locations: [],
    products: [],
    partners: [],
    vehicleTypes: [],
    defaults: {
      responseWindow: '48h',
      settlement: 'direct',
      requireTracking: false,
      negotiable: true,
      currency: 'EUR',
      bulkMode: 'single',
    },
    rules: {},
    notes: [],
    truncated: {},
  };
}

/** A load ready to publish: two stops, balanced cargo, a truck, a channel, a price. */
function publishable(overrides: Partial<ShipmentDraft> = {}): ShipmentDraft {
  const line = (action: 'pick' | 'drop') => ({
    productId: '97', action, qty: 10, unit: 'EUR_PALLET' as const, weight: 8000,
    wUnit: 'KG' as const, orderId: null, orderLineId: null, customerId: null,
  });
  let draft = draftFromSeed(bundle());
  draft = setStopAt(draft, 0, { locationId: '1841', from: '2030-09-14T08:00', to: null, lines: [line('pick')] });
  draft = setStopAt(draft, 1, { locationId: '1842', from: '2030-09-16T09:00', to: null, lines: [line('drop')] });
  return {
    ...draft,
    vehicleTypeIds: ['3'],
    vehicleCategoryIds: [],
    broadcast: { channels: ['private'], carrierPartnerIds: ['3312'], driverId: null },
    pricing: { negotiable: true, startingPrice: 1850, negotiableFloor: null, currency: 'EUR' },
    ...overrides,
  };
}

describe('schedulableIssues', () => {
  it('passes a load that is ready to publish', () => {
    expect(schedulableIssues(publishable())).toEqual([]);
  });

  /*
   * The headline case. A load whose pickup has passed cannot be published as it
   * stands — `blockingIssues` says so, correctly — but it is a perfectly good
   * template, because every copy gets new dates. Refusing it here would mean a
   * shipper could never repeat a route they have already run, which is the most
   * obvious reason to want this feature at all.
   */
  it('IGNORES a stop in the past, which a batch replaces anyway', () => {
    const shipped = publishable();
    const past = {
      ...shipped,
      stops: shipped.stops.map((stop) => ({ ...stop, from: '2020-01-15T08:00' })),
    };
    expect(blockingIssues(past).some((i) => /past/i.test(i.message))).toBe(true);
    expect(schedulableIssues(past)).toEqual([]);
  });

  it('asks for a channel, because copies go where the template went', () => {
    const issues = schedulableIssues(publishable({
      broadcast: { channels: [], carrierPartnerIds: [], driverId: null },
    }));
    expect(issues[0]).toMatchObject({ field: 'broadcast.channels' });
  });

  it('asks for carriers on a private load', () => {
    const issues = schedulableIssues(publishable({
      broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null },
    }));
    expect(issues[0]).toMatchObject({ field: 'broadcast.carrierPartnerIds' });
  });

  it('asks for a truck type', () => {
    const issues = schedulableIssues(publishable({ vehicleTypeIds: [] }));
    expect(issues.some((i) => i.field === 'vehicleTypeIds')).toBe(true);
  });

  /*
   * The rule `pricingIssues` alone does not catch. A negotiable load with no
   * figure is a valid single load and an invalid batch, because step 3 requires
   * a number.
   */
  it('asks for an asking price even on a negotiable load', () => {
    const issues = schedulableIssues(publishable({
      pricing: { negotiable: true, startingPrice: null, negotiableFloor: null, currency: 'EUR' },
    }));
    expect(issues.some((i) => i.field === 'pricing.startingPrice')).toBe(true);
  });

  it('reports every missing decision at once, not one at a time', () => {
    const issues = schedulableIssues(publishable({
      vehicleTypeIds: [],
      vehicleCategoryIds: [],
      broadcast: { channels: [], carrierPartnerIds: [], driverId: null },
      pricing: { negotiable: true, startingPrice: null, negotiableFloor: null, currency: 'EUR' },
    }));
    const fields = issues.map((i) => i.field);
    expect(fields).toContain('broadcast.channels');
    expect(fields).toContain('vehicleTypeIds');
    expect(fields).toContain('pricing.startingPrice');
  });

  /*
   * Everything a batch cannot fix must be checked, and nothing else. Cargo and
   * stops are copied verbatim too, but they are already guaranteed by the
   * gateway's own recovery, which refuses a draft it cannot rebuild exactly.
   */
  it('says nothing about the cargo, which the recovery already guarantees', () => {
    const issues = schedulableIssues(publishable({ stops: [] }));
    expect(issues.some((i) => i.field.startsWith('lines'))).toBe(false);
  });
});

/**
 * A private load goes to a LIST of carriers.
 *
 * `selected_carriers` on step 3 is an array with no upper bound, the wizard
 * ticks as many as the shipper likes, and the gateway's `partner_ids` is
 * `z.array(...).min(1)`. The review card used to replace the list on every tap,
 * so a shipper offering the load to three carriers sent it to one.
 */
describe('toggleVehicleType (MS3-347 multi-select)', () => {
  it('adds a second truck type instead of replacing the first', () => {
    expect(toggleVehicleType(publishable(), '7').vehicleTypeIds).toEqual(['3', '7']);
  });

  it("switching a type off drops its subtypes, and only its own", () => {
    // A subtype left behind has no row on screen to untick it, and the gateway
    // refuses a publish whose subtype belongs to no chosen type.
    let draft = toggleVehicleType(publishable(), '7');
    draft = toggleVehicleCategory(toggleVehicleCategory(draft, '31'), '71');
    draft = toggleVehicleType(draft, '7', ['70', '71']);
    expect(draft.vehicleTypeIds).toEqual(['3']);
    expect(draft.vehicleCategoryIds).toEqual(['31']);
  });

  it('several subtypes can be picked at once', () => {
    const draft = toggleVehicleCategory(toggleVehicleCategory(publishable(), '31'), '32');
    expect(draft.vehicleCategoryIds).toEqual(['31', '32']);
    expect(toggleVehicleCategory(draft, '31').vehicleCategoryIds).toEqual(['32']);
  });
});

describe('setBroadcastChannel (MS3-347 Private/Public)', () => {
  it('public needs no carrier', () => {
    const none = publishable({ broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null } });
    const draft = setBroadcastChannel(none, 'public');
    expect(draft.broadcast.channels).toEqual(['public']);
    expect(schedulableIssues(draft).some((i) => i.field === 'broadcast.carrierPartnerIds')).toBe(false);
  });

  it('a mistaken tap on Public does not lose the carriers ticked for private', () => {
    const draft = setBroadcastChannel(setBroadcastChannel(publishable(), 'public'), 'private');
    expect(draft.broadcast).toMatchObject({ channels: ['private'], carrierPartnerIds: ['3312'] });
    expect(schedulableIssues(draft)).toEqual([]);
  });

  it('a fresh draft is private', () => {
    expect(publishable().broadcast.channels).toEqual(['private']);
  });
});

describe('toggleCarrier', () => {
  it('adds a second carrier instead of replacing the first', () => {
    const one = publishable();
    const two = toggleCarrier(one, '4400');
    expect(two.broadcast.carrierPartnerIds).toEqual(['3312', '4400']);
  });

  it('keeps the order the shipper ticked them in', () => {
    let draft = publishable({ broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null } });
    for (const id of ['9', '3', '7']) draft = toggleCarrier(draft, id);
    expect(draft.broadcast.carrierPartnerIds).toEqual(['9', '3', '7']);
  });

  it('removes only the carrier tapped again', () => {
    let draft = publishable();
    draft = toggleCarrier(draft, '4400');
    draft = toggleCarrier(draft, '3312');
    expect(draft.broadcast.carrierPartnerIds).toEqual(['4400']);
  });

  it('leaves the load sendable while at least one carrier is left', () => {
    let draft = toggleCarrier(publishable(), '4400');
    draft = toggleCarrier(draft, '3312');
    expect(schedulableIssues(draft)).toEqual([]);
  });

  it('untucking the last carrier is what re-raises the missing-carrier issue', () => {
    const none = toggleCarrier(publishable(), '3312');
    expect(none.broadcast.carrierPartnerIds).toEqual([]);
    expect(schedulableIssues(none)[0]).toMatchObject({ field: 'broadcast.carrierPartnerIds' });
  });

  it('does not mutate the draft it is given', () => {
    const before = publishable();
    toggleCarrier(before, '4400');
    expect(before.broadcast.carrierPartnerIds).toEqual(['3312']);
  });
});
