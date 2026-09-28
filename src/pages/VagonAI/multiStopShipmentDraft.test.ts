import { describe, expect, it } from 'vitest';
import type { FlowBundle } from '../../hooks/useChat';
import {
  addStopAt, allLines, blockingIssues, draftFromSeed, isDirectRunAwaitingPairing, moveLine,
  removeStopAt, saveIssues, sectionComplete, sectionForField, setStopAt, stopRole,
  type DraftLine, type ShipmentDraft,
} from './createShipmentDraft';

/**
 * Multi-stop itineraries in the chat flow.
 *
 * The chat draft used to hold two parallel arrays — stops, and one flat `lines`
 * beside them — so a load collected once and split across two deliveries had
 * nowhere to record which goods went where. `setStop` also wrote by ROLE, which
 * meant a second delivery silently overwrote the first. Cargo now sits under the
 * stop that handles it and stops are addressed by index, which is what these
 * cases are about.
 *
 * The rule to read twice is the direct-run exemption. A two-stop load states
 * only its picks — the gateway's `autoPairLines` supplies the drops — so
 * checking balance before that happens would refuse every ordinary load for
 * delivering nothing. `isDirectRunAwaitingPairing` is the mirror of that
 * gateway function, condition for condition.
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

const cargo = (action: 'pick' | 'drop', qty: number, productId = 'p1'): DraftLine => ({
  productId,
  action,
  qty,
  unit: 'EUR_PALLET',
  weight: qty * 100,
  wUnit: 'KG',
  orderId: null,
  orderLineId: null,
  customerId: null,
});

/**
 * An itinerary of N stops with the cargo given, dated a day apart, and
 * otherwise ready to publish — so a failure names the allocation rule that
 * fired rather than a missing truck or price.
 */
function itinerary(perStop: DraftLine[][]): ShipmentDraft {
  let draft = draftFromSeed(bundle());
  perStop.forEach((lines, i) => {
    draft = setStopAt(draft, i, {
      locationId: 'loc-' + i,
      from: '2030-10-0' + (i + 1) + 'T09:00',
      to: null,
      lines,
    });
  });
  return {
    ...draft,
    vehicleTypeIds: ['3'],
    vehicleCategoryIds: [],
    broadcast: { channels: ['private'], carrierPartnerIds: ['3312'], driverId: null },
    pricing: { negotiable: true, startingPrice: 1850, negotiableFloor: null, currency: 'EUR' },
  };
}

describe('multi-stop itineraries', () => {
  it('accepts a 1-pickup / 2-dropoff split stated per stop', () => {
    const draft = itinerary([[cargo('pick', 30)], [cargo('drop', 20)], [cargo('drop', 10)]]);
    expect(blockingIssues(draft)).toEqual([]);
    expect(draft.stops.map((s) => s.lines.length)).toEqual([1, 1, 1]);
  });

  it('accepts a 2-pickup / 1-dropoff consolidation', () => {
    expect(blockingIssues(itinerary([[cargo('pick', 12)], [cargo('pick', 8)], [cargo('drop', 20)]]))).toEqual([]);
  });

  it('derives a middle stop that both delivers and collects, rather than collapsing it', () => {
    const draft = itinerary([
      [cargo('pick', 30)],
      [cargo('drop', 10), cargo('pick', 5, 'p2')],
      [cargo('drop', 20), cargo('drop', 5, 'p2')],
    ]);
    expect(stopRole(draft.stops[1]!)).toBe('both');
    expect(blockingIssues(draft)).toEqual([]);
  });

  it('refuses a split that does not add up', () => {
    const issues = blockingIssues(itinerary([[cargo('pick', 30)], [cargo('drop', 10)], [cargo('drop', 10)]]));
    expect(issues.some((i) => /collected but/.test(i.message))).toBe(true);
  });

  it('refuses delivering more than has been collected so far, even when the totals agree', () => {
    const issues = blockingIssues(itinerary([[cargo('pick', 10)], [cargo('drop', 30)], [cargo('pick', 20)]]));
    expect(issues.some((i) => /would be carrying -20/.test(i.message))).toBe(true);
  });

  it('refuses a product dropped before it is ever picked up', () => {
    const issues = blockingIssues(itinerary([[cargo('drop', 5)], [cargo('pick', 5)]]));
    expect(issues.some((i) => /never collects|not collected until/.test(i.message))).toBe(true);
  });

  it('refuses a stop with no cargo at all', () => {
    const issues = blockingIssues(itinerary([[cargo('pick', 5)], [], [cargo('drop', 5)]]));
    expect(issues.some((i) => i.field === 'stops[1].lines')).toBe(true);
  });

  it('does not ask a direct run to balance, because the gateway mirrors it', () => {
    const direct = itinerary([[cargo('pick', 10)], []]);
    expect(isDirectRunAwaitingPairing(direct)).toBe(true);
    expect(blockingIssues(direct)).toEqual([]);
  });

  it('stops honouring the implicit pairing the moment a third stop appears', () => {
    const three = addStopAt(itinerary([[cargo('pick', 10)], []]), 1);
    expect(isDirectRunAwaitingPairing(three)).toBe(false);
    expect(blockingIssues(three).length).toBeGreaterThan(0);
  });

  it('stops honouring it once the shipper writes a drop of their own', () => {
    const stated = itinerary([[cargo('pick', 10)], [cargo('drop', 4)]]);
    expect(isDirectRunAwaitingPairing(stated)).toBe(false);
    expect(blockingIssues(stated).some((i) => /collected but/.test(i.message))).toBe(true);
  });
});

describe('editing the itinerary', () => {
  it('adds a stop without disturbing the cargo already placed', () => {
    const grown = addStopAt(itinerary([[cargo('pick', 10)], [cargo('drop', 10)]]), 1);
    expect(grown.stops).toHaveLength(3);
    expect(grown.stops.map((s) => s.lines.length)).toEqual([1, 0, 1]);
  });

  it('writes a second delivery instead of overwriting the first', () => {
    // The old `setStop` replaced whatever stop shared the incoming role, so this
    // sequence produced a two-stop load. Index addressing is what fixed it.
    let draft = itinerary([[cargo('pick', 30)], [cargo('drop', 20)]]);
    draft = setStopAt(draft, 2, { locationId: 'loc-9', from: '2030-10-05T09:00', lines: [cargo('drop', 10)] });
    expect(draft.stops).toHaveLength(3);
    expect(allLines(draft).map((l) => l.qty)).toEqual([30, 20, 10]);
  });

  it('never removes a stop below two, so a load always has both ends', () => {
    const two = itinerary([[cargo('pick', 10)], [cargo('drop', 10)]]);
    expect(removeStopAt(two, 1)).toEqual(two);
  });

  it('takes the cargo with a removed stop rather than re-homing it on a guess', () => {
    const trimmed = removeStopAt(itinerary([[cargo('pick', 10)], [cargo('drop', 4)], [cargo('drop', 6)]]), 1);
    expect(trimmed.stops).toHaveLength(2);
    expect(allLines(trimmed).map((l) => l.qty)).toEqual([10, 6]);
  });

  it('moves one line between stops, which is how a split is stated', () => {
    const moved = moveLine(itinerary([[cargo('pick', 10), cargo('drop', 10)], []]), 0, 1, 1);
    expect(moved.stops[0]?.lines.map((l) => l.action)).toEqual(['pick']);
    expect(moved.stops[1]?.lines.map((l) => l.action)).toEqual(['drop']);
  });

  it('ignores a move to a stop that is not there', () => {
    const draft = itinerary([[cargo('pick', 10)], [cargo('drop', 10)]]);
    expect(moveLine(draft, 0, 0, 9)).toEqual(draft);
  });

  it('holds the route row until every added stop is a real site and date', () => {
    const withBlank = addStopAt(itinerary([[cargo('pick', 10)], [cargo('drop', 10)]]), 1);
    expect(sectionComplete(withBlank, 'route')).toBe(false);

    // Dated BETWEEN its neighbours: the stops run 1 Oct and 2 Oct, and a middle
    // stop on the 5th would be a chronology error rather than a filled-in one.
    const filled = setStopAt(withBlank, 1, { locationId: 'loc-x', from: '2030-10-01T14:00' });
    // The site and the date are answered...
    expect(saveIssues(filled).some((issue) => /locationId|\.from$/.test(issue.field))).toBe(false);
    // ...and the stop is still not finished, because a stop the truck drives to
    // and does nothing at is a mis-tap rather than an itinerary. The gateway
    // refuses the same thing, so saying so here is the affordance.
    expect(saveIssues(filled).some((issue) => issue.field === 'stops[1].lines')).toBe(true);
  });
});

describe('stepForField', () => {
  /*
   * The ordering that matters. The gate answers in `stops[i].lines[j].field`,
   * which begins with `stops[0]` for cargo on the collection stop — so testing
   * the stop prefix first would send the shipper to the site picker to fix a
   * quantity.
   */
  it('routes a stop-qualified cargo path to the products card, not the site card', () => {
    expect(sectionForField('stops[0].lines[0].qty')).toBe('cargo');
    expect(sectionForField('stops[2].lines[1].productId')).toBe('cargo');
    expect(sectionForField('lines')).toBe('cargo');
  });

  it('still routes the stops themselves to the card that owns them', () => {
    // Every stop is one row now, so the index no longer has to be told apart -
    // the route row lists all of them and the failing one is on screen.
    expect(sectionForField('stops[0].from')).toBe('route');
    expect(sectionForField('stops[1].locationId')).toBe('route');
    expect(sectionForField('stops[3].from')).toBe('route');
    expect(sectionForField('stops')).toBe('route');
  });

  it('routes the settled decisions to their own cards', () => {
    expect(sectionForField('broadcast.carrierPartnerIds')).toBe('carrier');
    expect(sectionForField('vehicleTypeIds')).toBe('truck');
    expect(sectionForField('pricing.startingPrice')).toBe('price');
    expect(sectionForField('trackingOrderIds')).toBe('extras');
  });
});
